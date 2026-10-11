# preflight-ordering-test-fails-on-main

`bun test tests/tools/preflight.test.ts` in the main checkout at `1d060dce`, 2026-10-11, bun 1.4.0:

```
(fail) ordering applies to blocks a module reads off the DOM, not just its loader map
 17 pass
 1 fail
```

The test built a module whose source is `function define(){}`, put a block `@a/b/undeclared.md`
after it, and expected `attachment-after-module`. `checkHtml` returned `[]`.

## Which of the two was wrong

The test. `tools/lope-preflight.ts` reports a block under a module's id that is not in its loader
map only when `resolvesContentAtBoot(source)` holds: the source has a `["FileAttachment"]` input
list, a call `lopecode.contentSync(`, or a `querySelectorAll('…script…')`. That condition came
in with `812455dc` (2026-08-17 07:16:00 +0100), whose message gives the reason: the deck of
thetarot.online is hoisted ahead of 1.5 MB of scans that another module reads after parsing, and
preflight had reported all 78 of them. The commit changed `tools/lope-preflight.ts` and no file
under `tests/`. The test's module calls none of the three, so the tool is right to say nothing.

Since when, measured with a detached worktree at each commit, 2026-10-11:

```
812455dc^ (061eb542)   16 pass  0 fail
812455dc               15 pass  1 fail   <- the same test
```

So it has failed on `main` since 2026-08-17. The issue says both files were last changed in
`82e1f42d`; `git log -- tests/tools/preflight.test.ts` gives `98c4346f` (2026-08-23) as the test
file's last commit, which did not touch this test.

## What changed

One file, `tests/tools/preflight.test.ts`. No change to the tool, to a baseline or to what the
pre-commit gate of the content repositories refuses.

- The failing test now gives its module one of the three mechanisms at a time (a DOM scan for
  script blocks, a `lopecode.contentSync(` call, a `["FileAttachment"]` input) and expects
  `attachment-after-module` for each.
- A new test, "a module that reads no block during define() may come before blocks under its
  id": the old fixture, expecting `[]`, and a module whose source only names `contentSync`,
  `querySelectorAll` and `FileAttachment` inside a string, expecting `[]`.

Count, in the worktree, 2026-10-11: `bun test tests/tools/preflight.test.ts` 19 pass, 0 fail;
`bun test tests/tools` 88 pass, 0 fail (86 pass, 1 fail before, by the issue).

With the line `if (!resolvesContentAtBoot(…)) continue;` taken out of the tool, the new test
fails and the other 18 pass; the tool was put back with `git checkout`.

## Not tried

- Whether the three patterns of `resolvesContentAtBoot` miss a module that does read its blocks
  at boot by another spelling. The tests hold the patterns as written, not their completeness.
- `placeBefore` (`tools/lope-fix-attachment-order.ts`) does not read `resolvesContentAtBoot`: its
  test moves a block ahead of a `function define(){}` module, the case preflight no longer
  reports. Whether that tool, run on thetarot.online's notebook, would undo the hoist was not run.
- `lope-preflight.ts` was not run over the corpus: the tool did not change.
