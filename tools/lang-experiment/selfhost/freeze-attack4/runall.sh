#!/bin/sh
# every batch through freeze-attack3's run.ts (verdictOf rules on, runCells), shipped mode and SS_MEASURE_REG=0
cd "$(dirname "$0")"
B="c0.ts b1.ts b2.ts b3.ts b4.ts b5.ts erg.ts"
bun ../freeze-attack3/run.ts $B > out-a.txt 2>&1
SS_MEASURE_REG=0 bun ../freeze-attack3/run.ts $B > out-b.txt 2>&1
for f in out-a.txt out-b.txt; do echo "## $f"; grep -E "^--|^SILENT|CONTROL" $f; done
