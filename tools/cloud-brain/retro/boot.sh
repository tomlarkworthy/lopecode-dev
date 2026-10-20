#!/bin/bash
# boot.sh   the first process of the daily retro machine (Fly app cloudbrain-retro). Written into the machine by
# `--file-local` at create, so it is the one file that does not come from the checkout: it clones or pulls
# lopecode-dev on the volume and hands over to the checkout's tools/cloud-brain/retro/run.sh.
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
git -C "$C" fetch -q origin main && git -C "$C" checkout -q main && git -C "$C" reset -q --hard origin/main || { echo "boot.sh: pull failed"; exit 1; }
exec bash "$C/tools/cloud-brain/retro/run.sh"
