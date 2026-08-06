#!/bin/bash
# Build a Binaryen pruned to what AssemblyScript's asc can actually reach.
#
#   ./build.sh [version] [stage]     # default: 131, stage 3
#
# Needs docker only (emscripten/emsdk). Everything else — source download, prune,
# build, verification — happens here. Artifacts land in ./dist.
set -e
cd "$(dirname "$0")"
VERSION=${1:-131}
STAGE=${2:-3}
WORK=$(pwd)/.work
TAR="$WORK/binaryen-$VERSION.tar.gz"

mkdir -p "$WORK" dist
[ -f "$TAR" ] || curl -sL -o "$TAR" \
  "https://codeload.github.com/WebAssembly/binaryen/tar.gz/refs/tags/version_$VERSION"

rm -rf "$WORK/src"
mkdir -p "$WORK/src"
tar xzf "$TAR" -C "$WORK/src"
mv "$WORK/src/binaryen-version_$VERSION" "$WORK/src/binaryen"

echo "== pruning (stage $STAGE) =="
python3 prune.py "$WORK/src/binaryen" "$STAGE"

echo "== building =="
# Same flags as AssemblyScript/binaryen.js CI, minus -sSINGLE_FILE (we want the
# .wasm as a real file, not escaped into a JS string literal) and with
# BUILD_TOOLS=OFF (the nine CLI binaries are not part of binaryen_js).
docker volume create binaryen-slim-emcache >/dev/null
docker run --rm \
  -v "$WORK/src:/src" \
  -v binaryen-slim-emcache:/emsdk/upstream/emscripten/cache \
  -w /src/binaryen emscripten/emsdk:latest bash -lc '
    set -e
    mkdir -p build && cd build
    emcmake cmake .. -G "Unix Makefiles" -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_EXE_LINKER_FLAGS="-sMAXIMUM_MEMORY=4294967296" \
      -DENABLE_WERROR=OFF -DBUILD_TOOLS=OFF -DBUILD_STATIC_LIB=OFF \
      -DBUILD_TESTS=OFF -DBUILD_FUZZTEST=OFF > cmake.log 2>&1
    make -j$(nproc) binaryen_js
  '

cp "$WORK/src/binaryen/build/bin/binaryen_js.js"   "dist/binaryen-slim-$VERSION.js"
cp "$WORK/src/binaryen/build/bin/binaryen_js.wasm" "dist/binaryen-slim-$VERSION.wasm"

echo "== self-optimizing the binary (-Oz, using stock binaryen) =="
node oz.mjs "dist/binaryen-slim-$VERSION.wasm" "dist/binaryen-slim-$VERSION.wasm" || \
  echo "  (skipped: needs a stock binaryen in node_modules)"

gzip -9 -c "dist/binaryen-slim-$VERSION.js"   > "dist/binaryen-slim-$VERSION.js.gz"
gzip -9 -c "dist/binaryen-slim-$VERSION.wasm" > "dist/binaryen-slim-$VERSION.wasm.gz"
ls -l dist/

echo
echo "== verify: compile detectrow.as.ts and diff against the shipped binary =="
echo "   node verify.mjs dist"
echo "== verify: differential test against a stock build =="
echo "   node diffone.mjs <stock-dir> > a.json && node diffone.mjs dist > b.json && diff a.json b.json"
