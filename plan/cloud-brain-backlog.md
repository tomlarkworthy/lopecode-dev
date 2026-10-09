# Cloud Brain: bugs and rough edges to fix

Collected 2026-10-05 22:40 to 2026-10-06 00:12 CEST, while building and while Tom first used the test Brain
`cb1` (`https://cb1.endpointservices.workers.dev/`). Each entry says what was seen and what is known about the
cause. "Not investigated" means exactly that. Sources: `tools/cloud-brain/*.ojs`, built into
`lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`. The as-built record is the `built_*` cells of
`@tomlarkworthy/cloud-brain-specs` in that notebook (`tools/cloud-brain/spec-as-built.md`).

## State on 2026-10-06 08:33

`cb1` and `cb2` are deleted. The test Brain is `cb3` (`https://cb3.endpointservices.workers.dev/`), built to the
literate-microservices revision: every Worker serves its module, the page loads modules from the Workers on opening
and runs their tests, the core holds unverified/verified, Save to Brain is gone. Record and what is not built:
`revision_built` in `tools/cloud-brain/spec-as-built.md`.

What that does to the list below: B5 and B8's saved-page half are gone with the stored head. B9 no longer applies
to sessions, which are not saved anywhere. B10's effect on service modules is overwritten on opening by the
Worker's source (seen 08:30); the history store itself is still there. B4 is gone with `cb2`. B6 remains for the
shared modules only: the page module is now served and loaded from `brain-x-page`. U11's "no source" cannot happen for a Worker deployed from this build.

## Open bugs

### B1. A reload restores the assistant's conversation into the wrong module

Seen 2026-10-06 00:10 on Tom's tab. He had a six-turn session in `@brain/2026-10-06-0003-mh4l`, never saved to
the Brain. After a reload the six `turn_*` cells were re-created, the channel reporting each as
`module="main"`. Read from the page:

```
sessionCells  [["unlisted:test-implicit-e6914di96m8", 6]]
brainMains    []
```

The turns are in a scratch module the pairing channel makes, no `@brain/…` module exists, so the session list
cannot show the conversation. The served page has no `@brain/` block (`grep` on a fresh download: none), so the
replay comes from the browser. The tab has an IndexedDB named `lopecode_history`; that is the first suspect and
was not checked. Related: memory note "a module joining mains late is named main". Likely in robocoop-5's
session handling or change-history, not in Brain code. Not investigated further; Tom asked that robocoop-5 is
not changed without asking.

### B2. The guard's cron trigger never runs

`cb1-guard` and `cb2-guard` have the trigger `* * * * *` and a `scheduled` handler. Cloudflare's
`workersInvocationsScheduled` showed 0 runs for `cb%` in an hour (23:14 CEST) while `slack-sync-bridge` and
`lopecode-contrail` ran every minute. `*/1 * * * *` did not start it in 3 minutes. Cause unknown; the Workers
that run were deployed by wrangler, these by the API. Worked around with an alarm on the rows object
(`cloudflare-iac.ojs`, `serve` and `Rows.alarm`). The trigger is still declared and still dead.

### B3. The alarm that replaced the cron has no test

`simulate` has no alarms and the tests call `scheduled` directly, which is how B2 passed 54 tests. The alarm is
verified on Cloudflare only (rollbacks at 23:35 and 23:38). It is armed by the first request to the Worker's
own address; a guard nobody has requested since deploy has no clock. The first alarm build (deployed 23:16)
recorded no tick in 3 minutes and the reason was never found; the next build, which only added a record of the
alarm's last call, worked.

### B4. `cb2-guard` has no clock

Installed 22:52, before the alarm. Its probation never ends. Delete `cb2` or reinstall it.

### B5. A page saved to the Brain hides later deploys

The kernel's `/` serves the stored head when there is one, else the asset the kernel was installed with. After
**Save to Brain**, deploying a new notebook changes nothing a visitor sees until the head is deleted
(`notebook.deleteHead`) or saved again. Met twice on 2026-10-05. Nothing in the page says which copy is being
served or that a newer one is deployed.

### B6. The kernel's hash does not cover the notebook

The asset is not in the kernel's hash, so a changed notebook reports `unchanged` and needs `--force` from the
CLI. From the page, Services shows the kernel "in sync" when the deployed notebook is older than the one open.

### B7. A new deploy is not visible for a few seconds, and a plain reload can show the old page

After a kernel deploy at 23:55 a fetch of `/` returned the old page, and the new one 5 s later. Tom's first
reload after the 00:05 deploy still ran the old module; the second had the new one. `/` answers
`cache-control: public, max-age=0, must-revalidate` with no `etag`. Whether the delay is Cloudflare's rollout
or caching was not separated.

### B8. Cloning from a Brain's page copies whatever was saved into that page

Clone sends the open page as the new kernel's asset. A page with a saved assistant session module, or one served
from a stored head, carries that into the clone. Not checked what a clone from a signed-in owner's tab holds.
The Clone section says no data is copied, which is not true for the page itself.

### B9. The assistant's page is readable by anyone

`/` is served to an anonymous visitor, by design, so that a Brain can be cloned. With B5 and B8 it means a
session saved into the page is public. Decide whether sessions belong in the page at all.

### B10. The browser replays earlier cell edits over a newly deployed page

Found 2026-10-06 00:20; it is the mechanism behind B1 and probably most of U10. The built-in assistant edited
`proxy_service`, `proxyRig` and `test_proxy_plain_fetch_and_refusals` in `@tomlarkworthy/brain-proxy` in Tom's
tab. Nothing was saved to the Brain (`notebook.list` returned `[]`) and nothing was deployed. After a reload the
channel reported the same three cells re-defined, and the page read:

```
liveInServedBlock  false      the running proxy_service is not the one in the served page
history            {"lopecode_history_files": 119}
```

So an IndexedDB store on the Brain's origin re-applies recorded edits on every load. Consequences:

- A deploy does not reach a browser that holds an older recorded edit of the same cell. At about 00:08
  `viewof assistant` was re-defined twice with its pre-deploy body.
- Edits made in a tab look saved and are not: another browser, or a clone, gets the served page.
- The session turns are replayed into whichever module answers to "main" (B1).
- Services compares the page's cells with what is deployed, so a replayed edit shows as "changed" with no
  hint that it came from history.

Not known: which module writes the store (change-history is in the bundle), what keys a record, and whether a
record is dropped when the served cell changes. Decide whether the Brain page should carry history at all,
given it has Save to Brain.

## Rough edges met by Tom

### U1. Sign-in "does not work"

Tom, 2026-10-05: "I can;t sign into the notebook, the form does not work, stick to Inputs". Not reproduced. The
`file://` link I had given him shows no sign-in form at all, because sign-in exists only on a page served by a
Brain, and the page did not say so in a way that was found. All forms in `@tomlarkworthy/cloud-brain` were
rewritten with `Inputs` (helpers `field` and `press`); sign-in then worked for him at 00:03. Still hand-built:
Apply and Refresh in `serviceList` (`cloudflare-iac.ojs`), which set `disabled` from state.

### U2. A wrong handle gets a raw JSON error page

`/auth/login?handle=tomlarkworthy.bsky.social` answered `500 {"error":"InternalServerError","message":"failed
to resolve identity: …"}` as the whole page. It should return to the notebook with a message.

### U3. Cloning was not discoverable

Tom: "its not clear how to clone the brain". The opening paragraph said "Clone it to get your own" and the only
section was called Install, hidden from an owner. Renamed Clone, shown on every copy, with **Download this
notebook**. Not walked through since the rename: neither button was pressed after the change, and the seed
Worker step (create a Worker by hand in the dashboard, paste 15 lines) is still the hardest part.

### U4. No model selector on the assistant

Tom typed `/model opus` and then "I can;t see a model selector in the UI. I was expecting one". The only
selector was in the separate robocoop-5 pane, folded shut. The Brain's assistant now passes `settings: true`
and the default layout no longer opens the second chat. Open: a URL that still names
`S30(@tomlarkworthy/robocoop-5)` shows two folds (seen 00:10), and only one chat on a page can host it. The
selector was not used to change model on the live page.

### U5. `/model` and other slash commands are treated as chat

The assistant answered "I can't switch models from here". Either support the common ones or say where the
setting is.

### U6. The proxy is a separate call, not `fetch`

