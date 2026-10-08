# Logs for the Cloud Brain: what Cloudflare gives, and the least to add

Research only, 2026-10-08, 18:10–18:25 UTC. Nothing in the Brain changed. Probes ran against one scratch Worker
outside the Brain, `cbx-logprobe`, deployed and deleted in that window, and read-only against cb4's settings.
Scripts: `tools/scratch/log-probe/`. Raw answers: `tools/scratch/log-probe/results/` (git-ignored, local only).
Docs were fetched 2026-10-08; each URL is given where it is used.

Tom's request: "I think we just need the minimum to reuse what it offers, but make it available as a service so
other things can read it (if they have permissions) … Does CF have its own log queries? We should pass that
through as well I think."

## Built, 2026-10-08

Sections 5 a to h and the credential flow iii were built the same day: see `brain-logs.ojs` and "Logs" in `spec-as-built.md`. Three things in this research were wrong or incomplete, found on cb4:

- `observability` in the metadata of a **version** upload is ignored. It is a setting of the script (`PATCH …/script-settings`). Section 5a says "one key in two places"; that left 14 of 17 scripts with no logs.
- The `cf-ray` a Worker reads has no colo: `a4775ef6ddbee513`, where the caller receives `a4775ef6ddbee513-TXL`.
- A line was readable 11 to 16 s after its call (3 calls), inside the "10 s to 45 s" below.

### Correction, 2026-10-08 20:10 UTC: custom lines carry the URL and the query string

"What the invocation line keeps in clear" says that with `invocation_logs: false` no event had request headers.
That is right, and incomplete: each custom line still has `$workers.event.request`.

| Stored beside each `console.log` line | Not stored |
|---|---|
| `method`, `url` (with the query string), `path`, `search` (each parameter by name) | headers, `cf`, the body, the response |

Seen on `cbx-logprobe` with `invocation_logs: false` (`tools/scratch/log-probe/reqprobe.ts`, `names.ts`,
`shapes.ts`) and on `cb4-core`:

- The URL is the one that Worker was called with. The core's lines have `https://core.internal/…?…`, as the kernel
  forwarded it. A line from the handler of a WebSocket message and a line written in `waitUntil` have the URL of the
  upgrade or of the call. A `scheduled` event has no request.
- A Worker that writes no line stores nothing for that call.
- Cloudflare replaces some values with `REDACTED` or `********`. Not documented; one request of each.
  By name: `token`, `key`, `jwt`, `password`, `passwd`, `auth`, `Authorization`, `access_token`, `api_key`,
  `hub.verify_token`, and each name with `secret` in it. By shape: 32 or more hex or mixed characters, a UUID, a JWT.
  Stored in clear: `code`, `state`, `iss`, `sig`, `signature`, `session`, `ticket`, `nonce`, `cc`, `pin`, `otp`, a
  24-character hex value (the length of a link code), a DID, and a URL inside a parameter.
- The docs name no setting that stops it (<https://developers.cloudflare.com/workers/observability/logs/workers-logs/>,
  read 2026-10-08: `enabled`, `head_sampling_rate`, `invocation_logs` only).

Rule: no long-lived secret in a path or a query string. A short-lived single-use code may be. No code was changed.

The text below is as it was written before the build.

## Result

1. Cloudflare has it: **Workers Logs** stores every `console.log` and one line per invocation, and a REST
   **query API** filters, searches and aggregates them. Both worked on this account today.
2. **cb4 keeps no logs today.** All 18 `cb4*` scripts have `observability: null`, `logpush: false`, no tail
   consumer (`settings.ts`). The deployer's upload metadata has no `observability` key
   (`brain-deployer.ojs:290`, `:676`).
3. **Cloudflare already joins the hops.** Every log line has `$metadata.traceId`, and it was the same across a
   service-binding call, with only `observability: { enabled: true }`. The edge hop also has
   `$metadata.rayId`, which is the `cf-ray` the client already receives. So `cf-ray` → trace → every hop, with
   no id of our own.
4. **The automatic invocation line stores request headers and the full URL.** Redaction is by name only. The
   Brain's own headers and a link code in a query string were stored in clear (table below). This decides the
   design: invocation logs off, one line of our own.
5. A token with **Workers Observability Read** alone can query. The deployer can mint that token by API
   (tried: mint, use, roll, delete).

## 1. Workers Logs

Docs: <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>,
<https://developers.cloudflare.com/workers/platform/pricing/>.

