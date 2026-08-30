# AWS CloudWatch dashboard viewer — research + design

A lopecode notebook that logs into a **shared** CloudWatch dashboard (email + password mode) and
re-renders it with Plot on a grid-container surface. Research findings, verified facts, and the gaps
that need a real share link to close.

Date of research: 2026-07-28. Everything under "Verified" was measured, not assumed.

## 1. What a shared dashboard actually is

Link handed to the viewer:

```
https://cloudwatch.amazonaws.com/dashboard.html?dashboard=<NAME>&context=<base64 JSON>&start=PT3H&end=null
```

`context` base64-decodes to a small JSON object naming the Cognito resources:

| Field | Example | Meaning |
|-------|---------|---------|
| `R` | `us-east-1` | region of the Cognito resources (always us-east-1) |
| `D` | `cw-db-112233445566` | user-pool domain prefix |
| `U` | `us-east-1_AaBb45dde` | **user pool id** |
| `C` | `e18aipaaaabbbbakdm7rc56kk` | **app client id** |
| `I` | `us-east-1:ab12…` | **identity pool id** |
| `O` | `arn:aws:iam::…:role/service-role/CWDBSharing…` | role the viewer assumes |
| `M` | `Public` \| `UsrPwSingle` \| `SSO` | sharing mode |

Email+password sharing is `M = UsrPwSingle`. Invitees get a username and a **temporary password** by
email, and set their own password on first sign-in. There is no AWS API to create these shares — the
console only — but that doesn't matter to us; we only consume the link.

Everything the official viewer does is plain public AWS API calls with Cognito-issued temporary
credentials. There is no private endpoint. That is what makes a replacement viewer possible.

## 2. Permissions the viewer gets

The `CWDBSharing*` role grants exactly:

- `cloudwatch:GetMetricData`
- `cloudwatch:DescribeAlarms` (by default scoped to the alarms on the dashboard at share time)
- `cloudwatch:GetInsightRuleReport`
- `ec2:DescribeTags`

AWS documents that **`GetMetricData` and `ec2:DescribeTags` cannot be scoped down**. So a shared
viewer can query *any* metric in the account — not just the ones on the dashboard. That is the whole
leverage for a "better viewer": arbitrary time ranges, arbitrary periods, metric math, 500 queries
and 100,800 datapoints per call — all things the official widget-image renderer won't give you.

Not granted by default (each needs the account owner to edit the sharing policy):

- `cloudwatch:ListMetrics` — **so there is no metric discovery**. You cannot browse namespaces.
- `logs:*` — Logs Insights widgets are invisible.
- `lambda:InvokeFunction` — custom widgets are invisible.
- composite alarms need `DescribeAlarms: *`.
- Metric widgets with alarm annotations are hidden from shared viewers entirely.

`cloudwatch:GetDashboard` is **not** in the documented role list, yet the reverse-engineering
write-up observes the official app calling it. This is gap #3 below and it decides whether the
viewer can auto-discover widgets or needs the dashboard JSON pasted in once.

## 3. Verified: the browser can do all of this from `file://`

Measured today with `tools/probe-file-storage.mjs`, `tools/probe-builtins.mjs`, and curl.

### CORS — open, including from a null origin

Preflight `OPTIONS` with `Origin: null` against all three endpoints we need
(`cognito-idp.us-east-1`, `cognito-identity.us-east-1`, `monitoring.us-east-1`) returns:

```
access-control-allow-origin: *
access-control-allow-headers: authorization,x-amz-date,x-amz-security-token,
                              x-amz-content-sha256,x-amz-target,content-type,x-amz-user-agent
access-control-allow-methods: POST
access-control-max-age: 172800
```

A real `fetch()` from a `file://` page reached all three (`response.type === "cors"`, real 400/404
status bodies readable). `authorization` and `x-amz-security-token` being allow-listed is the key
fact — SigV4-signed requests work straight from a local file with no proxy.

### Wire protocol

