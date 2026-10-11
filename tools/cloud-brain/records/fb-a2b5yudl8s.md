# Services is the first section after Health on the page (`fb-a2b5yudl8s`)

## Round 1, 2026-10-11

The owner's note on his page, at the heading "Services" of `@tomlarkworthy/cloud-brain` (event 2148):
"Services section is very useful and should be the first thing under the health section".

Round 1, a writer of the issue loop. The commit of the seed is `eb8b7ac6`, 2026-10-11 22:36:14 +0200
(`git log --format='%h %ci'`, after the rebase onto `main`).

Nothing here was seen in the owner's tab on cb4. What is said of the drawn page is from a local
headless Chrome on the worktree's build, with no session.

### What changed

`tools/cloud-brain/cloud-brain.ojs`, and no other seed.

- Six cells move, unchanged, from after the section Operator to before its heading: the heading
  `## Services`, `viewof services`, `registered`, `notLoaded`, `moduleLink` and `probation`.
- One cell is new: `test_services_is_the_first_section_after_health`, after `test_the_page_is_a_service`.

The headings of the seed, by cell (`awk 'BEGIN{RS="// %%\n"} …'` over the seed, cells counted from 1):

```
before   4 Health   41 Operator   46 Services   52 Library
after    4 Health   41 Services   47 Operator   52 Library
```

That the move changed no line: the lines git removed and the lines it added between `eb8b7ac6^` and
`eb8b7ac6`, each sorted, compared with `comm`.

```
removed lines                              37
added lines                                54
removed and not among the added             0
added and not among the removed            17    the new test, with its comment and its `// %%`
cells (grep -c '^// %%'), before, after   143   144
```

Git writes the move as the five cells of Operator going down past Services, the shorter of the two
blocks; the text of both is as it was.

### Choices

- **"Under the health section" is read as the next section after Health**, before `## Operator`. The
  two sign-in buttons (`loginLink`, `guestInvite`) have no heading of their own and stay the last
  cells under Health, where `dsv-5-page-section` left them (its commit `777f38fb`: "the section is
  before Operator, so the two sign-in buttons stay under Health"). Not taken: the Services table
  inside Health, above the span control or between the charts and the buttons. That changes what
  Health is, and the note names a section. `philosophy.md` line 2, the smaller side and the easier
  to undo.
- **The test reads the source the Worker serves**, `(await page_service.emit()).source.text`, and not
  the drawn page. The page draws a module's cells in the order of its source, so the served text is
  what decides the order on cb4, and a test of it runs with no browser. It looks for each heading as
  its compiled definition, ``(md`## Services`)``, and each cell as its `$def` line, `, "probation", [`,
  with the needle put together from parts so that the test's own text is not what is found. It holds
  two orders: Health, Services, Operator; and `healthView`, `guestInvite`, `viewof services`,
  `probation`, `operatorChat`.

### The test failed before the move

Written first, with the cells where they were, built, and run both ways:

```
bun test.ts brain-x-page --with …/fb-a2b5yudl8s.js           passed 12, failed 1, needsBrowser 14
bun tools/cloud-brain/tab-tests.ts … @tomlarkworthy/cloud-brain   tests 27, passed 26

test_services_is_the_first_section_after_health expect(received).toEqual(expected)
  Array [
    "Health",
-   "Services",
    "Operator",
+   "Services",
  ]
```

After the move, a new build: `passed 13, failed 0, needsBrowser 14`, and `tests 27, passed 27, failed []`.

### Counts, after the rebase

`main` had moved by `brain-issues.ojs` and a record (what `worktree.sh --rebase` printed), neither of
which this module is built from. The build was made again and the runs below are on it.

```
bun test.ts brain-x-page --with …/fb-a2b5yudl8s.js
  passed 13, failed 0, needsBrowser 14

bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloud-brain --emit page_service=…
  tests 27, passed 27, failed []        Chrome 151.0.7922.34

BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell …/.emitted/cloud-brain.html --times 20
  mains ["@tomlarkworthy/brain-shell","@tomlarkworthy/cloud-brain"]
  runs 20, passed 20, failed 0, none 0, from ["document"], byChance []     tests 27 in a run
```

27 is step 7's 13 passed and 14 that need a browser.

### What was looked at on the page

The build opened from the file in a local headless Chrome (1400 by 900, the layout
`C100(S100(@tomlarkworthy/cloud-brain))`, no session), and each `h1` and `h2` with a height read with
its distance from the top of the document, in pixels:

```
Cloud Brain 24, Health 109, Services 253, Operator 303, Library 354, Access 507, Spending 710,
Logs 837, People 964, Clone 1142
```

So in that tab the heading Services is drawn after Health and before Operator. A visitor is drawn
neither sign-in button (each cell answers an empty span with no owner), so that the buttons are drawn
between the charts and Services was not seen: it is the order of the cells in the source, which the
test holds.

### The owner's note

The note's anchor is the heading's cell, `pid` `_cloudbrain_anon_30d783050d`. In the module read out
of the build after the move (`bun tools/lope-reader.ts … --get-module @tomlarkworthy/cloud-brain`),
that name is still the cell ``md`## Services` `` (`grep -n 30d783050d`: its definition and its `$def`
line). That the note is drawn on the moved heading in his tab was not seen.

### Docs

`git grep -n -F 'Services' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`
printed 24 lines, and a second search for lines that place a section ("under Operator", "the
Services list", "## Services", with `cloud-brain-docs.ojs`, `brain-operator.ojs`, `tests/tools` and
`operator-tab-check.ts` added) was read line by line. None says where Services is among the
sections today. `spec-as-built.md` line 436 gives an order ("sign-in, Assistant, Services, Health,
…") as of the deploy it records; it is that entry's and was left. No doc was changed.

### Not tried

- **The owner's tab on cb4.** The page with his session: the Services table, the two sign-in
  buttons above it, the probation lines, his note on the heading.
- **The drawn order with a session**, in any browser.
- **Any other layout or width** than the one above.
- **A source in which a heading is written another way** (`md` with a paragraph under it, as
  `## Library` has): the test's needle is the heading alone in its cell, and a heading that gains a
  paragraph fails the test at "every name is found" and does not pass by mistake. Seen only as
  the code reads; no such source was built.
