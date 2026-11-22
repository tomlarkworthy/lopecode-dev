#!/bin/sh
# run from tools/lang-experiment: the counter's validation, the corpus census and its tables, the module-context
# supplement, the rewrites, the attack programs. Writes only selfhost/late-code/out/.
set -e
bun selfhost/late-code/validate.ts > selfhost/late-code/out/validate.txt
bun selfhost/late-code/run.ts
bun selfhost/late-code/summarize.ts > /dev/null
bun selfhost/late-code/run.ts --module
bun selfhost/late-code/summarize.ts --module > /dev/null
bun selfhost/late-code/rewrites.ts > selfhost/late-code/out/rewrites.txt
bun selfhost/late-code/attacks.ts > selfhost/late-code/out/attacks.txt
tail -1 selfhost/late-code/out/validate.txt; tail -1 selfhost/late-code/out/rewrites.txt; tail -1 selfhost/late-code/out/attacks.txt