CloudWatch is the AWS **Query protocol**: form-encoded `Action=GetMetricData&Version=2010-08-01`,
XML response. Verified — an unsigned POST returns
`<ErrorResponse xmlns="http://monitoring.amazonaws.com/doc/2010-08-01/">…MissingAuthenticationToken`.
(The coral `x-amz-json-1.0` + `x-amz-target` form also answered, but Query is the documented one.)
Parse the XML with `DOMParser`. Nested params serialize as
`MetricDataQueries.member.1.MetricStat.Metric.Dimensions.member.1.Name=…`.

Cognito is `x-amz-json-1.1` with `x-amz-target: AWSCognitoIdentityProviderService.InitiateAuth` etc.

### Signing

SigV4 needs HMAC-SHA256, i.e. `crypto.subtle`, i.e. a secure context.
**`file://` is a secure context** — verified `isSecureContext: true`, `crypto.subtle: object`.
So use **`aws4fetch`** (~6 KB, SubtleCrypto-based) rather than the AWS SDK v3 (hundreds of KB and
awkward under es-module-shims). Cognito's `GetId`/`GetCredentialsForIdentity` are unsigned anyway.

### Plot is a builtin

Verified by resolving `Plot` in a booted `@tomlarkworthy_blank-notebook.html` — returned the mark
list (`Area`, `Arrow`, `BarX`, …). No import needed.

### lopecode's network patching does not interfere

`patchFetch` only diverts URLs that resolve to an embedded `<script id=…>` block; `patchXHR` only
intercepts `file://`. `https://…amazonaws.com` passes through to native fetch untouched.

## 4. Does localStorage work on `file://`? — Yes in Chromium, with a sharp edge

Verified with a persistent Chromium profile across a browser restart:

| Question | Result |
|---|---|
| `localStorage` on `file://` | **Works.** `location.origin` is the literal string `file://` |
| Survives browser restart (same profile) | **Yes** |
| `sessionStorage`, `indexedDB`, `caches` | all available |
| `document.cookie` | **Silently does not work** — writes are dropped, reads return `""` |
| **Does another local file see the same storage?** | **YES — `b.html` read the key written by `a.html`** |

That last row is the design constraint. **All `file://` documents share one localStorage
partition.** Any other HTML file the user ever opens locally — a downloaded report, a saved page, a
different lopebook — can read a token stored there. Consequences:

- **Store the Cognito refresh token, never the password.** A refresh token is revocable and expires
  (30 days by default); a password is not and does not.
- Namespace the key by user-pool + dashboard (`cwshare:<U>:<dashboard>`) so multiple dashboards
  don't collide.
- Offer a "don't remember me" mode that uses `sessionStorage` instead.
- Wrap every access in `try/catch` — Safari is expected to throw `SecurityError` for storage on
  `file://` (**not verified here**; only Chromium was tested — Firefox and WebKit binaries aren't
  installed). This matches the existing repo convention of reaching storage via `window.X` inside
  `try/catch`.

**Lopecode-specific hazard:** don't let credentials get baked into an export. `save-in-place` /
exporter-3 with `prerender: true` snapshots live DOM into the HTML — a filled-in password field or a
rendered "logged in as…" panel would be serialized into a file that may then be shared. Keep the
auth cell out of `prerender`, and keep tokens in localStorage only, never in a cell whose value the
exporter can capture.

## 5. Proposed auth chain (email + password mode)

```
parse context blob (base64 → {R,D,U,C,I,O,M})
  │
  ├─ first run:  cognito-idp InitiateAuth  ClientId=C
  │                AuthFlow=USER_PASSWORD_AUTH   (fall back to USER_SRP_AUTH — gap #1)
  │              → possibly NEW_PASSWORD_REQUIRED challenge (temp password from the invite email)
  │                → RespondToAuthChallenge
  │              → { IdToken, AccessToken, RefreshToken }
  │              persist RefreshToken to localStorage
  │
  ├─ later runs: InitiateAuth AuthFlow=REFRESH_TOKEN_AUTH → fresh IdToken
  │
  ├─ cognito-identity GetId
  │     { IdentityPoolId: I, Logins: { "cognito-idp.us-east-1.amazonaws.com/<U>": IdToken } }
  ├─ cognito-identity GetCredentialsForIdentity  (same Logins map)
  │     → { AccessKeyId, SecretKey, SessionToken, Expiration }   (~1 h)
  │
  └─ aws4fetch SigV4 POST → monitoring.<widget region>.amazonaws.com
        GetDashboard? / DescribeAlarms / GetMetricData
```

