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
# The run has a TMPDIR of its own, `t` in a new directory of /tmp (SUITE_TMP_BASE names another place), removed when
# bun ends or the script is told to stop: what the tests make with mkdtemp(tmpdir()) is made there and goes with it.
# The system's temporary directory had 200,884 entries on 2026-10-13, most of them rigs of these tests, and a bun
# started under it took 740 ms where 13 ms in /tmp. The second line on stderr names the directory, and the last the
# entries of the caller's own. One file run alone, `bun test ./tests/tools/<file>`, has the TMPDIR of its caller.
# Issue tmpdir-entries-slow-every-bun-start; tools/cloud-brain/records/tmpdir-entries-slow-every-bun-start.md has the runs.
cd "$(dirname "$0")/../.." || exit 2
set -- bun test --parallel=4 --timings=tests/tools/timings.json --timeout=30000 "$@" ./tests/tools
echo "+ $* (in $PWD)" >&2
# The caller's temporary directory, which a file run alone and a tool still write to: its entries are counted while
# bun runs and said in the last line on stderr, so that its growth is seen before a test times out.
SYS="${TMPDIR:-$(getconf DARWIN_USER_TEMP_DIR 2>/dev/null)}"; SYS="${SYS%/}"
P="$(mktemp -d "${SUITE_TMP_BASE:-/tmp}/bm-suite-run.XXXXXX")" || { echo "suite.sh: no temporary directory in ${SUITE_TMP_BASE:-/tmp}; nothing was run" >&2; exit 2; }
P="$(cd "$P" && pwd -P)"; D="$P/t"
trap 'rm -rf "$P"' EXIT
mkdir "$D" || exit 2
trap 'exit 130' INT
trap 'exit 143' TERM
echo "+ TMPDIR=$D, removed at the end" >&2
[ -d "$SYS" ] && { ls -f "$SYS" | wc -l > "$P/count"; } 2>/dev/null &
TMPDIR="$D" "$@"
CODE=$?
wait
N="$(tr -d ' \n' < "$P/count" 2>/dev/null)"
[ -n "$N" ] && echo "+ $SYS, the temporary directory of the caller, has $((N - 2)) entries" >&2
exit $CODE
