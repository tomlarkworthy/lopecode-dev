<!-- cell: built_summary -->
This record is the short form for a reader outside the project. Date: 2026-10-08. The full working record is `tools/cloud-brain/spec-as-built.md` in the repository. It is not in this page.

How the Brain works is in `@tomlarkworthy/cloud-brain-docs`. The requirements table above gives the check for each row.

<!-- cell: built_exists -->
### What exists

One Brain, `cb4`, runs in one Cloudflare account. It has 17 Workers (counted 2026-10-09: the deployer and the 16 that `redistil` lists). The table gives the name that the Brain uses. On Cloudflare `brain` is `cb4` and `brain-NAME` is `cb4-NAME`. An 18th script, `cb4-guard`, is a stub: until 2026-10-07 it was the deployer, and it now holds no token and no key.

| Worker | module | job |
|---|---|---|
| `brain-deployer` | `brain-deployer`, `cloudflare-iac` | Holds the Cloudflare token. Distils module source to a Worker and deploys it. Restores a version that fails. |
| `brain` | `brain-kernel` | Answers the internet. Names the caller. Serves the page. |
| `brain-core` | `brain-core` | Routes a method to its Worker. Evaluates the rule of the method. Counts calls. |
| `brain-db` | `brain-db` | SQL tables and secrets. |
| `brain-x-page` | `cloud-brain` | The page as a service. |
| `brain-x-inbox` | `brain-inbox` | The inbox and the lease. |
| `brain-x-static`, `brain-x-blob`, `brain-x-library`, `brain-x-proxy`, `brain-x-feed` | one module each | Files, blobs, saved notebooks, outbound fetch, Bluesky feeds. `brain-x-metrics` was removed on 2026-10-09: calls are counted from the log lines. |
| `brain-x-whatsapp`, `brain-x-bluesky` | one module each | Channels. |
| `brain-x-logs` | `brain-logs` | The logs of this Brain's Workers, read from Cloudflare Workers Logs with Cloudflare's own query bodies. It holds a Cloudflare token with one permission, which the deployer minted for it. |
| `brain-x-knowledge` | `brain-knowledge` | What the Brain knows: one entry per paper, page, post or finding, with where it was found, the path of its kept file, and who entered it and how. A D1 database of its own with a full-text index; no file bytes. The owner searches it; the snapshot, the digest tool and the library (a card for each module of a kept notebook) enter into it. Each entry has one vector in one Vectorize index, and `knowledge.search?semantic=true` answers the entries nearest a question, held to the public ones and the caller's own. 173 entries on cb4, 2026-10-10. |
| `brain-x-snapshot` | `brain-snapshot` | Once a day, at 06:00 UTC, fetches a list of public feeds (arXiv, Hugging Face papers, lab blogs, named writers, Hacker News, Reddit, Lobsters) and keeps each as a public JSON file under `/static/snapshot/<day>/`. It records only: no model call, no ranking, no summary. |
| `brain-x-browser` | `brain-browser` | Remote browsers from Cloudflare Browser Run, for each process of the Brain. A browser has a name and belongs to the caller that bought its time; a page is a tab of one browser. Browser time is bought in seconds by `browser.extend`. |
| `brain-x-container` | `brain-container` | Leased Linux containers from Cloudflare Containers (built 2026-10-09). A container belongs to the caller that bought its time, has a declared image (`node`) and a name, and is destroyed when the time ends. `container.extend` buys seconds; `exec` runs a command; `get` and `post` are its port. The owner and the Brain's Workers only. |
| `brain-x-ai` | `brain-ai` | Open models from Cloudflare Workers AI (built 2026-10-09). `ai.run?model=&usd=` passes the body to Cloudflare's REST address and gives back its answer, a stream included; `ai.models` is Cloudflare's model list with its prices. The price is `usd` as the caller gave it; for a model priced by the token the service sets `max_tokens` so that Cloudflare's cost stays under it. Since 2026-10-10 an OpenAI client is given `https://HOST/xrpc/com.lopecode.brain.ai.v1` as its base URL and a Brain token as its key (`ai.v1/chat/completions`, `ai.v1/embeddings`, `ai.v1/models`); it sends no `usd` and is charged $0.01 a call. A minted Cloudflare token with `Workers AI Read`. No rows. |