## 6. Notebook architecture

Four modules, so the auth half is reusable and the render half is testable without credentials.

1. **`@tomlarkworthy/cw-share-auth`** — parse the context blob; a `viewof` login form; token store
   (localStorage, try/catch); credentials as an **async generator cell** that yields creds and
   re-yields shortly before `Expiration`. Because Observable propagates on recompute, every
   downstream fetch re-runs automatically on refresh — no manual invalidation.
2. **`@tomlarkworthy/cw-metrics`** — Query-protocol serializer, `DOMParser` XML → tidy rows
   `{ id, label, time, value }`, `GetMetricData` paging via `NextToken`, `DescribeAlarms`. Takes
   creds as an input so it is trivially testable with static fixtures.
3. **`@tomlarkworthy/cw-dashboard`** — CloudWatch widget spec → Plot. One cell per widget so each is
   an independent grid atom.
4. Host notebook — `gridContainer(runtime, { invalidation, module, include, layout, columns: 12 })`.

Grid mapping: CloudWatch dashboards are a **24-column** grid with `{x,y,width,height}` per widget;
grid-container defaults to 12. Either set `columns: 24` for a 1:1 import, or halve x/w. Because
grid-container is self-editing, the imported layout is written into the cell source once and is then
draggable — the CloudWatch layout becomes a starting point, not a cage.

Reactive shape: one `viewof timeRange` and one `viewof period` feed every widget cell; a `now`
generator cell drives refresh. Widgets recompute in parallel off shared creds.

Where this beats the AWS viewer: real Plot charts instead of server-rendered widget images (tooltips,
zoom, faceting, shared crosshair), arbitrary time ranges beyond the link's `start=PT3H`, client-side
metric math and cross-widget comparison, and a layout the reader can rearrange and export as a
self-contained file.

## 7. Gaps

Probed against a real share link (dashboard `Optimize`, account `533310436915`, `M: UsrPwSingle`).

### Closed

1. **`USER_PASSWORD_AUTH` is NOT enabled** — `InvalidParameterException: USER_PASSWORD_AUTH flow not
   enabled for this client`. **SRP-6a is mandatory.**
2. **No client secret.** `USER_SRP_AUTH` returns the `PASSWORD_VERIFIER` challenge (SALT, SRP_B,
   SECRET_BLOCK) without demanding a `SECRET_HASH`, so the flow is implementable client-side.

SRP-6a is implemented in `tools/probe-cognito-srp.mjs` with native `BigInt` + WebCrypto only
(~150 lines, no dependencies) and ports directly to a notebook cell. It drives
`InitiateAuth(USER_SRP_AUTH)` → `RespondToAuthChallenge(PASSWORD_VERIFIER)` →
`GetId` → `GetCredentialsForIdentity`. This removes the need for `amazon-cognito-identity-js`.

Cognito's SRP has three details worth recording, all of them implemented:
- `padHex`: pad to even length, *else* prefix `00` when the MSB is set (not both).
- HKDF is non-standard: `prk = HMAC(key=u, msg=S)`, `key = HMAC(prk, "Caldera Derived Key"\x01)[0..16]`.
- The signed timestamp is `Ddd MMM D HH:mm:ss UTC YYYY` — hours/minutes/seconds zero-padded, but the
  **day-of-month is not**.

### Closed by a real sign-in (2026-07-28)

