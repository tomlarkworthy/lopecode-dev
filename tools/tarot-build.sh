#!/bin/bash
# Build thetarot.online from scratch: base notebook -> inject module+deck -> re-export
# through exporter-3 (prerender, cell-map) -> patch head metadata.
#
#   bash tools/tarot-build.sh [--assets]     # --assets also re-encodes the deck
set -euo pipefail
cd "$(dirname "$0")/.."

BASE=lopecode/notebooks/quick_start.html
WORK=lopebooks/notebooks/@tomlarkworthy_tarot.html
TMP=scratch/tarot-sip.html
HASH='#view=S100(@tomlarkworthy/tarot)'

if [[ "${1:-}" == "--assets" ]]; then
  echo "== re-encoding deck =="
  node tools/tarot-build-assets.mjs
  node tools/tarot-verify-assets.mjs
  node tools/tarot-og-image.mjs
fi

echo "== 1/4 seeding from $BASE =="
# modules/**/*.js is gitignored — the notebook is the source of truth, the .js a working
# copy. Recover it from the declared canonical if this is a fresh clone.
if [[ ! -f modules/@tomlarkworthy/tarot.js ]]; then
  bun tools/lope-sync.ts checkout @tomlarkworthy/tarot
fi
cp "$BASE" "$WORK"

echo "== 2/4 injecting module + 81 attachments =="
node --check modules/@tomlarkworthy/tarot.js
node tools/tarot-inject.mjs "$WORK"

echo "== 3/4 re-exporting through exporter-3 =="
mkdir -p scratch
bun scratch/rmbt/save-in-place.ts --in "$WORK" --out "$TMP" --hash "$HASH" --settle 40000
cp "$TMP" "$WORK"

echo "== 4/4 patching head metadata =="
node tools/tarot-patch-head.mjs "$WORK"

ls -l "$WORK" | awk '{printf "\nbuilt %s  %.2f MB\n", $9, $5/1048576}'
