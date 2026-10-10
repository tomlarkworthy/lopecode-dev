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
file says where its documents are, how to reach a running Brain from this checkout, and how to
pair with the Brain's page, on this machine or in a browser of the cluster. Written 2026-10-08
from the session that built the cluster pairing; each command below was run that day against `cb4`, except where it says not run.

## Where the documents are

Read these before changing anything. They are records with dates and measurements, and they are
kept in step with the code.

| What | Where |
|---|---|
| The notebook (canonical, built, do not hand-edit) | `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html` |
| Its source: one seed per module, cells split by `// %%` | `tools/cloud-brain/*.ojs` |
| As-built record, full and short | `tools/cloud-brain/spec-as-built.md`, `spec-as-built-short.md` |
| Operating guide | `tools/cloud-brain/running-a-cloud-brain.md` |
| Backlog, open decisions, inventories | `plan/cloud-brain-backlog.md` |
| Design: one record for delegated authority (tokens, links, grants, a Worker acting for an account). The architecture for who may call what; its seven steps were built on cb4 2026-10-10 | `plan/cloud-brain-authority.md` |
| Design: issues (a signed record, guards as data), with what Tom amended and what was built 2026-10-10 | `plan/cloud-brain-issues.md` |
| Proposal: topics (read, take, push) in place of one inbox; its step 2 is the design above | `plan/cloud-brain-topics.md` |
| The spec Tom reviews (do not edit on disk while he may have it open; Claude does not set its status) | `plan/specs/cloud-brain.html` |
| Requirements and open questions as cells | `tools/cloud-brain/cloud-brain-specs.ojs` |
| User-facing docs module | `tools/cloud-brain/cloud-brain-docs.ojs` |
| Measured records | `tools/cloud-brain/rpc-performance.md`, `websockets.md`, `logging-research.md`, `containers.md`, `ai-cache.md`, `knowledge-vectors.md` |

Each service documents its own methods in the first `md` cell of its seed (`brain-browser.ojs`,
`brain-logs.ojs`, `brain-core.ojs`, …). That cell is the method reference.

## The shape, in six lines

- **Kernel** (`<base>`): the public address. Identity, CORS, serves the page. Makes no model calls.
- **Core** (`<base>-core`): every `/xrpc/com.lopecode.brain.*` call passes it. It checks the CEL
  rule, charges the price, writes one log line, then forwards to the service.
- **Services** (`<base>-x-NAME`, notebook module `@tomlarkworthy/brain-NAME`): browser, logs, proxy,
  bluesky, whatsapp, blob, feed, library, static, inbox, snapshot (a daily record of
  public feeds at `/static/snapshot/<day>/`; it makes no model call), knowledge (what the Brain
  knows: entries with their source, kept file and who entered them, in a D1 database of its own,
  `knowledge.search?q=` by words and `&semantic=true` by meaning, one vector an entry in one Vectorize index; a put
  to the library enters a card for each module that has none, and marks a kept card `staleSince` when the notebook's copy differs;
  `library.index { name }` writes the cards again, `{ name, modules }` the named ones; a card is public when its notebook is, and is deleted with it), container (leased Linux containers from Cloudflare Containers, for the owner
  and the Brain's Workers: `container.extend?seconds=`, `exec`, `get`/`post` to a port), ai (one call to an open model on Cloudflare Workers AI:
  `ai.run?model=&usd=`, where `usd` is charged whole; `ai.models` is Cloudflare's list; an OpenAI client's base URL is
  `/xrpc/com.lopecode.brain.ai.v1`, its key a Brain token, $0.01 a call with no `usd`), issues (a signed record of events
  about the Brain's work, with the workflow as CEL guards installed as data: `issue.open`, `issue.move`, `issue.list`,
  `issue.verify?guards=true`; design and amendments in `plan/cloud-brain-issues.md`). `<base>-x-page` is built from
  `@tomlarkworthy/cloud-brain`. `brain-secrets` is a module of the page, not a Worker.
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

## Access from this checkout

Everything goes through one CLI, run on this machine:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts <command>
```

- `cb4` is the scratch Brain: `https://cb4.endpointservices.workers.dev/`. Owner
  `larkworthy.bsky.social`.
- State is `tools/cloud-brain/.emitted/cb4.json`, git-ignored: recovery key, deployer key, minted
  sessions. The Cloudflare token is `tools/scratch/cloud-brain-experiments/.cf-token`, git-ignored
  and temporary. **Never print or copy either.** If the state file is missing, there is no access;
  ask Tom.
- The header comment of `brain.ts` lists the commands. The ones used daily:

