#!/usr/bin/env bash
# Runs every story case against the running service.
# Starts it with docker compose when nothing answers on BASE_URL, and stops it again at the end.
# It uses the service's own settings: the shell, then .env, then the defaults (mock).
# Prints each request and response, so the shapes can be read.
# Usage: scripts/e2e.sh     BASE_URL defaults to http://localhost:3000
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi
set -euo pipefail

cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-http://localhost:3000}"
URL="$BASE_URL/odometer/reading"

IMG_A=images/33c24909-e9dd-46d3-8e7f-c44fd9896537.jpeg
IMG_B=images/d621e37e-7c0f-49a4-8a19-d628b1e82a33.jpeg
IMG_C=images/dbab9932-823e-49ed-80db-1e898d836d5e.jpeg
IMG_D=images/3ae9d173-8895-409e-844c-77b5841138d7.jpeg
BLANK_JPEG=test/fixtures/blank-wall.jpeg
BLANK_PNG=test/fixtures/blank-wall.png

TMP="$(mktemp -d)"
STARTED=false
PASSED=0
FAILED=0

cleanup() {
  rm -rf "$TMP"
  if $STARTED; then docker compose down >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

is_up() { curl -s -o /dev/null --max-time 2 "$BASE_URL/"; }

if ! is_up; then
  echo "No service at $BASE_URL. Starting it with docker compose..."
  STARTED=true
  if ! docker compose up -d --build >"$TMP/compose.log" 2>&1; then
    cat "$TMP/compose.log"
    exit 1
  fi
  for _ in $(seq 1 60); do
    is_up && break
    [[ -z "$(docker compose ps -q --status running)" ]] && break
    sleep 1
  done
  if ! is_up; then
    echo "Service did not start:"
    docker compose logs --no-log-prefix | tail -5
    exit 1
  fi
fi

provider_source() {
  if [[ -n "${OCR_PROVIDER:-}" ]]; then echo "shell"
  elif [[ -f .env ]] && grep -q '^OCR_PROVIDER=.' .env; then echo ".env"
  else echo "default"; fi
}

provider="$(curl -s -D - -o /dev/null "$BASE_URL/" | tr -d '\r' | grep -i '^x-ocr-provider:' | cut -d' ' -f2)" || true

echo
echo "Mode"
if $STARTED; then
  echo "  service    started by this script with docker compose, stopped at the end"
  echo "  provider   ${provider:-unknown}   (OCR_PROVIDER from $(provider_source))"
else
  echo "  service    already running at $BASE_URL, left running"
  echo "  provider   ${provider:-unknown}   (as that service was started)"
fi

short() {
  local text="$1"
  if ((${#text} > 80)); then text="${text:0:60}…\" (${#1} chars)}"; fi
  printf '%s' "$text"
}

file_label() {
  local spec="${1#@}" file="${1#@}"
  file="${file%%;*}"
  printf '@%s (%s bytes)' "${spec#"$TMP"/}" "$(wc -c < "$file" | tr -d ' ')"
}

# Prints the request the curl args describe: method, path, content type, body.
describe() {
  local method=GET type="" body="" path=""
  while (($#)); do
    case "$1" in
      -F)
        method=POST type="multipart/form-data"
        body="${2%%=*}=$(file_label "${2#*=}")"
        shift 2 ;;
      -H) type="${2#Content-Type: }"; shift 2 ;;
      -d | --data-binary)
        method=POST
        if [[ "$2" != @* ]]; then body="$2"
        elif [[ "$2" == *.json ]]; then body="$(short "$(cat "${2#@}")")"
        else body="<binary $(file_label "$2")>"; fi
        shift 2 ;;
      *) path="${1#"$BASE_URL"}"; shift ;;
    esac
  done
  echo "      > $method $path${type:+  $type}${body:+  $body}"
}

# check <name> <status> <expected body, or a fragment of it> <curl args...>
check() {
  local name="$1" status="$2" expected="$3"
  shift 3
  local got body
  : >"$TMP/body"
  got="$(curl -s -o "$TMP/body" -w '%{http_code}' "$@")" || got="no response (curl exit $?)"
  body="$(cat "$TMP/body")"
  if [[ "$got" == "$status" && "$body" == *"$expected"* ]]; then
    PASSED=$((PASSED + 1))
    echo "ok    $name"
  else
    FAILED=$((FAILED + 1))
    echo "FAIL  $name"
    echo "      expected $status $expected"
  fi
  describe "$@"
  echo "      < $got $body"
}

b64() { base64 < "$1" | tr -d '\n'; }

json_image() { printf '{"image":"%s%s"}' "$2" "$(b64 "$1")" > "$TMP/$3"; }

json_image "$IMG_A" "" a.json
json_image "$IMG_A" "data:image/jpeg;base64," a-prefix.json
printf 'GIF89a0000000000' > "$TMP/photo.jpg"
printf '\xff\xd8\xff0000000000' > "$TMP/broken.jpg"
{ printf '\xff\xd8\xff'; head -c $((12 * 1024 * 1024)) /dev/zero; } > "$TMP/big.jpg"
printf 'not an image' > "$TMP/note.txt"

echo
echo "S1  read an uploaded photo"
check "img-A -> 62690.5 miles high" 200 '{"reading":62690.5,"unit":"miles","confidence":"high"}' -F "image=@$IMG_A" "$URL"
check "img-D -> 161967" 200 '"reading":161967' -F "image=@$IMG_D" "$URL"

echo "S2  Base64 image"
check "img-A as Base64 -> same as S1" 200 '{"reading":62690.5,"unit":"miles","confidence":"high"}' -H 'Content-Type: application/json' -d "@$TMP/a.json" "$URL"
check "img-A with data: prefix -> same as S1" 200 '{"reading":62690.5,"unit":"miles","confidence":"high"}' -H 'Content-Type: application/json' -d "@$TMP/a-prefix.json" "$URL"

echo "S3  ignore other numbers"
check "img-C -> 205265, not a dial mark" 200 '"reading":205265' -F "image=@$IMG_C" "$URL"

echo "S4  report the unit"
check "img-B shows miles -> miles" 200 '"unit":"miles"' -F "image=@$IMG_B" "$URL"
check "img-C, unit only on the dial -> unknown" 200 '"unit":"unknown"' -F "image=@$IMG_C" "$URL"
check "img-D shows none -> unknown" 200 '"unit":"unknown"' -F "image=@$IMG_D" "$URL"

echo "S5  flag an unsure reading"
check "img-B -> 200 low" 200 '"confidence":"low"' -F "image=@$IMG_B" "$URL"

echo "S6  no mileage found"
check "blank wall -> 422" 422 '"error":"UNREADABLE_IMAGE"' -F "image=@$BLANK_JPEG" "$URL"
check "JPEG that does not decode -> 422" 422 '"error":"UNREADABLE_IMAGE"' -F "image=@$TMP/broken.jpg" "$URL"

echo "S7  no image sent"
check "multipart without image -> 400" 400 '"error":"MISSING_IMAGE"' -F "photo=@$IMG_A" "$URL"
check "JSON {} -> 400" 400 '"error":"MISSING_IMAGE"' -H 'Content-Type: application/json' -d '{}' "$URL"

echo "S8  file type"
check "GIF named photo.jpg -> 415" 415 '"error":"UNSUPPORTED_TYPE"' -F "image=@$TMP/photo.jpg;type=image/jpeg" "$URL"
check "text file -> 415" 415 '"error":"UNSUPPORTED_TYPE"' -F "image=@$TMP/note.txt" "$URL"
check "PNG sent as image/jpeg -> not 415" 422 '"error":"UNREADABLE_IMAGE"' -F "image=@$BLANK_PNG;type=image/jpeg" "$URL"

echo "S9  malformed request"
check "image not Base64 -> 400" 400 '"error":"INVALID_REQUEST"' -H 'Content-Type: application/json' -d '{"image": "%%%not-base64"}' "$URL"
check "JSON cut off -> 400" 400 '"error":"INVALID_REQUEST"' -H 'Content-Type: application/json' -d '{"image": ' "$URL"
check "raw JPEG body -> 400" 400 '"error":"INVALID_REQUEST"' -H 'Content-Type: image/jpeg' --data-binary "@$IMG_A" "$URL"

echo "S11 image too large"
check "12 MB upload -> 413" 413 '"error":"IMAGE_TOO_LARGE"' -F "image=@$TMP/big.jpg" "$URL"

echo "D19 every error is JSON"
check "GET /nope -> 404" 404 '"error":"NOT_FOUND"' "$BASE_URL/nope"

if $STARTED; then
  echo "C5  nothing kept"
  logs="$(docker compose logs --no-log-prefix)"
  if [[ "$logs" == *'"msg":"request done"'* && "$logs" != *"62690.5"* ]]; then
    PASSED=$((PASSED + 1))
    echo "ok    log lines hold request facts, never a reading"
  else
    FAILED=$((FAILED + 1))
    echo "FAIL  log lines hold request facts, never a reading"
  fi
fi

echo
echo "$PASSED passed, $FAILED failed"
[[ $FAILED -eq 0 ]]
