# philosophy-one-role-for-one-job

A next action of the post mortem `tools/cloud-brain/post-mortems/pm-second-summarizer-role.md`. Written 2026-10-12 by the
orchestrating session, whose edit it is (`philosophy.md`, its head) and whose push it is (`rules.md`, "Two standing
leaves of the orchestrating session").

## What changed

`cloud-brain-dev/philosophy.md`, under "Clarifications", before "Not settled": a paragraph dated 2026-10-12 with the
owner's two sentences, each whole, copied from the body of this issue (which has them from comments 4458 and 4463 of
`docs-summarised-for-search`), a reading marked as the orchestrating session's and not his words, and what his words
do not say. Commit `cloud-brain-dev@cc9cf7e`; the pointer is `lopecode-dev@e4ec5c0e`.

## Commands, with results

| Command | Result |
|---|---|
| `worktree.sh --push-dev orch-MacBook-Pro-3 --dry-run` | exit 0, "1 commit(s) of the clone are not on its origin/main; nothing was written" |
| `worktree.sh --push-dev orch-MacBook-Pro-3`, under the landing lock (22:19:14 to 22:19:22 CEST) | exit 0, printed `cc9cf7e24a76…` |
| `git push origin HEAD:main` in the worktree | exit 0 |
| `git ls-tree origin/main cloud-brain-dev` after a fetch | `cc9cf7e24a76…` |

The push was made with the loop's token `loop-git` through `--push-dev`, not with a write token got with the owner's
session, which the standing leave also allows: the narrower one did.

## Not tried

- No test was run: the change is prose in one file, and no test of `tests/tools` reads `philosophy.md`'s Clarifications.
- The fresh review (`/review-notebook`) was not run; the loop's reviewer reads it.
- I did not hear his words. They are as two comments of a session he was in wrote them.
