#!/bin/bash
# suite.sh [bun test flags]     the whole of tests/tools of the checkout this file is in, from any directory.
# It runs, at that checkout's root:
#   bun test --parallel=4 --timings=tests/tools/timings.json --timeout=30000 ./tests/tools
# and prints that line on stderr first. Exit and output are bun's: the counts are those of `bun test ./tests/tools`.
#   --parallel=4   four worker processes, a file in one of them at a time. With no flag the files run one after
#                  another: 207 s on 2026-10-12, past the 120 s that is a command's default timeout. With a worker a
#                  file (`--parallel`, 18 on that machine) a test timed out at 5 s in one run of 19.
#   --timings      starts the slowest files first, so the run is as long as worktree.test.ts (80 to 94 s that
#                  day) and not longer; without it 100 to 110 s. `suite.sh --update-timings` writes the file again.
#   --timeout      30 s for a test that names none, where bun's own is 5 s: two suites at the same second each
#                  failed a test that takes 3 s alone at 5001 ms.
# A flag given here comes after these and is bun's to take: `suite.sh --parallel=1` is the serial run.
# One file is `bun test ./tests/tools/<file>`, with the `./`.
# Issue tests-tools-suite-three-minutes; tools/cloud-brain/records/tests-tools-suite-three-minutes.md has the runs.
cd "$(dirname "$0")/../.." || exit 2
set -- bun test --parallel=4 --timings=tests/tools/timings.json --timeout=30000 "$@" ./tests/tools
echo "+ $* (in $PWD)" >&2
exec "$@"