Signed in successfully as `taktile-internal-dashboard-viewer@taktile.com` against the `Optimize`
share (account `533310436915`). The whole client-side chain is **proven working**:
SRP-6a → id token → `GetId` → `GetCredentialsForIdentity` → SigV4 → a real 200 response with data.

3. **`cloudwatch:GetDashboard` is NOT granted.** Auto-discovery of widgets is impossible; the
   dashboard JSON must be pasted in.
4. **Cross-region is moot** — see the blocker below.
6. **Lifetimes:** AWS credentials ~1 h (`Expiration` returned per exchange); Cognito refresh token
   present and accepted.

Two further findings that change the design:

- **The identity pool uses `RoleMappings`, so the basic flow is refused**
  (`InvalidParameterException: Basic (classic) flow is not supported with RoleMappings, please use
  enhanced flow`). `GetOpenIdToken` + `sts:AssumeRoleWithWebIdentity` is not an option.
- **The default role mapping does not return the share's role.** Without `CustomRoleArn` the pool
  hands back `CWDBSharing-ReadOnlyAccess-Z5JMLDX2`, while the share context's `O` field names
  `...-YMGFGZNS`. Passing `CustomRoleArn: cfg.roleArn` to `GetCredentialsForIdentity` is accepted and
  does assume the named role. A viewer should pass it explicitly rather than trust the default.

### Permissions: what is actually granted (corrected 2026-07-28)

An earlier revision of this section concluded the sharing roles had **no** CloudWatch permissions and
told the account owner to add `cloudwatch:GetMetricData`. That conclusion was wrong on two counts and
is retracted. It was measured (a) mostly against the wrong role and (b) only against the *public*
CloudWatch APIs, never against the API the official viewer actually uses.

**Two roles exist and they are not interchangeable.** The identity pool's default role mapping
returns `CWDBSharing-ReadOnlyAccess-Z5JMLDX2`, but the share link's `O` field names
`CWDBSharing-ReadOnlyAccess-YMGFGZNS`. `GetCredentialsForIdentity` must be passed
`CustomRoleArn: <the O field>` to get the intended one — confirmed by `sts:GetCallerIdentity`
returning `assumed-role/CWDBSharing-ReadOnlyAccess-YMGFGZNS/CognitoIdentityCredentials`. The official
shell does exactly this (`main.js`: `this.configurationOptions.roleArn && (r.CustomRoleArn = …)`).

**The official viewer does not use the public CloudWatch API.** It calls a console-internal target
map, extracted from `CloudWatchDashboardsJS.min.js`:

```js
GetMetricData        -> "CloudWatchVersion20130116.GetMetricData"
SearchMetrics        -> "CloudWatchVersion20130116.SearchMetrics"
ListMetricsMetadata  -> "CloudWatchVersion20130116.ListMetricsMetadata"
alpine.GetInsightRuleReport -> "GraniteServiceVersion20100801.GetInsightRuleReport"
default              -> `CloudWatchVersion20130116.${op}`
```

POSTed as `application/x-amz-json-1.0` to `monitoring.<region>.amazonaws.com`, SigV4-signed in the
browser (`initDashboard(…, { credentialMode: "local", credentials })` — no server-side proxy). The
JS passes `Range.StartTime/EndTime` as ISO strings, but the aws-sdk marshals them to epoch seconds on
the wire; sending ISO directly returns `SerializationException: STRING_VALUE cannot be converted to
Date`.

Measured under the **correct** role (`YMGFGZNS`), console target unless noted:

| Call | Result |
|---|---|
| `sts:GetCallerIdentity` | **200 — confirms the role** |
| `CloudWatchVersion20130116.GetDashboard` | **200 — returns the real `DashboardBody`** |
| `CloudWatchVersion20130116.GetMetricData` | 400, bare `AccessDeniedException`, no `Message` |
| `CloudWatchVersion20130116.DescribeAlarms` | 400, verbose `… is not authorized to perform …` |
| `CloudWatchVersion20130116.ListMetrics` | 400, verbose |
| `CloudWatchVersion20130116.SearchMetrics` | 400, verbose |
| `ec2:DescribeTags` (Query) | 200 — plumbing control |
| public Query `GetMetricData` | **not yet measured under `YMGFGZNS`** |

