#!/bin/bash
# machine.sh   makes the daily retro's machine on the Fly app cloudbrain-retro, with the owner's `fly auth login`.
# Run from the repository root. DRY=1 prints the commands. It makes a volume and a machine; it sets no secret.
#
# The app and its secrets, made once by hand on 2026-10-20 (values never printed or kept in the repository):
#   fly apps create cloudbrain-retro --org personal
#   DEPLOY_KEY_LOPECODE_DEV, _LOPEBOOKS, _LOPECODE_PLUGIN, _LOPECODE  base64 of an ed25519 key; each public half is a
#                                      write deploy key titled "cloudbrain-retro" on tomlarkworthy/<repo>
#   CB4_STATE                          base64 of the laptop's tools/cloud-brain/.emitted/cb4.json (the owner's state)
#   CLAUDE_CODE_OAUTH_TOKEN            the same value as the app cloudbrain's
#   CF_TOKEN (optional, not set yet)   base64 of a Cloudflare API token that can edit Workers; add
#                                      `--file-secret /root/cf-token=CF_TOKEN` below when it exists
#   all set with `fly secrets import --stage -a cloudbrain-retro` from stdin.
# Its own app, not cloudbrain: Fly gives an app's secrets to every machine of the app, and the loop's agents read
# process environments. The image is the loop's (its ssh aliases are tools/cloud-brain/fly/ssh_config).
# Env MODEL, EFFORT, BUDGET_USD, HOURS (run.sh) can be added with --env.
APP=cloudbrain-retro
IMAGE="${IMAGE:-registry.fly.io/cloudbrain:fly-2-b}"
GB="${GB:-8}"
run() { if [ "$DRY" = 1 ]; then printf '%q ' "$@"; echo; else "$@"; fi; }
cd "$(git rev-parse --show-toplevel)" || exit 1
VOL=$(fly volumes list -a $APP --json 2>/dev/null | jq -r '[.[] | select(.name=="retro_data" and .attached_machine_id==null)][0].id // empty')
if [ -z "$VOL" ]; then
  run fly volumes create retro_data -a $APP -r ams -s "$GB" -y
  [ "$DRY" = 1 ] || VOL=$(fly volumes list -a $APP --json | jq -r '[.[] | select(.name=="retro_data" and .attached_machine_id==null)][0].id')
fi
run fly machine run "$IMAGE" -a $APP -r ams --name retro \
  --vm-cpu-kind performance --vm-cpus 2 --vm-memory 4096 --volume "${VOL:-<volume>}:/data" --restart no --schedule daily \
  --file-local /usr/local/bin/retro-boot.sh=tools/cloud-brain/retro/boot.sh \
  --file-secret /root/.ssh/lopecode-dev.key=DEPLOY_KEY_LOPECODE_DEV --file-secret /root/.ssh/lopebooks.key=DEPLOY_KEY_LOPEBOOKS \
  --file-secret /root/.ssh/lopecode-plugin.key=DEPLOY_KEY_LOPECODE_PLUGIN --file-secret /root/.ssh/lopecode.key=DEPLOY_KEY_LOPECODE \
  --file-secret /root/cb4.json=CB4_STATE --entrypoint "/bin/bash /usr/local/bin/retro-boot.sh" --detach
