# knowledge-by-says-owner-for-a-token

Issue opened 2026-10-11 (event 1287). A token made for `knowledge.put` entered 75 entries and each
reads `by: "owner"`, where the reference of `brain-knowledge.ojs` (the table "An entry") said `by`
is "the caller the core names (`owner`, `token:NAME`, `worker:brain-x-NAME`, a DID)". The issue
did not say which of the two was wrong.

## Which was wrong

The reference. The service keeps what it is sent; the core has sent `owner` for a token since
tokens became delegations (2026-10-10). Read 2026-10-11:

- `brain-core.ojs`, `asSecret`: `c.set("who", { caller: d.from, via: "delegation:" + d.id, tab, holder: "secret:" + d.name, … })`,
  and `forward` sets `x-brain-caller` from `who.caller` and `x-brain-holder` from `who.holder`.
- `plan/cloud-brain-authority.md`, "What this changes for a token made today": "Now `caller` is
  `token:NAME`. After, it is `owner`, `caller.holder == "secret:NAME"`, not the owner's tab." Its
  table of services that read `token:` names `brain-knowledge.ojs`.
- On cb4, the events of this issue: `"by":{"caller":"owner","via":"delegation:b6559fa96c36","holder":"secret:issues-implementer-2","tab":false}`
  (`issue-as.sh issues-implementer-2 "get?id=knowledge-by-says-owner-for-a-token"`). That is the
  tracker's record of a token's call, not the knowledge service's; no put was made to
  `brain-x-knowledge` with a token in this round.

`knowledge.put` reads `x-brain-caller` and nothing else of who calls (`brain-knowledge.ojs`, `served`,
`const by = c.req.header("x-brain-caller")`).

## What changed

`tools/cloud-brain/brain-knowledge.ojs`, three things, no change to what the service does:

- The row `by`, `at` of the reference. It names `owner`, `worker:brain-x-NAME` or a DID, and says
  that a token's entry has `by: "owner"`, that the delegation and the token's name
  (`x-brain-via`, `x-brain-holder: secret:NAME`) are not kept, and that `changed.by` is set the same way.
- `knowledgeRig`: `as(who, more)` takes the other headers the core sends.
- A test, `test_knowledge_a_token_enters_as_the_owner_and_the_reference_says_so`. It puts with
  `x-brain-caller: owner`, `x-brain-via: delegation:d1`, `x-brain-tab: 0`,
  `x-brain-holder: secret:rsi-index`, then reads `by`, `changed.by` of an entry a Worker entered
  and the token changed, `knowledge.stats`, and the row of the reference as `getSource?part=reference` serves it.

The other side was not taken: keeping the token's name (`token:NAME`, or `owner by d:<id>` as
`brain-static` writes). The row's reader is `knowledgeTenant(entered_by)` (`served`, "A private
entry is its first enterer's"), so a new form of `by` is a change to who reads an entry, and to
`stats.by`, the filter `by` and who may change an entry. Whether the record should tell tokens
apart, or agents, is the open question of `record-names-token-not-agent`, which this issue is
linked to. Triage (event 1531) named the sentence as the change for this case; `philosophy.md`
line 2, the smaller side.

## Tests

Each run in the worktree `bm/knowledge-by-says-owner-for-a-token` on 2026-10-11, after the start move (19:55 CEST, its event's `at`) and before the seed's commit (19:57:23, `git log --format=%ci`); the 20 runs ended 19:57:19 (`at` of their last line).

Before the sentence changed, with the test and the rig in place
(`bun test.ts brain-x-knowledge --with <built module>` in `cloud-brain-dev/`):

```
FAIL test_knowledge_a_token_enters_as_the_owner_and_the_reference_says_so
     Expected value:  "token:NAME"
     Received string: "| `by`, `at` | who entered it and when. Set here from the caller the core names (`owner`, `token:NAME`, …
"passed":9,"failed":1,"needsBrowser":1
```

The assertions of `by: "owner"` come before that line in the cell and did not fail: the service
recorded `owner` for the token's headers before and after.

After, the same command: `"passed":10,"failed":0,"needsBrowser":1`.

In a QA tab on the worktree's build (Chrome 151, the snippet of the implementer's brief, step 8): `[11,[]]`.

`BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-knowledge --shell <the build> --times 20`:
`"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`, `mains` of the
first line `["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-knowledge"]`, `tests` 11 in each run.

The rebase before the landing brought in `tests/tools/issue-lock-sql.test.ts`,
`tools/cloud-brain/brain-issues.ojs` and a record; none is what `brain-knowledge` is built from,
and the tests were not run again.

## Not tried, not changed

- A put to `brain-x-knowledge` on cb4 with a token. The loop's tokens name `knowledge.search` and
  no put. What the deployed service records for one is the issue's own observation (179 to 254
  under `by.owner`), not a run of this round.
- A Worker that calls under the owner's delegation (`x-brain-holder: worker:NAME`). The sentence
  does not speak of it.
- The 75 entries, and every other entry a token entered, still read `owner`. Nothing says which they are.
- `test_knowledge_declares_its_own_database_and_who_calls` still has a caller `{ caller: "token:laptop" }`,
  and `knowledgeTenant` still has a branch for `token:`; no call of the core arrives that way. Left.
- The same phrase in other references: `brain-browser.ojs` ("`owner`, `token:NAME`, a member's DID"),
  `cloudflare-iac.ojs` (`caller.id`), `brain-blob.ojs` (`by:token:<name>`). Not read against what
  those services do; `cloudflare-iac` is in the deployer's hash.
