# Reviewer brief

Moved 2026-10-11. The reviewer's brief is a file of the Brain,
`https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md`, and that is the only copy.
The loop starts its reviewer with `cloud-brain-dev/agent.sh reviewer "review issue <id>"` (`SKILL.md`, step 4),
which reads it as `brain/roles/reviewer.md`.

If you were spawned as a reviewer and told to read this file: fetch the brief with
`cloud-brain-dev/put.sh --get roles/reviewer.md`, read `cloud-brain-dev/brain/roles/reviewer.md` whole, and
follow it. Your `checkout:` is the repository root your prompt names.

It is changed with `cloud-brain-dev/put.sh roles/reviewer.md` (`agents/overseer.md`). Its text until the move:
`git show f7881ad7:.claude/skills/brain-maintenance/agents/reviewer.md`.
