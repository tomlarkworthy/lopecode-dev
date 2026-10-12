# Reviewer brief

Moved 2026-10-11. The reviewer's brief is a file of the Brain,
`https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md`, and that is the only copy.
The loop starts its reviewer in a view, a detached worktree at the commit under review, with that view's
`cloud-brain-dev/agent.sh reviewer "review issue <id>; your token is <name>"` (`SKILL.md`, step 4, since
`wt-4-reviewer-in-a-view`, 2026-10-12), which reads it as `brain/roles/reviewer.md`.

If you were spawned as a reviewer and told to read this file: in the working directory your prompt names, fetch
the brief with `cloud-brain-dev/put.sh --get roles/reviewer.md`, read `cloud-brain-dev/brain/roles/reviewer.md`
whole, and follow it. Your `checkout:` is that working directory: the view, or a repository root, for which the
brief has a paragraph ("Started in no view").

It is changed with `cloud-brain-dev/put.sh roles/reviewer.md` (`agents/overseer.md`). Its text until the move:
`git show f7881ad7:.claude/skills/brain-maintenance/agents/reviewer.md`.
