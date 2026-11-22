#!/bin/zsh
# run-all.sh: every batch through harness.ts in skip mode (SS_FREEZE_ALL unset) and all mode (SS_FREEZE_ALL=1);
# logs to logs/<mode>.txt (stderr from unhandled rejections in a cell's own promises filtered out)
cd "${0:A:h}"; mkdir -p logs
B=(b1.ts b2.ts b3.ts b4.ts b5.ts b6.ts b7.ts)
env -u SS_FREEZE_ALL bun harness.ts $B 2>&1 | grep -E "^==|^   [a-zA-Z(]|^--|^SILENT" > logs/skip.txt
SS_FREEZE_ALL=1 bun harness.ts $B 2>&1 | grep -E "^==|^   [a-zA-Z(]|^--|^SILENT" > logs/all.txt
grep -E "^-- mode" logs/skip.txt logs/all.txt
