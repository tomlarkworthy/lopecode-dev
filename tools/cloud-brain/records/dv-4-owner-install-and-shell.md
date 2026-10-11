# dv-4-owner-install-and-shell

Task 4 of `plan/cloud-brain-deploy-verdict-from-a-shared-page.md`: the deployer change of
`dv-3-deployer-opens-verify-html` goes on `main` and onto cb4, and `shell/verify.html` is put,
which switches a deploy's test run to the small page. The spec gives these to the owner.

## Who did it

The orchestrating session of the issue loop, for the owner. `rules.md`, Never: "Deploy the kernel
(`brain`), `brain-core`, `brain-db` or the deployer". The owner, 2026-10-11, in chat to that
session: "can you do whatever " dv-4-owner-install-and-shell" is asking on my behalf?" (his words as typed, with the space after the first inner quote; comment 1020 on the issue dropped that space). It was done
on that word, for this issue alone. `rules.md` is not changed: the word was for one act and makes
no rule. His "done" on the issue earlier (event 977) had not been pushed or installed (comment 988).

## What was done, 2026-10-11, times CEST from the tools' own lines

| Step | What | Result |
|---|---|---|
| 1 | In a worktree at `main`: `git merge origin/bm/dv-3-deployer-opens-verify-html` | no conflict; merge `e1ca5c47`; `57c775cc` is the merge of `main` into the branch, which `main` was fast-forwarded to; `main` after the landing, with the notebook's pointer, was `737fda15` |
| 2 | `build.ts`, then `deployer_service.emit()` in a headless QA tab (`orch-dv-4`, closed by name), posted to `test-receiver.ts` | 2,837,911 characters, hash `4a25dc92cc07`; the file before kept as `.emitted/deployer.before-dv-4.json` (`74e7e27c911d`) |
| 3 | `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts install-deployer`, deploy lock 16:41:08 to 16:42:06 | "updated cb4-deployer 4a25dc92cc07", answered by 16:41:15 |
| 4 | `brain.ts shell <built shell.html> <built verify.html>` at 16:41:51 | `shell/verify.html` 200, 5,094,701 bytes, sha256 `7628f3c3456e…`; `shell/index.html` 200, 5,095,425 bytes, sha256 `db1e6bad657b…`; exit 0 |

Landing lock 16:40:25 to 16:42:48. The notebook is `lopebooks@74325ebf` (only `brain-deployer`
differs from the one before); its pointer is `lopecode-dev@737fda15`.

## Runs, the orchestrator's own

- `bun test.ts @tomlarkworthy/brain-deployer --with <built module>` in the worktree's `cloud-brain-dev`: passed 56, failed 0, needsBrowser 0.
- `bun test ./tests/tools` in the worktree: 158 pass, 0 fail.
- `brain.ts redistil` after step 3: 20 `same`.
- `curl` after step 4: `/` 200, 5,095,425 bytes; `/static/shell/verify.html` 200, 5,094,701 bytes.
- The `brain-deployer` module of the notebook that was committed has the sha256 of the one tested (`56283c6bc328…`).

## A slip, undone before any commit

`main` moved while the worktree was being built (`brain-feedback.ojs`, `8cd50597`). Merging it
made `lopebooks` a directory in the worktree in place of its link, the rebuild failed, and the
command went on and copied the notebook built before into `lopebooks`. Put back with
`git -C lopebooks checkout`, the links restored, built again.

## Not shown

- A deploy's run opening the small page on cb4, in the cluster's Chrome 128. No Worker was
  deployed between the install and this record (`logs.deploys` since 16:40: no lines, review
  1032). The reviewer opened the address the deployer now uses in a local Chrome 136: the Worker's
  own tests and 9 beside them, where `/` gave 141 beside. `dv-5-read-first-20-runs` reads the real ones.
- `static.delete { path: "shell/verify.html" }`, which switches it off, and going back by copying
  `deployer.before-dv-4.json` over `deployer.json` and `install-deployer`. Neither was run.

Written 2026-10-11 16:48:53 CEST.

Round 2 of the review (1052) asked for a deploy ref and for the two corrections above (the quote, the commit of step 1). It also read `logs.deploys`: the first deploy after the install, `brain-x-page@6edb3a422a9d` at 16:49:52, ran `/static/shell/verify.html#…&verify=brain-x-page` and was verified at 16:49:57 with 17 tests, `otherTestsRan` 9, 7376 ms. The first line of "Not shown" is so shown once.
