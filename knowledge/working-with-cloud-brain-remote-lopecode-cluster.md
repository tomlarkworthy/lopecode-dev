---
scope: [local-development]
topics: Cloud Brain; cb4; brain.ts; deploying Workers from a notebook; pairing with a Brain page on the cluster; where the Cloud Brain architecture documents are
triggers:
  - "^(Edit|Write|MultiEdit) .*tools/cloud-brain/"
  - "(^Bash |^|[;&|] )bun +tools/cloud-brain/(brain|build)\.ts( |$)"
  - "(^Bash |^|[;&|] )BRAIN_BASE=[a-z0-9]+ +bun +tools/cloud-brain/(brain|build)\.ts( |$)"
---

# Working with Cloud Brain, the remote lopecode cluster

Cloud Brain is a set of Cloudflare Workers that one notebook defines, deploys and operates. This
file says where its documents are, what the parts are, and what Tom has ruled. Written 2026-10-08
from the session that built the cluster pairing. On 2026-10-11 the commands were moved to three pages,
so that an agent reads the one for what it is doing (the whole file was 28.6 KB, read before any `brain.ts`):

| To do this | Read |
|---|---|
| Call a running Brain: `brain.ts`, the state file, a token, the health check, the logs, the docs in its search | `knowledge/calling-a-cloud-brain-from-this-checkout.md` |
| Change a seed, build, test, deploy, commit; `redistil`, `apply`, `saw`; a Playwright script in `tools/`; where a service keeps files | `knowledge/changing-and-deploying-a-cloud-brain-worker.md` |
| Pair with the Brain's page, on this machine or in a browser of the cluster (`brain.ts page up`) | `knowledge/pairing-with-the-cloud-brain-page.md` |

The hook that asks for this file asks for the page too, when the command is one of that page's.

## Where the documents are

Read these before changing anything. They are records with dates and measurements, and they are
kept in step with the code.

| What | Where |
|---|---|
| The notebook (canonical, built, do not hand-edit) | `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html` |
| Its source: one seed per module, cells split by `// %%` | `tools/cloud-brain/*.ojs` |
| As-built record, full and short | `tools/cloud-brain/spec-as-built.md`, `spec-as-built-short.md` |
| `cloud-brain-dev/`: a submodule, a repository kept by the Brain's `git` service (started 2026-10-10, no history). `bun sync.ts https://cb4.endpointservices.workers.dev` reads what the Brain runs into `deploy/` by import path (about 1 s; shared modules committed, a service's module git-ignored). `bun test.ts brain-x-NAME` runs that service's tests with no browser and prints a JSON report with the hash; `--with FILE` runs a module that is not deployed yet in its place, as a check before a deploy; `bun all.ts` every service (19 s). It cannot send a change back. `AGENTS.md` there is what an agent reads first, and `philosophy.md` (the owner's seven lines; the issue loop's copy is a link to it) | `cloud-brain-dev/README.md`. Its URL is the Brain's (`/git/cloud-brain-dev.git`, read by anyone, since 2026-10-10 22:55), so `git submodule update --init cloud-brain-dev` needs no token. A push goes to Cloudflare's address: set `remote.origin.pushurl` once in the submodule, from `git.get` (the commands are in `cloud-brain-dev/README.md`; a fresh checkout has none and its push is not found), with a token from `git.token?…&scope=write` in `git -c http.extraHeader="Authorization: Bearer $T"` |
| Records of fixes made by the issue loop since 2026-10-10 19:33, one file an issue | `tools/cloud-brain/records/<id>.md` |
| Operating guide | `tools/cloud-brain/running-a-cloud-brain.md` |
| Backlog, open decisions, inventories | `plan/cloud-brain-backlog.md` |
| Design: one record for delegated authority (tokens, links, grants, a Worker acting for an account). The architecture for who may call what; its seven steps were built on cb4 2026-10-10 | `plan/cloud-brain-authority.md` |
| Design: issues (a signed record, guards as data), with what Tom amended and what was built 2026-10-10 | `plan/cloud-brain-issues.md` |
| The loop that works the tracker: triage, one implementer, one separate reviewer, an overseer (written 2026-10-10, not yet run as a loop) | `.claude/skills/brain-maintenance/` (`/loop /brain-maintenance`); tokens through `tools/cloud-brain/issue-as.sh` |
| Proposal: topics (read, take, push) in place of one inbox; its step 2 is the design above | `plan/cloud-brain-topics.md` |
| The spec Tom reviews (do not edit on disk while he may have it open; Claude does not set its status) | `plan/specs/cloud-brain.html` |
| Requirements and open questions as cells | `tools/cloud-brain/cloud-brain-specs.ojs` |
| User-facing docs module | `tools/cloud-brain/cloud-brain-docs.ojs` |
| Measured records | `tools/cloud-brain/rpc-performance.md`, `websockets.md`, `logging-research.md`, `containers.md`, `ai-cache.md`, `knowledge-vectors.md`, `knowledge-reranking.md` (how `knowledge.search` orders its answers, and the question sets in `knowledge-eval/` to measure a change to it) |