| Command | Use |
|---|---|
| `curl <path> --owner [curl args]` | Call the kernel as the owner. `--other` calls as a test member. |
| `state` | What is deployed. |
| `redistil` | Compare each Worker with its source. Healthy is every line `same`. |
| `apply <name>.json --reason="why"` | Deploy a recipe, signed with the recovery key. Since 2026-10-09 the deployer answers 400 without `--reason=` (3 to 300 characters) and logs it as `deploy.reason`; the same for `redistil --apply`, `remove` and `rollback`. |
| `saw [name…]` | The hash this checkout last deployed or fetched for each Worker; `apply` and `remove` send it as `was`. A refused apply means the Worker changed elsewhere: read it with `getSource?worker=NAME`, merge it into the seed, build, emit, then `saw NAME` (2026-10-10, after a kernel deployed from elsewhere was replaced). |
| `page up` / `page state` / `page down` | The Brain's page in a browser of the cluster (below). |

A health check that takes ten seconds:

```
brain.ts curl /xrpc/com.lopecode.brain.lease.get --owner     # {"held":true}
brain.ts redistil | grep -c same                             # 20 on 2026-10-10 11:57 (18 on 2026-10-09)
brain.ts curl /xrpc/com.lopecode.brain.browser.all --owner   # browsers that cost money
brain.ts curl /xrpc/com.lopecode.brain.container.all --owner # containers that cost money
brain.ts curl /xrpc/com.lopecode.brain.quota.get --owner     # today's spend
```

## Changing it

1. Edit the seed in `tools/cloud-brain/*.ojs`. Never the notebook HTML.
2. `bun tools/cloud-brain/build.ts`.
3. Run the tests in a local QA tab: `qa_open_notebook` on the file URL with
   `#view=…&cc=<pairing token>&r=<fresh number>`, then `run_tests`. `r` does nothing; a new value makes a new URL, so the tab
   loads the file again.
   `run_tests` hung four times on 2026-10-09. The stand-in is to force each `test_*` cell from `eval_code`. Do it
   from a module of its own (`const side = runtime.module(); side.variable().import(name, alias, mod);
   side.variable(observer).define(null, [alias], (x) => x)`), never with `mod.variable(observer).define(…)` inside
   the module under test: `exportModuleJS` writes every variable of a module into its source, so the deployer's
   own tests fail with "invalid redefinition of global identifier", and a record emitted in that tab carries the
   test cells into the deployed Worker's kept source (seen in the deployer, 2026-10-09 23:33).
4. Deploy under the lock: `mkdir tools/cloud-brain/.emitted/cb4.lock`, `apply … --reason="why"`, remove the lock.
   Nothing enforces it. It is the agreement between agents in this checkout: if the directory is
   there, another one is deploying; wait.
   Core and page go on probation and are put back after 10 minutes unless confirmed: run `brain.ts confirm` about a
   minute after applying either (2026-10-09: an applied page was put back, "not confirmed in 10 minutes").
   `NAME.json` is written by emitting in a tab: `(await module.value("NAME_service")).emit()`, posted to
   `http://127.0.0.1:47814/NAME.json`, which `bun tools/cloud-brain/test-receiver.ts` saves in `.emitted/`.
   `redistil --apply` does not do this: it distils again the source the deployer already keeps. It is for after
   `install-deployer`, which is how a change to the wrapper (`workerRuntime` in `cloudflare-iac.ojs`) reaches the Workers.
5. Update the as-built record and the backlog in the same change.
6. Run `/review-notebook` on what changed. The two logging reviews on 2026-10-08 found 15 real
   defects the authoring session had not seen.
7. Commit on `main` in `lopebooks` and here, and push. Tom, 2026-10-08: "we should work on main
   mainly". Not a branch in the shared directory.

## Where a service keeps files

Files are in `brain-static`, by path. Anything dated is `<service>/<YYYY-MM-DD>/<name>`:
`snapshot/2026-10-09/arxiv.json`. The store sets the rest: a Worker `brain-x-NAME` makes a new path
only under `NAME/`, and each file carries `worker:brain-x-NAME` and `savedAt`. The day is the second
segment for two reasons. Clean-up is one call, `static.delete` with `{ prefix: "snapshot/", before:
"2026-07-01" }` (`before` is compared with `savedAt`). And `static.list` reads every record under its
prefix, so a prefix that ends at a day reads that day only.

## The knowledge docs in the Brain's search

