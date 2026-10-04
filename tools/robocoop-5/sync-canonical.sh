#!/bin/sh
# Push the robocoop-5 working copies that differ into the canonical notebook.
cd "$(dirname "$0")/../.." || exit 1
NB=lopebooks/notebooks/@tomlarkworthy_robocoop-5.html
bun tools/lope-sync.ts status 2>&1 | grep -E "modified +@tomlarkworthy/robocoop-5" | awk '{print $2}' | while read -r m; do
  bun tools/channel/sync-module.ts --module "$m" --source "modules/$m.js" --target "$NB" 2>&1 | grep -E "rebased|refus|rror" | cut -c1-160
done
bun tools/lope-sync.ts status 2>&1 | grep robocoop-5 | grep -v clean
# ratchet-code.html: the canonical plus the spec-lock plugin, from its working copy when there is one
SRC=modules/@tomlarkworthy/robocoop-5-spec-lock.js
if [ -f "$SRC" ]; then node tools/robocoop-5/build-ratchet-code.mjs --source "$SRC" > /dev/null; else node tools/robocoop-5/build-ratchet-code.mjs > /dev/null; fi
exit 0
