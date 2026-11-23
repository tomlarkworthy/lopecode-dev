#!/bin/sh
# every set through run.ts (freeze-attack3's runCand; silent = a CHANGED line or a drive line with DIFF):
# shipped -> out-a.txt, SS_MEASURE_REG=0 -> out-b.txt; then the check-only probes
cd "$(dirname "$0")"
B="c0.ts m0.ts a1.ts a2.ts a3.ts a4.ts a5.ts a6.ts a7.ts"
date
bun run.ts $B > out-a.txt 2>&1 &
SS_MEASURE_REG=0 bun run.ts $B > out-b.txt 2>&1
wait
bun fprobe.ts f1.ts > probe-foreign.txt 2>&1
for q in q1 q2 q3 q4 q5 q6 q8 q9; do echo "## $q"; bun ../freeze-attack4/probe.ts $q.ts; done > probe-checker.txt 2>&1
for f in out-a.txt out-b.txt; do echo "## $f"; grep -E "^--" $f; done
date
# the same sets through freeze-attack3's own run.ts (CHANGED lines only; it cannot see P, see RESULTS.md)
bun ../freeze-attack3/run.ts c0.ts m0.ts a1.ts a2.ts a3.ts a4.ts a5.ts a6.ts a7.ts > fa3run-a.txt 2>&1
SS_MEASURE_REG=0 bun ../freeze-attack3/run.ts c0.ts m0.ts a1.ts a2.ts a3.ts a4.ts a5.ts a6.ts a7.ts > fa3run-b.txt 2>&1
bun ../freeze-attack4/probe.ts q11.ts >> probe-checker.txt 2>&1
for f in fa3run-a.txt fa3run-b.txt; do echo "## $f"; grep -E "^--" $f; done
date
