#!/bin/sh
# freeze-attack8: every set through run.ts (checker verdict + run with the checker on when accepted + run with the
# checker skipped) in each mode. Mode files: <set>-a.txt shipped; -b SS_MEASURE_REG=0 (registration off);
# -c SS_MEASURE_BODYFN=0 (S4.12's throw off, measurement only); -d both off. Then tally.ts -> tally.txt.
cd "$(dirname "$0")"
date
for s in r1 r2 s1 s56 t1; do
  bun run.ts $s.ts > $s-a.txt 2>&1 &
  SS_MEASURE_REG=0 bun run.ts $s.ts > $s-b.txt 2>&1 &
  wait
done
for s in r3; do
  bun run.ts $s.ts > $s-a.txt 2>&1 &
  SS_MEASURE_REG=0 bun run.ts $s.ts > $s-b.txt 2>&1 &
  wait
done
for s in r2 s1 r3; do
  SS_MEASURE_BODYFN=0 bun run.ts $s.ts > $s-c.txt 2>&1 &
  SS_MEASURE_BODYFN=0 SS_MEASURE_REG=0 bun run.ts $s.ts > $s-d.txt 2>&1 &
  wait
done
for p in p0 p1 p2 p3 p4 p5 p6 s1probe t1probe; do echo "## $p"; bun ../freeze-attack4/probe.ts $p.ts; done > probe-checker.txt 2>&1
for n in r1-D-fn-decl-in-switch-case r1-D-method-bigint-key r1-D-method-computed r1-D-getter r1-D-class-method r1-D-bind r1-D-transitive-weakmap r1-D-this-capture r1-D-arguments-capture; do echo "#### $n"; bun dumpsrc.ts r1.ts $n; done > dump-r1-gaps.txt 2>&1
for n in r2-D-I-arrow r2-D-I-method r2-D-I-fn-decl r2-D-SH-const r2-D-SH-methods r2-A-I-arrow r2-CR-catch r2-CR-fn-decl-hoist; do echo "#### $n"; bun dumpsrc.ts r2.ts $n; done > dump-r2-gaps.txt 2>&1
bun twin.ts > twin.txt 2>&1
for n in $(grep -A1 '^## r1 shipped chk-skipped' tally.txt 2>/dev/null | tail -1); do echo "#### $n"; bun dumpsrc.ts r1.ts $n; done > dump-r1-silent.txt 2>&1
bun tally.ts > tally.txt
cat tally.txt
date
