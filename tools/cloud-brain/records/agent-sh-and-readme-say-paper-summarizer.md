# agent-sh-and-readme-say-paper-summarizer: two texts of `cloud-brain-dev` name the role `summarizer`

2026-10-13. A quick win of the judgment run `orch-ea3775`, which was given the triage of the issue (event 6759) and
started it at event 6765, in the worktree `bm-orch-Mac`. A comment in `cloud-brain-dev/agent.sh`, a sentence of
`cloud-brain-dev/README.md`, one test file. No seed, no deploy, and nothing `agent.sh` does is changed. Times are
CEST, from `date`.

## What was read

At `cloud-brain-dev` `cb9aac5`, 19:25, `grep -rn paper-summarizer cloud-brain-dev --exclude-dir=.git`:

```
cloud-brain-dev/agent.sh:15:#   (the role paper-summarizer; lopecode-dev plan/cloud-brain-paper-summarizer-persona.md, design piece 1). It is given
cloud-brain-dev/README.md:195:`READS=DIR ./agent.sh ROLE "task"` starts an agent for text from outside (the role `paper-summarizer`, since
cloud-brain-dev/README.md:196:2026-10-11; `lopecode-dev/plan/cloud-brain-paper-summarizer-persona.md`, design piece 1). It has the one tool Read,
```

Those two places and no other file of the clone: the issue's "Not read". The grep also read `deploy/`, which is a
read of what cb4 runs and not a file of the repository.

The role the tool starts with `READS` is `summarizer`: `tools/cloud-brain/summarize-papers.ts`, line 85,
`export const ROLE = "summarizer";`. The date of the rename is from `tools/cloud-brain/records/sd-2-one-summarizer.md`
("Written 2026-10-12", the brief put at 23:43:47 that day).

## What changed

Each text names the role `summarizer`, with the name before in a clause, as `SKILL.md` step 5 has it ("It was named
`paper-summarizer` until `sd-2-one-summarizer`"). After the change, 19:27, the same grep with `--exclude-dir=deploy`:

```
cloud-brain-dev/agent.sh:15:#   (the role summarizer, named paper-summarizer until sd-2-one-summarizer, 2026-10-12; lopecode-dev
cloud-brain-dev/agent.sh:16:#   plan/cloud-brain-paper-summarizer-persona.md, design piece 1). It is given
cloud-brain-dev/README.md:196:2026-10-11, named `paper-summarizer` until `sd-2-one-summarizer`, 2026-10-12;
cloud-brain-dev/README.md:197:`lopecode-dev/plan/cloud-brain-paper-summarizer-persona.md`, design piece 1). It has the one tool Read,
```

The path of the spec keeps the old name: the file is named so. `bash -n cloud-brain-dev/agent.sh` exits 0.

## Tests

`tests/tools/agent-sh-role-name.test.ts`, new, 2 tests: each text has "the role summarizer" with `ROLE` imported from
`summarize-papers.ts`, and the one line of each file that has the old name outside the spec's path says until when.
Where `cloud-brain-dev` has neither file the two skip, with a `skipped:` line.

- `bun test --timeout=30000 ./tests/tools/agent-sh-role-name.test.ts` on the texts of before: 0 pass, 2 fail.
- The same after the change: 2 pass, 0 fail.
- `bun test --timeout=120000 ./tests/tools/light-agent.test.ts ./tests/tools/agent-sh-tests-own-env.test.ts`, which
  run `agent.sh`, after the change: 32 pass, 0 fail.

## Not done, not tried

- The whole suite (`tests/tools/suite.sh`) was not run.
- The skip was not run in a checkout with an empty `cloud-brain-dev`.
- Texts of `lopecode-dev` that have the old name (specs, records, `summarize-papers.ts`, where `method:
  "paper-summarizer"` is what kept entries carry) were listed and not read for whether each is of the time before.
- Whether `README.md` or `agent.sh` is also kept as a file on the Brain, and so read there as before, was not looked at.