Enabled per script. In the upload metadata the key is `observability`; the upload API answered with the
normalised form:

```
sent      { enabled: true, head_sampling_rate: 1, logs: { enabled: true, invocation_logs: true, head_sampling_rate: 1 }, traces: { enabled: true, head_sampling_rate: 1 } }
echoed    {"enabled":true,"head_sampling_rate":1,"logs":{"enabled":true,"head_sampling_rate":1,"persist":null,"invocation_logs":true},"traces":{"enabled":true,"persist":null,"head_sampling_rate":1}}
sent      { enabled: true }
echoed    {"enabled":true,"head_sampling_rate":null}
```

| | |
|---|---|
| Object logs | `console.log({ at: "a.start", n: 1, nested: { deep: { z: 9 } } })` is stored as fields. `at`, `n`, `nested.deep.z` came back from the `keys` endpoint and filtered by type (`status >= 400` as a number worked). |
| JSON string | `console.log(JSON.stringify({...}))` is parsed the same way (the `a.end` line had `status`, `ms` as fields). |
| Mixed arguments | `console.log("text", id, { extra: true })` becomes one `message` string. Log one object. |
| Level | `console.error` sets `level: "error"`. |
| Exception | An uncaught throw is its own line: `{ message, exception: { name, stack, timestamp } }`, in each hop it passed through. |
| Invocation line | `$metadata.type = "cf-worker-event"`: `$workers.outcome`, `wallTimeMs`, `cpuTimeMs`, `scriptVersion.id`, `eventType`, `event.request.{url, method, path, search.*, headers.*, cf.*}`, `event.response.status`. |
| On every line | `$metadata.{requestId, traceId, spanId, trigger, service, level, timestampNs, eventSize}`, `$workers.scriptName`, `$workers.scriptVersion.id`. `rayId` only on the hop that came from the internet. |
| Size | Docs: 256 KB a log. Tried: a 300 000-character field was cut to 262 144 characters, and `$workers.truncated` stayed `false`. |
| Retention | Docs: 7 days on Workers Paid, 3 days on Free. |
| Volume | Docs: 20 million events a month included on Paid, then $0.60 a million; 200 000 a day on Free. 5 billion a day an account, then a 1 % sample. |
| Sampling | `head_sampling_rate` 0 to 1, default 1. |
| Delay | A query 10 s after the calls found 0 events; 45 s after found all 37. Not measured more finely. |
| Pricing change | Docs: "Beginning December 1, 2026, Workers Logs will use Cloudflare Observability pricing". The new prices were not on the pages fetched. |

### What the invocation line keeps in clear

One request with invented values (`redact.json`, `min.json`):

```
header authorization, x-api-key          "********"
header cookie, x-brain-key               "REDACTED"
query  token, access_token               "REDACTED" / "********"
header x-custom                          stored
header x-brain-origin                    stored      the core's origin reference
header x-brain-deployer, x-brain-guard   stored      these carry BRAIN_KEY (cloudflare-iac.ojs:589, :661)
header x-brain-session, x-hub-signature-256   stored
query  code, state, sig, cc              stored      /link?channel=…&code=… is a live path (brain-kernel.ojs:34)
```

So with invocation logs on, the deployer's key and each link code would sit in a store that any holder of the
logs permission can read. With `invocation_logs: false` no event had request headers (`noinv.json`), and the
custom lines, the exception lines and the shared `traceId` were still there. What is lost is the automatic
`outcome`, `wallTimeMs` and `cpuTimeMs`; our own line carries status and ms, not CPU.

Not tried: whether renaming the headers to contain `key` or `token` would be enough. The query string would
still be stored, so it would not be.

## 2. The query API

Docs: <https://developers.cloudflare.com/api/resources/workers/subresources/observability/subresources/telemetry/methods/query/>,
<https://developers.cloudflare.com/workers/observability/query-builder/>.

```
POST /accounts/{account}/workers/observability/telemetry/query     run a query
POST /accounts/{account}/workers/observability/telemetry/keys      the field names seen in a time range
POST /accounts/{account}/workers/observability/telemetry/values    the values of one field
GET  /accounts/{account}/workers/observability/queries             saved queries (answered [] here)
GET  /accounts/{account}/workers/observability/destinations        export destinations (answered [] here)
```