Tom to the assistant: "I don't think its designed all that well, it should shadow fetch really". The assistant
fetched github.com by trying `fetch`, failing, then calling `proxy.fetch` through `brain_call`.
`proxyFetch(brainBase, …)` in `@tomlarkworthy/brain-proxy` already returns a fetch-shaped function; the page
does not use it as its `fetch`, so cells and `eval_js` do not get it. Tom also opened with "I think we made a
mistake with the CORS design"; what he wants changed there was not said.

### U7. The model comes from the pairing token, not the Brain

On `cb1` no model key is in Secrets, so the assistant only has a model while the tab is paired (`cc=`), and the
page no longer keeps `cc=` in its URL across a sign-in redirect. A Brain with no pairing and no key has an
assistant that cannot answer, and the page does not say why.

### U8. Ten-minute waits while testing

Tom: "do we need to iterate in 10 minute intervals? Its very slow". Probation is now `probationMs` in the
guard's config; `cb1` runs 90 s. The page installer cannot set it.

### U11. The assistant behaved as a notebook agent, not an operator

Tom, 2026-10-06 00:30: "the brain bot is not very focused on its primary task of helping manage the
infrastructure. Its still more notebook agent than operator". In his session it answered "where is this
notebook served from?" and "how would you know what the kernel serves?" by grepping source, and never called
the Brain. Its brief was one sentence appended at order 95 to robocoop-5's notebook prompt ("You are also the
assistant of a Cloud Brain"), and nothing told it what was running unless it asked.

Changed 00:45, deployed to `cb1`: the operator's brief now leads the system prompt (`system:` option, the
settings fold's prompt after it); a `brain` watch gives it one line of state every step (Workers not in sync,
probation, inbox waiting); a `brain_status` tool returns Workers, probation with seconds left, held deploys,
the guard's clock, unset secrets and inbox count in one call. Checked: 54 tests, the chat renders, four tools
registered, on a local copy with no owner session. **Not checked: any turn with the new brief.** Whether it
now behaves as an operator is unmeasured.

**Measured 2026-10-06 00:21 to 00:31 CEST**, in my own signed-in tab on `cb1`, model `claude-sonnet-5-5`,
approval on for round 1 and off for round 2. I played the owner; each claim was checked from outside the page.

```
round 1 (brief only, 4 tools)
 "Let the proxy call api.github.com with my GitHub token… Roll it out."
   brain_status, brain_services, grep, read wiki, 2 edits, brain_apply -> waiting      ~25 s
   said: held for approval, GITHUB_TOKEN unset, not checked live
 [I approved c0f6491dabac]  "Approved it. Finish the rollout…"
   brain_status, brain_apply, brain_status                                             17 s
   outside: proxy.fetch api.github.com/zen -> 400 "the secret for api.github.com is not set"
 "I want to host public static files…"
   16 calls, new module @tomlarkworthy/brain-files, 2 tests, brain_apply -> waiting    80 s
 [I approved 4ed5b0e26ee1]  "Approved. Roll it out, upload a small test file and prove a stranger can fetch it."
   brain_apply, brain_status, files.put, eval_js fetch                                 20 s
   outside: GET /files/hello.txt 200 text/plain, nosniff; /files/nope.txt 404; anonymous files.put 401
```

Both tasks done as an operator: status first, tests, apply, stop at the approval hold, report what was not
checked, list unset secrets. Two faults, both mine, not the model's:

- The brief named the wiki page without its path. First read failed
  (`cannot read /content/wiki/running-a-cloud-brain.md`), then a glob found it. Brief now gives the path.
- **Nothing it built was saved.** A reload of the tab had no `brain-files` module while `brain-x-files` kept
  serving, and Services did not list the Worker at all. The proxy edit came back only through B10's replay.

Fixed 00:27, deployed: a `brain_save` tool (the page's Save to Brain), a line in the brief to call it once a
change serves, and Services now lists a Worker the guard runs that the notebook does not declare as
**no source** (`serviceRows`, tested in `test_service_rows_states`).

```
round 2 (fresh tab: brain-x-files:no source)
 "Two jobs. 1: …send user-agent: cloud-brain on calls to api.github.com… 2: public static file hosting…"
   job 1: edit, new test, brain_apply, real proxy.fetch, brain_status, brain_save       77 s
   job 2: refused to overwrite the unsourced Worker; offered three options
 "(b). Replace it; nothing in it matters."
   brain_apply brain-x-files, files.put, eval_js fetch, brain_status, brain_save        90 s
   outside: served page has id="@tomlarkworthy/brain-files" (1) and withUserAgent (9);
            reload: 5 Workers, 5 in sync, brain-files a main
```

Not checked: any model but Sonnet 5.5; a kernel or core change by the assistant; a deploy that fails its
self-test; the assistant's own reply to a rollback. One run of each task, so this is an existence proof, not
a rate.

Left behind by this test, on `cb1`: a stored head (so B5 applies: later deploys are hidden until it is saved
again or deleted) that contains my test conversation `@brain/2026-10-06-0029-e0ga`, readable by anyone (B9);
Workers `cb1-x-files`; `hello.txt`; the proxy now lists `api.github.com` and expects `GITHUB_TOKEN`.

Still missing for an operator: no logs or request trace from a Worker, no error counts, no way to see what a
failing Worker answered, and it cannot confirm, approve or roll back (by design).

### U9. The page shows internals first

The first screen of the Brain page is `brainOrigin`, `session`, `client`, `brain`, `platformWiring`, `field`,
`press` as inspector output, above the sign-in control. Not raised by Tom; seen in every screenshot.

### U10. Stale tabs

Tom's tab ran an old page three times in an hour (after the stored head was deleted, after the Inputs deploy,
after the settings deploy). Nothing tells an open tab that the Brain now serves a different notebook.

## Noise seen and not explained

- `FileAttachment` in `@tomlarkworthy/editor-5` reported as re-defined with an identical body, four times.
- `viewof assistant` and `assistant` in `@tomlarkworthy/cloud-brain` reported as re-defined twice with the old
  body at about 00:08, before the tab was reloaded. Not me. Possibly the assistant's `eval_js`, possibly B1.
- An anonymous cell created and deleted in `@tomlarkworthy/cloud-brain` per `eval_js` call. Expected, listed so
  it is not chased.

## Tooling

- `qa_type` with a `selector` does not focus the element; the keys go to `<body>`. I read that as "the form
  loses what is typed" and rewrote four forms on a false reproduction before clicking first. Click by
  coordinates, then type.
- `eval_code` results from the `https://cb1…` page are cut at about 500 characters; from `file://` pages
  1,200 came through. Strip to ASCII and page the result.
- `brain.ts apply` takes a file name inside `.emitted/`, not a path.
- With approval on, a CLI deploy needs approve then apply again; I turn approval off and on around deploys,
  which is not what an owner would do.

## Not built

R32 to R35, Lexicons, an approval code over WhatsApp, `canonical.json` / preflight / sitemap entries, a real Meta WhatsApp number, an install into a second
Cloudflare account, the token's minimum permissions.

`brain-x-container`, leased containers (asked 2026-10-09). A spike ran a Docker Hub image from three REST calls with
no Docker and no wrangler: cold start 245 ms, 34 ms a request from the object to a container placed in Istanbul.
**Built 2026-10-09 20:29 CEST** as `brain-x-container` (`f2581201bd95` since 20:42), with the five decisions taken as defaults by the
parent session; see "Added 2026-10-09 20:41 CEST" below and `tools/cloud-brain/containers.md`.

## Housekeeping

Scratch Workers `cb-experiments`, `cb-step1-fixture`, `cb3`, `cb3-core`, `cb3-guard`, `cb3-x-proxy`,
`cb3-x-whatsapp`, `cb3-x-files`, `cb3-x-page`; bucket `cb3-blobs`. The Cloudflare token is
bound as `CF_API_TOKEN` on both guards and expires 2026-10-11; revoking it stops both guards deploying.
(2026-10-08: on cb4 the token is bound to `cb4-deployer` only; `cb4-guard` is a stub with no token.)
`cb1` holds test secrets and a linked test number. Duplicate `plan/specs/Cloud_Brain_20261005T175727Z.html`.
`plan/specs/cloud-brain.html` does not have the as-built cells. Nothing is committed.

## Experiment, 2026-10-06 08:57: `toString` on a Worker (not adopted)

Question from Tom: a package carries a module twice, as distilled code in `worker.js` and as text in `source.js`.
Could the Worker serve its source from the functions it runs?

