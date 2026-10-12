# The image of the issue loop's worker machine on Fly.io (plan/cloud-brain-worker-machine-on-fly.md, part 1).
# The tools are here because a stopped machine starts again from its image: what a stop loses is in
# tools/cloud-brain/records/fly-1-by-hand.md, "The stop, and what it loses". The checkout, its node_modules and
# Claude Code's own directory are on the volume at /data, and run.sh puts them there.
# Built and kept by build.sh beside this file. The build's context is this directory and nothing else of the checkout.
# The machine is x86_64: a build on an arm64 laptop's own docker is another image.
FROM ubuntu:24.04

ARG BUN_VERSION=1.4.3
ARG CLAUDE_VERSION=2.1.296
ARG PLAYWRIGHT_VERSION=1.57.0

# HOME is set because `fly machine exec` gives a command HOME=/ (the record of fly-1-by-hand).
ENV DEBIAN_FRONTEND=noninteractive \
    HOME=/root \
    BUN_INSTALL=/usr/local \
    PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright \
    PATH=/root/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN apt-get update -qq \
 && apt-get install -y -qq --no-install-recommends git curl unzip jq python3 poppler-utils ca-certificates openssh-client procps xz-utils gnupg \
 && rm -rf /var/lib/apt/lists/*

# bun into /usr/local/bin.
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}" && bun --version

RUN curl -fsSL https://deb.nodesource.com/setup_current.x | bash - \
 && apt-get install -y -qq --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/* && node --version

# Claude Code into /root/.local/bin.
RUN curl -fsSL https://claude.ai/install.sh | bash -s "${CLAUDE_VERSION}" && claude --version

# The Chromium that this Playwright names, with the system packages it needs. `--bun` runs Playwright's tool
# under bun and not under the node its first line names: under node 26 the download ends at "100%" and goes
# no further (the record of fly-1-by-hand; and this file's first build, which had no `--bun`, stood there 10 minutes).
RUN bun x --bun "playwright@${PLAYWRIGHT_VERSION}" install --with-deps chromium \
 && rm -rf /var/lib/apt/lists/* /root/.bun/install/cache && ls /opt/ms-playwright

# One host alias for each repository that has a deploy key: GitHub takes the first key SSH offers.
# The keys are no part of the image: the machine's `files` write them at each start (machine.json).
COPY ssh_config /etc/ssh/ssh_config.d/github.conf
RUN ssh-keyscan -t ed25519,rsa,ecdsa github.com > /etc/ssh/ssh_known_hosts && test -s /etc/ssh/ssh_known_hosts

COPY run.sh /usr/local/bin/fly-run.sh
RUN chmod 755 /usr/local/bin/fly-run.sh
CMD ["/usr/local/bin/fly-run.sh"]
