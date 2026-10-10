# git-reference-shows-template-holes

The first prose cell of `brain-git.ojs` interpolated `gitDefaults` in 5 places.
`getSource?worker=brain-x-git&part=reference` is the text of a module's prose cells as written
(`referenceOf`, `cloudflare-iac.ojs`); it evaluates nothing. Read from cb4 with no session on
2026-10-10 at 23:28:51 CEST (this machine's `date`), hash `afa5c8779b42`:

```
${gitDefaults.seconds}
${gitDefaults.least}
${gitDefaults.most}
${gitDefaults.group}
${gitDefaults.usd}
```

So a reader of the reference did not learn how long a token lasts, the range of `seconds`, the
Cloudflare permission or the price.

## What changed

One seed, `brain-git.ojs`. Triage chose this side over filling holes in `referenceOf`, which is
a deploy of the deployer (event 348 of the issue).

- The prose says the values: `3600`, `60`, `86400`, `Artifacts Write`, `$0.001`. No hole is left
  in a prose cell of the module.
- A test, `test_the_reference_says_each_default_and_has_no_hole`. It asks the simulated Worker
  for `getSource?part=reference`, so it reads the text through `referenceOf` and copies none of
  it. It expects no `${`, the three sentences that carry the values built from `gitDefaults`,
  and each value of `gitDefaults` in the text as a whole word or number (so a key added later
  must be said too). It expects no call to Cloudflare.

`gitDefaults` is still what the code reads. The prose repeats it and the test holds the two together.

## Test

In the worktree, `bun test.ts brain-x-git --with <built module>` in `cloud-brain-dev/`:

```
the test added, prose unchanged   passed 5  failed 1  needsBrowser 0   Expected value: "${"
prose changed                     passed 6  failed 0  needsBrowser 0
```

The built module with one edit made by `sed`, to see the test fail when the two part:

```
least: 60 -> 61 in gitDefaults          passed 4  failed 2   (the other is the test that sends seconds=60)
usd: 0.001 -> 0.002 in gitDefaults      passed 5  failed 1
"from 60 to 86400" -> "from 600 to …"   passed 5  failed 1
```

In a headless browser tab on the worktree's build, each `test_*` cell of the module observed from
a module of its own: 6 of 6, none failed. The rebase onto `main` after that brought in
`.claude/skills/brain-maintenance/agents/reviewer.md` only, so the tests were not run again.

## Not done, not tried

- `brain-issues.ojs` has 9 holes of the same kind. It is the issue `reference-shows-template-holes`.
- Other Workers' references were not counted here.
- The whole-word check takes `60` anywhere in the prose as the least time. The sentence check
  beside it is what places it.
- The test reads prose cells only. A hole in a comment or in a refusal's message is not its matter.
- The page's rendering of the cell was not looked at; the text is the same characters with the
  values in place of the holes.

## Landing (2026-10-10, times from `date`)

`land.lock` was another writer's at 23:31:27 and taken at 23:31:50. The rebase under it brought in
`brain-issues.ojs`, `records/reference-shows-template-holes.md`, `seen.json` and the `lopebooks`
pointer: none is what `brain-git` is built from, so the record emitted at 23:29 was applied.
`apply` answered `brain-x-git 65d26e97c27d deployed` in 11.3 s at 23:32:15, not held for the
owner. `redistil`: 20 lines `same`, `brain-x-git same 65d26e97c27d`.

Not done at landing: `build.ts` in the main checkout and the `lopebooks` commit. The main checkout
had six files of `tools/cloud-brain/` changed and not committed by another writer
(`brain-deployer.ojs` +379 lines, `brain-core.ojs`, `brain.ts`, `cloud-brain.ojs`,
`cloud-brain-docs.ojs`, `cloud-brain-specs.ojs`; modified 23:26 to 23:28) and a built notebook that
differs from the committed one by 460 lines. A build there would have put that work in the
notebook this landing commits. The notebook in `lopebooks` has the old `brain-git` until the
next build is committed.
