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

echo "== 1/6 seeding from $BASE =="
# modules/**/*.js is gitignored — the notebook is the source of truth, the .js a working
# copy. Recover it from the declared canonical if this is a fresh clone.
if [[ ! -f modules/@tomlarkworthy/tarot.js ]]; then
  bun tools/lope-sync.ts checkout @tomlarkworthy/tarot
fi
cp "$BASE" "$WORK"

echo "== 2/6 injecting module + 80 attachments =="
node --check modules/@tomlarkworthy/tarot.js
node tools/tarot-inject.mjs "$WORK"

echo "== 3/6 refreshing exporter-3 to canonical =="
# quick_start carries exporter-3 10d706c73268, which emits userBlocks BEFORE bootconf and
# the bootloader. `main` is at the top of the document and immediately awaits
# importShim("@tomlarkworthy/bootloader"), so boot cannot start until ~99% of the bytes have
# arrived — measured at 2 MB/s: every module block was in by 1.8s, the runtime was not
# constructed until 3.07s. Canonical (3ccacbe45314) already emits boot first. Step 4 runs
# the exporter that is IN this file, so it has to be refreshed before the export, not after.
bun tools/lope-sync.ts checkout @tomlarkworthy/exporter-3 --repo lopecode
bun tools/channel/sync-module.ts --module @tomlarkworthy/exporter-3 \
  --source modules/@tomlarkworthy/exporter-3.js --target "$WORK"

echo "== 4/6 re-exporting through exporter-3 =="
mkdir -p scratch
bun scratch/rmbt/save-in-place.ts --in "$WORK" --out "$TMP" --hash "$HASH" --settle 40000
cp "$TMP" "$WORK"

echo "== 5/6 moving the deck to the tail =="
# exporter-3 puts mains ahead of everything else regardless of size, and the deck has to be
# a main. See the header of tarot-tail-deck.mjs — worth 1.0s on the mount.
node tools/tarot-tail-deck.mjs "$WORK"

echo "== 6/6 patching head metadata =="
node tools/tarot-patch-head.mjs "$WORK"

ls -l "$WORK" | awk '{printf "\nbuilt %s  %.2f MB\n", $9, $5/1048576}'
