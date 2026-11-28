#!/bin/zsh
# lite/infer/attack/gates.sh <logdir>: the fast gates of the holes work, each log kept, the summary lines printed
cd "${0:A:h}/../../.."
L=${1:?logdir}; mkdir -p $L
echo "== $(date '+%F %T') $(pmset -g batt | head -1 | sed "s/Now drawing from //") load $(sysctl -n vm.loadavg)"
run() { local n=$1; shift; "$@" > $L/$n.log 2>&1; echo "-- $n exit $?"; }
run build bun lite/soundscript/build.ts --force; echo "   dependancy map lines: $(grep -c 'error building module dependancy map' $L/build.log)"; tail -2 $L/build.log
run bunverify bun bun-verify/run.ts; grep -E '^bun-verify:' $L/bunverify.log
run diff bun lite/infer/diff.ts; grep -E '^[0-9]+ sources, |^(ownership|fed rule):' $L/diff.log
run diffmod bun lite/infer/diff.ts --module-only; grep -E 'SAME [0-9]+ DIFFERENT' $L/diffmod.log | tail -2
run rgdiff bun lite/infer/rg-diff.ts; grep -E 'registry level|end to end' $L/rgdiff.log | tail -2
run cpl bun lite/infer/complete-diff.ts; tail -1 $L/cpl.log
for t in infer/infer.test.ts infer/rg.test.ts infer/cp.test.ts toolchain/tc.test.ts infer/attack/live.test.ts infer/attack/incr.test.ts; do run bt-${t:t:r} zsh -c "cd lite && bun test $t"; grep -E '^ *[0-9]+ (pass|fail)' $L/bt-${t:t:r}.log | tr '\n' ' '; echo; done
for t in infer/narrow-kinds.test.ts soundscript/ts-cells.test.ts acorn.test.ts syntax.test.ts boundary.test.ts complete.test.ts walks.test.ts checks.test.ts shape.test.ts cross.test.ts pool.test.ts store.test.ts events.test.ts render.test.ts; do [ -f lite/$t ] || continue; run s-${t:t:r} bun lite/$t; tail -1 $L/s-${t:t:r}.log; done
(cd .. && cd .. && bun tools/lang-experiment/fixtures.ts) > $L/fixtures.log 2>&1; echo "-- fixtures exit $?"; grep -E 'fixtures pass|registered' $L/fixtures.log | tail -2
