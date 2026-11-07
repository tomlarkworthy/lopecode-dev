#!/bin/sh
# builds link.wasm and arm.wasm. Uses $CC (default clang; it needs a wasm32 target, which Apple's clang lacks),
# or clang-in-wasm via tools/firmware-toolchain/cc.mjs when that exists and CC is unset.
set -e
D=$(cd "$(dirname "$0")" && pwd); T="$D/../../../tools/firmware-toolchain/cc.mjs"
FLAGS="--target=wasm32 -Os -nostdlib -ffreestanding -Wall -Wextra -Werror -Wl,--no-entry -Wl,--strip-all -Wl,--export-dynamic -Wl,--allow-undefined"
cc() { out=$1; shift
  if [ -z "$CC" ] && [ -f "$T" ]; then node "$T" "$out" "$@" > "$D/.build.log" 2>&1 || { grep -v fetched "$D/.build.log"; exit 1; }
  else ${CC:-clang} $FLAGS -I"$D" -o "$out" "$@"; fi; }
cc "$D/link.wasm" "$D/link.c" "$D/proto.c"
cc "$D/arm.wasm" "$D/arm.c" "$D/proto.c" "$D/kin.c"
rm -f "$D/.build.log"
for f in link arm; do base64 -i "$D/$f.wasm" | tr -d '\n' > "$D/$f.wasm.b64"; done
shasum -a 256 "$D/link.wasm" "$D/arm.wasm"
