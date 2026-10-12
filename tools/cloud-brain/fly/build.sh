#!/bin/bash
# build.sh [label]   builds the worker machine's image on Fly.io's builder and keeps it in Fly.io's registry
# of the app: registry.fly.io/<app>:<label>. The label is `loop-` and the checkout's short commit when none is given.
# It is run on the owner's laptop with his `fly auth login`. It deploys nothing, starts no machine and makes no
# token: a machine gets the image when its config names it (machine.json, `image`).
# The context is this directory. APP is cloudbrain when not set. DRY=1 prints the command and runs nothing.
# Not built on the laptop's own docker: it is arm64 and the machine is x86_64, and a push from it needs
# `fly auth docker`, which writes his login into ~/.docker/config.json.
# tools/cloud-brain/records/fly-2-image-and-run-sh.md has the first build, with its time and the image's size.
cd "$(dirname "$0")" || exit 70
APP="${APP:-cloudbrain}"
LABEL="${1:-loop-$(git rev-parse --short HEAD)}"
CMD=(fly deploy --build-only --push --remote-only --app "$APP" --config fly.toml --dockerfile Dockerfile --image-label "$LABEL")
if [ "$DRY" = 1 ]; then printf '%s\n' "${CMD[@]}"; exit 0; fi
"${CMD[@]}" || exit $?
echo "registry.fly.io/$APP:$LABEL"
