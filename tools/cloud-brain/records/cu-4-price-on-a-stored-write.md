# cu-4-price-on-a-stored-write: a price on `static.put` and `blob.upload`

Issue `cu-4-price-on-a-stored-write`, task 4 of `plan/cloud-brain-cloudflare-usage-read.md` (approved by the owner,
event 3378). Written 2026-10-13 by the writer of the change (token `impl-9a6be4`). Two seeds changed, and their two
Workers are deployed by the landing: `brain-x-static` and `brain-x-blob`.

## What changed

- `tools/cloud-brain/brain-static.ojs`: `static.put` has `price: 'origin.kind == "anonymous" ? 0.0 : 0.00018'`; a
  paragraph "**Price.**" in the reference; `test_static_put_has_the_price_of_a_stored_write`.
- `tools/cloud-brain/brain-blob.ojs`: `blob.upload` has the same text; an item under "Limits" in the reference;
  `test_blob_upload_has_the_price_of_a_stored_write`.
- Both seeds import `cel` and `callerOf` from `@tomlarkworthy/cloudflare-iac`, for the test.
- `tools/cloud-brain/cloudflare-usage.md`: the row of R2 in the table of the Brain's prices, and an "(As built …)"
  note under the price. `plan/cloud-brain-cloudflare-usage-read.md`: an "(As built …)" note under task 4, one in
  the row R5 and one under "Chosen: a flat price a write".
  `knowledge/calling-a-cloud-brain-from-this-checkout.md`: the comment beside `knowledge-docs.ts put --stale` names
  the price of the file's put.

The number is task 3's, `0.00018` (`tools/cloud-brain/records/cu-3-figures-and-the-price.md`). No other method of the
two Workers has a price: each test holds that.

## One difference from the spec: the text is not `"0.00018"`

The spec and the orchestrating session's comment 6048 give the text `price: "0.00018"`. The seeds have that number
behind a condition, and a chain of calls that nobody started pays 0.

The core refuses a priced call whose origin has no account (`brain-core.ojs`, `accountOf` and the line
`has no credits`), and `anonymous` is such an origin. Its own test,
`test_a_priced_call_is_charged_to_the_day_of_its_origin`, has the case through a Worker:
`(await rig.chain(rig.anonymous, "shop.buy")).status` is 402. `brain-x-whatsapp` calls `static.put` inside its
answer to `POST /hooks/whatsapp`, a path open to anyone that Meta calls (`brain-whatsapp.ojs`, `keepImage`), and
reads `kept.ok`: at a 402 the picture is not kept and the message is entered without it. The core's reference lists
that call as "a picture that arrived, with no caller". A path and a method are forwarded by one branch of the core
(`rule = method || path`, then `priced`, then `forward`, which sets `x-brain-context` from the call's origin), so the
Worker's put carries the origin of the webhook's caller: read in `brain-core.ojs`, not run for a path.

Run on the built core, 2026-10-13 08:41 CEST, with six lines put in the place of the `return` of
`test_the_origin_of_a_call_is_who_started_the_chain` in a copy of the built module (not in the seed):
`price.put` on `b.who` of its rig, then `b.who` called by Worker `a` while it answers `anonymous`, and while it
answers the owner (`cd cloud-brain-dev && bun test.ts brain-core --with <the copy> --whole`):

```
price put on b.who                              a answers anonymous                                   a answers the owner
origin.kind == "anonymous" ? 0.0 : 0.00018      200, no x-brain-price                                 200, x-brain-price 0.00018
0.00018                                         402 "… costs $0.00018 and anonymous has no credits"   200, x-brain-price 0.00018
```

So the condition keeps what such a chain does today, and every origin with an account pays the number. Taken by
line 2 of `philosophy.md` ("the side that is smaller and easier to undo"): fewer calls change. The owner's
`price.put` with `"0.00018"` gives the spec's text with no deploy, and `"0"` ends the price.

`blob.upload` has the same text though no seed calls it from such a chain (`git grep -n 'blob.upload' -- 'tools/cloud-brain/*.ojs'`:
the blob seed, and the lists `WORKER` of the core and `MEMBER` of `cloudflare-iac`). A member's Worker may call both
methods (`WORKER`), and one that answers a path open to anyone is in the case of `brain-x-whatsapp`; that was read
and not run.

What it costs: a Worker that answers anyone and writes files does so with no charge, as before this change.
`brain-x-whatsapp` holds a number to a count of pictures an hour (`brain-whatsapp.ojs`, the comment above the limits).

## Tests

All after the rebase that brought in a change to `cloudflare-iac.ojs`, on a build of the worktree,
`bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`, 2026-10-13 08:39 to 08:41 CEST.

```
cd cloud-brain-dev && bun test.ts brain-x-static --with <the built module>     13 passed, 0 failed, 0 need a browser
cd cloud-brain-dev && bun test.ts brain-x-blob --with <the built module>       10 passed, 0 failed, 0 need a browser
bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/brain-static         "tests":13,"passed":13,"failed":[]
bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/brain-blob           "tests":10,"passed":10,"failed":[]
bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/brain-library        "tests":9,"passed":9,"failed":[]
bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/brain-whatsapp       "tests":11,"passed":11,"failed":[]
verify-run.ts brain-x-static --shell <build> --times 20                        "runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]; "tests":13 in each run
verify-run.ts brain-x-blob --shell <build> --times 20                          "runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]; "tests":10 in each run
```

`brain-library` imports `static_service` and `brain-whatsapp` calls `static.put`; their rigs have no core, so their
counts say that the seeds still load and nothing of what the price does.

Each new test with one text of the built module changed, before the rebase, 08:35 CEST (`test.ts … --with`):

```
                                  brain-x-static                         brain-x-blob
the price taken off               12 passed, 1 failed: Received undefined   9 passed, 1 failed: Received undefined
price: "0.00018", the spec's      12 passed, 1 failed: Received "0.00018"   9 passed, 1 failed: Received "0.00018"
```

The failed test is the new one in each.

What each new test holds: the text of the price in `meta.access`; that no other method has a `price`; the text
parsed with `cel` and read over six origins of a Worker's call (`owner`, a DID, a token, a Worker, `deployer`: 0.00018;
`anonymous`: 0); and one line of the reference, read through `getSource?part=reference` of the rig, that starts with
the sentence of the price.

