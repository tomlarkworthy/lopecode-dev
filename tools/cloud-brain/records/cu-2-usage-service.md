# cu-2-usage-service: `brain-x-usage`, the account's billable usage from Cloudflare as `usage.account`

Issue `cu-2-usage-service`, task 2 of `plan/cloud-brain-cloudflare-usage-read.md` (approved by the owner, event
3378). Written 2026-10-13 by the writer of the change (token `impl-4cfb5d`). The first answer of cb4, and which of
the spec's five open points held, are in "The first answer of cb4", added after the deploy.

## What changed

- `tools/cloud-brain/brain-usage.ojs`, new: module `@tomlarkworthy/brain-usage`, Worker `brain-x-usage`. It declares
  `cloudflare: ["Billing Read"]` and one method, `com.lopecode.brain.usage.account`, a query with the rule
  `caller.id == "owner"` and no price. Its first `md` cell is the method reference.
- `tools/cloud-brain/build.ts`: the module in `MODULES` and in `OWNED`.
- `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`: the service in the list of services.
- `plan/cloud-brain-cloudflare-usage-read.md`: one "(As built …)" note, for the two differences below.

What the method sends is two GETs, `/billable-usage` (with `from` and `to` when given) and `/billable-usage/info`,
through the `cloudflareApi` cell. A caller's `from` and `to` are each refused unless they match
`^\d{4}-\d{2}-\d{2}$`, and a `from` after its `to` is refused. A row is ten of Cloudflare's fields, renamed
(`usageRow`). An answer with status 200 is kept 600 s in the Worker's memory under its two dates (`usageKeep`).

## Two differences from the spec

**No 502 of the service's own when no token is bound.** The spec: "When no token is bound … the method answers 502
and says so." The first build read `secrets.CF_TOKEN` to tell, and the manifest test failed in the tab:

```
-   Array [],
+   Array [
+     "CF_TOKEN",
+   ],
```

A service that names `secrets.NAME` declares a secret of that name (`cloudflare-iac.ojs`, `secretNames`, line 985),
which also binds `CORE` to it (line 1100). So the service does not read the token. The call is sent as it is, and
Cloudflare's refusal is the answer; the message of a 400, 401 or 403 names the deployer's line `token.mint-failed`.
In the rig a Worker with no `CF_TOKEN` sends `authorization: Bearer undefined`
(`test_usage_passes_on_cloudflares_refusal_and_names_the_mint_when_it_may_be_the_cause`). What Cloudflare answers to
that header was not tried. The other way, a flag from the wrapper, is a change to `cloudflare-iac.ojs` and so to
every Worker's hash, the kernel's among them.

**`cloudflare.info`, a fourth field.** The anchor is read from a second path. When that read alone is refused the
rows are still answered: `anchor` is `null` and `cloudflare.info` is the status. The spec's `cloudflare` has
`status`, `ms` and `cached`. Chosen so that the first call on cb4 shows the rows also when the info path, which the
reference lists once as deprecated, is not answered.

## What the spec left to the writer

- **Which anchor.** The spec has "`billing_cycle_anchor_timestamp` of `/billable-usage/info`". Cloudflare's reference,
  fetched 2026-10-13 as a summary made by a fetch tool, has it inside a list: `{ covered, subscriptions: [{ id,
  billing_cycle_anchor_timestamp, start_timestamp, end_timestamp }] }`, with `end_timestamp` "present only when the
  subscription has been cancelled". `usageAnchor` answers the first of a subscription with no `end_timestamp`, else
  the first.
- **A refusal's body.** Cloudflare's status, and of each of its `errors` the `code` and the `message` cut at 300
  characters, ten at most. Nothing else of a refused body leaves.
- **200 with no list.** 502 `UpstreamFailure`, with the keys of the answer named and no value.
- **The map of kept answers** is cleared when it holds 100 keys and a new one comes.
- **One date alone** is sent on as it is. What Cloudflare answers to it was not tried.

## Tests

Five `test_*` cells in the seed. `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html
@tomlarkworthy/brain-usage` (Chrome 151.0.7922.34), run three times one after another on 2026-10-13, 06:48 to
06:49 CEST, each: `"tests":5,"passed":5,"failed":[]`. The count after the last change of the seed is in "The first
answer of cb4", from the run that emitted.

| Row of the spec's table | Cell |
|---|---|
| R2, R3: every request recorded is a GET of one of two paths; `from=../tokens` is 400 with nothing sent | `test_usage_sends_two_fixed_gets_and_of_a_caller_only_two_days`: 8 requests over 4 calls, then 11 bad dates and 4 other method names with none sent |
| R3: five callers against the rule, `[true, true, false, false, false]`; `meta.cloudflare`, `meta.resources` | `test_usage_declares_billing_read_and_answers_the_owner_and_no_other` |
| R3: a row has the ten names, against a stand-in of 27 fields | `test_usage_a_row_has_ten_names_and_nothing_of_the_account_leaves` |
| (the design: kept 600 s) | `test_usage_keeps_an_answer_600_s_under_its_two_dates` |
| (the design: a refusal is passed on) | `test_usage_passes_on_cloudflares_refusal_and_names_the_mint_when_it_may_be_the_cause` |

Each cell fails on a change of the line it holds. Five builds with one line changed, 2026-10-13 before 06:48 CEST,
each run with `tab-tests.ts` and then taken back:

```
no check of the days                       4 of 5  test_usage_sends_two_fixed_gets_and_of_a_caller_only_two_days
a row also keeps BillingAccountName        4 of 5  test_usage_a_row_has_ten_names_and_nothing_of_the_account_leaves
usageKeep.get answers null                 4 of 5  test_usage_keeps_an_answer_600_s_under_its_two_dates
the rule is caller.session                 4 of 5  test_usage_declares_billing_read_and_answers_the_owner_and_no_other
a refusal's errors are passed on whole     4 of 5  test_usage_passes_on_cloudflares_refusal_and_names_the_mint_…
```

`tests/tools/suite.sh`, 2026-10-13 between 06:49 and 06:52 CEST, after the last edit of a file it reads: `1074 pass`, `0 fail`,
`Ran 1074 tests across 109 files`.

## Not tried, not done

- `cloud-brain-dev/test.ts` (the tests with no browser) was not run: `bun test.ts brain-x-usage --with FILE` and
  `bun test.ts @tomlarkworthy/brain-usage --with FILE` both answered `--with takes a Worker of one module, or the
  module's name`. It names a Worker by what `sync.ts` read from cb4, and this one was not deployed.
- `verify-run.ts brain-x-usage --shell … --times 20` was not run before the deploy, for the same reason: the
  deployer has no run address for a Worker it does not run. The three runs of `tab-tests.ts` stand in for it.
- No row for the service in `tools/cloud-brain/cloud-brain-docs.ojs` (the table of services on the page). That
  module is one of the shell's, and posting the shell is the orchestrating session's.
- The 600 s were shown with a time given to `usageKeep`, and through the method only that a second call inside
  them asks Cloudflare nothing. No test waits 600 s.
- A date that matches the pattern and is no day (`2026-99-99`) is sent on. What Cloudflare answers was not tried.
- What else a token with `Billing Read` reaches was not tried (the spec, "Not asked of him").