A service is one notebook module. The module holds the prose, the code and the tests of the service.

<!-- cell: built_verified -->
### What is verified

| claim | how | date |
|---|---|---|
| Each Worker runs what its source distils to. | `brain.ts redistil` through `cb4-deployer` reports `same` for 13 Workers. | 2026-10-07 23:56 CEST |
| The deployer moves to a new Worker name and no row is lost. | cb4: 44 rows in 7 classes copied from `cb4-guard` to `cb4-deployer`, count and SHA-256 equal per class. 13 Workers deployed again through the new one. The old address answers 410 `Replaced` and has 2 bindings, `ROWS` and `BRAIN_CONFIG`. | 2026-10-07 23:52 to 23:58 CEST |
| A failed version is restored. | cb1: restored in 35.7 s after a failed self-test. The alarm restored a kernel with no confirm. | 2026-10-05 |
| The recovery key rolls the kernel back when the kernel is down. | cb1: 4 s. | 2026-10-05 |
| Only the kernel and the deployer answer the internet. | cb2 and cb4: each other Worker answers 404. | 2026-10-05, 2026-10-07 |
| A session is a bearer token. No cookie is read. | cb4: a session sent as a cookie gets 401. The owner signed in with Bluesky OAuth. | 2026-10-07 |
| A turn runs as its sender. | cb4: an owner turn token gets 401 on `secret.get`. | 2026-10-07 |
| A member Worker calls as its author. | cb4: 112 of 114 rows as expected. The 2 others were wrong expectations. | 2026-10-07 |
| A portal token reaches one member's methods. | cb4: 69 rows. | 2026-10-07 |
| A room turn reaches only what each participant can call. | cb4: 74 rows with real tokens. | 2026-10-07 |
| A file and a blob are read by tag. | cb4: 95 rows, 0 bad. | 2026-10-07 |
| WhatsApp carries a message in and a reply out. | cb4, the owner's number. | 2026-10-07 |
| Bluesky carries a direct message in, and a turn runs. | cb4, `inbox.list`: entry 149 from the owner at 20:17 CEST and entry 164 from a member at 21:58 CEST. Each is done and holds one reply. | 2026-10-07 |
| The Brain sends a Bluesky direct message. | cb4: `bluesky.send` answered `sent: true` 2 times, to one person the owner named. Reported by the session that sent them. | 2026-10-07 |
| `brain-x-feed` writes a public record only when the owner started the chain. | cb4, scratch service with the rule `origin.kind == "owner"`, removed after: 200 for the owner's session, 401 for no sign-in. | 2026-10-07 23:57 CEST |
| A caller opens a page in a remote browser, runs JavaScript in it and reads a screenshot. | cb4: `browser.run` on example.com gave `Example Domain` in 1831 ms with a cold browser and 665 ms with a warm one; 3 tabs in one browser; a second request read what the first one set in the page. | 2026-10-08 |
| Each caller has its own named browsers, each with its own time and its own end. | cb4: the owner's session had browsers `a` and `b`, and the scratch Worker `brain-x-bruser` its own `default`, charged to the owner who started the chain; the Worker got 401 from `browser.all` and `browser.end` and reached no page of the owner; `close` of `a` left `b` answering; two tabs of the Brain's page ended `a` and the one tab in `b` still answered. | 2026-10-08 |
| Browser time is bought before use by `browser.extend` at $0.000025 a second, charged by the core and not given back, and a browser closes when its time has passed. | cb4: `extend?seconds=20` answered `x-brain-price: 0.0005`; 5 refused forms of `seconds` answered 400 and cost 0; `run` with no time answered 409 `NoTime`; 2 failed `open` calls cost 0 and added no time; 2 `extend` calls at one time added 20 s for $0.0005. Earlier that day: pages answered `closed: time ran out` 1 s after `paidUntil`. | 2026-10-08 |
| A caller holds a WebSocket to a service, through the kernel and the core. | cb4, scratch service `brain-x-wsprobe`, removed after: 101 for the owner's session, a token and a Worker by its own key; 401 by the rule with no caller; a price charged at the upgrade; a frame of 33 MB each way. Before the change each upgrade answered 500. | 2026-10-08 |
| The owner reads why a call was refused, why it cost nothing, why a browser ended and why a deploy was put back, from the logs alone. | cb4, `logs.query`: a 401 had `rule: deny, by: manifest`; a 402 had `error: OutOfCredits, price: 0.0015`; a browser had `browser.end, reason: time ran out`; a deploy had `deploy.put-back` with Cloudflare's message "Uncaught Error: boom at start". brain-core: test_one_log_line_a_call_with_these_keys_and_no_secret. | 2026-10-08 |
| A service gets a Cloudflare token of the permissions it declared and no others, by the owner's approval. | cb4: Cloudflare lists the token of `cb4-x-logs` with one group, `Workers Observability Read`, on one account, to 2027-01-06. A token of the same policy read the logs (200) and was refused script settings, script content, secrets, D1 and a token mint (403, 403, 403, 401, 403). brain-deployer: test_a_declared_cloudflare_permission_is_held_for_the_owner_and_minted_for_that_worker_alone. | 2026-10-08 |
| A Worker reads its own log lines and no other Worker's, when the owner's rule says so. | cb4, scratch service `brain-x-logcheck`, removed after: with the rule `caller.session \|\| (caller.kind == "worker" && request.params.worker == caller.worker)` it read 4 lines, all of `cb4-x-logcheck`, and got 401 for `brain-core`. Before the rule both were 401. | 2026-10-08 |
| A standard CDP client drives a remote browser through `browser.cdp`. | cb4: `playwright-core` `connectOverCDP` did `goto`, a click with a wait for the navigation, 4 trusted key events and a screenshot; a raw `Runtime.evaluate` had p50 60.7 ms against 427 ms for `browser.eval`. | 2026-10-08 |
| A Worker calls only the methods that its service declared. | cb4, mode `enforce`: a scratch service that declared `lease.get` got 200 on it and 403 on 4 other methods. | 2026-10-07 |
| A rule reads `origin`, who started a chain of calls. A Worker cannot name an origin of its choice. | cb4, scratch Worker: with the core's reference the next method read `owner`; with none, a changed one, or the name in clear it read the Worker, and a rule with `origin.trusted` answered 401. | 2026-10-07 |
| The wrapper passes the origin on with each call a Worker makes while it answers a call. | cb4, scratch service: 150 calls, 50 at one time, owner and no sign-in mixed; 0 read the origin of another call. A secret with a rule that reads `origin` was read for the owner and refused for no sign-in. | 2026-10-07 |
| Anyone reads a public feed with `app.bsky.feed.getFeedSkeleton`. | cb4: 5 real post URIs in 2 pages with no sign-in. A feed that is not public answers `UnknownFeed`. | 2026-10-07 |
| `secret.copy` gives a secret a second name and shows no value. | cb4: 20 rows, 0 bad, with made-up values. | 2026-10-07 |
| A session from before the key rename is read after it. | cb4: the kernel has both bindings. | 2026-10-07 |
| A priced call is charged to the origin's account for the UTC day, and calls made at one time do not spend past it. | cb4, scratch service, removed after: 150 calls of $0.03, 50 at one time, on $1.00: 33 passed, 117 got 402. A failed call was then given back; since the same day no charge is returned. Through 2 Workers the owner paid at each priced method. Priced p50 104 ms, free 46 ms. | 2026-10-08 |
| The owner changes a value a service reads from `config` with one call and no deploy. A value set at deploy is never replaced. | cb4: `pollMs` 60000 on `brain-x-inbox`, `inbox.poll` 20 → 10 in 10 minutes; a member 403, no session 401, key `owner` 400, the kernel 404. | 2026-10-09 |
| A question finds the module, paper or note nearest it, and a caller's search answers only what that caller reads. | cb4: 172 vectors in one index; the wanted module first for 5 of 7 questions (6 before the cards took later prose, 2026-10-10); 0.45 to 0.55 s; a member granted the search got 73 public entries and none of the 100 private ones (`knowledge-vectors.md`). | 2026-10-10 |
| A module's card is not written again when its notebook is put; it says since when the notebook's copy differs, and the owner indexes it. | cb4: 400 cards given their hash with none written, 0 stale; a scratch module changed twice: `staleSince` set once, $0 charged, old card still found; `library.index` cleared it for $0.00005. | 2026-10-10 |
| `/llms.txt` tells a program how to call this Brain, from the host and the route table of the Brain that answers. | cb4: 6660 bytes; 101 listed names, none 501; a token made as it says called `knowledge.search` with curl. | 2026-10-09 |

