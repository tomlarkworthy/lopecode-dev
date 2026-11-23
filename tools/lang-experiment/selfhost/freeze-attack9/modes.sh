#!/bin/bash
# bash selfhost/freeze-attack9/modes.sh <set.ts> <out>: run9 over the set in the four modes (shipped, BODYFN=0, REG=0, both)
f=$1; out=$2; : > "$out"
for m in "" "SS_MEASURE_BODYFN=0" "SS_MEASURE_REG=0" "SS_MEASURE_BODYFN=0 SS_MEASURE_REG=0"; do
  echo "##### mode: [$m]" >> "$out"
  env $m bun selfhost/freeze-attack9/run9.ts "$f" 2>&1 | grep -v "CHANGED" >> "$out"
done
grep "^#####\|^-- \|^SILENT" "$out"
