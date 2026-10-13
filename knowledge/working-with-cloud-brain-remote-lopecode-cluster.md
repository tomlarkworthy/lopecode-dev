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

The hook that asks for this file asks for the page too, when the command is one of that page's. A write under
`tools/cloud-brain/` asks for this file, and for the page on changing and deploying when the file is a seed or
a tool (`.ojs`, `.ts`, `.js`, `.sh`, `.py`): a record, a post mortem or another `.md` asks for this file alone
(since 2026-10-13, issue `learnings-gate-deploy-page-for-a-record`).

## Where the documents are

Read these before changing anything. They are records with dates and measurements, and they are
kept in step with the code.

| What | Where |
|---|---|
| The source of every module of the Brain: one seed per module, cells split by `// %%`. For these modules the seed is the source of truth, not the notebook HTML (`CLAUDE.md` tip 8 is about the other notebooks) | `tools/cloud-brain/*.ojs` |
| The notebook: a build of the seeds, never hand-edited. `bun tools/cloud-brain/build.ts --out FILE` at a commit of `lopecode-dev` writes that commit's notebook. The file here is written by each landing that builds and is committed once a day as a backup, by the first such landing of the day (`tools/cloud-brain/notebook-backup.sh`, since 2026-10-11, issue `notebook-commit-once-a-day`), so `git status` in `lopebooks` shows it modified for the rest of the day | `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html` |
| As-built record, full and short | `tools/cloud-brain/spec-as-built.md`, `spec-as-built-short.md` |
| `cloud-brain-dev/`: a submodule, a repository kept by the Brain's `git` service (started 2026-10-10, no history). `bun sync.ts https://cb4.endpointservices.workers.dev` reads what the Brain runs into `deploy/` by import path (about 1 s; shared modules committed, a service's module git-ignored). `bun test.ts brain-x-NAME` runs that service's tests with no browser; its last lines are the counts with the hash and each failed test (`2>&1 | tail -15` reads them whole), and the JSON report is a file, `reports/brain-x-NAME.json` there (since 2026-10-13, issue `test-ts-output-floods-the-reader`; until then the last line of stdout); `--with FILE` runs a module that is not deployed yet in its place, as a check before a deploy; `bun all.ts` every service (19 s). It cannot send a change back. `AGENTS.md` there is what an agent reads first, and `philosophy.md` (the owner's seven lines; the issue loop's copy is a link to it) | `cloud-brain-dev/README.md`. Its URL is the Brain's (`/git/cloud-brain-dev.git`, read by anyone, since 2026-10-10 22:55), so `git submodule update --init cloud-brain-dev` needs no token. A push goes to Cloudflare's address: set `remote.origin.pushurl` once in the submodule, from `git.get` (the commands are in `cloud-brain-dev/README.md`; a fresh checkout has none and its push is not found), with a token from `git.token?…&scope=write` in `git -c http.extraHeader="Authorization: Bearer $T"`. In a worktree made by `tools/cloud-brain/worktree.sh` it is a clone of its own, and since 2026-10-12 an agent of the issue loop lands a change to it with `tools/cloud-brain/worktree.sh --push-dev <name>`, which asks for that token as `loop-git` and commits the pointer (`cloud-brain-dev/README.md`, "A change from a worktree of lopecode-dev") |
| Records of fixes made by the issue loop since 2026-10-10 19:33, one file an issue | `tools/cloud-brain/records/<id>.md` |
| Post mortems of the issue loop, one file a post mortem, named by its issue (`pm-<short>`): one decision traced back through the record to a cause a change can be made to, with its next actions. The parts of a file, and who declares and writes one, are in `plan/cloud-brain-post-mortems-declared-and-kept.md` (part 3), and since `pm-2-brief-and-procedure` (2026-10-12) in what the loop follows: "A post mortem" of `.claude/skills/brain-maintenance/agents/implementer.md` for its writer and of `agents/orchestrator.md` there for the session that declares one (a section of `SKILL.md` until `st-4-orchestrator-brief`, 2026-10-13); `tests/tools/post-mortems.test.ts` holds those parts for every file of the directory. Since 2026-10-12 `tools/cloud-brain/knowledge-docs.ts` takes the directory, so a file is an entry `doc:pm-<short>` of the Brain's search from the release of the landing that pushes it (issue `pm-1-file-and-search`, whose record has the searches run on the first, which was on `main` before the tool took the directory and was entered by that change's release). Three files on 2026-10-12, `pm-second-summarizer-role.md`, `pm-approver-leaves-everything.md` and `pm-agent-request-not-seen-fly-idle.md` | `tools/cloud-brain/post-mortems/<id>.md` |
| Operating guide | `tools/cloud-brain/running-a-cloud-brain.md` |
| Backlog, open decisions, inventories | `plan/cloud-brain-backlog.md` |
| Design: one record for delegated authority (tokens, links, grants, a Worker acting for an account). The architecture for who may call what; its seven steps were built on cb4 2026-10-10 | `plan/cloud-brain-authority.md` |
| Design: issues (a signed record, guards as data), with what Tom amended and what was built 2026-10-10 | `plan/cloud-brain-issues.md` |
| The loop that works the tracker: triage, one implementer, one separate reviewer, an overseer (written 2026-10-10, run as a loop since that day); since 2026-10-12 its procedure also starts an approver for an issue at `awaiting-approval`, which writes a verdict and, since the owner installed a policy for it that day (event 4668), makes the `approve` move through `tools/cloud-brain/approver.ts` when the verdict is to approve (`agents/approver.md`, `plan/cloud-brain-approver-persona.md`; `rules.md`, "The approver"). Since `st-7-switch-and-texts` (2026-10-13) the loop is a program with no model, the driver: the owner starts it in a terminal with `tools/cloud-brain/loop.sh` (`bun tools/cloud-brain/loop.ts run` inside `safehouse`) and stops it with Ctrl-C, and no agent starts it without `--dry`. It makes a step at a tracker event, at a run that ended and every 1,800 s; a step starts each agent as a process of its own, writes the run in the record as a `cost` event with the outcome `running`, and starts a model, a judgment run with the brief `agents/orchestrator.md`, only for the entries a rule cannot decide. What it did, what runs and what waits for the owner is `tools/cloud-brain/.emitted/issue-loop/status.md` of the main checkout, written at each step, with `steps.jsonl` beside it. A step makes no act with the owner's session: those wait for a session he is in (`rules.md`, "A session the owner is in"). `/brain-maintenance` in a session is one pass by hand, and `/loop /brain-maintenance` is the loop as it was until that day, kept for going back. The driver had not been started when this was written; its first run, the owner's of 2026-10-13, started five agents that were not logged in, and `tools/cloud-brain/records/loop-sh-sandbox-has-no-keychain.md` has what `loop.sh` gives `safehouse` since and what a step does at such a result; the design is `plan/cloud-brain-orchestrator-as-steps.md`, the header of `tools/cloud-brain/loop.ts` has each command, and `tools/cloud-brain/records/st-5-driver.md` and `st-6-a-day-beside-the-session.md` have what was run of it and what was not | `.claude/skills/brain-maintenance/` (`SKILL.md`, "Run it"); `tools/cloud-brain/loop.sh`, `loop.ts`; tokens through `tools/cloud-brain/issue-as.sh` |
| Design: topics, named logs that are read, taken from and pushed to a method (`brain-x-topic`). The spec the service was built from on 2026-10-12, with a note "As built" where a task differed. It takes the place of the proposal of 2026-10-10, which is kept as written | `plan/cloud-brain-topics-service.md`; the proposal is `plan/cloud-brain-topics.md` |
| The spec Tom reviews (do not edit on disk while he may have it open; Claude does not set its status) | `plan/specs/cloud-brain.html` |
| Requirements and open questions as cells | `tools/cloud-brain/cloud-brain-specs.ojs` |
| User-facing docs module | `tools/cloud-brain/cloud-brain-docs.ojs` |
| Measured records | `tools/cloud-brain/rpc-performance.md`, `websockets.md`, `logging-research.md`, `containers.md`, `ai-cache.md`, `knowledge-vectors.md`, `knowledge-reranking.md` (how `knowledge.search` orders its answers, and the question sets in `knowledge-eval/` to measure a change to it), `tomarkdown.md` (what `ai.tomarkdown` took and gave on 2026-10-12: the largest body, a paper beside `pdftotext` and arXiv's HTML, an image file, a scanned page) |

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
  `ai.run?model=&usd=`, where `usd` is charged whole; `ai.models` is Cloudflare's list; since 2026-10-12 `ai.tomarkdown?usd=` passes a multipart body of files (a PDF, an office file, an image) to Cloudflare's Markdown conversion, $0.01 at least, and `ai.tomarkdown/supported` lists the formats; an OpenAI client's base URL is
  `/xrpc/com.lopecode.brain.ai.v1`, its key a Brain token, $0.01 a call with no `usd`), issues (a signed record of events
  about the Brain's work, with the workflow as CEL guards installed as data: `issue.open`, `issue.move`, `issue.list`,
  `issue.verify?guards=true`; since 2026-10-12 `issue.flow?metric=&since=&until=&by=` answers the times work took as rows, lead times and open work among them, from the record at each call (`plan/cloud-brain-flow-metrics.md`), and `issue.queue` answers what is next, in the service's order, and what waits and for what (`{ queue, waiting }`; an order between two issues is a link `after`, a wait for a time is `issue.hold`; the issue loop's step 3 and its watch read it; `plan/cloud-brain-bookkeeping-in-the-tracker.md`); design and amendments in `plan/cloud-brain-issues.md`), git (repositories kept by Cloudflare Artifacts:
  `git.create?name=`, `git.token?name=&scope=&seconds=`, then plain `git` against Cloudflare's address with the token; a member's
  repository is their own; a repository the owner names in the setting `public` of `brain-x-git` is cloned by anyone from `/git/NAME.git`; record in `tools/cloud-brain/records/brain-git.md`), dashboard (since 2026-10-11: a metric is a definition over lines a Worker already logs, read with
  `metric.query?metric=&since=&until=&by=`, which the service turns into one query of Cloudflare's logs; a dashboard is a row, a list of panels over metrics,
  `dashboard.put`, `get`, `list`, `delete`; the select at the top of its module draws the one it names, kept in the address as `dashboard=NAME`, over the span chosen under Health of the page; the token `loop-dashboard`
  reads `deploys.*` and the dashboards; since 2026-10-12 a panel whose metric starts `flow.` is asked of the tracker's `issue.flow` by the page, not of `metric.query`, there are the draws `points` and `share`, and cb4 keeps a dashboard `flow`, at `#dashboard=flow` for the owner (`tools/cloud-brain/records/fm-5-page-and-dashboard.md`), of eleven panels since its last, "Time to restore", which the page draws from `restores` of `logs.deploys` (a row for each put-back with the next deploy of that Worker that stood; `tools/cloud-brain/records/fm-6-restores.md`); design in `plan/cloud-brain-dashboard-service.md`, the method reference is the prose of `tools/cloud-brain/brain-dashboard.ojs` from `## Methods`), topic (since 2026-10-12, Worker `brain-x-topic`: named, ordered logs, each with a CEL rule for who appends and one for who reads;
  `topic.append { topic, key, body }` keeps a key once, `topic.read?topic=&after=&limit=` answers the entries after a position the reader keeps, `topic.subscribe` with a `target` pushes each entry to a method named `NAME.receive` as the subscriber, under a delegation the subscriber made for `brain-x-topic`,
  and with no `target` is taken from with `topic.take` and `topic.done`; the owner and a token of his create topics, and a member calls no `topic.*` method without his grant; the token `loop-topic` is for the loop's checks, on topics named `check.…`;
  design in `plan/cloud-brain-topics-service.md`, the method reference is the first `md` cell of `tools/cloud-brain/brain-topic.ojs`), usage (since 2026-10-13, Worker `brain-x-usage`: `usage.account?from=&to=` answers what the Cloudflare account was billed for, a row a product and charge period with its quantity and cost, read from Cloudflare's billable usage with the permission group `Billing Read`; the two paths are the service's own and a caller gives two days and nothing else; the owner and a token of his that names it, `loop-usage` for the loop; design in `plan/cloud-brain-cloudflare-usage-read.md`, the method reference is the first `md` cell of `tools/cloud-brain/brain-usage.ojs`, the first answer of cb4 in `tools/cloud-brain/records/cu-2-usage-service.md`). `<base>-x-page` is built from
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