The tests of each module run in the page under `simulate`. A deploy is unverified until the page runs those tests from the deployed source.

<!-- cell: built_not_verified -->
### What is not verified

- A sign-in through a PDS other than bsky.social.
- A service JWT from a real PDS against this kernel.
- That a reply to a Bluesky message is shown in the Bluesky app. The entry holds the reply; nobody looked in the app.
- A published feed. No `app.bsky.feed.generator` record was written, and the Bluesky app was not seen to read a feed.
- `feed.publish` on a deployed Brain. The rule of `bluesky.putRecord` reads `origin.kind == "owner"` from 2026-10-08. The joined test under `simulate` passes. On cb4 a member, a member's turn and a token were not tried against the rule.
- The page of a signed-in owner after the deployer moved. The page with no sign-in loads and reads the module list at the new address.
- A Worker that adds posts to a feed under a rule of the owner.
- A Bluesky group. Bluesky refused to make one: both test accounts refuse group invites.
- A second person who signs in as a member.
- An install into a second Cloudflare account.
- The Clone form after the deployer began to distil source.

<!-- cell: built_not_built -->
### What is not built

- Lexicons. An input is not checked against a schema.
- A call from a Worker to another atproto service as the owner.
- A request trace with replay.
- A relay for pairing from a phone. A page in a browser of the cluster pairs without one: `brain.ts page up` carries its dial to `127.0.0.1` over `browser.cdp` (2026-10-08, CLI only).
- An executor with no browser tab. With no tab open, no message is answered.
- A service that fills a feed from accounts or from a search. A feed holds only what `feed.add` gives it.
- A hostname per member. A member's page is a sandboxed frame in the shell.
- CPU limits and SQL metering for a member Worker.
- The Brain's own page hosted in a remote browser. `brain-x-browser` opens pages that are not signed in.
- A tool for the assistant to use the browser.
- A container image that runs a lopecode notebook. `brain-x-container` runs images from Docker Hub; that image has to be built and pushed with Docker one time.
- A cost known only after a call, such as model tokens. A charge is fixed before the call and is not returned.

