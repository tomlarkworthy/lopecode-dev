#!/bin/bash
# run.sh   the first process of the issue loop's worker machine on Fly.io: it starts the loop, and the machine
# stops when it ends (restart policy `no`; plan/cloud-brain-worker-machine-on-fly.md, parts 1 and 2).
# The image has a copy as /usr/local/bin/fly-run.sh and starts that (Dockerfile, CMD).
#
# Two halves. The first is run by whichever copy the machine starts:
#   the deploy keys that the machine's `files` wrote are made mode 600 (they are written 0755, and ssh refuses that);
#   the checkout is cloned to $CHECKOUT when the volume has none;
#   `main` is pulled, fast-forward only;
#   then the checkout's own copy of this file is started in this one's place, so a change to run.sh on `main`
#   is what runs, with no new image.
# The second, by the checkout's copy:
#   the Brain is asked for fly.work, with the token fly-status. `{"work":[]}`: exit 0, and nothing more is done.
#   An answer that is not 200 with a list: exit 1, and no loop is started (a machine that cannot ask cannot
#   reach the tracker either);
#   three submodules are updated (lopebooks, cloud-brain-dev, lopecode-plugin) and `bun install` is run at the
#   root and in tools/. The fourth, lopecode, is not asked for: the commit recorded for it is on no remote
#   (issue seen-lopecode-pointer-on-no-remote). A step of these that fails prints a line and the start goes on;
#   IS_SANDBOX=1 METADEV=1 claude -p "/loop /brain-maintenance" --model opus --permission-mode bypassPermissions
#   and its exit is this script's. IS_SANDBOX=1 because root is refused that mode without it, and METADEV=1
#   because the SessionStart hook of .claude/settings.json ends a session without it (the record of fly-1-by-hand).
#
# What it reads from the environment, each with what it is when not set:
#   DATA /data                    the volume
#   CHECKOUT $DATA/lopecode-dev
#   CLAUDE_CONFIG_DIR $DATA/claude   Claude Code's directory (transcripts, memory, its login state), kept over a stop
#   FLY_TOKENS /root/cb4-tokens.json   the Brain's tokens for the machine as `files` wrote them; copied, mode 600, to
#                                 the checkout's tools/cloud-brain/.emitted/cb4-tokens.json when the file is there
#   FLY_RUN_BASE https://cb4.endpointservices.workers.dev   the Brain's address. brain.ts reads it from the state
#                                 file, which the machine does not have, so the call names it whole
#   FLY_RUN_ORIGIN git@github-lopecode-dev:tomlarkworthy/lopecode-dev.git   what is cloned
#   FLY_RUN_PROMPT "/loop /brain-maintenance"   the prompt. What a session there is told of its token is not
#                                 decided here (task fly-4-loop-files)
#   MODEL opus                    as cloud-brain-dev/agent.sh; a session there starts with another model by default
#   RUN_SH_PULLED                 1 in the second half. Set by the first; with it set by hand the first is left out
# Nothing here holds or names a credential of Fly.io: the machine stops because this process ends.
# tests/tools/fly-run-sh.test.ts; tools/cloud-brain/records/fly-2-image-and-run-sh.md.
#
# The body is one block with its exit inside: bash reads a block whole before it runs it, so the pull that writes
# this file over does not change the run (as cloud-brain-dev/agent.sh).
{
export HOME="${HOME:-/root}"; [ "$HOME" = / ] && export HOME=/root
DATA="${DATA:-/data}"
CHECKOUT="${CHECKOUT:-$DATA/lopecode-dev}"
export CLAUDE_CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$DATA/claude}"
ORIGIN="${FLY_RUN_ORIGIN:-git@github-lopecode-dev:tomlarkworthy/lopecode-dev.git}"
BASE="${FLY_RUN_BASE:-https://cb4.endpointservices.workers.dev}"
OWN="$CHECKOUT/tools/cloud-brain/fly/run.sh"
say() { echo "run.sh $(date -u +%H:%M:%SZ) $*"; }

if [ "$RUN_SH_PULLED" != 1 ]; then
  for k in "$HOME"/.ssh/*.key; do [ -f "$k" ] && chmod 600 "$k"; done
  if [ ! -d "$CHECKOUT/.git" ]; then
    say "no checkout at $CHECKOUT: cloning"
    mkdir -p "$(dirname "$CHECKOUT")" && git clone -q "$ORIGIN" "$CHECKOUT" || { say "the clone failed; nothing is started"; exit 1; }
  fi
  git -C "$CHECKOUT" pull -q --ff-only --no-recurse-submodules origin main || { say "main was not pulled; nothing is started"; exit 1; }
  say "main is at $(git -C "$CHECKOUT" rev-parse --short HEAD)"
  [ -f "$OWN" ] || { say "the checkout has no tools/cloud-brain/fly/run.sh; nothing is started"; exit 1; }
  RUN_SH_PULLED=1 exec bash "$OWN"
fi

cd "$CHECKOUT" || { say "no checkout at $CHECKOUT"; exit 1; }
mkdir -p "$CLAUDE_CONFIG_DIR" tools/cloud-brain/.emitted
TOKENS="${FLY_TOKENS:-/root/cb4-tokens.json}"
[ -f "$TOKENS" ] && install -m 600 "$TOKENS" tools/cloud-brain/.emitted/cb4-tokens.json

# The question the service's tick asks before a start, asked again: with no work there is no loop to run.
STATUS=$(mktemp)
ANSWER=$(BRAIN_STATE_DIR="$CHECKOUT/tools/cloud-brain/.emitted" BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl "$BASE/xrpc/com.lopecode.brain.fly.work" --as fly-status 2>"$STATUS")
CODE=$(sed -n 's/.*\[\([0-9][0-9]*\)\]$/\1/p' "$STATUS" | tail -1); rm -f "$STATUS"
N=$(printf '%s' "$ANSWER" | jq -e 'if (.work | type) == "array" then .work | length else empty end' 2>/dev/null)
if [ "$CODE" != 200 ] || [ -z "$N" ]; then
  say "fly.work was not answered (status ${CODE:-none}): $(printf '%s' "$ANSWER" | head -c 300); no loop is started"
  exit 1
fi
if [ "$N" = 0 ]; then say "fly.work is empty; no loop is started"; exit 0; fi
say "fly.work has $N"

git config submodule.lopebooks.url git@github-lopebooks:tomlarkworthy/lopebooks.git
git config submodule.lopecode-plugin.url git@github-lopecode-plugin:tomlarkworthy/lopecode-plugin.git
for m in lopebooks cloud-brain-dev lopecode-plugin; do
  git submodule update -q --init "$m" || say "the submodule $m was not updated; the start goes on"
done
bun install --silent || say "bun install failed at the root; the start goes on"
(cd tools && bun install --silent) || say "bun install failed in tools/; the start goes on"

say "starting claude"
IS_SANDBOX=1 METADEV=1 claude -p "${FLY_RUN_PROMPT:-/loop /brain-maintenance}" --model "${MODEL:-opus}" --permission-mode bypassPermissions < /dev/null
CODE=$?
say "claude ended with $CODE"
exit $CODE
}
