#!/usr/bin/env bash
# A private copy of the robocoop-5 notebook for one training worker. Changes land in the copy only;
# the canonical in lopebooks is never written. Run from the repo root.
#   rc5-sandbox.sh new    DIR                 copy the canonical to DIR/notebook.html
#   rc5-sandbox.sh get    DIR @user/module    extract a module to DIR/<module>.js for editing
#   rc5-sandbox.sh put    DIR @user/module    push DIR/<module>.js back into DIR/notebook.html
#   rc5-sandbox.sh wiki   DIR NAME.md         ship DIR/knowledge/NAME.md into the copy's wiki
set -euo pipefail
cmd=${1:?cmd}; dir=${2:?dir}
nb="$dir/notebook.html"
canon=lopebooks/notebooks/@tomlarkworthy_robocoop-5.html
case "$cmd" in
  new)
    mkdir -p "$dir/knowledge"
    cp "$canon" "$nb"
    echo "$nb" ;;
  get)
    m=${3:?module}; f="$dir/$(basename "$m").js"
    bun tools/lope-reader.ts "$nb" --get-module "$m" > "$f"
    echo "$f" ;;
  put)
    m=${3:?module}; f="$dir/$(basename "$m").js"
    # --force: the source is a scratch copy by design, and the only target is the scratch notebook
    bun tools/channel/sync-module.ts --force --module "$m" --source "$f" --target "$nb" 2>&1 | grep -v "^WARNING\|^  " ;;
  wiki)
    doc=${3:?NAME.md}
    bun tools/sync-wiki.ts --write --knowledge "$dir/knowledge" --doc "$doc" --notebook "$nb" | tail -1 ;;
  *) echo "unknown command $cmd" >&2; exit 2 ;;
esac
