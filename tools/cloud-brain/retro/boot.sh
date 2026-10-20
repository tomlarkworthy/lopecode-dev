#!/bin/bash
# boot.sh   the first process of the daily retro machine (Fly app cloudbrain-retro). Written into the machine by
# `--file-local` at create, so it is the one file that does not come from the checkout: it clones or pulls
# lopecode-dev on the volume and hands over to the checkout's tools/cloud-brain/retro/run.sh.
# The machine, its image, files and secrets: machine.sh beside this file. The aliases github-lopecode-dev,
# -lopebooks and -lopecode-plugin come from the loop's image (tools/cloud-brain/fly/ssh_config); github-lopecode is added here.
export HOME=/root
mkdir -p /root/.ssh && chmod 700 /root/.ssh
for k in /root/.ssh/*.key; do [ -f "$k" ] && chmod 600 "$k"; done
cat > /root/.ssh/config <<'EOF'
Host github-lopecode
  HostName github.com
  User git
  IdentityFile /root/.ssh/lopecode.key
  IdentitiesOnly yes
EOF
C=/data/lopecode-dev
[ -d "$C/.git" ] || git clone -q git@github-lopecode-dev:tomlarkworthy/lopecode-dev.git "$C" || { echo "boot.sh: clone failed"; exit 1; }
git -C "$C" rebase --abort 2>/dev/null
git -C "$C" fetch -q origin main || { echo "boot.sh: fetch failed"; exit 1; }
# commits a past run did not push are kept on a branch before main is reset
[ -n "$(git -C "$C" log --oneline origin/main..HEAD 2>/dev/null)" ] && git -C "$C" push -q origin "HEAD:refs/heads/retro/unpushed-$(date -u +%Y%m%dT%H%M)"
git -C "$C" checkout -q -f main && git -C "$C" reset -q --hard origin/main || { echo "boot.sh: reset failed"; exit 1; }
exec bash "$C/tools/cloud-brain/retro/run.sh"
