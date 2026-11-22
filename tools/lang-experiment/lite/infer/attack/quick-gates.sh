#!/bin/zsh
# lite/infer/attack/quick-gates.sh <logdir>: build, bun-verify, fixtures, diff, the attack live test and run-sets; summary lines
cd "${0:A:h}/../../.."
L=${1:?logdir}; mkdir -p $L
echo "== $(date '+%F %T') $(pmset -g batt | head -1 | sed "s/Now drawing from //") $(uptime | sed 's/.*load/load/')"
run() { local n=$1; shift; "$@" > $L/$n.log 2>&1; echo "-- $n exit $?"; }
run build bun lite/soundscript/build.ts --force; echo "   dependancy map lines: $(grep -c 'error building module dependancy map' $L/build.log)"
run bunverify bun bun-verify/run.ts; grep -E '^bun-verify:' $L/bunverify.log
(cd ../.. && bun tools/lang-experiment/fixtures.ts) > $L/fixtures.log 2>&1; echo "-- fixtures exit $?"; grep -E 'fixtures pass' $L/fixtures.log | tail -1
run diff bun lite/infer/diff.ts; grep -E '^[0-9]+ sources, |^(ownership):' $L/diff.log
run live zsh -c "cd lite && bun test infer/attack/live.test.ts browser/run.test.ts"; grep -E '^ *[0-9]+ (pass|fail)|^live:' $L/live.log | tr '\n' ' '; echo
run sets bun lite/infer/attack/run-sets.ts; grep -E '^-- (freeze|all)' $L/sets.log
(cd selfhost/freeze-attack && ./run-all.sh) 2>&1 | tail -2
