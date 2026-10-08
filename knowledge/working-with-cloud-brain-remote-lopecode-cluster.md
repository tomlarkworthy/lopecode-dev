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
from the session that built the cluster pairing; each command below was run that day against `cb4`.

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
| The spec Tom reviews (do not edit on disk while he may have it open; Claude does not set its status) | `plan/specs/cloud-brain.html` |
| Requirements and open questions as cells | `tools/cloud-brain/cloud-brain-specs.ojs` |
| User-facing docs module | `tools/cloud-brain/cloud-brain-docs.ojs` |
| Measured records | `tools/cloud-brain/rpc-performance.md`, `websockets.md`, `logging-research.md` |

Each service documents its own methods in the first `md` cell of its seed (`brain-browser.ojs`,
`brain-logs.ojs`, `brain-core.ojs`, …). That cell is the method reference.

## The shape, in six lines

- **Kernel** (`<base>`): the public address. Identity, CORS, serves the page. Makes no model calls.
- **Core** (`<base>-core`): every `/xrpc/com.lopecode.brain.*` call passes it. It checks the CEL
  rule, charges the price, writes one log line, then forwards to the service.
- **Services** (`<base>-x-NAME`, notebook module `@tomlarkworthy/brain-NAME`): browser, logs, proxy,
  bluesky, whatsapp, blob, feed, library, metrics, secrets, static, inbox, page.
- **Deployer** (`<base>-deployer`): the only holder of a Cloudflare token. It applies recipes,
  health-checks, puts a bad version back, and mints narrow tokens for services that declare them.
- **The page**: the notebook itself, served by the kernel. One open, signed-in tab holds the
  **lease** and is handed the inbox. With no tab, the lease lapses after 30 s.
- All access control is CEL rules on methods. There is none anywhere else.

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
- The header comment of `brain.ts` lists every command. The ones used daily:

| Command | Use |
|---|---|
| `curl <path> --owner [curl args]` | Call the kernel as the owner. `--other` calls as a test member. |
| `state` | What is deployed. |
| `redistil` | Compare each Worker with its source. Healthy is every line `same`. |
| `apply <name>.json` | Deploy a recipe, signed with the recovery key. |
| `page up` / `page state` / `page down` | The Brain's page in a browser of the cluster (below). |

A health check that takes ten seconds:

```
brain.ts curl /xrpc/com.lopecode.brain.lease.get --owner     # {"held":true}
brain.ts redistil | grep -c same                             # 15 on 2026-10-08
brain.ts curl /xrpc/com.lopecode.brain.browser.all --owner   # browsers that cost money
brain.ts curl /xrpc/com.lopecode.brain.quota.get --owner     # today's spend
```

## Changing it

1. Edit the seed in `tools/cloud-brain/*.ojs`. Never the notebook HTML.
2. `bun tools/cloud-brain/build.ts`.
3. Run the tests in a local QA tab: `qa_open_notebook` on the file URL with
   `#view=…&cc=<pairing token>&r=<fresh number>`, then `run_tests`.
4. Deploy under the lock: `mkdir tools/cloud-brain/.emitted/cb4.lock`, `apply`, remove the lock.
   Kernel, core and page go on probation and are put back if unhealthy.
5. Update the as-built record and the backlog in the same change.
6. Run `/review-notebook` on what changed. The two logging reviews on 2026-10-08 found 15 real
   defects the authoring session had not seen.
7. Commit on `main` in `lopebooks` and here, and push. Tom, 2026-10-08: "we should work on main
   mainly". Not a branch in the shared directory.

## Why did that happen: the logs

`brain-x-logs` passes Cloudflare's log queries through, scoped to this Brain, owner's session only.
The core writes one line a call with keys `at ray caller via origin method worker status error ms
price rule by`. Two traps met on the first day:

- `method` is the short name (`bluesky.poll`), not the NSID. A filter on the NSID returns nothing.
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

**In a browser of the cluster.**

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts page up --minutes 30 --token <LOPE token>
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts page up --minutes 5 --token <LOPE token> --url "https://host/notebook.html#view=…"
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts page state|down [--browser NAME]
```

`--url` opens any hosted notebook (an https address the cluster can fetch, not `file://`) in browser
`test`, with no session; `page down --browser test` ends it. `--keep` buys time again when under 2
minutes are left. The public quick start paired this way on 2026-10-08.

It buys browser time, opens the page in the owner's browser `brain`, signs it in, and stays in the
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
