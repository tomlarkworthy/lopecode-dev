# day-spend-not-bounded-by-one-row: the deploys and the check on cb4

Task 3 of `plan/cloud-brain-day-spend-not-bounded-by-one-row.md` (`ds-3-record-and-after`): the
deployer, every Worker and the core were deployed on cb4 with the seeds of `ds-1-rows-add-within`
(`92f3d259`) and `ds-2-core-spends-by-row` (`32d62f24`), and the check of the spec was made.
Written 2026-10-12 19:45 CEST. Times are UTC, from `date -u` beside each command.

## Who did it

A session outside the issue loop, for the owner. `rules.md`, Never: "Deploy the kernel (`brain`),
`brain-core`, `brain-db` or the deployer". The owner, in chat to that session on 2026-10-12:
"please complete the steps of ds-3-record-and-after for me", and later, "When that is working
please mark the issue as completed to unblock future work". Done on those words, for this issue
alone. `rules.md` is not changed.

## What was done

Built at `main` `e24b06e4` (the three commits `main` gained before the install change `brain.ts`
alone, no seed).

| Step | At | What | Result |
|---|---|---|---|
| 0 | 17:09 | `build.ts --out .emitted/cloud-brain.html`, `tab-tests.ts` | `brain-deployer` 56 of 56, `brain-core` 37 of 37, `cloudflare-iac` 27 of 27 (Chrome 151); the deployer's record emitted, `753641455e0b` |
| 1 | 17:22:40 | `install-deployer`, under the deploy lock (17:22:33 to 17:37:48) | "updated cb4-deployer 753641455e0b"; `redistil` then read 22 of 22 `changes` |
| 2 | 17:23:21 | `redistil --apply`, three runs | 22 of 22 `same` at 17:35:32; every Worker but the kernel `verified` or `confirmed` by the deployer |
| 2b | 17:36 | `confirm brain` | `{"confirmed":["brain"]}`; the kernel was on probation until 17:40:57 |
| 3 | 17:36:50 | the core emitted after step 2 (`470753465969`, 37 of 37), `apply core.json` | `"state":"verified"`, 37 tests, 23,436 ms |
| 4 | | `quota.setDefaults { charges: N }` | not made: the owner named no number. `quota.list` answers `"charges":8000`, the default, which was the limit before |

Hashes: deployer `4a25dc92cc07` to `753641455e0b`; `brain-core` `26486a49c85b` to `8a784a67fc8a`
(the old source, new wrapper) to `470753465969`; `brain-db` `163647e04b63` to `bde50895fac7`.

## The check, 17:37:19

```
quota.get  --as loop-quota   {"who":"owner","day":"2026-10-12","spent":0.003,"daily":1,"remaining":0.997,…}   200
knowledge.search?semantic=true&q=spend --as loop-quota   200, first entry doc:cloud-brain-day-spend-not-bounded-by-one-row
quota.get  --as loop-quota   {"who":"owner","day":"2026-10-12","spent":0.00305,…}                             200
```

`spent` rose by 0.00005, the price of one embedding: the first `rows.addWithin` sent to D1 itself
counted. `quota.ledger` (owner) answered that charge as a line (`ai.v1/embeddings`, 0.00005,
`counted: true`) after one of the deployer (`browser.extend`, 0.003, the test run of the core's
deploy); `quota.list` answered `"spent":0.00305,"charges":2`. `redistil | grep -c same`: 22.

The day began again for the owner, as the spec said it would: `quota.get` read 0.34705 at 17:36,
under the old core, and 0.003 at 17:37 under the new one.

## What went otherwise than the issue's steps

- **The token on this machine had ended.** `install-deployer` uploads with
  `tools/scratch/cloud-brain-experiments/.cf-token`, which Cloudflare's verify answered `expired`,
  `expires_on 2026-10-11T23:59:59Z`. The owner wrote a `wrangler` login token there. `wrangler auth
  token > file` wrote two lines of banner before the token and `fetch` refused the header; the file
  was cut to its last line. That token ends about an hour after the login. The deployer keeps the
  token it had (`install-deployer` without `--token`).
- **`redistil --apply` is one request and the client stops at 5 minutes.** The first run ended in
  `TimeoutError` at 17:28:21 with 9 of 22 deployed and nothing written to `seen.json`. The deployer
  did not go on after it (9 `same` a minute later). The second run did 12 more and was refused
  `brain-x-git` ("another change to brain-x-git is running"); the third did that one. `seen.json`
  was then moved by `saw` for the 7 Workers of the first run that have an entry: each ran its own
  kept source, distilled again.
- **`.emitted/deployer.json` was the old record** until this session copied the new one over it.
  An install before that would have put `4a25dc92cc07` back.

## The way back, not run

`cp .emitted/deployer.before-ds-3.json .emitted/deployer.json`, `install-deployer`, `redistil
--apply`; the core from `.emitted/core.before-ds-3.json`. The core has charged since 17:37, so an
old core put back answers `quota.list` and `quota.ledger` 500 for 2026-10-12 (the spec's reviewer,
event 3592).

## Not shown

- R4's time on cb4 before and after: the spec leaves it to the owner, from the logs.
- A refusal at the count on cb4. The tests have it on the rig; no one spent 8000 charges.
- `brain-db`, `brain-x-feed`, `brain-x-inbox`, `brain-x-proxy` and `brain-x-whatsapp` have no entry
  in `seen.json`, as before.