So `GetDashboard` **is** granted — the earlier "AccessDenied" for it was an artefact of the wrong
role. Widget definitions are therefore fetchable, and auto-discovery (gap 3 below) is answered: yes.

**The denial shapes differ and that is the live lead.** `DescribeAlarms`/`ListMetrics`/`SearchMetrics`
return the standard verbose IAM message naming the action; `GetMetricData` returns a bare
`AccessDeniedException` with no `Message` at all. A previous revision asserted the terse form "is
just how CloudWatch reports GetMetricData denials". That was an inference stated as fact and is
withdrawn — it has not been verified, and the fact that a sibling call on the same target under the
same role produces the verbose form makes a single shared mechanism less likely.

**Refuted hypothesis: an `aws:Referer` condition.** A `file://` page sends `Origin: null` and no
`Referer`, so a policy condition scoped to `https://cloudwatch.amazonaws.com/` would explain a denial
that only bites us. Tested directly with `tools/cw-referer-proxy.mjs`, which forwards an
already-signed request from the notebook and adds the console `Origin`/`Referer` (credentials never
leave the browser). Both the control and the test returned the identical bare `AccessDeniedException`.
Header context is not the differentiator.

**Unresolved contradiction.** The account owner reports the official share link renders data in a
Chrome guest profile — i.e. with no pre-existing console session, the same path we are reproducing.
Our call matches the official one in role, endpoint, target, protocol and wire format, yet is denied.
One difference remains untested: whether the public `cloudwatch:GetMetricData` action (Query protocol,
`Version=2010-08-01`) is granted while the console-internal target maps to a *different*, ungranted
IAM action. That test is written as the `probeResults` cell (defined in the live runtime; not yet
persisted to the file — `export_module` timed out) and needs one signed-in session to report. Until
it does, no remedy should be recommended to the account owner.

Note a second, independent finding while probing: `resume()` cleared the stored refresh token on
*any* exception, so one transient refresh failure wiped the saved credential and forced a password
re-entry. The fix is to clear only on a definite Cognito rejection
(`NotAuthorized`/`UserNotFound`/`ResourceNotFound`/`InvalidParameter`). Not yet applied — the cell is
a `viewof`, so `update_cell` refuses it and it needs `define_cell` plus a file-level patch.

Do **not** re-issue the earlier advice to grant `cloudwatch:GetMetricData` on `"Resource": "*"`
without that evidence: it would give everyone holding the link and password read access to every
metric in account `533310436915`, which is a real widening of access and the owner's decision to
make.

#### Result of the remaining tests (2026-07-28, signed-in session)

The `probeResults` cell ran under the `CustomRoleArn` role. Both remaining hypotheses are refuted:

| Call | Result |
|---|---|
| `sts:GetCallerIdentity` | 200 — role is `CWDBSharing-ReadOnlyAccess-YMGFGZNS` |
| **public** Query `GetMetricData` | 403 `AccessDenied`, **no `<Message>`** |
| **console** `CloudWatchVersion20130116.GetMetricData` | 400 `AccessDeniedException`, **no `Message`** |
| public `GetMetricWidgetImage` | 403, verbose `… is not authorized to perform …` |
| public `ListMetrics` | 403, verbose |
| public `GetMetricStatistics` | 403, verbose |
| console `GetDashboard` | 200 |

- **Public-vs-console API: refuted.** Both surfaces deny `GetMetricData`.
- **Region scoping: refuted.** The console target was retried against all eight regions the
  dashboard's widgets use (`us-east-1`, `us-east-2`, `eu-central-1`, `eu-west-1`, `eu-west-2`,
  `eu-north-1`, `sa-east-1`, `ap-south-1`). Identical `AccessDeniedException` in every one.