<!-- cell: built_limits -->
### Known limits

- The Cloudflare token of `cb4-deployer` is temporary and ends on 2026-10-11. After that day no deploy, no restore and no health check by the deployer works on cb4 until a new token is bound. The Workers that run keep running.
- Three tabs of the Brain's own page stopped one remote browser on cb4, two times of two. Two tabs did not. The memory limit of a Browser Run browser is not published.
- A page in a web browser cannot open a WebSocket to the Brain as a person: it cannot set the `Authorization` header, and the kernel reads no cookie. A server-side client and a Worker can.
- A remote browser can live up to 60 s after the time that was bought, until the next tick. Time that is bought is not given back, used or not; one `extend` is $0.09 at most.
- Cloudflare keeps 6 instances of the container image ready with no lease. Whether they are billed was not seen on a bill (2026-10-09); at the full rate it would be $1.04 a day.
- A container's disk is not kept past its lease. The image list of `brain-x-container` changes only by removing the Worker and deploying it again.
- `brain.ts apply` sends the recovery key. The deployer does not hold that deploy for approval. The page's Apply is held.
- A member's files and blobs count separately against one quota.
- A portal token cannot be withdrawn in its 10 minutes.
- The session token is in `localStorage`. Each script on the Brain's page can read it.
- WhatsApp pictures are public files.
- A Bluesky direct message cannot carry a picture.
- A feed is the same for each viewer. The kernel does not read the token that the Bluesky app sends.
- The Brain's Bluesky session tokens are in that Worker's rows, not encrypted.
- The signing key has two names, `SESSION_KEY` and `COOKIE_KEY`, with one value. The old name is not removed.
- Under `enforce`, a WhatsApp picture and a channel reply are not yet seen on cb4. The tests of the modules cover them.
- `secret.copy` is not a step of the key rename. The signing key is a Worker binding, not a row that `secret.copy` reads.
