<p align="center">
  <img src="design/mark.svg" width="96" alt="cpxo mark">
</p>

<h1 align="center">cpxo</h1>

<p align="center">
  <b>Copy here. Paste anywhere.</b><br>
  One clipboard for iPhone, Mac and Windows. File drop from any shell with one curl line.
</p>

<p align="center">
  <a href="https://cpxo.dev">cpxo.dev</a> ·
  <a href="https://cpxo.dev/docs/ios">iPhone</a> ·
  <a href="https://cpxo.dev/docs/mac">Mac</a> ·
  <a href="https://cpxo.dev/docs/windows">Windows</a> ·
  <a href="https://cpxo.dev/docs/cli">Shell</a> ·
  <a href="https://github.com/noneym/cpxo.dev/releases/latest">Download</a>
</p>

<p align="center">
  <a href="https://github.com/noneym/cpxo.dev/actions/workflows/web.yml"><img src="https://github.com/noneym/cpxo.dev/actions/workflows/web.yml/badge.svg" alt="web"></a>
  <a href="https://github.com/noneym/cpxo.dev/actions/workflows/desktop.yml"><img src="https://github.com/noneym/cpxo.dev/actions/workflows/desktop.yml/badge.svg" alt="desktop"></a>
  <a href="https://github.com/noneym/cpxo.dev/releases/latest"><img src="https://img.shields.io/github/v/release/noneym/cpxo.dev?label=desktop%20app" alt="release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-lime" alt="MIT"></a>
</p>

---

## Features

### Clipboard

- **Universal clipboard.** Copy on the iPhone, Mac or Windows, paste on any of the others. Desktop apps sync within two seconds and show a notification; each device ignores what it sent itself, so nothing loops.
- **History up to 10,000 clips** per account on the dashboard: filter by device (iPhone, Mac, Windows, shell, web), full-text search, cursor paging, per-entry copy and delete, clear with the current filter. Identical consecutive clips are not stored twice.
- **Shell clipboard.** `cpxo copy "text"` and `cpxo paste` from any Linux box.

### iPhone

- **Two signed Shortcuts**, installed with one tap from [cpxo.dev/docs/ios](https://cpxo.dev/docs/ios). The token is asked once and kept in the Shortcuts folder.
- **Send to Windows** sends whatever is on the clipboard. Text becomes a clip; a copied **photo, video or file is uploaded** and its share link becomes the clip, copied back to the iPhone too.
- **Share Sheet**: share a photo from Photos or a file from Files straight to cpxo.
- **Get from Windows** puts the latest clip from any device on the iPhone clipboard.
- Back Tap, Action Button, app-close and timer automation recipes are in the docs (iOS has no background clipboard access).

### Files

- **Upload from any shell**: `curl -T file https://cpxo.dev/up/<token>/` prints a share link. Pipes work too (`pg_dump db | gzip | curl -T - ...?name=db.sql.gz`).
- **Up to 4 GB per file** (`MAX_FILE_MB`). Big files go straight to object storage with presigned URLs, bypassing the app server.
- **Download with `wget` or `curl -JLO`**. Links are public and unguessable.
- **7-day expiry**: files are deleted from the database and from storage after 7 days (`FILE_TTL_DAYS`). Hourly cleanup in the app plus a bucket lifecycle rule as a backstop.
- Dashboard upload with progress, file list with download counts and days left.

### Desktop app (Windows and macOS)

- **Windows**: tray app, NSIS installer. Explorer right-click: *Upload to cpxo and copy link*. Launch at login.
- **macOS**: menu bar app for Apple Silicon and Intel. Finder *Open With cpxo*, drop files on the Dock icon, `open -a cpxo file`. Ad-hoc signed (not notarized): first launch via right-click, Open.
- Both: drag and drop onto the settings window, upload progress for large files, link copied to the clipboard when done, exponential backoff when offline, rotating log file.

### Platform

- **Accounts** with per-device API tokens; tokens work as `Authorization: Bearer`, `?t=` or in the upload path.
- **Cloudflare Turnstile** on the register form (server-side verified, optional).
- **Dockerfile** for the web app with `prisma db push` on start; GitHub Actions build the Windows installer and both Mac dmgs on every `v*` tag; Dependabot keeps npm, Docker and Actions current; CI fails on high-severity audit findings.
- Configurable limits: file size, clip size, history length, retention.

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
cpxo up disk.img
```

Tokens come from the dashboard at [cpxo.dev/dashboard](https://cpxo.dev/dashboard). Desktop installers are on the [releases page](https://github.com/noneym/cpxo.dev/releases/latest).

## How it fits together

```
iPhone (Shortcuts) ──┐
Mac (menu bar app) ──┼── HTTPS ──> cpxo.dev (Next.js API) ──> MariaDB (accounts, clips, file index)
Windows (tray app) ──┤                     │
shell (curl / cpxo) ─┘                     └──> MinIO / S3 (files, 7-day lifecycle)
```

Every client talks to the same small API, documented in [docs/API.md](docs/API.md): `POST /api/clip`, `GET /api/clip?since=`, `GET /api/clip/history`, `POST /api/drop` (text or file from the phone), `PUT /up`, `GET /f/<code>`, presigned uploads for big files.

## Repository layout

| Path         | What                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `web/`       | Next.js 16 site + API. Prisma on MariaDB, MinIO through the S3 SDK   |
| `desktop/`   | Electron app for Windows (NSIS) and macOS (dmg, arm64 + x64)         |
| `shortcuts/` | Generator for the iOS Shortcuts (`build.py`) and signing notes       |
| `cli/cpxo`   | POSIX shell client, served at `/cli`                                 |
| `design/`    | Logo, mono variant and brand board                                   |
| `docs/`      | [API contract](docs/API.md)                                          |

## Run the web app locally

```bash
cd web
cp .env.example .env   # DATABASE_URL, MINIO_*, APP_URL, SESSION_SECRET, limits
npm install
npx prisma db push
npm run dev
```

## Deploy

The root `Dockerfile` builds a standalone Next.js server. On start it runs `prisma db push`, so the schema follows the code. Base images use floating `node:22-alpine` tags and the runtime stage runs `apk upgrade`, so every build picks up current security patches.

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
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | | Cloudflare Turnstile on the register form (both empty = no captcha) |

Reverse proxy and DNS: uploads stream through the app, so anything in front must allow bodies of `MAX_FILE_MB` and long requests. If the domain is on Cloudflare, keep the record **DNS only** (grey cloud): the Cloudflare proxy caps request bodies at 100 MB. The `cpxo` CLI and the desktop apps send files above 100 MB straight to MinIO with a presigned URL.

## Build the desktop app

```bash
cd desktop
npm install
npm run dist:win   # dist/cpxo-setup-<version>.exe              (on Windows)
npm run dist:mac   # dist/cpxo-<version>-mac-{arm64,x64}.dmg    (on a Mac)
```

Pushing a tag like `v0.3.0` builds both on GitHub Actions and attaches them to a release.

## iOS Shortcuts

`shortcuts/build.py` generates the two Shortcuts as `.shortcut` files. iOS only installs signed files and Apple's `shortcuts sign` needs a Mac signed into iCloud, so signing is a manual step; see [shortcuts/README.md](shortcuts/README.md). The signed files live in `web/public/s/` and the docs page shows the install buttons as soon as they exist.

## License

MIT