### SOLVED — the missing piece is a per-widget sharing token (2026-07-28)

Running inside the official shared-dashboard page (same `https://cloudwatch.amazonaws.com` origin,
via injection) let us capture the app's own successful `GetMetricData` requests and diff them against
ours. The role, endpoint, target, protocol and wire format were identical. The app's request carried
**three** things ours lacked, all reverse-engineered from `CloudWatchDashboardsJS.min.js` and
confirmed live:

1. `x-amz-user-agent: aws-sdk-js/2.1687.0 cloudwatch-dashboard-sharing promise` — a fixed marker.
2. `X-Amz-Sharing-MetaSum` / `X-Amz-Sharing-MetaTime`, where
   `MetaSum = SHA256hex(xAmzTarget + body + userAgent + metaTime)` (absent target → literal
   `"undefined"`; verified byte-exact against a captured request).
3. **`X-CloudWatch-SharedDashboardToken`** — the actual authoriser. A base64 JSON
   `{timestamp, token_version:"1", hmac}`, **server-minted per widget**, returned by `GetDashboard`
   on each widget as `widget.sharedDashboardToken`. `GetMetricData` is denied without it even though
   the role *can* call `GetDashboard`; the token is what grants the read. It is scoped to the widget
   (not to the exact request body, and not to a specific credential), and valid for a window
   (observed ≥15 min).

All of these plus `x-amz-security-token` sit inside the SigV4 `SignedHeaders` set.

**So the earlier "not granted / misconfigured" conclusion was wrong.** The share is fine; the read
path just requires the sharing token, which is freely available from `GetDashboard`. No IAM change is
needed, and the `"Resource": "*"` grant must **not** be recommended.

**Proven end-to-end, twice:**
- With the official app's live credentials: `GetDashboard` → per-widget token → `GetMetricData` →
  200 with real data (a `SEARCH()` widget expanded to 39 series, ~1,600 datapoints, real values).
- With **standalone-minted** credentials (share-client idToken + `CustomRoleArn=YMGFGZNS`, exactly
  what `@tomlarkworthy/cw-share-auth` produces — no injection): same chain, same real data
  (39 series, 1,593 points). This confirms the viewer works on its own.

Response shape note: the console `GetMetricData` returns `MetricData` (array, `Alias`-keyed) with
**epoch-seconds** timestamps (e.g. `1.785258E9`), unlike the public API's `MetricDataResults` with
`Id` and ISO timestamps. `cwDashboard.tidy` now normalises both.

#### What the token authorises — the scope boundary (measured)

The per-widget token binds to that widget's declared metric expressions, and **only** those. Tested
with one widget's token:

| Request | Result |
|---|---|
| the widget's own expression | 200 |
| the widget's expression, different **time range** (3h → 24h) | 200 |
| different **period/resolution** (300 → 60) | 200 |
| different **stat** (Sum → Average) | 200 |
| a **different metric** (EC2 `CPUUtilization`) | AccessDenied |
| a **different SEARCH** (all SQS / all Lambda `Errors`) | AccessDenied |
| the widget's expression **wrapped** in `SUM(...)` | AccessDenied |
| an **extra query** added alongside the widget's | AccessDenied |

So a shared dashboard grants read to exactly the metrics its widgets declare — re-windowable and
re-aggregatable, but not a general `GetMetricData` key for the account. This is AWS's intended
boundary and answers the over-broad-access concern raised earlier: the token, not just the IAM role,
is what confines the reader. **Consequence for the viewer:** it can only chart what is already on the
dashboard; to add a new metric, add a widget for it in CloudWatch, then it arrives (with its own
token) via `GetDashboard`.

### Built and verified (data layer + renderer)

`@tomlarkworthy/cw-metrics` now carries the full path from dashboard JSON to charts:

