#!/usr/bin/env zsh
# loop.sh [--dry]     the driver of the issue loop, started on the laptop in the sandbox the sessions run in:
#                     safehouse with the arguments `metadev` gives it and METADEV=1, then `bun tools/cloud-brain/loop.ts run`
#                     with what this script was given, at the root of the main checkout. Stopped with Ctrl-C.
# The arguments are read from the main checkout's `metadev` each time: its lines from `ENV_PASS=` to the `)` that ends
# `SAFEHOUSE_ARGS=(` are run here, the `mkdir -p` of the directories the sandbox mounts among them. No other line of
# `metadev` is run, and the file is not changed. Exit 2 and nothing run: no such lines, or no safehouse.
# The exit is otherwise the driver's (loop.ts, `run`). LOOP_ROOT names another checkout; only the tests set it.
# Part 4 of plan/cloud-brain-orchestrator-as-steps.md, issue st-5-driver; tests/tools/loop-run.test.ts.
set -u
ROOT="${LOOP_ROOT:-${$(git -C "${0:A:h}" rev-parse --path-format=absolute --git-common-dir):h}}"
ROOT="${ROOT:A}"
TEXT="$(sed -n '/^ENV_PASS=/,/^)/p' "$ROOT/metadev" 2>/dev/null)"
[[ "$TEXT" == *$'\nSAFEHOUSE_ARGS=('* ]] || { echo "loop.sh: $ROOT/metadev has no SAFEHOUSE_ARGS=( … ) to read; nothing was run" >&2; exit 2; }
command -v safehouse >/dev/null || { echo "loop.sh: no safehouse on the PATH; nothing was run" >&2; exit 2; }
# metadev names a file beside itself with ${0:A:h}: the lines are read in a function whose $0 is that file.
typeset -a SAFEHOUSE_ARGS
read_args() { 0="$ROOT/metadev"; eval "$TEXT"; }
read_args
export METADEV=1
cd "$ROOT" || exit 2
exec safehouse "${SAFEHOUSE_ARGS[@]}" bun tools/cloud-brain/loop.ts run "$@"
