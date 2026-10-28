# cpxo.dev API

Base URL: `https://cpxo.dev` (local dev: `http://localhost:3000`).

## Authentication

Every API call is authenticated with a personal token created on the dashboard. Tokens look like `cpx_` followed by 40 base62 chars.

Accepted forms (any one):

- `Authorization: Bearer <token>` header
- `?t=<token>` query parameter (for iOS Shortcuts and one-liners)
- `/up/<token>/` path form for uploads (the trailing slash makes `curl -T` append the file name)

Error responses are JSON: `{ "error": "message" }` with 401 / 400 / 413 / 404.

## Clipboard

### `POST /api/clip`
Push a clipboard entry.

- Body: raw `text/plain`, or JSON `{ "text": "...", "source": "ios" | "windows" | "mac" | "cli" }`
- Optional header `X-Source: ios|windows|mac|cli` when the body is plain text.
- Max 512 KB.
- Response `201`: `{ "id": 123, "createdAt": "ISO", "source": "ios" }`

### `GET /api/clip`
Latest clipboard entry.

- Query `since=<id>`: respond `204 No Content` when there is no entry newer than `<id>`.
- Query `format=json`: respond with JSON `{ "id", "text", "source", "createdAt" }`.
- Default response: `200` with `text/plain; charset=utf-8` body = the text. Headers `X-Clip-Id`, `X-Clip-Source`, `X-Clip-At`.
- `204` when the user has no clips yet.

### `POST /api/drop`
One endpoint for the iOS Shortcut. The request body decides what happens:

- `text/*`, JSON `{ text }` or form `text=`: stored as a clipboard entry; response is the text.
- anything else (`image/jpeg`, `video/quicktime`, `application/pdf`, ...): uploaded like `/up`, the share link is stored as a clipboard entry, response is the link. File name from `X-File-Name` / `?name=` or generated (`photo-20261026-143000.jpg`).
- `application/octet-stream`: sniffed; small valid UTF-8 is treated as text.

Response is `text/plain` (200 for text, 201 for uploads). `X-Source` header as for `/api/clip`.

### `GET /api/clip/history`
Clipboard history, newest first. Up to `MAX_CLIPS` entries (default 10000) are kept per account.

Query: `limit` (1..100, default 30), `source` (`ios,windows,mac,cli,web`, comma-separated), `q` (text search), `before` (cursor: id), `after` (only newer than id).

Response: `{ "items": [{ id, text, source, createdAt }], "nextCursor": 123 | null, "total": 4211 }` (text truncated to 2000 chars).

### `DELETE /api/clip/history`
Deletes the history; accepts the same `source` and `q` filters. `{ ok: true, deleted: n }`.

### `DELETE /api/clip/:id`
Delete one entry. `200 { ok: true }`.

## Files

Files live in MinIO and are deleted 7 days after upload (DB cleanup job + bucket lifecycle rule).

### `PUT /up` or `PUT /up/<token>` (raw stream)
Upload the request body as a file. Use with `curl -T`.

- Filename: `X-File-Name` header, or `?name=`, or the last path segment when using `/up/<token>/<name>`. Falls back to `upload.bin`.
- `Content-Type` is stored as the file's mime type.
- Max size is `MAX_FILE_MB` (default 4096 MB = 4 GB); over the limit returns `413`.
- Response `201`:

```json
{ "code": "k3v9xq2a", "name": "file.zip", "size": 1234, "url": "https://cpxo.dev/f/k3v9xq2a/file.zip", "expiresAt": "ISO" }
```

- Plain-text response when `Accept: text/plain` or `?plain=1`: just the URL on one line.

### `POST /up` (multipart)
Same as above, `multipart/form-data` with a `file` field. Works with `curl -F file=@x.zip`.

### `GET /f/<code>` and `GET /f/<code>/<name>`
Public download. Responds `302` to a short-lived presigned MinIO URL with `Content-Disposition: attachment`. Counts a download. `404` JSON when missing or expired.

Shell usage:

```bash
curl -JLO https://cpxo.dev/f/k3v9xq2a
wget --content-disposition https://cpxo.dev/f/k3v9xq2a
```

### `GET /api/files`
JSON array of the user's files: `{ id, code, name, size, mime, url, downloads, createdAt, expiresAt }`.

### `DELETE /api/files/:id`
Delete now. `200 { ok: true }`.

### `POST /api/files/presign`
For big uploads straight to MinIO, bypassing the app server.
Body JSON `{ "name": "file.zip", "size": 123, "mime": "application/zip" }`.
Response `{ "uploadUrl": "<presigned PUT>", "code", "url", "expiresAt" }`. The client PUTs the bytes to `uploadUrl`, then calls `POST /api/files/complete` with `{ "code" }`.

## Account

### `GET /api/me`
`{ "email": "..." }`. Used by clients to validate a token.

## CLI script

`GET /cli` serves a POSIX shell script. Usage:

```bash
curl -fsSL https://cpxo.dev/cli -o ~/.local/bin/cpxo && chmod +x ~/.local/bin/cpxo
cpxo login              # stores token in ~/.config/cpxo/token
cpxo up file.zip        # prints the share URL
cpxo get k3v9xq2a       # downloads
cpxo copy "text"        # push text to clipboard
cpxo paste              # print the latest clipboard
```

## MCP

`https://cpxo.dev/mcp` is a remote MCP server (Streamable HTTP). Authenticate with `Authorization: Bearer <cpx_ token>`. Tools: `clipboard_latest`, `clipboard_history`, `clipboard_push`, `files_list`, `file_upload` (inline content, 25 MB), `file_delete`. See `/docs/mcp` for client configs.
