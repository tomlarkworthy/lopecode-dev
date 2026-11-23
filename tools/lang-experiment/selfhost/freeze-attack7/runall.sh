#!/bin/sh
# freeze-attack7: every set through lite/infer/attack/drive-run.ts in both modes (A shipped -> <set>-a.txt,
# B SS_MEASURE_REG=0 -> <set>-b.txt), then the check-only probes and the tally (tally.txt)
cd "$(dirname "$0")"
date
for s in b1 b2 b4 b5 b6 b7 b8; do
  bun ../../lite/infer/attack/drive-run.ts $s.ts > $s-a.txt 2>&1
  SS_MEASURE_REG=0 bun ../../lite/infer/attack/drive-run.ts $s.ts > $s-b.txt 2>&1
done
for m in 1 0; do SS_MEASURE_REG=$m bun ../../lite/infer/attack/drive-run.ts o3.ts; done > o3-run.txt 2>&1
for q in q0 q1 q2 o1 o2; do echo "## $q"; bun ../freeze-attack4/probe.ts $q.ts; done > probe-checker.txt 2>&1
bun dump.ts b6.ts b6-dupkey-st > dump-b6-dupkey-st.txt 2>&1
bun dump.ts b6.ts b6-spread-rec-st > dump-b6-spread-rec-st.txt 2>&1
bun tally.ts > tally.txt
cat tally.txt
date