The whole suite, `tests/tools/suite.sh`, run after the rebase and the last edit of a seed, ended 08:46:49 CEST:
`1095 pass`, `0 fail`, and `grep -c 'skipped:'` over its output is 0. A run that ended 08:44:25 had the same two counts and
`Ran 1095 tests across 112 files`. It runs no test of a seed.

## The landing

Under the landing lock, taken 08:50:16 CEST, and the deploy lock, taken 08:57:19 after a wait for `ds-ingestion`.

- The rebase brought in `brain-core.ojs` and `brain-issues.ojs`, neither of which the two modules are built from.
- The first apply of each was refused, 08:57:27: `brain-x-static is badc774ffae0, you saw 3edce35d1118, your view is
  stale`, and `brain-x-blob is 202ee45a560f, you saw 9ef6e8a074db`. Both Workers had changed on cb4 at 08:48 and
  08:42 (the times of the next refusal), by a deploy that is not on `origin/main`. `getSource?worker=` of each,
  compared with `source.text` of the emitted record (`difflib`, no context): 24 and 23 lines differ, each of this
  change. So `saw` of both, then the build and the emit again, since `apply` does not send a record emitted before a
  Worker last changed: `tab-tests.ts … --emit`, 13 of 13 and 10 of 10, the same two hashes as before.
- `apply`, 08:58:58 and 08:59:14: `brain-x-static` `6ba2091970d2` `"state":"verified"`, `"tests":13`; `brain-x-blob`
  `4dd90bf3b589` `"state":"verified"`, `"tests":10`. `redistil` then reads `same` for both.
- `notebook-backup.sh`: `not due: last committed 2026-10-13`.

What the two Workers answer on cb4 after it is in the comment on the issue.

## Not tried

- A priced `static.put` or `blob.upload` through the core and the Worker together. The seeds' rigs have no core; the
  core's probe above is of a method of its own rig with the same price text.
- A picture sent to `brain-x-whatsapp` on cb4, before or after. The 402 of that chain is read from the three seeds
  and run for a method of the core's rig, not for a path.
- A member's Worker that answers a path open to anyone and writes a file.
- An origin other than the six of the test. An origin of a kind with no account that is not `anonymous` (the core's
  `accountOf` takes `owner`, `did`, `token`, `worker` and `deployer`) is still refused a put, 402. `kernel` is such a
  kind, and no seed was found where the kernel starts a chain that puts a file.
- How many `static.put` and `blob.upload` cb4 answers in a day, and so how many of an account's 8000 charges of a
  day (`brain-core.ojs`, `PRICING.charges`) the price takes: no token of the loop reads `quota.list` or the core's
  log line of each call. When the count is used up, a put is refused 402 until 00:00 UTC, with every other priced call.
- What the day's spend under Quota shows on the owner's page: item 4 of the spec's "What only the owner can do".
- A put that the Worker then refuses (a path the caller may not make, a file over the limit): the reference of the
  core says a charge is not returned, and no test of this change makes such a call.
- `price.put` and `price.delete` on the two methods on cb4: the owner's session.
- `/review-notebook` was not run on this file: the loop's reviewer is its fresh read.
