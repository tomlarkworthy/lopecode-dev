#!/bin/sh
# every batch through freeze-attack3's run.ts (verdictOf rules on, runCells): shipped -> out-a.txt, SS_MEASURE_REG=0 -> out-b.txt
cd "$(dirname "$0")"
B="c0.ts n1.ts n2.ts n3.ts n4.ts n5.ts n6.ts n7.ts n8.ts"
bun ../freeze-attack3/run.ts $B > out-a.txt 2>&1
SS_MEASURE_REG=0 bun ../freeze-attack3/run.ts $B > out-b.txt 2>&1
for f in out-a.txt out-b.txt; do echo "## $f"; grep -E "^--" $f; grep -c "^SILENT" $f; done
