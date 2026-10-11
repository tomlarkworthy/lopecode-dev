# A Worker's reference with its holes filled at the emit

Issue `reference-holes-four-more-workers`. Written 2026-10-11 08:05 CEST. **Not landed and not deployed**: branch
`bm-reference-rendered`, see "What it takes to reach cb4".

## What was wrong

`getSource?worker=NAME&part=reference` is the method table an agent reads. The Worker made it from
the module's source text (`referenceOf` in `workerRuntime`), and a Worker does not run its prose
cells, so a value written as a hole came out as code. Counted by the overseer on cb4, 2026-10-10 23:42:

```
brain-x-knowledge 22   brain-x-ai 16   brain-x-container 1   brain-x-snapshot 1   the other 17: 0
```

Two Workers were fixed before this by writing the values into the prose (`brain-x-issues`, 9 holes;
`brain-x-git`, 5), at 257,224 and 237,720 tokens a round. Tom, 2026-10-11, on doing it once
instead: "yes! because we have the quickJS part".

## The change (`cloudflare-iac.ojs`)

- `emit` computes each cell of the service's module whose whole definition is one `md`…``, with a
  tag that joins strings and values, and keeps the text as `source.reference`. It is inside
  `source.js`, so it is hashed. The deployer's emit runs in QuickJS and does the same.
- The Worker serves `source.reference`, and `referenceOf(source.text)` when it has none (a Worker
  emitted before this).
- A hole that cannot be computed refuses the emit. The first draft kept the source text of such a
  cell; then a value that computes in the tab and not in QuickJS gives one module two hashes, and
  the deployer refuses the deploy with nothing saying why.

## Measured, 2026-10-11

- No browser (`cloud-brain-dev/all.ts` on the built module): `total 287 passed, 0 failed, 27 need a browser`, 19 s.
- In a tab, every service of the notebook emitted and then distilled in QuickJS from its own
  source: 25 of 25 gave the same hash and the same reference, with no `${` in any. The two
  deployer services answer "the deployer is not distilled by a deployer", as before this change.
- `test_a_worker_serves_its_manifest_and_its_source` now has a hole in the module's own prose
  (`wrapperFlags`) and asserts the served text holds the value, and that the reference is the
  source's prose cells in the source's order with only that hole changed.
- The cells the 40 holes name are literals (`knowledgeLimits`, `knowledgeVectors`, `knowledgeKinds`,
  `aiDefaults`, `aiMeasured`, `containerMeasured`, `snapshotAgent`): nothing fetched or timed.

## Dead end

The first pattern for "a prose cell" matched `{ return ( md`` anywhere in a definition. A test of
`brain-library` holds such text in a string; emit called that test cell, which emits, without end.
`all.ts` hung past 255 s; one service at a time with `timeout 25` named it. The pattern is now
anchored to the whole definition.

## What it takes to reach cb4

`workerRuntime` is text inside every Worker, so this changes the hash of all 19, the four with
holes and the 15 without. The route is the one the knowledge doc gives for a change to the wrapper:
`install-deployer`, then `redistil --apply`. Both are the owner's (the deployer, the kernel, the
core and the database are among them).

Landing on `main` before the deployer runs this would make every later emit from a tab carry a
`source.reference` and a wrapper the running deployer does not produce. So the branch waits.

Not done: the four seeds keep their holes (they are now right to have them). The tests added to
`brain-issues` and `brain-git` that forbid a hole in their prose still hold and can stay.
