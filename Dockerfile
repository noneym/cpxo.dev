# cpxo.dev web + API
# Base images use floating tags on purpose: every build picks up the latest
# Node 22 / Alpine security patches, and `apk upgrade` refreshes OS packages.
FROM node:22-alpine AS deps
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
COPY web/prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY web ./web
COPY cli ./cli
WORKDIR /app/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# Small, self-contained Prisma CLI used only for `db push` at container start.
FROM node:22-alpine AS prisma-cli
WORKDIR /tools
COPY web/package.json /tmp/web-package.json
RUN PRISMA_VERSION=$(node -p "require('/tmp/web-package.json').devDependencies.prisma.replace(/^[\^~]/,'')") \
 && npm init -y >/dev/null && npm i --no-audit --no-fund prisma@"$PRISMA_VERSION"

FROM node:22-alpine AS run
RUN apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# standalone output is rooted at web/ (outputFileTracingRoot), so server.js lands in /app/web
COPY --from=build /app/web/.next/standalone ./web
COPY --from=build /app/web/.next/static ./web/.next/static
COPY --from=build /app/web/public ./web/public
COPY --from=build /app/web/prisma ./web/prisma
COPY --from=prisma-cli /tools/node_modules ./tools/node_modules
COPY cli ./cli
WORKDIR /app/web
EXPOSE 3000
CMD ["sh", "-c", "node /app/tools/node_modules/prisma/build/index.js db push --schema prisma/schema.prisma --skip-generate --accept-data-loss && node server.js"]
