#!/bin/zsh
# attack1: controls (checker skipped, freezing off), every program in ctl/noB/B, the ergonomic probes, the N ablation
# of the silent set, and the intrinsic audit. Output in out/.
cd "$(dirname "$0")"
HYP="SS_BOUNDARY=0 SS_REG=0 SS_CONVERT=1 SS_HYP=1"
ALL="SS_H=1 SS_V=1 SS_R3X=1 SS_U=1 SS_F=1 SS_T=1 SS_N=1"
mkdir -p out
env SS_BOUNDARY=0 SS_REG=0 SS_CONVERT=0 SS_HYP=1 bun run.ts --set controls --force > out/controls-ctl.txt 2>&1 &
env ${=HYP} ${=ALL} bun run.ts --set controls > out/controls-noB.txt 2>&1 &
env SS_BOUNDARY=0 SS_REG=0 SS_CONVERT=0 SS_HYP=1 bun run.ts --force > out/progs-ctl.txt 2>&1 &
env ${=HYP} ${=ALL} bun run.ts > out/progs-noB.txt 2>&1 &
env ${=HYP} ${=ALL} SS_B=1 bun run.ts > out/progs-B.txt 2>&1 &
env ${=HYP} ${=ALL} bun run.ts --set ergo > out/ergo-noB.txt 2>&1 &
env ${=HYP} ${=ALL} SS_B=1 bun run.ts --set ergo > out/ergo-B.txt 2>&1 &
env SS_BOUNDARY=1 SS_REG=1 SS_CONVERT=0 SS_HYP=0 bun run.ts --set ergo > out/ergo-main.txt 2>&1 &
env SS_BOUNDARY=1 SS_REG=1 SS_CONVERT=0 SS_HYP=0 bun run.ts > out/progs-main.txt 2>&1 &
bun audit.ts > out/audit.txt 2>&1 &
wait
grep -h "^SILENT" out/progs-noB.txt out/progs-B.txt | sed 's/^SILENT //;s/ \[.*//' | sort -u > out/silent-names.txt
for off in N V F R3X U T H; do env ${=HYP} ${=ALL} SS_$off=0 bun run.ts --list out/silent-names.txt > out/ablate-${off}0-noB.txt 2>&1 & done
wait
for off in N V F R3X U T H; do echo "ablate $off off: $(grep -h '^-- ' out/ablate-${off}0-noB.txt)"; done
for b in 0 1; do echo "consumers, B=$b:"; env ${=HYP} ${=ALL} SS_B=$b bun show-consumer.ts; done > out/consumers.txt 2>&1
for f in controls-ctl controls-noB progs-ctl progs-noB progs-B progs-main ergo-noB ergo-B ergo-main; do echo "$f: $(grep -h '^-- ' out/$f.txt)"; done
grep "^==" out/audit.txt