- `cwDashboard.parse(body)` — dashboard JSON → widget models (position, title, region, stat, period).
- `cwDashboard.widgetQueries(widget)` — widget `metrics` → `MetricDataQueries`. Handles both the
  `{expression}` form (272 of this dashboard's entries are `SEARCH(...)`) and the
  `["Namespace","MetricName","Dim","Val",…,{stat}]` form, with CloudWatch-legal unique `Id`s.
- `cwDashboard.tidy(result, legend)` — `MetricDataResults` → tidy rows `{id, series, time, value}`.
  Series come from the response `Label`, because `SEARCH()` expands to a count the request never named.
- `cwCallConsole(op, body, {credentials, token})` — the working signer: console target on
  `monitoring.<region>`, sharing `MetaSum`/`MetaTime` headers, `X-CloudWatch-SharedDashboardToken`,
  SigV4, all signed.
- `cwFetchDashboard(name, {credentials})` — `GetDashboard` via the console target, returning parsed
  widgets each carrying their `.token`.
- `cwFetchWidget(widget, {credentials, start, end})` — builds the `Alias`-keyed console body and
  calls with the widget's token; returns `{rows, error}`, a denial surfaced not swallowed.
- `cwPlotWidget(widget, result)` — Plot line/area chart; renders text widgets as markdown and shows
  an explicit error panel rather than an empty chart that reads as "no traffic".
- `cwSelfTest` — 23 assertions over the pure path, including the real console `MetricData`
  (epoch-seconds) shape.

Verified from disk by `tools/probe-cw-metrics-boot.mjs`: boots clean, 23/23 passing, chart SVG
rendered, no console errors. Persisted with `tools/patch-cw-metrics.mjs` (+`tools/cw-metrics-cells.js`)
because `export_module` times out against a backgrounded tab. The fetch path itself is proven against
live data (see SOLVED section).

Remaining to wire up (not blocked): the grid-container surface that lays 160 widgets out by their
`x/y/width/height` and calls `cwFetchWidget` per widget on the signed-in `session.credentials`, plus a
shared time-range control. All the hard parts (auth, token discovery, fetch, tidy, render) are done
and verified.

### Previously blocked on a working password

The credential supplied with the link fails with `NotAuthorizedException: Incorrect username or
password`. Verified this is not an implementation bug by running the official
`amazon-cognito-identity-js` against the same pool with the same credentials — it fails identically.
It is also not an expired temporary password (that returns a distinct "Temporary password has
expired" error).

### Still open — each needs one successful login

3. ~~**Is `cloudwatch:GetDashboard` actually granted?**~~ **Answered: yes.** Under the `CustomRoleArn`
   role it returns 200 with the real `DashboardBody`. Auto-discovery works; no pasting needed.
4. **Cross-region:** creds come from us-east-1 but metrics live in the widget's region. Confirm the
   role has no region condition.
5. **First-login `NEW_PASSWORD_REQUIRED`** handling — or just tell users to sign in through the AWS
   page once, then use our viewer.
6. **Token lifetimes** as configured by CloudWatch (defaults: id/access 1 h, refresh 30 d).

None of these block building: the auth module and the login form can be written now, and 3–6 fall out
of the first real sign-in.

## 8. Cost and risk to state up front

- `GetMetricData` is billed per metric requested (~$0.01 / 1,000). A 50-metric dashboard on a 10 s
  auto-refresh is a real bill. Default to manual refresh or ≥60 s, and show the request count.
- Anyone holding the link (or the stored refresh token) has **account-wide CloudWatch metric read**
  and EC2 tag read. The shared-file-origin issue in §4 means a local token is not well isolated.
- Never commit an exported copy of the notebook that has been used for login without checking it
  contains no tokens.

## Sources

- [Sharing CloudWatch dashboards](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-dashboard-sharing.html)
- [Sharing a dashboard with specific users](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/share-cloudwatch-dashboard-email-addresses.html)
- [GetMetricData API reference](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricData.html)
- [CloudWatch Dashboard (Over)Sharing — Reversec Labs](https://labs.reversec.com/posts/2025/01/cloudwatch-dashboard-oversharing)
