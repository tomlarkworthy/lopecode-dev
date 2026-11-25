#!/bin/sh
# run one freeze-attack14 file under both runners and the probe; print the totals and compare the silent sets
cd "$(dirname "$0")/../.." || exit 1
for f in "$@"; do
  d=selfhost/freeze-attack14
  bun lite/infer/attack/drive-rt.ts $d/$f.ts > $d/$f-rt-out.txt 2>&1
  bun lite/infer/attack/drive-run.ts $d/$f.ts > $d/$f-dr-out.txt 2>&1
  bun selfhost/freeze-attack4/probe.ts $d/$f.ts > $d/$f-probe-out.txt 2>&1
  echo "== $f"; grep -E "^-- (controls|[0-9])" $d/$f-rt-out.txt $d/$f-dr-out.txt | sed "s#$d/##"
  if diff <(grep ^SILENT $d/$f-rt-out.txt) <(grep ^SILENT $d/$f-dr-out.txt | sed 's/ (tap only)//') >/dev/null; then echo "silent sets agree"; else echo "SILENT SETS DIFFER"; fi
done