`knowledge/*.md` are entries of kind `doc` in the Brain's knowledge base (`knowledge.search?semantic=true&kind=doc&q=`),
entered 2026-10-10. A changed doc is not entered again by anything:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status        # fresh / stale (and for how long) / missing
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --stale   # the reindex; $0.00005 a doc whose text changed
```

## Why did that happen: the logs

`brain-x-logs` passes Cloudflare's log queries through, scoped to this Brain, owner's session only.
The core writes one line a call with keys `at ray caller via origin delegation holder method worker status
error ms price rule by`. Three traps met on the first day:

- `method` is the short name (`bluesky.poll`), not the NSID. A filter on the NSID returns nothing.
- A `calculations` query with `groupBys`: set `limit` to 500. With 50 and more groups than that, a group of 19 calls was left out (2026-10-09).
- `ray` is the `cf-ray` without the part after the hyphen.
- Cloudflare stores the request's path and query string beside each line. Do not put a long-lived
  secret in a query string. Short-lived single-use codes are acceptable.

## Pairing with the Brain's page

The page pairs like any lopecode notebook: `cc=LOPE-<port>-XXXX` in the hash makes it dial
`ws://127.0.0.1:<port>`, where this session's channel server listens.

**On this machine.** Open the kernel's address in a QA tab:

```
qa_open_notebook  session brain-live, headless
https://cb4.endpointservices.workers.dev/#view=C100(S70(@tomlarkworthy/cloud-brain,@tomlarkworthy/brain-shell),S30(@tomlarkworthy/claude-code-pairing))&cc=<token>&o=30
```

`&o=30` is on the address this tab has used since it was first opened. What it does is not recorded;
leave it out and nothing here depends on it (the cluster page runs without it).

**In a browser of the cluster.**

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts page up --minutes 30 --token <LOPE token>
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts page up --minutes 5 --token <LOPE token> --url "https://host/notebook.html#view=…"
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts page state|down [--browser NAME]
```

`--url` opens any hosted notebook (an https address the cluster can fetch, not `file://`) in browser
`test`, with no session; `page down --browser test` ends it. `--keep` (not run) buys time again when under 2
minutes are left. The public quick start paired this way on 2026-10-08.

`page up` with no `--url` buys browser time, opens the page in the owner's browser `brain`, signs it in, and stays in the
foreground as the bridge. `connected` then arrives on the channel for the `cb4…` URL and every
pairing tool works against it. `page down` closes the browser. With several notebooks connected,
pass the cb4 URL as `notebook_id`.

How the dial to `127.0.0.1` is carried, with no change to the page, the pairing module or the
channel server:

1. `browser.cdp` gives this machine Cloudflare's own CDP socket for that browser.
2. Over it, a script is installed to run before the page's code. It stands in for `WebSocket` on
   loopback addresses only.
3. Each frame leaves the page through a CDP binding. The bridge opens a real socket to the local
   channel server and copies frames both ways.

Measured 2026-10-08: the page reported Linux, HeadlessChrome 128, time zone UTC, 4 cores, signed in,
and held the lease after the local tab was closed. Heap 534 to 632 MB.

Limits:

- The bridge runs on this machine. If it stops, pairing drops; the page on the cluster goes on
  holding the lease until its bought time ends.
- The pairing module dials once, at load. Each time the bridge connects it loads the page again: 10 to
  11 s from `bridge up` to the local socket (three runs), and the lease is free for about a minute.
- No cut of the CDP socket was seen: two sockets ran 11 min each, the second closing 22 s after the
  bought time ended, when the bridge exits. The reconnect was run only by stopping and starting it.
- $0.09 an hour. Tom, 2026-10-08: "we don't need it all day, only when doing stuff". Do not leave
  one running; check `browser.all` when done.
- One Brain page per browser. Two killed a browser at about 500 MB each.
- The owner's session is placed in that browser's storage. Only the owner's own session reaches
  it, because a browser belongs to its caller. Rule overrides for this were set and removed the
  same day; they were not needed.
- When the cluster page goes down, nothing holds the lease. Reopen the local `brain-live` tab.
- A QA session that was closed comes back as a new browser: signed out, and its dial to `127.0.0.1`
  fails with `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` (seen 2026-10-08 23:10 CEST). Open it with
  `chromium_args: ["--disable-features=LocalNetworkAccessChecks"]`, then put the session in
  `localStorage.brain_session` without printing it (a one-shot loopback server that the page fetches
  from) and reload. Do not `qa_close` with no session name: it closes every session.

Rejected: a relay service on a Durable Object, with both ends dialling a room. Tom: "no because you
have modified the protocol". The bridge needed no new infrastructure.

## Standing rules from Tom

- Small lean code, close to the base service. No refunds. No abstractions over Cloudflare's own API
  where a pass-through will do (`browser.cdp`, `logs.query`).
- No agent loop in a Worker. A turn runs in a notebook.
- Only the deployer holds a Cloudflare token. A service declares the permissions it needs and the
  deployer mints a token for it. Only the owner deploys such a service.
- Secrets never printed, never copied into files or output: recovery key, deployer key, sessions,
  tokens, the Cloudflare token, app passwords.
- Do not send WhatsApp or Bluesky messages to anyone Tom did not name.
- Do not change `exporter-3`, `robocoop-5` or the channel server for this project without asking.