Request: `queryId`, `timeframe { from, to }` in ms, `view` (`events`, `invocations`, `traces`, `calculations`,
`requests`, `agents`), `limit` (2000 at most), `offset`, and `parameters`: `datasets`, `filters` (key,
operation, type, value; nested to depth 4; `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `includes`, `starts_with`,
`regex`, `exists`, `in`, …), `filterCombination`, `needle { value, isRegex, matchCase }` for full text,
`calculations` (`count`, `uniq`, `sum`, `avg`, `median`, `p90`, `p99`, …), `groupBys`, `havings`, `orderBy`.

A real query, all lines of one trace (the trace id came from a query on `$metadata.rayId`):

```json
{"queryId":"x","timeframe":{"from":…,"to":…},"view":"events","limit":50,
 "parameters":{"datasets":["cloudflare-workers"],
  "filters":[{"key":"$metadata.traceId","operation":"eq","type":"string","value":"<trace id>"}]}}
```

Answer, trimmed: 4 events for the ray, 7 for the trace, both hops.

```
GET /a cf-worker-event   GET https://cbx-logprobe…/a
GET /a cf-worker         a.start
GET /b cf-worker         b
GET /b cf-worker         b.error
GET /b cf-worker-event   GET https://self/b?redact=1&token=REDACT…
GET /a cf-worker         a.end
GET /a cf-worker         plain text line …
```

One event:

```json
{"source":{"level":"error","at":"b.error","trace":"9567…","error":"RuleRefused","status":403},
 "timestamp":1791483490325,"$workers":{"scriptName":"cbx-logprobe","eventType":"fetch"},
 "$metadata":{"requestId":"<id>","traceId":"<id>","spanId":"80dfc2a07b4cfd78","trigger":"GET /b",
  "service":"cbx-logprobe","level":"error","type":"cf-worker","eventSize":883}}
```

| | |
|---|---|
| Views tried | `events` (flat), `invocations` (lines grouped by `requestId`), `traces` (one row a trace: `services`, `spans`, `errors`, `traceDurationMs`), `calculations` (count and p90 of `$workers.wallTimeMs` grouped by trigger and outcome). All answered. |
| Time | 420–550 ms a query from Berlin. `statistics` gives `rows_read` (4.2 M for a 30-minute account-wide range, 11 610 with a trace id). |
| Rate limit | The only header was the general API limit: `ratelimit-policy: "default";q=1200;w=300`, 1200 requests in 5 minutes for the token's owner. No limit special to the query API was seen or found in the docs. |
| Query price | None found in the docs. Unverified under the December pricing. |
| Permission | The API page says `Workers Observability Write`. Tried: a token with only **Workers Observability Read** ran `query` and `keys` (200). One with only `Workers Observability Telemetry Write` got 401. |
| Scope | The dataset is the account's. A filter on `$metadata.service` or `$workers.scriptName` narrows it; the token does not. Per-Worker roles exist in the newer model (<https://developers.cloudflare.com/workers/authorization/workers/>, "Metadata Read-Only … observability data"); not tried. |

## 3. Other routes

| Route | Fits when | Here |
|---|---|---|
| Workers Logs + query API | history, search, aggregates, 7 days | the base to use |
| Automatic traces (`observability.traces`), early beta | spans for fetch and binding calls, OTel export. Docs: names "not yet finalized"; ids do not leave Cloudflare (<https://developers.cloudflare.com/workers/observability/traces/known-limitations/>) | not needed: `traceId` is on log lines without it. No `traceparent` header reached the Worker, so code cannot read the id. |
| Tail Worker (`tail_consumers`) | own filter or own store; gets `logs`, `exceptions`, `outcome` per invocation; Paid; billed by its CPU (<https://developers.cloudflare.com/workers/observability/logs/tail-workers/>) | only if 7 days is too short |
| `wrangler tail` / tail WebSocket | live view while debugging | no history |
| Logpush to R2 | long retention; 10 M a month included, then $0.05 a million | later, if asked for |
| Analytics Engine, GraphQL analytics | counts and sums, no lines | `brain-metrics` already does this |

## 4. What the Brain records today, and what it cannot answer

- `brain-metrics`: counts by worker, version, method, caller kind and status in 10 s batches, and a
  `metrics_faults` row for a 5xx (`brain-core.ojs:177`, `brain-metrics.ojs:85`). No message, no error name,
  no rule, no link between hops.
- The deployer's audit rows: who deployed what and when.
- The core's spend ledger: who was charged for which method.
- `console.*`: one call in all the seeds (`brain-browser.ojs:803`), and it goes nowhere.

| This week | The line that would have answered it |
|---|---|
| Three first-try deploy failures and rollbacks ("core_service: not a function", kernel and `brain-x-static` rolled back, then passed) | the exception line with stack and `scriptVersion.id` from the Worker on probation |
| `quota.get` answered 403 "has no grant" | the core's line: caller, method, `error`, and which rule or grant refused |
| A test saw 200 where 401 was expected (origin reference) | the core's line with `origin.kind` and why the reference was or was not accepted |
| `bluesky.poll` counted at half of `inbox.poll` | lines by `at` from the pump's calls: skipped, busy or error |
| A browser with two Brain tabs ended | the tick's line: session, reason, `paidUntil`, and the Browser Run close reason |

## 5. Design: the least to add

**a. Turn logs on, invocation logs off.** The deployer adds to every upload:
`observability: { enabled: true, logs: { enabled: true, invocation_logs: false } }`. One key in two places;
it changes every Worker's metadata, so every Worker is redeployed once.

**b. One line a call, at the core.** After the answer, in the place `observe` runs now:

```js
console.log({ at: "call", ray, caller, origin, method, worker, status, error, ms, price, rule })
```

The fields are an allow-list written in the code: names and decisions only. No header, no body, no query
string except what the method's price already reads. `error` is the XRPC error name. `rule` is `allow`,
`calls`, `price`, `grant` or `session`: the step that decided. A scrubber is not used, because a scrubber
fails open.

**c. A `log` platform cell for services.** `log({ at: "poll.skipped", reason })` is `console.log` of that
object. No trace id is added by us: Cloudflare stamps `traceId`, `requestId`, `scriptName` and the version.
The wrapper logs an uncaught error by not catching it, or by `console.error({ at: "throw", error, stack })`
where it turns one into a 500.

**d. No trace id of our own.** The kernel puts `cf-ray` in the core's line (it has the header; an inner hop
does not: `inner.ray` was `null`). The client already gets `cf-ray` on every answer. Alternative: mint an id
at the kernel and pass it like the origin reference. Cost: a header on every hop and a field on every line,
for a join Cloudflare already does. Not recommended.

**e. A `logs` service, thin.** `brain-x-logs` with three methods that pass Cloudflare's bodies through:
`logs.query`, `logs.keys`, `logs.values`. The service adds one thing: a filter
`$workers.scriptName starts_with "<base>"` (for example `cb4`) joined with AND around whatever the caller
sent, and `datasets: ["cloudflare-workers"]`. A caller cannot widen it, because the caller's filters sit
inside ours. The answer is returned as Cloudflare gave it.

**f. Rules in CEL.** Default `caller.session` (the owner's own session). To let a service read its own lines,
the method takes `?worker=NAME` in the query string, the service turns it into the `scriptName` filter, and
the owner's rule can be `request.params.worker == caller.worker`. Members: not by default.

**g. Price.** None now: no query cost was found and the rate limit is the account's 1200 in 5 minutes. A
price is one line later if the December pricing charges for queries.

**h. Not built.** No log store, no query language, no retention of our own, no alerting. A panel of four
inputs (time range, worker, text, ray id) and a table.

### Where the Cloudflare credential lives

Today only the deployer holds a Cloudflare token. Three ways:

| | How | Cost |
|---|---|---|
| i. Query in the deployer | `infra.logs` beside the deploy methods | The Worker with the all-powerful token takes a new kind of request from more callers. Keeps one token. |
| ii. A token the owner makes by hand | paste a read-only token into the secret store | Works on any Brain; a manual step for each Brain and each expiry; the value passes through a person and the secret store. |
| iii. The deployer mints it (Tom, 2026-10-08: "the service declares the CF permissions it needs, and the deployer mints an API token for it connected to a secret") | below | The deployer's token needs `Account API Tokens Write`. |

**Recommended: iii.** Tried on the account today (`tokens.ts mint`), three times, each token deleted after:

```
POST /accounts/<acct>/tokens  200   value length 53, expires_on honoured (1 h)
  minted → telemetry/query, telemetry/keys          200
  minted → list scripts                              200     names only
  minted → script settings, D1 list, create token    403 / 401 / 403
  PUT …/tokens/<id>/value (roll)                     200     the old value still answered 200 one call later
  DELETE …/tokens/<id>                               200
```

Facts (docs: <https://developers.cloudflare.com/fundamentals/api/how-to/create-via-api/>,
<https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/>):

- The deployer's token is account-owned (`/accounts/{id}/tokens/verify` 200, `/user/tokens/verify` 401), so
  it mints with `POST /accounts/{id}/tokens`. The permission is **Account API Tokens Write**. User tokens
  use `POST /user/tokens` and need the "Create additional tokens" template.
- Docs: a created token cannot exceed its creator's permissions. So the least deployer token is its present
  needs plus `Account API Tokens Write` plus each group it may hand out. Not tried with a narrow creator.
- Groups: `GET /accounts/{id}/tokens/permission_groups` listed 407. The one needed is
  `Workers Observability Read`, scope `com.cloudflare.api.account`.
- A policy is `{ effect, resources: { "com.cloudflare.api.account.<id>": "*" }, permission_groups: [{ id }] }`.
  `expires_on`, `not_before` and an IP condition are accepted by the docs; `expires_on` was tried.
- A token-count limit was not found.

The flow:

1. A service declares it: `cloudflare.Service(name, fn, { cloudflare: ["Workers Observability Read"] })`.
   It is in the emitted meta and the hash, and the approval page shows it like `browser: true` and `calls`.
2. Refused for a member's service. A recipe apply with it is held for the owner.
3. On deploy the deployer mints a token with exactly those groups, on this account, and attaches the value
   to that Worker as a secret binding. It is never in the Brain's secret store and no method returns it. The
   deployer keeps the token **id** and the group list in its own rows, and writes an audit row for each
   mint, roll and delete.
4. The wrapper gives the service a platform cell (suggested name `cloudflareApi`: a fetch to
   `api.cloudflare.com` with the token and account id filled in) only when the option is declared.
5. Same declared set on a redeploy: keep the binding (Cloudflare keeps a secret across uploads when it is in
   `keep_bindings`) and check the id still exists. Changed set: mint new, attach, delete old. Service
   removed: delete the token.
6. Expiry: 90 days, re-minted by any deploy inside the last 30. A rollback to a version from before a roll
   has a dead value: the restore must re-mint. This is the one new failure the design adds.
7. When the deployer's own token expires, minted tokens are separate account tokens with their own
   `expires_on`. That they keep working is what the docs imply; not tried.

Risks: the deployer's token gains token-create, which with a broad token is close to everything it already
has. A leaked logs token reads every Worker's logs on the account for up to 90 days, which is why invocation
logs stay off and the line is an allow-list. The old value answering after a roll was seen once; how long it
lasts was not measured, so delete, not roll, is the way to revoke.

### Cost at today's traffic

cb4 had 173 612 invocations in 24 h on a development day (`rpc-performance.md:326`). One line a call at the
core is fewer than that: a call is 3 or more invocations, so about 35 000–60 000 lines a day, 1–2 million a
month, against 20 million included on Paid. Estimate, not a count. On the Free plan the limit is 200 000 a
day, so it also fits, with 3 days kept. Which plan the account is on is still not settled
(`rpc-performance.md:360`).

### What must change

| Where | Change | Deploy |
|---|---|---|
| deployer | `observability` in both metadata builders; mint, keep, roll, delete a token; audit rows; approval-page line | deployer update, then every Worker once |
| wrapper (`cloudflare-iac`) | `log` cell; `cloudflare` option and its cell; log a caught error | with the deployer |
| core | the one line, with `ray` from the kernel's request | probation |
| kernel | pass `cf-ray` on to the core if it does not already | probation |
| new | `brain-x-logs`, three pass-through methods, a small panel | ordinary |

## 6. Questions for Tom

1. Invocation logs off, and our one line in their place? Recommended: yes. On would store `BRAIN_KEY` and
   link codes.
2. Deployer-minted token (iii)? Recommended: yes, with `Account API Tokens Write` named in the next
   deployer token's permission list.
3. Keep `cf-ray` as the id a person quotes? Recommended: yes.
4. 7 days of history enough? Recommended: start there; Logpush to R2 if not.
5. May a service read its own Worker's lines by rule? Recommended: allow the rule to be written, default
   owner only.
6. Is `caller` in the line the DID or the kind? The DID is what answers "why was Scott refused"; it is
   personal data kept 7 days in Cloudflare. Recommended: the DID.

## Not verified

- A cross-Worker trace between two different scripts: the probe called itself over a binding. Same
  mechanism; one script.
- Logs from a scheduled handler, a Durable Object (the deployer) and a WebSocket.
- Per-Worker scoping of a token, and a mint by a narrow creator token.
- The December 2026 prices, and any charge or limit for queries.
- How long a rolled-away value keeps working.
- CPU cost and latency of `console.log` on the call path.
