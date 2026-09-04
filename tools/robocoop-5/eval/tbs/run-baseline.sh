#!/bin/bash
# Raw-model arm — the OFFICIAL runner: harbor + terminus-2 in the task's own Docker environment,
# same model as the system arm, pinned explicitly. Under the safehouse sandbox harbor cannot write
# ~/.cache or ~/Library/Caches, so HOME is redirected to /tmp/harbor-home (verified: oracle agent on
# mri-harmonization -> reward 1, 2026-09-02); DOCKER_CONFIG keeps the real docker credentials.
#   tbs/run-baseline.sh <slug> [model] [n-attempts]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="${TBS_ROOT:-$HERE/../tbs-src}"
HARBOR="${HARBOR:-$HOME/.local/share/uv/tools/harbor/bin/harbor}"
SLUG="$1"; MODEL="${2:-openrouter/xiaomi/mimo-v2.5-pro}"; N="${3:-1}"
DIR="$(python3 -c "import json,sys;print(next(t['dir'] for t in json.load(open(sys.argv[1]))['tasks'] if t['slug']==sys.argv[2]))" "$HERE/tasks.json" "$SLUG")"
REAL_HOME="$HOME"; mkdir -p /tmp/harbor-home
export HOME=/tmp/harbor-home DOCKER_CONFIG="${DOCKER_CONFIG:-$REAL_HOME/.docker}"
[ -n "${OPENROUTER_API_KEY:-}" ] || export OPENROUTER_API_KEY="$(cd "$HERE" && node -e 'import("./keyload.mjs").then(m=>process.stdout.write(m.loadKey()))' )"
exec "$HARBOR" run --path "$ROOT/$DIR" --agent terminus-2 --model "$MODEL" --n-attempts "$N" --jobs-dir "$HERE/results/harbor-jobs"
