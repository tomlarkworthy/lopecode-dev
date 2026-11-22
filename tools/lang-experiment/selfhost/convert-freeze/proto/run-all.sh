#!/bin/zsh
# convert-freeze prototype: M1 over run-sets (10 sets), freeze-attack3 (360) and the paper probes, per mode.
# Modes set env switches read by tree/lite/proto-flags.ts. Output in out/<mode>-{m1,fa3,paper}.txt; summary at the end.
cd "$(dirname "$0")"
HYP="SS_BOUNDARY=0 SS_REG=0 SS_CONVERT=1 SS_HYP=1"
typeset -A MODES
MODES=(
  main   "SS_BOUNDARY=1 SS_REG=1 SS_CONVERT=0 SS_HYP=0"
  ctl    "SS_BOUNDARY=0 SS_REG=0 SS_CONVERT=0 SS_HYP=1"
  r17    "$HYP"
  r17+H  "$HYP SS_H=1"
  r17+V  "$HYP SS_V=1"
  r17+R3X "$HYP SS_R3X=1"
  r17+B  "$HYP SS_B=1"
  r17+U  "$HYP SS_U=1"
  r17+F  "$HYP SS_F=1"
  all    "$HYP SS_H=1 SS_V=1 SS_R3X=1 SS_B=1 SS_U=1 SS_F=1"
  all+T  "$HYP SS_H=1 SS_V=1 SS_R3X=1 SS_B=1 SS_U=1 SS_F=1 SS_T=1"
  all+TN "$HYP SS_H=1 SS_V=1 SS_R3X=1 SS_B=1 SS_U=1 SS_F=1 SS_T=1 SS_N=1"
  noB    "$HYP SS_H=1 SS_V=1 SS_R3X=1 SS_U=1 SS_F=1 SS_T=1 SS_N=1"
)
FA3="c0.ts b1.ts b2.ts b3.ts b4.ts b5.ts b6.ts b7.ts b8.ts b9.ts b10.ts b11.ts"
mkdir -p out
for m in ${(k)MODES}; do
  ( env ${=MODES[$m]} bun tree/lite/infer/attack/run-sets.ts > out/$m-m1.txt 2>&1
    (cd tree/selfhost/freeze-attack3 && env ${=MODES[$m]} bun run.ts ${=FA3} > ../../../out/$m-fa3.txt 2>&1)
    env ${=MODES[$m]} bun paper.ts > out/$m-paper.txt 2>&1 ) &
done
wait
for m in main ctl r17 r17+H r17+V r17+R3X r17+B r17+U r17+F all all+T all+TN noB; do
  echo "== $m: $(grep -h '^-- all' out/$m-m1.txt) | fa3 $(grep -h '^-- [0-9]* candidates' out/$m-fa3.txt) $(grep -h 'controls' out/$m-fa3.txt) | $(grep -h '^-- paper' out/$m-paper.txt)"
done
echo "proto probes (C): $(env ${=MODES[noB]} bun tree/lite/infer/attack/run-sets.ts --sets proto 2>&1 | grep '^-- proto\|^SILENT' | tr '\n' ' ')"
[ "$1" = "--m2" ] || exit 0
# M2/M3 (minutes): static verdicts and sites on the shipped sections, converted checker run, examples, timings
R="SS_H=1 SS_V=1 SS_R3X=1 SS_U=1 SS_F=1 SS_T=1 SS_N=1"
env SS_HYP=0 bun m2-static.ts > out/m2-main.json; env ${=HYP} bun m2-static.ts > out/m2-r17.json; env ${=HYP} ${=R} bun m2-static.ts > out/m2-allN.json
bun m2-diff.ts out/m2-r17.json out/m2-allN.json; bun m2-sites.ts out/m2-allN.json
./m2-runtime.sh "$R"
SS_BOUNDARY=1 SS_REG=1 bun m2-selfcheck.ts tree > out/self-tree.jsonl; SS_BOUNDARY=0 SS_REG=0 bun m2-selfcheck.ts treeconv > out/self-conv.jsonl
echo "converted checker on shipped sections, verdicts differing: $(diff out/self-tree.jsonl out/self-conv.jsonl | grep -c '^>')"
SS_BOUNDARY=1 SS_REG=1 SS_HYP=0 bun m2-examples.ts | tail -1; env ${=HYP} ${=R} bun m2-examples.ts | tail -1; env ${=HYP} ${=R} SS_B=1 bun m2-examples.ts | tail -1
SS_BOUNDARY=1 SS_REG=1 bun m3-checker.ts tree; SS_BOUNDARY=0 SS_REG=0 bun m3-checker.ts treeconv; bun m3-bench.ts
