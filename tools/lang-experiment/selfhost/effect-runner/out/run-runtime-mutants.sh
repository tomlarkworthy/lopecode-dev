cd /Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite
for s in events store; do for m in fifo shared swallow late; do
  RUNNER_MUTANT=$m SHELLS=$s STEP_TRACE=../selfhost/effect-runner/out/tr-runtime-$s-$m.json bun --preload ../selfhost/effect-runner/redirect.ts stdlib/runtime.test.ts > ../selfhost/effect-runner/out/tr-runtime-$s-$m.txt 2>&1 &
done; done
SHELLS=events STEP_TRACE=../selfhost/effect-runner/out/tr-runtime-events-only.json bun --preload ../selfhost/effect-runner/redirect.ts stdlib/runtime.test.ts > ../selfhost/effect-runner/out/tr-runtime-events-only.txt 2>&1 &
SHELLS=store STEP_TRACE=../selfhost/effect-runner/out/tr-runtime-store-only.json bun --preload ../selfhost/effect-runner/redirect.ts stdlib/runtime.test.ts > ../selfhost/effect-runner/out/tr-runtime-store-only.txt 2>&1 &
wait