Each service documents its own methods in the first `md` cell of its seed (`brain-browser.ojs`,
`brain-logs.ojs`, `brain-core.ojs`, …). That cell is the method reference.

## The shape, in six lines

- **Kernel** (`<base>`): the public address. Identity, CORS, serves the page. Makes no model calls.
- **Core** (`<base>-core`): every `/xrpc/com.lopecode.brain.*` call passes it. It checks the CEL
  rule, charges the price, writes one log line, then forwards to the service.
- **Services** (`<base>-x-NAME`, notebook module `@tomlarkworthy/brain-NAME`): browser, logs, proxy,
  bluesky, whatsapp, blob, feed, library (a notebook put by a token is served with scripts and no origin since 2026-10-11, so an agent may publish one), static, inbox, snapshot (a daily record of
  public feeds at `/static/snapshot/<day>/`; it makes no model call, and since 2026-10-11 a run opens the task `digest-<day>` in the tracker), knowledge (what the Brain
  knows: entries with their source, kept file and who entered them, in a D1 database of its own,
  `knowledge.search?q=` by words (any of them, the id searched too) and `&semantic=true` by words and meaning as one order (since 2026-10-11), one vector an entry in one Vectorize index; a put
  to the library enters a card for each module that has none, and marks a kept card `staleSince` when the notebook's copy differs;
  `library.index { name }` writes the cards again, `{ name, modules }` the named ones; a card is public when its notebook is, and is deleted with it), container (leased Linux containers from Cloudflare Containers, for the owner
  and the Brain's Workers: `container.extend?seconds=`, `exec`, `get`/`post` to a port), ai (one call to an open model on Cloudflare Workers AI:
  `ai.run?model=&usd=`, where `usd` is charged whole; `ai.models` is Cloudflare's list; an OpenAI client's base URL is
  `/xrpc/com.lopecode.brain.ai.v1`, its key a Brain token, $0.01 a call with no `usd`), issues (a signed record of events
  about the Brain's work, with the workflow as CEL guards installed as data: `issue.open`, `issue.move`, `issue.list`,
  `issue.verify?guards=true`; design and amendments in `plan/cloud-brain-issues.md`), git (repositories kept by Cloudflare Artifacts:
  `git.create?name=`, `git.token?name=&scope=&seconds=`, then plain `git` against Cloudflare's address with the token; a member's
  repository is their own; a repository the owner names in the setting `public` of `brain-x-git` is cloned by anyone from `/git/NAME.git`; record in `tools/cloud-brain/records/brain-git.md`). `<base>-x-page` is built from
  `@tomlarkworthy/cloud-brain`. `brain-secrets` is a module of the page, not a Worker. So is `brain-feedback` (since 2026-10-11): the owner annotates the page, the note is filed as a `feedback` issue with the label `annotation` and shows that issue from then on (`tools/cloud-brain/records/annotations-file-feedback.md`).
- **Database** (`<base>-db`): the rows every Worker keeps go through it.
- **Deployer** (`<base>-deployer`): the only holder of a Cloudflare token. It applies recipes,
  health-checks, puts a bad version back, and mints narrow tokens for services that declare them.
- **The page**: the notebook itself, served by the kernel. One open, signed-in tab holds the
  **lease** and is handed the inbox. The page polls every 30 s. With no tab, the lease lapses after 90 s.
- All access control is CEL rules on methods. There is none anywhere else.
- **Settings**: a value a service reads as `config.NAME ?? default` is changed with `config.set { worker, key, value }` on
  the core, the owner's own session, no deploy. `config.get?worker=` shows what a Worker has read.
- **`/llms.txt`** on the kernel's address says how a program calls this Brain; it is written from what is deployed.
  One Worker's method table: `/xrpc/com.lopecode.brain.getSource?worker=NAME&part=reference`.

## Standing rules from Tom

- Small lean code, close to the base service. No refunds. No abstractions over Cloudflare's own API
  where a pass-through will do (`browser.cdp`, `logs.query`).
- No agent loop in a Worker. A turn runs in a notebook.
- Only the deployer holds a Cloudflare token. A service declares the permissions it needs and the
  deployer mints a token for it. Only the owner deployed such a service until 2026-10-11, when
  Tom said the loop may: "yes if its behind a multi tenant interface and thoroughly designed acording to the principles." (`cloud-brain-dev/philosophy.md`, Clarifications). A new
  permission is still his.
- Secrets never printed, never copied into files or output: recovery key, deployer key, sessions,
  tokens, the Cloudflare token, app passwords.
- Do not send WhatsApp or Bluesky messages to anyone Tom did not name. Named for the issue loop on 2026-10-11: a Bluesky DM to the owner, or to the member who owns the service it is about (`.claude/skills/brain-maintenance/rules.md`, "A Bluesky DM").
- Do not change `exporter-3`, `robocoop-5` or the channel server for this project without asking.
