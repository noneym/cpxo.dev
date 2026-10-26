<p align="center">
  <img src="design/mark.svg" width="96" alt="cpxo mark">
</p>

<h1 align="center">cpxo</h1>

<p align="center">
  <b>Copy here. Paste anywhere.</b><br>
  iPhone clipboard to Windows and back. File drop from any shell with one curl line.
</p>

<p align="center">
  <a href="https://cpxo.dev">cpxo.dev</a> ·
  <a href="https://cpxo.dev/docs/ios">iPhone setup</a> ·
  <a href="https://cpxo.dev/docs/cli">Shell</a> ·
  <a href="https://cpxo.dev/docs/windows">Windows app</a> ·
  <a href="https://cpxo.dev/docs/mac">Mac app</a> ·
  <a href="https://github.com/noneym/cpxo.dev/releases/latest">Download</a>
</p>

<p align="center">
  <a href="https://github.com/noneym/cpxo.dev/actions/workflows/web.yml"><img src="https://github.com/noneym/cpxo.dev/actions/workflows/web.yml/badge.svg" alt="web"></a>
  <a href="https://github.com/noneym/cpxo.dev/actions/workflows/desktop.yml"><img src="https://github.com/noneym/cpxo.dev/actions/workflows/desktop.yml/badge.svg" alt="desktop"></a>
  <a href="https://github.com/noneym/cpxo.dev/releases/latest"><img src="https://img.shields.io/github/v/release/noneym/cpxo.dev?label=desktop%20app" alt="release"></a>
</p>

---

## What it does

| | |
| --- | --- |
| **Clipboard sync** | Two iOS Shortcuts push and pull your clipboard. The Windows tray app syncs automatically. Searchable history of up to 10,000 clips on the dashboard, filterable by device. |
| **File drop** | `curl -T file https://cpxo.dev/up/<token>/` returns a share link. Up to 4 GB per file (configurable). Download with `wget` or `curl -JLO`. |
| **7-day expiry** | Every file is deleted from storage after 7 days. Hourly cleanup in the app plus a bucket lifecycle rule as a backstop. |
| **Desktop app** | Windows and macOS (Apple Silicon + Intel). Right-click a file in Explorer, or Open With on the Mac: *Upload to cpxo and copy link*. Drag and drop. Notifications when a clip arrives from your phone. |

## Quick start

```bash
# upload
curl -T backup.tar.gz https://cpxo.dev/up/cpx_YOURTOKEN/

# download
wget --content-disposition https://cpxo.dev/f/k3v9xq2a

# optional CLI: clipboard from the shell
curl -fsSL https://cpxo.dev/cli -o /usr/local/bin/cpxo && chmod +x /usr/local/bin/cpxo
cpxo login cpx_YOURTOKEN
cpxo copy "hello from the server"
cpxo paste
```

Tokens come from the dashboard at [cpxo.dev/dashboard](https://cpxo.dev/dashboard).

## Repository layout

| Path       | What                                                              |
| ---------- | ----------------------------------------------------------------- |
| `web/`     | Next.js 16 site + API. Prisma on MariaDB, MinIO through the S3 SDK |
| `desktop/` | Electron tray app for Windows (NSIS) and macOS (dmg, arm64 + x64)    |
| `cli/cpxo` | POSIX shell client, served at `/cli`                              |
| `design/`  | Logo, mono variant and brand board                                |
| `docs/`    | [API contract](docs/API.md)                                       |

## Run the web app locally

```bash
cd web
cp .env.example .env   # DATABASE_URL, MINIO_*, APP_URL, SESSION_SECRET, MAX_FILE_MB
npm install
npx prisma db push
npm run dev
```

## Deploy

The root `Dockerfile` builds a standalone Next.js server. On start it runs `prisma db push`, so the schema follows the code. Base images use floating `node:22-alpine` tags and the runtime stage runs `apk upgrade`, so every build picks up current security patches. Dependabot opens weekly update PRs for npm, Docker and Actions; CI fails on high-severity audit findings.

Environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | | MariaDB / MySQL connection string |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_SECURE`, `MINIO_BUCKET` | | Object storage |
| `APP_URL` | `http://localhost:3000` | Public URL used in share links |
| `SESSION_SECRET` | | Random string, 32+ chars |
| `FILE_TTL_DAYS` | `7` | Days before a file is deleted |
| `MAX_FILE_MB` | `4096` | Upload limit in megabytes |
| `MAX_CLIP_KB` | `512` | Clipboard entry limit |
| `MAX_CLIPS` | `10000` | Clipboard history kept per account |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | | Cloudflare Turnstile on the register form (both empty = no captcha) |

Reverse proxy and DNS: uploads stream through the app, so anything in front must allow bodies of `MAX_FILE_MB` and long requests. If the domain is on Cloudflare, keep the record **DNS only** (grey cloud): the Cloudflare proxy caps request bodies at 100 MB. The `cpxo` CLI and the Windows app send files above 100 MB straight to MinIO with a presigned URL.

## Build the desktop app

```bash
cd desktop
npm install
npm run dist:win   # dist/cpxo-setup-<version>.exe   (on Windows)
npm run dist:mac   # dist/cpxo-<version>-mac-{arm64,x64}.dmg  (on a Mac)
```

Pushing a tag like `v0.2.0` builds both on GitHub Actions and attaches them to a release. The Mac build is not notarized: first launch needs right-click, Open.

## License

MIT