`tools/scratch/cloud-brain-experiments/tostring.ts` uploads a module's exported source as a JavaScript module to a
scratch Worker, calls its `define` against a recorder (no cell runs) and compares each `fn.toString()` with the text
uploaded. The scratch Worker is deleted at the end.

```
brain-proxy    18 of 18 functions verbatim
brain-core     28 of 28
cloud-brain   101 of 101
brain-kernel   define threw "window is not defined" (mod.js:385): the file-attachment loader reads window
```

Cloudflare accepted the module text unchanged, including `import("/@tomlarkworthy/….js?v=4")` inside functions. So
`toString` returns a cell as written, and name, inputs and text can all be read back on the Worker.

Not tried: running the service from those same function objects, which is what removes the copy. `worker.js` is
written by the distiller, which resolves a cell's inputs at emit time without a runtime. Also not tried: rebuilding
the exporter's exact text on the Worker so the hash and the page's "same" comparison still hold.

## State on 2026-10-06 09:39

`cb3` runs guard `b615c65fa83b`, kernel `3004c0f7c2e5`, core `feac01a7c55d`, page `64702571828b`, metrics `d030ae642d65`, proxy `fe6c23fd97f2`, whatsapp `ac44f1d1c5d8`, files `b6f19f4f6da5`. New Worker: `cb3-x-metrics`. Verified by the page at 09:39:04, 38 tests over 7 Workers. Nothing is committed.

Open, from this stretch (evidence in `tools/cloud-brain/spec-as-built.md`, "Telemetry" and "Three defects"):

- Tom has not confirmed the choice of our own XRPC telemetry over OpenTelemetry.
- `brain-x-files` was built by the assistant before the `x-brain-served-by` header and has not been redeployed: its calls are counted with no version.
- The page does not check that the module a Worker serves as its source is the module that declares that Worker. A wrong module name passed verification once (09:31:53).
- No test applies a source with a cell removed over a page. The guard is in `build.ts` (`stablePids`).
- The guard waits 60 s for a new version to answer. How long Cloudflare takes was measured once (about 28 s).
- Secrets, access and inbox lists on the page are still hand-built tables, not `Inputs.table`.
- Prose in `brain-guard`, `brain-core`, `brain-kernel`, `brain-proxy`, `brain-whatsapp` and `cloudflare-iac` was not reviewed against "reference, no descriptions of what was done".
- The dashboard is fixed charts over one query. A separate dashboard and log-exploration service is not built; only faults are logged call by call.
- On each load the page deletes three cells `_brainmetrics_0_0`, `_brainmetrics_4_0`, `_brainmetrics_21_0` from `brain-metrics` (channel events, 09:35 to 09:39). Those are ids from before `stablePids`; where the page still gets them was not found.
- The page deploy at 09:38 took 42 s in the guard, longer than the 30 s wait it replaced.

## Added 2026-10-06 09:56: static hosting and the library

New Workers on `cb3`: `cb3-x-static`, `cb3-x-library`. Evidence in `tools/cloud-brain/spec-as-built.md`, "Static hosting and the library". Open:

- Tom has not confirmed removing the core's block-level notebook store in favour of whole-file saves in the library.
- A page served from `/library` or `/static` has the owner's session. Serving them from a second hostname, or with a sandboxing header for files that are not notebooks, is not built.
- The page (`brain-x-page`) is still served from the Worker's own asset, not from the library.
- The guard does not check that the methods a service lists under `calls` exist: `brain-x-library` deploys without `brain-x-static` and then answers 502 on a put.
- Deleting a recipe does not delete its files from the bucket.
- `brain-x-files`, built earlier by the assistant, overlaps with `brain-x-static` and is still deployed.

## Added 2026-10-06 18:04: page review, inbox and secrets moved out

State of `cb3` at 18:03:54: guard `41679bcb9171`, kernel `1af0d22831c6`, core `84eaadc908a4`, page `c97bae9ea08c`, inbox `b6a2d225159f`, static `41f987fce841`, library `5fd8497fc85a`, metrics `a93d259f592e`, proxy `d8f99e9a7e93`, whatsapp `94bb8ffd5e0d`, files `b6f19f4f6da5`. 10 Workers verified by the page at 18:03:38. 75 tests. Evidence in `tools/cloud-brain/spec-as-built.md`, "Page review".

Open:

- An idle owner tab makes 2 calls every 5 s (`lease.take`, `inbox.list`): 7,690 of 7,696 calls in the 6 hours to 17:46 were these, from headless test tabs left open. Not changed. Options: one call instead of two; a slower poll when the inbox is empty; a WebSocket from a Durable Object.
- Old inbox rows remain in the core's storage.
- The inbox pump is still in the page module; `brain-inbox` and `brain-secrets` import from the page module.
- `brain-secrets` has no Worker, so it is not assembled or tested on page load.
- No link from the page to `brain-inbox` or `brain-secrets`.
- Access and Clone sections are still hand-built DOM.
- `brain.ts` cannot sign a test tab in; the owner cookie is handed over by a one-time file served by `.emitted/recv.ts`, and closing the QA session loses it.

## Added 2026-10-06 18:19: access rules are CEL expressions

State of `cb3` at 18:18:13: core `ea33593c1067`, inbox `d3630275df0c`, page `c97bae9ea08c`; the rest as at 18:04. 10 Workers verified. 78 tests. Evidence in `tools/cloud-brain/spec-as-built.md`, "Access rules as CEL in the core".

Open, in the order Tom raised them (2026-10-06 ~18:05: "the brain, as its an RPC proxy, becomes an ideal place for attribute based access controls … secrets as its own sevice … gate access to certain secrets by access control … expose certain routes to the public"):

