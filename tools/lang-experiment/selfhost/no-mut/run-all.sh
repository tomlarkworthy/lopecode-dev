#!/bin/sh
# run from tools/lang-experiment: the counter's validation, the census of the corpus and of the module supplement,
# the tables, part 3, the rewrites, the registration programs and the deletion line counts. Writes only
# selfhost/no-mut/out/.
set -e
bun selfhost/no-mut/validate.ts > selfhost/no-mut/out/validate.txt
bun selfhost/no-mut/run.ts
bun selfhost/no-mut/run.ts --module
bun selfhost/no-mut/summarize.ts > /dev/null
bun selfhost/no-mut/part3.ts > /dev/null
bun selfhost/no-mut/rewrites.ts > selfhost/no-mut/out/rewrites.txt
bun selfhost/no-mut/registration.ts > selfhost/no-mut/out/registration.txt
bun selfhost/no-mut/deletable.ts > selfhost/no-mut/out/deletable.txt
tail -1 selfhost/no-mut/out/validate.txt; tail -1 selfhost/no-mut/out/rewrites.txt; tail -1 selfhost/no-mut/out/registration.txt; tail -1 selfhost/no-mut/out/deletable.txt
