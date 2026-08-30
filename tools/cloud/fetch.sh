#!/bin/zsh
# Download one GCS object with a read-only token. Bun.write stalls on a large
# response body in this sandbox; curl streams to disk and does not.
set -e
BUCKET=$1; NAME=$2; OUT=$3
T=$(bun "$(dirname $0)/tok.ts")
curl -sS -o "$OUT" -w "$OUT  %{http_code}  %{size_download} bytes  %{time_total}s\n" \
  -H "Authorization: Bearer $T" \
  "https://storage.googleapis.com/storage/v1/b/$BUCKET/o/$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$NAME")?alt=media"
