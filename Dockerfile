# cpxo.dev web + API
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

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static ./web/.next/static
COPY --from=build /app/web/public ./web/public
COPY --from=build /app/web/prisma ./web/prisma
COPY --from=build /app/web/node_modules/.bin/prisma ./web/node_modules/.bin/prisma
COPY --from=build /app/web/node_modules/prisma ./web/node_modules/prisma
COPY --from=build /app/web/node_modules/@prisma ./web/node_modules/@prisma
COPY cli ./cli
WORKDIR /app/web
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node server.js"]
