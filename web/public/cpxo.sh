#!/bin/sh
# cpxo - clipboard and file drop from the shell. https://cpxo.dev
# install: curl -fsSL https://cpxo.dev/cli -o /usr/local/bin/cpxo && chmod +x /usr/local/bin/cpxo
set -eu

CPXO_URL="${CPXO_URL:-https://cpxo.dev}"
CONF_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/cpxo"
TOKEN_FILE="$CONF_DIR/token"
# 100 MB: above this we upload straight to storage with a presigned URL
DIRECT_LIMIT=104857600

usage() {
  cat <<EOF
cpxo - copy here, paste anywhere.

  cpxo login [TOKEN]      save your API token (from $CPXO_URL/dashboard)
  cpxo up FILE [FILE...]  upload, print the share link (max 4 GB, kept 7 days)
  cpxo get CODE_OR_URL    download a shared file into the current directory
  cpxo copy [TEXT]        push text (or stdin) to your clipboard
  cpxo paste              print the latest clipboard entry
  cpxo ls                 list your files
  cpxo rm ID              delete a file
  cpxo whoami             check the token

Env: CPXO_TOKEN overrides the saved token, CPXO_URL overrides the server.
EOF
}

need() { command -v "$1" >/dev/null 2>&1 || { echo "cpxo: '$1' is required" >&2; exit 1; }; }
need curl

token() {
  if [ -n "${CPXO_TOKEN:-}" ]; then printf '%s' "$CPXO_TOKEN"; return; fi
  if [ -f "$TOKEN_FILE" ]; then cat "$TOKEN_FILE"; return; fi
  echo "cpxo: not logged in. Run: cpxo login cpx_yourtoken" >&2
  exit 1
}

auth() { printf 'Authorization: Bearer %s' "$(token)"; }

json_field() { # json_field KEY  (reads stdin; good enough for our flat responses)
  sed -n "s/.*\"$1\":\"\{0,1\}\([^\",}]*\)\"\{0,1\}.*/\1/p" | head -n1
}

file_size() {
  if stat -c %s "$1" >/dev/null 2>&1; then stat -c %s "$1"; else stat -f %z "$1"; fi
}

cmd_login() {
  mkdir -p "$CONF_DIR"
  t="${1:-}"
  if [ -z "$t" ]; then
    printf 'Paste your token (cpx_...): '
    read -r t
  fi
  case "$t" in cpx_*) ;; *) echo "cpxo: that does not look like a cpxo token" >&2; exit 1;; esac
  printf '%s' "$t" > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
  CPXO_TOKEN="$t" cmd_whoami
}

cmd_whoami() {
  resp=$(curl -fsS -H "$(auth)" "$CPXO_URL/api/me") || { echo "cpxo: token rejected" >&2; exit 1; }
  echo "signed in as $(printf '%s' "$resp" | json_field email)"
}

upload_one() {
  f="$1"
  [ -f "$f" ] || { echo "cpxo: no such file: $f" >&2; return 1; }
  name=$(basename "$f")
  size=$(file_size "$f")
  if [ "$size" -gt 4294967296 ]; then echo "cpxo: $name is larger than 4 GB" >&2; return 1; fi
  if [ "$size" -le "$DIRECT_LIMIT" ]; then
    curl -fsS --progress-bar -T "$f" -H "$(auth)" -H "X-File-Name: $name" -H "Accept: text/plain" "$CPXO_URL/up"
  else
    meta=$(curl -fsS -H "$(auth)" -H 'Content-Type: application/json' \
      -d "{\"name\":\"$name\",\"size\":$size}" "$CPXO_URL/api/files/presign")
    put=$(printf '%s' "$meta" | json_field uploadUrl | sed 's/\\u0026/\&/g; s#\\/#/#g')
    code=$(printf '%s' "$meta" | json_field code)
    ct=$(printf '%s' "$meta" | json_field contentType)
    curl -fS --progress-bar -T "$f" -H "Content-Type: $ct" "$put" -o /dev/null
    curl -fsS -H "$(auth)" -H 'Content-Type: application/json' -H "Accept: text/plain" \
      -d "{\"code\":\"$code\"}" "$CPXO_URL/api/files/complete"
  fi
}

cmd_up() {
  [ $# -gt 0 ] || { echo "cpxo: usage: cpxo up FILE" >&2; exit 1; }
  rc=0
  for f in "$@"; do upload_one "$f" || rc=1; done
  exit $rc
}

cmd_get() {
  [ $# -eq 1 ] || { echo "cpxo: usage: cpxo get CODE_OR_URL" >&2; exit 1; }
  case "$1" in
    http://*|https://*) url="$1" ;;
    *) url="$CPXO_URL/f/$1" ;;
  esac
  curl -fL --progress-bar -O -J "$url"
}

cmd_copy() {
  if [ $# -gt 0 ]; then text="$*"; else text=$(cat); fi
  [ -n "$text" ] || { echo "cpxo: nothing to copy" >&2; exit 1; }
  printf '%s' "$text" | curl -fsS -H "$(auth)" -H 'Content-Type: text/plain; charset=utf-8' -H 'X-Source: cli' \
    --data-binary @- "$CPXO_URL/api/clip" >/dev/null
  echo "copied ($(printf '%s' "$text" | wc -c | tr -d ' ') bytes)"
}

cmd_paste() {
  curl -fsS -H "$(auth)" "$CPXO_URL/api/clip"
}

cmd_ls() {
  curl -fsS -H "$(auth)" "$CPXO_URL/api/files" \
    | tr '{' '\n' | sed -n 's/.*"id":\([0-9]*\).*"name":"\([^"]*\)".*"size":\([0-9]*\).*"url":"\([^"]*\)".*/\1\t\3\t\2\t\4/p'
}

cmd_rm() {
  [ $# -eq 1 ] || { echo "cpxo: usage: cpxo rm ID" >&2; exit 1; }
  curl -fsS -X DELETE -H "$(auth)" "$CPXO_URL/api/files/$1" >/dev/null && echo "deleted"
}

cmd="${1:-}"; [ $# -gt 0 ] && shift
case "$cmd" in
  login) cmd_login "$@" ;;
  up|upload|put) cmd_up "$@" ;;
  get|dl|down) cmd_get "$@" ;;
  copy|cp) cmd_copy "$@" ;;
  paste) cmd_paste ;;
  ls|list) cmd_ls ;;
  rm|del) cmd_rm "$@" ;;
  whoami|me) cmd_whoami ;;
  ""|-h|--help|help) usage ;;
  *) echo "cpxo: unknown command '$cmd'" >&2; usage; exit 1 ;;
esac
