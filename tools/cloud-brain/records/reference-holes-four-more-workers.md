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

## Deployed on cb4, 2026-10-11 08:23 to 08:37 CEST

The owner, asked whether to run the two steps or drop the branch: "1 deploy it".

```
08:23:07  install-deployer                 cb4-deployer f9007d2d7681
08:23:45  redistil --apply                 the client timed out at 5 minutes; 11 Workers were done, the kernel on probation
08:28     confirm brain                    after /llms.txt 200, lease held, and 0 holes in the reference of brain, brain-core, brain-x-knowledge, brain-x-ai
08:30:20  redistil --apply (the rest)      logs, proxy, static, whatsapp, page verified; library refused ("another change to brain-x-library is running")
08:34:29  redistil --apply (three)         library verified; container and snapshot put back a second time
08:36     apply brain-x-issues from seed   ec8dc24307e7 verified, 20 tests
```

18 of 20 Workers run the new wrapper. Two do not, each put back twice on one test in the deployer's browser:

- `brain-x-snapshot` (stays 5cbec0bab498): `test_the_panel_lists_the_days_and_the_sources_of_one` waits 50 ms
  after a click and expects the redraw. In a local tab on this build the redraw's input event had not come at
  50 ms (twice) and had at 300 ms and 1500 ms. The module's text is the same on main and on the branch.
- `brain-x-container` (stays e661e7f284e7): `test_container_get_and_post_are_the_port_and_read_no_row`,
  "Cannot read properties of undefined (reading 'method')". Passed twice in a local tab on this build. Not
  explained.

Both show `changes` in `redistil` until they pass. Their references still read from source (1 hole each).

`brain-x-issues` could not be distilled by this deployer as it ran: it had been put back at 07:50:48 to
15d722ba45e4, whose prose has a hole on `issuesStore`, which names `localStorage`
("cannot deploy \"issues\": cell \"(a prose cell)\" is prose with a value that cannot be computed at the
emit: localStorage is not defined"). The refusal did what it is for. The seed has no such hole since
5cd71020 and was applied in its place.

To go back: `cp .emitted/deployer.before-reference.json .emitted/deployer.json`, `install-deployer`,
`redistil --apply`.

Not done: the fresh review of this change was cut off by a crash at about 08:00 and the owner said not to
run it again. `redistil --apply` of every Worker does not fit in one call of 5 minutes now that each is tested.
