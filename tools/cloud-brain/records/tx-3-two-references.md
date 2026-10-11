# tx-3-two-references

Task 3 of `plan/cloud-brain-texts-not-read-again-after-a-change.md` (R4), started 2026-10-11 21:56:04
CEST (event 2411's `at`). The references of `brain-x-browser` and `brain-x-blob` named `token:NAME` as
a caller. The core has sent none since 2026-10-10: a call with a token is its maker's, under the
token's delegation (`brain-core.ojs`, `asSecret`: `caller: d.from, via: "delegation:" + d.id, tab, holder: "secret:" + d.name`).

Before, on cb4, at 21:54:02 (`date`), the spec's check of R4:

```
curl -s "https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.getSource?worker=brain-x-browser&part=reference" | grep -o 'token:NAME\|token:<name>' | wc -l   -> 2
the same of brain-x-blob                                                                                                                                              -> 1
```

## What each service does with a token's call, as the tests now hold it

Read in the code first, then run in each service's rig with the headers the core sends
(`x-brain-via: delegation:<id>`, `x-brain-holder: secret:laptop`, `x-brain-tab`).

```
brain-browser (keeperOf, cloudflare-iac.ojs)   caller owner,       tab 0 -> owner d:0a1b, list []            the owner's page "brain" not reached
                                               caller did:plc:ada, tab 0 -> owner d:0c2d
                                               caller owner,       tab 1 -> owner "owner", list ["brain"]    the owner's page reached
                                               caller did:plc:ada, tab 1 -> owner did:plc:ada
brain-blob (me)                                caller owner,       tab 0 -> tags by:d:0a1b, served sandboxed
                                               caller owner,       tab 1 -> tags by:owner, served as a page
                                               caller a member,    tab 0 or 1 -> tags by:<their did>, sandboxed
```

The row with `tab 1` is why the mend is longer than a swap of names. The sentence of the browser's
"Who can call" said a token does "not reach" the page that `brain.ts page up` signs in. That holds
for a token's call with `x-brain-tab: 0` and not with `1`. When the core sends `1` was read in
`asSecret` (a delegation with the cap `session` whose scope names the method) and not run: no test of
this round runs the core, and no such token was made on cb4.

## What changed

Three sentences in `brain-browser.ojs` and one in `brain-blob.ojs`, four in all. The spec names three (lines 97, 131
and 36); the fourth is in the paragraph after line 97, "A person's own session, a token and a Worker
keep the caller's name", untrue by the same cause, in the same cell, in the same deploy.

- `brain-browser.ojs`, "Many browsers, each with tabs", first paragraph: the owner is read from
  `x-brain-caller`, `x-brain-via` and `x-brain-tab`; the list of owners has `via:<caller>` and
  `d:<id>` and no `token:NAME`.
- The next paragraph: a token's browsers are under `d:<id>`, whoever made it, but for a call the core
  marks as the maker's own tab; `x-brain-holder` is not read.
- "Who can call": `b/token:NAME/` is `b/d:<id>/`, with the exception of the mark.
- `brain-blob.ojs`, the row `by:<did>` of "Tags": a token the owner made stamps `by:d:<id>`, or the
  owner's with the mark; a token a member made stamps that member's `by:<did>`; the name is not kept.
- A test in each seed: `test_browser_a_tokens_browsers_are_its_delegations_and_the_reference_says_so`,
  `test_blob_a_tokens_upload_is_stamped_as_the_core_sends_it_and_the_reference_says_so`. Each makes the
  calls of the table above, then reads `getSource?part=reference` from the rig and holds that
  `token:NAME` and `token:<name>` are nowhere in it and that short phrases are in the mended lines
  (`d:<id>`, `x-brain-tab`, `b/d:<id>/`, "a token the owner made", "a token a member made"). Not the
  sentences by their letters (review 1624 of `knowledge-by-says-owner-for-a-token`).

No code of either service changed.

## Tests

All on 2026-10-11, in the worktree `bm/tx-3-two-references`.

With the two tests added and the sentences as they were (21:57:27, `date` after the run),
`bun test.ts brain-x-<name> --with <built module>` in `cloud-brain-dev/`:

```
brain-x-browser  FAIL test_browser_a_tokens_browsers_are_its_delegations_and_the_reference_says_so   Expected value: "token:NAME"     "passed":17,"failed":1,"needsBrowser":1
brain-x-blob     FAIL test_blob_a_tokens_upload_is_stamped_as_the_core_sends_it_and_the_reference_says_so   Expected value: "token:<name>"   "passed":8,"failed":1,"needsBrowser":0
```

The assertions of the table come before that line in each cell and held: the services did this before
the round.

After the sentences changed (21:58:14), the same command: `"passed":18,"failed":0,"needsBrowser":1`
and `"passed":9,"failed":0,"needsBrowser":0`. The seeds were committed at 21:58:20 (`git log --format=%ai`).

`BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-<name> --shell <the build> --times 20`, from the main checkout:

```
brain-x-browser  "runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]   tests 19 in each run   mains brain-shell, brain-browser   at 2026-10-11T20:02:25Z
brain-x-blob     "runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]   tests 9 in each run    mains brain-shell, brain-blob      at 2026-10-11T20:02:48Z
```

`worktree.sh --rebase` then brought in 31 files; none is a seed either module is built from
(`cloud-brain.ojs` is the page's). The build was made again and
`bun tools/cloud-brain/tab-tests.ts <the build> @tomlarkworthy/brain-<name> --emit …` (Chrome 151, 22:03:46):

```
brain-browser  "tests":19,"passed":19,"failed":[]   emitted hash 248f48c24c4f…
brain-blob     "tests":9,"passed":9,"failed":[]     emitted hash 90faa7353a8f…
```

Before the rebase the same counts came from a paired QA tab with the snippet the brief then had
(`[19,[]]`, `[9,[]]`). The brief that came in with the rebase says not to open one; it was closed by name.

## The search of step 11

`git grep -n -F -e 'b/token:' -e 'by:token:' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
printed 4 lines: two of `plan/cloud-brain-authority.md` (144 and 258, which say what was and what it
becomes), one of this project's spec and one of the record of `knowledge-by-says-owner-for-a-token`.
None was made untrue by this change. The Brain was searched three times with `loop-knowledge`
("token:NAME caller the core sends owner holder secret:NAME", "browser owner of a call under a
delegation d:id", "blob upload stamp by:d:id delegation token"); used:
`doc:cloud-brain-authority`, "What this changes for a token made today" ("what it makes is its own:
browsers, containers, blobs (under d:<id>, where it was token:NAME)").

## Not tried, not changed

- A call to either Worker on cb4 with a token. The loop's tokens name neither `browser.*` nor
  `blob.*`. What the deployed services do with a token's headers is the rigs' answer.
- A token with the cap `session`, on cb4 or against the core. The exception is written from
  `asSecret` and from each service's answer to `x-brain-tab: 1`.
- A member's Worker that calls with a token, and a Worker that holds a delegation (`x-brain-holder: worker:NAME`).
- The branches for a caller `token:` (`brain-blob.ojs`, `me`; nothing in `brain-browser.ojs` but
  `keeperOf`'s fall-through) and the tests that send `token:laptop` are left, as the spec says. Two
  comments in those tests still say "A token's upload is the token's" and "A token … keep the
  caller's own name"; they are true of the header the test sends, which no call of the core carries.
- Other sentences of the two references that say "a token" and name no `token:NAME`, not read against
  the code in this round: `brain-blob.ojs` "a token and a person do not" (set a type the owner vouches
  for; by the table above a token's call with the mark does), "the owner or a token, the blob"
  (delete), "One a token uploaded before then carries the owner's tag"; `brain-browser.ojs` line 5,
  "belongs to the caller that bought its time: the owner, a token, a member, or a Worker".
- Whether a blob tagged `by:token:NAME` is still kept on cb4.
- `cloudflare-iac.ojs` line 1628 (`caller.id`: `token:NAME`) is the owner's: the deployer's hash covers that file.
- `brain-container.ojs` reads `keeperOf` too. Its reference was not read.

## The landing: the first apply of `brain-x-blob` was put back

Added under the landing lock, 2026-10-11. `brain-x-browser` was applied once: `"state":"verified","tests":19`.
`brain-x-blob` had no entry in `seen.json`; `getSource?worker=brain-x-blob` differed from the record's
`source.text` in 29 lines of `diff`, each of this change (the row, the new test and its `$def`), so `saw brain-x-blob`, then apply.
`logs.deploys` (`--as loop-deploys`) of that apply, times from the lines' `t`:

```
22:06:56  deploy.uploaded   brain-x-blob  hash 90faa7353a8f
22:08:06  deploy.unhealthy  last: "hash 8060796790ff"
22:08:08  deploy.put-back   reason: "health check failed after go-live"
```

For 70 s after the upload the Worker answered with the hash before. No test ran. `waitHealthy`
(`brain-deployer.ojs`) has a comment of the same on 2026-10-06. The same record applied again at
22:09:36: `17849 ms`, `"state":"verified","tests":9`. Why Cloudflare answered late was not found.
