cd /Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/lite
STEP_TRACE=../selfhost/effect-runner/out/tr-delivery-shipped.json bun --preload ../selfhost/effect-runner/redirect.ts browser/delivery.test.ts > ../selfhost/effect-runner/out/tr-delivery-shipped.txt 2>&1 &
SHELLS=events,store STEP_TRACE=../selfhost/effect-runner/out/tr-delivery-runner.json bun --preload ../selfhost/effect-runner/redirect.ts browser/delivery.test.ts > ../selfhost/effect-runner/out/tr-delivery-runner.txt 2>&1 &
for m in fifo shared swallow late; do RUNNER_MUTANT=$m SHELLS=events,store STEP_TRACE=../selfhost/effect-runner/out/tr-delivery-$m.json bun --preload ../selfhost/effect-runner/redirect.ts browser/delivery.test.ts > ../selfhost/effect-runner/out/tr-delivery-$m.txt 2>&1 & done
wait