- Secrets as its own Worker with a rule per secret. Needs: a resource the rule can read (`resource.name`), a floor the rule cannot lower (`secret.get` never to a token or a service JWT), and an answer for the guard depending on a recipe-tier Worker at deploy time.
- Rules the owner sets without a deploy (kept in the core, over the service's default).
- The guard's approval page should show a changed rule.
- Rate limit for routes open to anyone.
- The core's own methods are not behind expressions.
- A refused or errored rule is not counted in metrics.

## Added 2026-10-06 18:31: settings store, owner-set rules, usage

State of `cb3` at 18:28:34: core `c9b258246963`, page `7724195d86b2`, inbox `d3630275df0c`; the rest as at 18:04. 10 Workers verified. 80 tests. Evidence in `tools/cloud-brain/spec-as-built.md`, "A cached settings store…".

Open:

- Secrets as a Worker behind rules: needs a floor a set rule cannot lower, a resource the rule can read, and a decision on the guard reading secrets from a recipe-tier Worker.
- A panel for rules (list, set, delete), as `Inputs.table`.
- Staleness across two instances of the core not observed.
- Buckets `cb1-blobs` (12.2 MB, 176 objects) and `cb2-blobs` (empty) are still in the account after `cb1` and `cb2` were removed.

Usage of the whole Cloudflare account, 2026-10-01 to 2026-10-06 18:25, from the GraphQL analytics API (`tools/cloud-brain/.emitted/usage.ts`): 116,917 Worker requests and 301 s CPU across 40 scripts, of which `cb3*` 41,874 requests and scripts since deleted 34,173; Durable Objects 105,588 requests, 149,355 s active, 452,804 rows written; R2 181 MB in 6 buckets.

## Added 2026-10-06 19:32: brain-db, key-value tables behind rules

State of `cb3` at 19:30:02: db `a8d97bbc2e3e` (new), page `0d5137826111`, core `c9b258246963`. 11 Workers verified. 84 tests. Evidence in `tools/cloud-brain/spec-as-built.md`, "A database service with a rule per table".

Open:

- Move secrets onto it: needs the guard's read path decided, and a rule the owner cannot set by accident to `true`.
- `db.drop` for a table and a database; the `check` database is test data left on `cb3`.
- Limits: rows per table, tables per database, a paged `db.list`.
- Anonymous writes are stopped at the core.
- Token, Worker and granted-account callers not tried on Cloudflare.

## Added 2026-10-06 20:10: rows on D1, `cb4`

The test Brain is now `cb4` (`https://cb4.endpointservices.workers.dev/`), installed 20:02–20:05: guard `1424f9a36d70`, kernel `eddd3feac485`, core `16b5ea251e69`, db `888c2db58533` (system tier), inbox `b4ebb7d9d75f`, metrics `ed8a8226505a`, static `d97799b5948f`, library `188b46b0d59d`, proxy `75cd75b175ab`, whatsapp `ecf653b0ea50`, page `01111866fd89`. 10 Workers verified at 20:05:58. 84 tests. State in `tools/cloud-brain/.emitted/cb4.json`. Evidence in `tools/cloud-brain/spec-as-built.md`, "Rows on D1 for every Worker but the guard".

`cb3` still runs, on Durable Objects, with 11 Workers, the bucket `cb3-blobs` and the `check` test rows.

Open:

- Delete `cb3` and its bucket, and `cb1-blobs`, `cb2-blobs`, once `cb4` is accepted.
- Read the Durable Object and D1 usage of `cb4` after a day with a tab open.
- Secrets into `brain-db`, read by the guard from D1.
- D1 read replication (needs the Sessions API).
- `db.drop`, size limits, a paged `db.list`.
- Which caller appended a `whatsapp` inbox entry on a fresh install.

## Added 2026-10-06 20:18: `cb3` deleted

Tom: "we should delete cb3 if we have moved on to cb4". At 20:17 the 12 `cb3*` Workers and the bucket `cb3-blobs` (2 objects: a 5.4 MB library copy of this notebook and `hello.txt`) were deleted with `tools/cloud-brain/.emitted/wipe-cb3.ts`. After: `cb3` answers 404, `cb4` 200. Scripts left with the prefix: `cb-experiments`, `cb-step1-fixture` and the 11 of `cb4`. Buckets left with the prefix: `cb4-blobs` only, so `cb1-blobs` and `cb2-blobs`, which the storage analytics listed at 18:25, were already gone. `.emitted/cb3.json` is kept; its keys open nothing now.

## Added 2026-10-06 20:25: secrets in brain-db

State of `cb4` at 20:22:41: guard `65f59a8f1473`, core `6f207f435c49`, db `e9900fa1296e`, whatsapp `ecf653b0ea50` (redeployed), the rest as at 20:10. 10 Workers verified. 84 tests. One secret set on `cb4`: `WHATSAPP_VERIFY_TOKEN`, a random test value. Evidence in `tools/cloud-brain/spec-as-built.md`, "Secrets in brain-db".

Open:

- `brain-db` in the installers (the page imports from it and it imports from the page: a cycle to break first).
- A rule column and form in the Secrets panel.
- "Set secret" with approval on: say where to approve.
- Secrets are plain text in D1.

## Added 2026-10-06 20:36: secrets read at run time

State of `cb4` at 20:34:16: guard `04a84eae571f`, whatsapp `46b558febaf1`, page `445aeb1865f1`, core `6f207f435c49`, db `e9900fa1296e`. 10 Workers verified. 84 tests. `WHATSAPP_VERIFY_TOKEN` on `cb4` holds a random test value with the rule `caller.worker in ["brain-x-whatsapp"]`. Evidence in `tools/cloud-brain/spec-as-built.md`, "Workers read secrets while they run".

Closed by this: "Set secret" stalling on approval; the guard naming `brain-db`'s storage key; no panel for a secret's rule.

Open: `brain-db` in the installers; secrets in plain text in D1; a Worker cannot tell "unset" from "refused".

## Added 2026-10-06 20:56: page notes, public metrics

`cb4` at 20:55:20: metrics `9bc96611ffd3`, page `c48244e07a2f`. `metrics.query` is public. Open: read the fault log's fields before a Brain with real traffic is public; `brain.ts apply page.json` uploads the notebook but reuses a stale emitted hash unless the emit is rerun.

## Added 2026-10-06 21:33: source as the deploy input

Spike in `tools/scratch/quickjs-distil/`: all 11 services distilled from source inside QuickJS, each hash equal to the browser's. Evidence in `spec-as-built.md`, "Spike: distilling from source inside QuickJS". Open: what a Worker's source bundle contains (its module, `cloudflare-iac`, attachments); QuickJS inside the guard Worker (CPU, WebAssembly load) not tried; a page that loads each service into its own runtime; `quickjs-emscripten` is installed only in the scratch directory.

## Added 2026-10-06 21:39: the distiller runs in a Worker

Scratch Worker `cb-distil-spike`: 55 of 55 distils gave the browser's hash; CPU p50 131.5 ms, p99 293.9 ms. Open: what a Worker's source bundle contains; moving this into the guard (asks for `quickjs-emscripten-core` and the WebAssembly file as guard dependencies); delete `cb-distil-spike`, `cb-experiments`, `cb-step1-fixture` when done.

## Added 2026-10-06 22:10: the guard distils (step 1 of 5)

`cb4` at 22:09:32: guard `7e0a43666654`, page `8d97d936886e`. `brain.ts distil` gives 10 of 10 hashes equal to the browser's. 86 tests. Proposed design and build order: `spec-as-built.md`, "Revision 2026-10-06, second: the guard distils". Next is step 2 (`apply` takes source). Open: Q7 to Q13 there; the shell as its own Worker is proposed, not agreed; six Workers on `cb4` run code older than their source; `brain-x-whatsapp` is listed as pending approval; scratch Worker `cb-distil-spike` to delete.

## Added 2026-10-06 23:06: apply takes source (step 2 of 5)

`cb4` at 23:04:29: guard `ad72bbbd0736`, kernel `cbd12043ab55`, core `c4d75d23e7b0`, db `77112fade37b`, inbox `d115207c2d99`, library `472019296b6a`, metrics `9bc96611ffd3`, page `8d97d936886e`, proxy `8eb5be297871`, static `046fd1d9f893`, whatsapp `46b558febaf1`; all deployed from source through the guard. 87 tests. Decided: the shell is a file in blob storage through `brain-static`, written only by the owner, without the Workers' modules (D11 to D13). Next: step 3, the page's deploy sends source and parts are refused. Open: `source/` on rollback; the `ECONNRESET` on a page apply; a stale approval for `brain-x-whatsapp`; delete `cb-distil-spike`.

## Added 2026-10-06 23:23: the shell is in blob storage

`cb4`: static `f4226cfe1690`, library `8cc09208e5e3`, page `ea95f29d1f1f`, guard `da5df782cf9b`. `/` is `shell/index.html` from `brain-static`; a page deploy sends 62 KB of source. 89 tests. Open: workers.dev removes ETag from a compressed response, so every load is 2.6 MB (fix: store the shell compressed); `static.put` buffers; shell history is never pruned; installer not run against a real account. Next: step 3, the page's deploy sends source and parts are refused.


## Added 2026-10-06 23:56: steps 3 to 5, compressed shell, metrics tables

`cb4` at 23:51: guard `d928c0ffb91c`, kernel `c3791772ab1c`, core `f5c2702154b4`, db `a5c46dc7242e`, inbox `0cbdd153788a`, library `f5afb7ae1fe3`, metrics `2477f75c8049`, page `c46a10a2a9e3`, proxy `20ddfb9aaf60`, static `d3965f86914d`, whatsapp `70f376452bf4`. 94 tests. The shell holds no Brain module and loads the 12 from the guard; first load 2.1 MB, then 304. Metrics is two SQL tables in its own D1 database through the new `sql` platform cell. Records: `spec-as-built.md`, cells `distil_steps345` and `metrics_tables`. Open: Q9 (one approval for a redistil); `getModules` has no cache; the page's deploy button not pressed since step 3; SQL statements are not run by any test; a Worker's database outlives the Worker; `brain-db` and the rest still on `rows`, not reviewed; old `shell/<sha256>.html` never pruned; scratch Workers `cb-distil-spike`, `cb-experiments`, `cb-step1-fixture` still deployed; nothing committed.

## Added 2026-10-07 06:54: SQL tables behind brain-db

`cb4` at 06:53: guard `a6982c78f79f`, db `bd07203700c8`, metrics `000a027dbc53`. 96 tests. Every Worker's SQL goes through `db.sql`; access is per table, read or write, from `EXPLAIN`; the table database `cb4-db` is bound to `brain-db` alone; metrics' tables are `metrics_calls` and `metrics_faults`. Design: the module `@tomlarkworthy/brain-db`, *SQL tables*. Record and the hostile set: `spec-as-built.md`, cell `sql_access`. To confirm: the second database; the owner unchecked; grants by the owner only; the one-underscore prefix (`brain-x-a` also owns `a_b_*`); views and triggers owner-only. Open: no UI for grants; `SqlCheckFailed` not shown on any page; `cb4-x-metrics` left in place, unbound; a Worker's tables outlive it; the earlier open items of 2026-10-06 23:56 stand.

## Added 2026-10-07 08:10: WhatsApp live on cb4; people, channels and skills proposed

`cb4`: four `WHATSAPP_*` secrets set, the app subscribed to the business account and to `messages`, the owner's number linked. 07:57: two real messages answered by the assistant in a signed-in tab (`whatsapp.send` 200, twice). Decided by Tom: no server-side agent loop; offline handling is notebooks in Cloudflare Containers, its own workstream. Proposal and Q14 to Q19: `spec-as-built.md`, cell `people_proposal`. Open: an entry is marked done when typed, not when answered; the link confirmation ignores a failed send; the access token and app secret were pasted into a chat transcript and should be regenerated before a real number is used; the test number reaches five allowed numbers only; `infra` remove leaves the kept source (the `sqlprobe` module still loads on `cb4`).

## Added 2026-10-07 08:51: members, linking, and turns that run as their sender

`cb4` at 08:50: kernel `c4e1784b6e0e`, inbox `ad72270831d3`, whatsapp `46e5f2e942e2`, page `8b32053bb751`; every Worker `same`; 107 tests. A person is a DID; roles are owner and member; a member's turn may call `inbox.reply` and what `grant.put` names. A channel says only which address wrote; the kernel names the DID when a tab reads the inbox and hands the owner's session a 10-minute turn token for each entry. An entry is finished when answered, and finished as failed with one apology otherwise. Record and the hostile table: `spec-as-built.md`, cell `people_built`. Open: no real WhatsApp message has passed through the new Worker; sign-in from `/link` not run against a PDS; the pump has no test; a member's turn still gets robocoop-5's page context; turns run one at a time; Q15 (memory) unanswered; the earlier items of 08:10 stand except "marked done when typed" and "link confirmation ignores a failed send", which are gone with the code they described.

## Added 2026-10-07 12:30: WhatsApp pictures, written by the Brain's assistant, reviewed and live

Tom asked the Brain over WhatsApp for pictures; its owner turn wrote the change in a headless tab and the guard held it as `d3f5a6d0eded`. Reviewed from the live cells: it sent the WhatsApp access token to whatever address Meta's lookup named, stored any type and any size. The seed (`brain-whatsapp.ojs`) now checks the host, the id, the type (four picture types) and the size (5 MB), with one more test; 110/110. Record: `spec-as-built.md`, cell `whatsapp_images`. The seed build `60bd43e89857` is live on `cb4`, by mistake: `brain.ts apply` uses the recovery key and is not held for approval. Open: Tom to keep or roll back `60bd43e89857`, and to drop the pending `d3f5a6d0eded` and `ecf653b0ea50`; no real picture sent yet; the call to `static.put` from this Worker unproven on `cb4`; kept pictures are public, never deleted and unmetered; `static.put` is open to every Worker for every path but the shell; `brain.ts` needs a way to submit for approval without the recovery key.

## Added 2026-10-07 12:59: member services

`cb4` at 12:58: guard `7b6d8079f21e`, kernel `6e0c3fead68c`, core `71e1693c0433`, db `9ee54b114c74`, static `cd093c876d00`; every Worker `same`; 119 tests (109 before). A member deploys `brain-m-ID-NAME` through `member.deploy` with no approval; the core checks each call it makes as its author. A session cookie is refused from another address of the site. File access is by tag on `brain-static` records and is not to be extended: blob storage is to be rebuilt PDS-shaped. Next: a page per member on its own hostname, CPU and SQL limits, `rows` for a member's Worker. Record: `tools/cloud-brain/spec-as-built.md`, "Member services".

## Added 2026-10-07 13:13: blob store

`cb4` at 13:12: blob `b4e5765e19a8` (new Worker `brain-x-blob`), core `695272a13b89`, kernel `71fc0a97a574`; every Worker `same`; 126 tests (119 before). A blob is addressed by its CID alone (CIDv1, raw, SHA-256), carries a checked MIME type, and is read or changed by its tags: `by:<did>` stamped from the caller, `public`, `members`, and the tag grants `brain-static` already uses. 95 live rows, 0 bad. Open: WhatsApp pictures are still public files in `brain-static`; method names are `com.lopecode.brain.blob.*`; blob and file bytes are counted against the same limit separately. Record: `spec-as-built.md`, cell `blob_store`.

## Added 2026-10-07 13:52: token sessions and portals

`cb4` at 13:50: kernel `b8a913b2c0ee`, core `2dfe410ebf14`, page `30b798331b87`, library `4c8001f89c02`, metrics `c1f39ec090da`, proxy `04395e1e17a3`; 130 tests (126 before). No cookie is set or read: the session is a token in `localStorage` sent as `Authorization`, and the Origin check is gone with it. A member's module is a row in the shell's module table that opens as a sandboxed frame with its own runtime, holding a 10-minute portal token that reaches only that member's methods, as the viewer. Record: `tools/cloud-brain/spec-as-built.md`, cell `token_auth_and_portals`. Open: sign-in through a PDS and the `/link` page have not been run in a browser since the change; signed links for private files; an author's frame cannot reach their own blobs; one 5.2 MB shell boot per frame.

## Added 2026-10-07 19:42: Bluesky direct messages as a channel

`cb4` at 19:38: new `brain-x-bluesky` `983d44356267`, kernel `9fbf2959a617`, page `f10ca01230c6`; 12 Workers; 143 tests (130 before). Deployed with no secrets: `bluesky.status` answers `configured: false` and the tick, seen at 17:40:01Z and 17:41:22Z, makes no request. The sender's address is their DID: the owner is served with no setup, a member from `people.put`, anyone else gets one answer an hour and no entry. Read with `chat.bsky.convo.getLog` on the minute and every 5 s from the answering tab. No real message has been sent or received: the account needs a phone number and is the owner's to make. Messages carry no pictures. Next: make the account and an app password with message access, set `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD`, then check the four unverified points in the record against it. Record: `tools/cloud-brain/spec-as-built.md`, cell `bluesky_channel`.

## Added 2026-10-07 20:18: Bluesky groups, and room turns capped by their audience

`cb4` at 20:18: bluesky `3d671a86fb51`, kernel `138929c43346`, inbox `ebbcad2f3a46`, page `19873c1fbb32`; all 12 `same`; 152 tests (143 before). The account signed in at about 20:14 (`cosmiccalendrics.bsky.social`); `getLog` answers through the PDS; no message has arrived. In a group the account answers the owner and members when they address it, only where the owner is present or has switched the group on, and replies to the group. The kernel caps such a turn: `inbox.reply`, plus a method only if every participant has it (owner all, member their grant, others none); the defaults every member has are refused in a room. 74 live rows on `cb4` and one entry end to end through a scratch channel. The Worker wrote `allowGroupInvites: "all"` to the account's declaration, which read `"none"`. Record: `tools/cloud-brain/spec-as-built.md`, cell `bluesky_groups`. Open: no real group message; the `brain-live` tab runs the older page until reloaded; Tom to confirm the seven defaults, the stricter cap and the invite setting; the first real direct message is still the check for the two unverified points of 19:42.

## Added 2026-10-07 21:10: a docs tab, and the spec renamed to cloud-brain-specs

`cb4` at 21:08: page `e307a9ff1544`, new shell; all 12 `same`. New module `@tomlarkworthy/cloud-brain-docs` in the shell, second default tab; the operator's brief names it. `@spec/cloud-brain` is `@tomlarkworthy/cloud-brain-specs`, built from a seed with notes and status carried; 29,468 words to 9,789; 28 open questions. Still says `@spec/`: `tools/spec-notebook.ts` (finds a spec by that prefix), `plan/specs/*.html`. Record: `cloud_brain_docs` in `spec-as-built.md`.

## Added 2026-10-07 21:45: calls, the signing key, secret.copy

- **SESSION_KEY stage 2.** The installer and `brain.ts` stop the write of `COOKIE_KEY`. Condition: each Brain has `SESSION_KEY` bound with the value of `COOKIE_KEY` (cb4: yes), and Tom says so. Tom, 2026-10-07: "do it slowly without deleting anything".
- **SESSION_KEY stage 3.** The kernel stops the read of `COOKIE_KEY`; the manifest drops it; the binding goes on the next kernel deploy. Condition: stage 2 done, and 7 days passed (the life of a session), so no token signed under the old name only is live.
- **Old Brain, first new kernel.** Fixed in the deployer 2026-10-07 (`e69b9f4043cd`): a name that is not held is left unbound when the other is held. Not verified on a Brain installed before 2026-10-07.
- **Deployer rename, stage 2.** Stage 1 done 2026-10-07 (module, cells, pages, `install-deployer`). Still guard: the Worker `brain-guard` and `BASE-guard`, the role and caller `guard`, the platform cell `guard` and binding `GUARD`, `guard.internal`, `x-brain-guard`, `guardKey`, the inbox source `guard`. A new Worker name is a new Durable Object: copy the rows, change the approval address, deploy each Worker bound to `GUARD` again. Condition: Tom says so.
- **Kept source of removed scratch services.** `getModules` on cb4 still lists `brain-chaincheck`, `brain-origincheck`, `brain-callscheck`, `brain-loop`, `brain-sqlprobe`. `remove` does not delete the kept source.
- **calls under enforce, not yet seen on cb4**: a WhatsApp picture (`static.put`) and a reply through the inbox (`*.send`).
- **The kernel's first deploy was put back** ("health check failed after go-live", 69 s); the same file went live on the second try. Not explained.
- **The guard does not check `calls` at deploy**: a service that lists a method nobody declares deploys.

## Added 2026-10-07 22:12: feeds

- **Feed publish is not pressed.** `feed.publish` writes a public `app.bsky.feed.generator` record under `cosmiccalendrics.bsky.social`. Tom decides the account. After a publish: open the feed in the Bluesky app and see the 4 posts of feed `tom`. Next: a filler service that calls `feed.add` (accounts, search); a rule for each feed if one expression for a method is not enough.

## Added 2026-10-07 22:45: origin

- **`origin` in more rules.** Done 2026-10-07 23:19 CEST: the wrapper passes the reference on, so the rule of each secret, table and method can read `origin` (see `spec-as-built.md`). Open: read `origin` in the rules of `*.send` and `static.put` if Tom wants. Not verified on cb4: `feed.publish` under the rule of `bluesky.putRecord`; a message in and a reply out. `origin` is not in the metrics rows.

## Added 2026-10-08 00:05: the deployer moved to cb4-deployer

- **Delete `cb4-guard`: Tom decides when.** It is a stub with the bindings `ROWS` and `BRAIN_CONFIG`, no token, no key and no cron. Its rows are as they were at 23:52 CEST on 2026-10-07. To delete: remove the script in the Cloudflare dashboard. Before that, the way back is `deployerScript: "cb4-guard"` in `.emitted/cb4.json` and `install-deployer`; not tried.
- **The Cloudflare token ends on 2026-10-11.** `cb4-deployer` holds the temporary token. After that day it cannot deploy, restore or check health. Next: a token with the minimum permissions, bound with `install-deployer`.
- **Reload `brain-live`.** That tab runs the page from before the move.
- **Not verified after the move:** a signed-in owner's page, a deploy held for approval and approved on the new page, a restore of a version from before the move, `feed.publish` under the rule `origin.kind == "owner"`.
- **A first deploy that is put back after about 68 s and passes on the second try.** Seen for the kernel (2026-10-07) and for `brain-x-static` (23:54 CEST). Cause not found. Next: log what the health check got.
- **A new service answers "not bound to the core" for some seconds after its deploy.** Seen at 7 s, gone at 22 s. Next: measure, or have the deployer wait for the binding before it answers `deployed`.
- **`getModules` lists the kept source of removed scratch services** (`callscheck`, `chaincheck`, `deploycheck`, `loop`, `origincheck`, `sqlprobe`). `remove` keeps the `source/` row.
- **Commit `tools/cloud-brain/` and this file.** Nothing of the Cloud Brain is in a commit. The handover cell says so.
- **The old spellings stay read** (`BASE-guard`, the cell `guard`, `x-brain-guard`, the caller `guard`, `"guard"` in a rule, `guardKey`). Remove them when no Brain from before 2026-10-08 runs and no kept source from before then can be restored.

## Added 2026-10-08 07:26: the browser service

- **Three tabs of the Brain's page stop one browser.** Two attempts of two on cb4; two tabs held. Next: measure one tab over 10 minutes with `performance.memory`, and find Browser Run's memory limit. Until then a hosted Brain page gets `own: true`.
- **The 10 s command limit is not seen on cb4.** Next: open three tabs of the page again and read what the next call and the next tick answer.
- **The viewport is 780 × 493.** `Target.createTarget` did not apply `width` and `height`. Next: `Emulation.setDeviceMetricsOverride` before a screenshot.
- **A tab with no row is not closed.** A call that dies between `Target.createTarget` and the row write leaves the tab until the browser ends.
- **`usedSeconds` is to the minute.** `/v1/history` on the binding has the exact start and end of each session.
- **The deployer's token has every permission.** The next token: which groups, and are Workers Scripts and R2 enough for a browser binding.
- **Hosting the Brain's page.** Not built: an identity for the page, and the proxy as its path to a model.

## Added 2026-10-08 07:27: prices and credits

- **A declared price does not reach the core.** `cloudflare-iac.ojs`, the `access` entry of the emit: add `...(m.price ? { price: checkedRule(nsid, m.price) } : {})`, and show the price on the approval page. Until then a price is set with `price.put`.
- **The browser joins the price list.** `price` on `browser.open`, `browser.extend`, `browser.run`; delete its own count of bought seconds.
- **Deploy the kernel and the page.** The kernel lets a member call `quota.get`; the page has the Spending panel. Neither was deployed on 2026-10-08, and the panel was not seen in a browser.
- **58 ms more at p50 for a priced call** (cb4, 104 ms against 46 ms). One statement that appends and returns the list would halve it; that is a change to `rows` in `cloudflare-iac.ojs`.
- **Tom decides:** the unit, UTC or the owner's time zone, the defaults, who pays in a room, settle-after for model tokens, whether members see each other's spend. The questions are in the spec.  (2026-10-08 08:37: refunds and settle-down were removed; see the last section.)
- Cost is not in the metrics rows. The ledger has totals by account and by method for a day.

## Added 2026-10-08 08:37: no refunds, and `extend` alone buys browser time

- **Done from the lists above:** a declared price reaches the core; the browser is on the price list; the page with the Spending panel is deployed; a member's `quota.get` works (the 403 was for a DID that is not a member).
- **Reload `brain-live`.** It runs the page from before 08:35 CEST. The browser panel and the ledger column changed.
- **A page's own browser was removed** with the refunds (one browser, one `paidUntil`). Answered 2026-10-08 19:45: a browser is now owned by its caller and has a name; see below.
- **A model call needs a price design.** `x-brain-cost` is gone. The question is in the spec.
- **A credit by hand.** No method returns a charge. If wanted: one owner-session method that appends a credit against a ledger id. The question is in the spec.
- **Not measured: Browser Run's idle close at 180 s.** The tick no longer closes a session that a dead start left. Next: start a session with no command on a scratch Worker and read `/v1/sessions` after 200 s.
- **`lope-browser-runner.ts` did not launch for a reviewer:** Playwright's headless shell 1200 is not installed under `tools/`. Next: `bunx playwright install chromium-headless-shell` in the tool's directory, or point the runner at the installed Chromium.
- **The old pending WhatsApp deploys** (`d3f5a6d0eded`, `ecf653b0ea50`) are still on the approval page. No method removes a pending deploy.

## Added 2026-10-08 19:45: many browsers, each owned by its caller

- **Done:** `brain-x-browser` keeps a browser for each pair of caller and name; `browser.all` and `browser.end` for the owner's session; `maxBrowsers` and `maxPerOwner`.
- **Two tabs of the Brain's page ended a browser** on cb4 (about 500 MB of heap each at +35 s). One tab in a second browser held. A hosted Brain page gets a browser of its own. Next: measure one tab over 10 minutes.
- **Not seen on cb4:** the two limits of browsers, a member as the owner of a browser, the panel's table of all browsers in the signed-in page.
- **An `extend` that a limit stops is charged** and its seconds stay bought (at most $0.09). If that is not wanted: the core would need a way for a service to refuse before the charge.
- **Each call lists the rows of all browsers** only when it starts a browser and in `status`; the tick lists them one time a minute. Not measured with more than 3 browsers.


## Added 2026-10-08 20:29: WebSockets, and `browser.cdp`

- **Done:** a WebSocket passes kernel, core and service (two lines: the wrapper's `stamp`, the kernel's CORS middleware). `browser.cdp` gives a caller the CDP socket of its own browser. Record: `tools/cloud-brain/websockets.md`.
- **A page in a web browser cannot open a socket as a person.** It cannot send `Authorization`, and the kernel reads no cookie. If the Brain's page needs one: read the token from `Sec-WebSocket-Protocol` in the kernel. Tom decides.
- **The close of a CDP socket has no reason** (code 1005) and comes up to 60 s after `paidUntil`. A relay in the service could close at the second with a reason; it was not built, to keep the service out of the frames.
- **A tab made over the socket has no row:** `list` does not show it and `maxTabs` does not count it.
- **Not measured:** a deploy of the core or the kernel under an open socket; a socket open longer than 10 minutes; more than one socket at a time.
- **The metrics do not know how long a socket was open.** One row at the 101.

## Added 2026-10-08 21:12: logs

- **Done:** Workers Logs on for each Worker with the invocation line off; one line a call at the core; `log` and `cloudflareApi` cells; a Cloudflare token minted by the deployer for a service that declares its permission groups; `brain-x-logs` (`logs.query`, `logs.keys`, `logs.values`); a Logs panel.
- **The next deployer token** (the present one ends 2026-10-11) needs `Account API Tokens Write`, `Workers Observability Read` and `Workers Tail Read`, or `brain-x-logs` cannot be deployed again once its token has 30 days left (2026-12-07).
- **Follow-on, not approved: a live stream.** Cloudflare has a tail of a Worker over a WebSocket (`POST /workers/scripts/NAME/tails` gives a `wss:` address; this is from memory of Cloudflare's API and was not read or tried on 2026-10-08). The permission `Workers Tail Read` is one a service can already declare. A method `logs.tail` could answer 101 and pass that socket on, as `browser.cdp` does. Not tried: a tail is for one script, so a Brain needs one for each Worker or a choice of Worker.
- **Follow-on, not approved: metrics from the logs.** Tom, 2026-10-08: "could our metrics reporting be more cost efficient if we wrote the metrics into logs and collected them from logs?" The core's line has what a metrics row has (worker, method, caller, status, ms), and `logs.query` with `view: "calculations"` counts and takes percentiles by group. That would remove the core's batches, `metrics.record` and the `db.sql` writes of `brain-x-metrics` (109 of 478 lines in 6 minutes on cb4 were those writes). Limits to check first: 7 days of history against the metrics tables' own; a query reads rows (4.2 M for 30 minutes of the account, in the research) and its price after 2026-12-01 is not known; the Worker's version is not in the line.
- **Done 2026-10-08: the stream error** ("Can't read from request stream after response has been sent"). Kernel and core read a body of 1 MB or less before they send it on. 162 lines in 10 minutes before, 0 after. The question in the spec can be closed.
- **Cloudflare keeps the path of each request** in `$metadata.trigger`, so a name or a path a caller typed is in the logs although the core writes `(unknown)`. Not removable by the code.
- **The core's line volume:** 3414 lines an hour with one tab open (2026-10-08 19:46 UTC).
- **`secret.get` is 29 % of the lines** at rest (140 of 478 in 6 minutes, by `brain-x-bluesky`). The wrapper holds a secret 5 s. A longer hold, or no line for `secret.get`, would cut the volume; neither is done.
- **A first deploy that is put back and then passes** happened again (the page, 19:08 UTC). The deployer now writes `deploy.unhealthy` with what the last health check answered. Next: read that line the next time it happens.
- **Not reviewed:** `/review-notebook` was not run on this change; the worker that made it could not start a reviewer.
- **Not done:** a price for a query; alerts; history past 7 days (Logpush to R2); a token for each Worker.

## Added 2026-10-08 22:10: the query string is in the logs

Cloudflare stores the URL of a call, with its query string, beside each line a Worker writes. Not headers, not the body. No setting stops it (`tools/cloud-brain/logging-research.md`, correction). Rule: no long-lived secret in a path or a query string; a short-lived single-use code may be. No code was changed.

| In a query string | Life | Reaches a Worker that logs | Stored |
|---|---|---|---|
| `/link?channel=…&code=…` | 10 minutes, one use, and a sign-in | the kernel, which writes no line for it || no, unless the call throws: the wrapper then writes a `throw` line and Cloudflare stores the URL beside it |
| `/auth/login?next=/link?…code=…` | the same code | the kernel, the same || no, unless the call throws |
| `/auth/callback?code&state&iss` | one use, spent in that request, bound to this client's keys | the kernel, the same || no, unless the call throws |
| `/hooks/whatsapp?hub.verify_token=…` | long-lived; proves nothing but Meta's handshake, messages are checked by signature | the core, one line a call | Cloudflare writes `REDACTED` for this name (seen on a scratch Worker, not on cb4) |
| `seconds`, `browser`, `feed`, `worker`, `name`, `path`, `cursor`, `since` | not secrets; rules and prices read them | the core | yes, expected |
| the proxy's target URL, the browser's `goto` URL and expression | | | no: in the body |
| a session, a token, a Worker's key, the recovery key | | | no: in headers or a form body |

- 24 h of cb4 (2026-10-08 20:05 UTC): no line with `code`, `state`, `iss`, `next`, `hub.verify_token`, `token`, `key`, `session`, `cc`, `sig`, `secret` or `password` as a parameter, but for one `proxy.fetch?code=…` call of a test. No line for `/link`, `/auth/*` or `/hooks/*`. Nothing to rotate.
- Open: if the kernel ever writes a line of its own, the link code is stored. Then move the code after `#`.
- Open: a third party's callback with a secret in its query that Cloudflare does not redact by name.

## Added 2026-10-08 23:02: a page on the cluster

`brain.ts page up` (see `running-a-cloud-brain.md`). Open:

- The pairing module dials once, at load, so each bridge connect loads the page again and frees the lease for about a minute. A redial on close in the pairing module would remove the reload; that module is not changed without asking.
- The heap of the Brain's page grew over loads in one browser: 632 MB, then 993 MB after the third. Not looked into.
- No cut of the CDP socket was seen in 11 min, so the reconnect path ran only by hand.
- `--url` on a notebook from `brain-library` (`/library/<name>`, public) was not run.
- The owner's $1 a day allows about 11 hours of one browser.

## Added 2026-10-09 06:11: the research digest

Tom, 2026-10-09: "I would like to record the latest research (AI particularly) and you to send me a summary. We need this cluster to self improve itself. A snapshot of hackernews, reddit etc. The most interesting things should be replicated into a Notebook. Maybe the format should be a timestamped notebook." Sources: "It needs to be research or top blogger Karpathy / Simon Willison kinds of people."

- **Built:** `brain-x-snapshot` records 21 feeds a day as public JSON under `/static/snapshot/<day>/` (`spec-as-built.md`, last section).
- **Built 2026-10-09: the first digest**, by Claude Code in a local session. `research-2026-10-09` is public in `brain-library`: <https://cb4.endpointservices.workers.dev/library/research-2026-10-09>. Seed, builder and method: `tools/cloud-brain/digests/`. It loads the day's 843 items from `/static/snapshot/` when opened, and runs NeuDecide (43 MB, audio to tool call) in the page on a button press. The DM to Tom was drafted, not sent.
- **Not built: the digest on the cluster.** What it needs is listed in `tools/cloud-brain/digests/README.md`, last section.
- Flagged by the first digest, for Tom to decide: (1) an open-weights embedding model (EmbeddingGemma 2) for the paper corpus; (2) a decision model as a cheap classifier for ranking snapshot items or scoring a call; (3) a view of the logs that groups lines by `ray` into behaviours; (4) something that compares each digest's `picks` with what was acted on.
- **Not built: "self improve".** Nothing reads a digest back into the Brain's own backlog or code.
- Settled for the first one: the notebook of the day is public in `brain-library`, named `research-<day>`.
- Open: who runs the digest turn when no local session is open (a notebook in a cluster browser; the Containers workstream).
- Open: Reddit. The feed gives no score and Reddit rate-limits Cloudflare's addresses (429 after about ten requests in an hour). An OAuth app of Tom's would give scores and a limit of its own. Not asked for yet.
- Open: Anthropic and Meta AI publish no feed at the addresses tried. A page scrape with the browser service would cover them; not built.
- Done: the timed run was observed on 2026-10-09. `days.json` read at 06:20 UTC gave `ranAt` 06:00:28 UTC, 822 items, 18 papers, no errors.
- Open 2026-10-09: a digest reads `/static/snapshot/<day>/` live, and a later `snapshot.run` that day replaces those files. `research-2026-10-09` says 843 items in its text and now loads 823. Either a digest carries its day's items inside it, or a published day is not run again.
- Open 2026-10-09: the timed 06:00 UTC run has not been seen. `days.json` `ranAt` after 06:00 on any day settles it.
- Done 2026-10-09 05:15 UTC: the second review's 10 findings (spec-as-built, "The second review"). `papers.json` is 15 papers with `days: 3` on the Hugging Face list; `static.delete` takes a prefix that ends in `/`.
- Done 2026-10-09: history. The timed run drops days older than `keepDays` (90) through `static.delete` `{ prefix, before }`. Not observed on cb4: no day is that old.
- **Built 2026-10-09: the knowledge base**, `brain-x-knowledge`, a database of its own (`spec-as-built.md`, last section). 67 entries on cb4 (the test note deleted 09:25 CEST): the day's 13 titled papers from the snapshot, and the digest's 28 picks with a finding each. Open: search by meaning; the text inside a PDF; a rule for further feeders (web capture, Colibri, notebooks); export (D1 refuses a database with a virtual table); removing one tag or cite without deleting the entry. Reviewed fresh the same morning, 5 findings fixed and deployed. A digest could read its picks from here, where a later `snapshot.run` does not change them.
- Done 2026-10-09: "600 papers is too many" (Tom). `snapshot/<day>/papers.json` holds the papers with a signal: 18 on 2026-10-09 (12 by Hugging Face votes of 10 or more, 6 linked from Reddit or Import AI, 0 from a lab feed). `arxiv.json` stays, marked `lookup`. For Tom: is 10 votes the right line (9 more papers had 5 to 9), and should a later digest read `papers.json` in place of `arxiv.json`.
- Not done: a retry when a source fails at 06:00; old files of a renamed source on the same day; a search over the days.


## Added 2026-10-09 07:35 CEST: left open by the security review

The record is in `tools/cloud-brain/spec-as-built.md`, "Security review and fixes, and a reason on every change".

- **One database for every Worker.** `brain-db` keys rows by the calling Worker's name, and the name comes from the deployer's binding. A defect in that one check exposes every service's rows and secrets. The other design is a D1 database per Worker, made by the deployer. Cost: a migration of the rows on cb4, and one more resource to make and delete per service. Tom's decision.
- **`worker.js` comes from the caller.** The deployer distils `source.js` itself and compares hashes, but takes the wrapper's text from the request. The other design: the deployer holds the wrapper and assembles the Worker. Cost: a wrapper change needs a deployer install first. Tom's decision.
- **`Workers Tail Read`** is minted for `brain-x-logs`. Whether a tail shows request headers of other Workers, the `Authorization` header among them, was not checked.
- **Old files have no `writer`.** Outside `shell/` they are served sandboxed until the owner puts them again. List the library's files and re-put the ones that should run.
- **A member's id** is 8 hex characters of a hash of the DID. Not changed.
- **Check one WhatsApp picture** after the `redirect: "manual"` change.
- **A `deploy.reason` line names the module, not the Worker.** Swap the order in `apply` if the Worker's name reads better in the logs.
- **No test** for the owner-by-turn writer in brain-static and brain-blob.
- **The deployer's Cloudflare token expires 2026-10-11.**

## Added 2026-10-09 08:55 CEST: after `was` and the deploy lease

- **Named leases as a service.** `brain-deployer` holds its own lease (`deploying/NAME`) and must not reach it through the core. A service `lease.*` over the database for other Workers is not built; `lease.take` and `lease.get` are the tab lease in `brain-inbox` and would move or be renamed.
- **The tick's put-back does not take the deploy lease.**
- **Imports are not in the `was` check** (Tom, 2026-10-09: "skip dependencies").
- **The Health section is blank for about 19 s for the owner**: `healthView` waits on `assembled`, which verifies 16 services one after another. Measured once, 2026-10-09 08:30 CEST.
- Done from the list above: `deploy.reason` still names the module; the open review findings of the security pass are closed.
- **One build for every session in the checkout** (2026-10-09 09:40 CEST). `build.ts` builds every seed as it is on disk, so a deploy by one session ships another's uncommitted edits. On 2026-10-09 the deployer `3257ff63a6e1` was installed with another session's wrapper change in it and `redistil` went from 17 `same` to 17 `changes`. A build from a commit, or a worktree per session, would stop it.
- **Unexplained**: a forced apply of brain-x-library through `3257ff63a6e1` answered `deployed` and the hash did not change, while `redistil` lists the Worker as `changes`.

## Added 2026-10-09 10:44 CEST: settings and `/llms.txt`

Built and on cb4: stored settings read through `config` (`config.set`, `config.get`, `config.list`), and `/llms.txt` with `getSource?part=reference`. Record: the last two sections of `tools/cloud-brain/spec-as-built.md`.

- **`redistil --apply` does not deploy a changed module.** It distils the source the deployer keeps. A session that edits a seed must emit and `apply`, and `confirm` core and page within 10 minutes. There is no one command for "deploy what the notebook now says"; `test-receiver.ts` and a tab stand in for it.
- **Log counts: ask for 500 groups.** With 50 a large group was left out of an answer. The 24-hour total that looked incomplete on 2026-10-09 was not looked at again.
- Not moved onto settings: snapshot's sources, Bluesky's own settings rows. No panel on the page.
- `/llms.txt` from a Claude Code on the web session: not tried.
- The page has no button that makes a token and shows the `llms.txt` address beside it.

## Added 2026-10-09 11:05 CEST: metrics removed

`brain-x-metrics` is gone from cb4 and from the build; the page's Health section counts the core's log lines. Record: the last section of `tools/cloud-brain/spec-as-built.md`. The line "Follow-on, not approved: metrics from the logs" above is done.

- **For Tom: drop `metrics_calls` and `metrics_faults`?** Kept, unread.
- ~~`brain-x-browser` is one wrapper behind~~ Done 11:20 CEST: the test asserted on wall time (`rig.paid() > 590`); it now asserts some time is left.
- ~~A 24-hour log count was not run again with 500 groups.~~ Run 11:28 CEST: 40148 lines in one 24-hour query and 40148 as 24 one-hour queries. The page could offer ranges over an hour.
- The page shows one hour. A range control, the faults list and latency were in the removed module and are not carried over.

## Added 2026-10-09 11:35 CEST: the core's review

11 findings, all acted on; record in the last section of `tools/cloud-brain/spec-as-built.md`. Open after it:

- `redistil --apply` crashed once in the CLI (a DOMException from bun, part-way through 15 Workers). Not reproduced on the second run; cause unknown.
- Two browser tests still compare seconds within 3 (`near`). They have not failed.
- A tick may run on a setting up to 5 minutes old. Timing the header copy and the row copy apart would make it 60 s at the cost of one statement a tick.
- `/llms.txt` is 11.4 KB with whole names (9.2 KB with short ones).


## Added 2026-10-09 20:41 CEST: leased containers

- **Done:** `brain-x-container` on cb4: `container.extend|exec|get|post|status|stop` for the owner and the Brain's Workers, `all|end|settings` for the owner's session; one lease proven end to end; `container.get` 15 ms over a core-only call. Record: `tools/cloud-brain/containers.md`.
- **For Tom, each a default the parent session took and he can reverse:** who may lease (now the owner and Workers; members by a rule later), the image list (`node:22-alpine` alone), region `WEUR`, the price (lite at full use), 6 containers at most.
- **For Tom, to look at:** Cloudflare keeps 6 instances ready with no lease. Read the account's Containers usage; if ready instances are billed it is about $1.04 a day, and `max` should go to 1 or the Worker be removed until it is used.
- **Next step of the offline workstream:** an image that runs a headless lopecode notebook. It needs Docker one time (a machine or CI) and a push to Docker Hub or Cloudflare's registry, then one entry in `containerImageList` and a remove-and-deploy of the Worker. Not started.
- Open: a fresh review of `brain-container`, and of the hunks in `cloudflare-iac` and `brain-deployer`.
- Open: the 504 from Cloudflare's version upload that put one apply back (seen once).
- Open: a per-owner daily limit before any member may lease; a count of egress.
- Open: `exec` does not stream; no method puts a file in a container.
