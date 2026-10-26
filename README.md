# cpxo

Copy here. Paste anywhere.

- iPhone clipboard to Windows and back, through two iOS Shortcuts and a Windows tray app.
- File drop from any shell: `curl -T file https://cpxo.dev/up/<token>/` returns a link. Up to 4 GB, kept 7 days.
- Windows app adds "Upload to cpxo and copy link" to the Explorer right-click menu.

## Layout

| Path       | What                                                        |
| ---------- | ----------------------------------------------------------- |
| `web/`     | Next.js 16 site + API, Prisma on MariaDB, MinIO via S3 SDK  |
| `desktop/` | Electron tray app for Windows (electron-builder NSIS)       |
| `cli/cpxo` | POSIX shell client, also served at `/cli`                   |
| `design/`  | Logo and brand board                                        |
| `docs/`    | API contract                                                |

## Run the web app

```bash
cd web
cp .env.example .env   # fill DATABASE_URL, MINIO_*, APP_URL, SESSION_SECRET
npm install
npx prisma db push
npm run dev
```

Production: the root `Dockerfile` builds a standalone Next.js server. It runs `prisma db push` on start, so the schema follows the code. Expired files are deleted hourly by the app (see `web/src/instrumentation.ts`) and, as a backstop, by a MinIO lifecycle rule the app installs on the bucket.

Reverse proxy notes: uploads stream through the app, so the proxy in front must allow 4 GB bodies and long requests (nginx: `client_max_body_size 4g; proxy_request_buffering off; proxy_read_timeout 3600;`). The `cpxo` CLI uploads files above 100 MB straight to MinIO with a presigned URL, which bypasses the proxy entirely.

## Build the Windows app

```bash
cd desktop
npm install
npm run dist
```

See `docs/API.md` for the HTTP API.
