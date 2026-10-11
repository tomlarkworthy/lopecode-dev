# fb-a2pyxbfzuh

## Round 1, 2026-10-11

The owner, in a note on `brain-x-inbox` in the Services table: "When I click on a service that has
not been loaded, it opens the tab but the module never loads". The change is in `brain-shell.ojs`:
`brainWanted` now reads the `open=` intent a link writes. No Worker's module changed and nothing
was deployed. **The fix is not on cb4 until the shell is posted**, which is the owner's act:
`BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts shell tools/cloud-brain/.emitted/fb-a2pyxbfzuh-shell.html tools/cloud-brain/.emitted/fb-a2pyxbfzuh-verify.html`.
Those two files are the landing's build of `main`, copied there from the worktree; the command was not run.

Times are CEST, from `date` at the start of each run. The four scripts (`repro.ts`, `probe.ts`, `probe2.ts`,
`more.ts`) are attached to the issue; each opens `https://cb4.endpointservices.workers.dev/` signed
out in a local headless Chromium (Playwright's build 1234), and with `--file` answers the document
at `/` with a built `shell.html` while every other request goes to cb4.

### Reproduced, 21:17:05, on the page cb4 serves

`bun repro.ts brain-x-inbox`. The link's `href` is `#open=@tomlarkworthy/brain-inbox`. After the
click, at 2 s, 10 s and 30 s:

```
hash   #view=C100(S70(…,@tomlarkworthy/brain-shell,@tomlarkworthy/brain-inbox),S30(…claude-code-pairing))
isMain false   block false   vars null
```

The layout names the module, the tab is there, and the page has neither the module's script block
nor a main of that name. In the 21:23:47 run below, on the shell of HEAD's seed, the pane reads
`loading @tomlarkworthy/brain-inbox…` 30 s after the click (`before.png`, attached to the issue;
`after.png` is the same moment with the change).

### The cause, 21:22:19

`bun probe2.ts`: a `hashchange` listener added before the click, and `viewModules` of the shell
called on the address afterwards.

```
atEvent        ["#open=@tomlarkworthy/brain-inbox"]
now            #view=C100(S70(…,@tomlarkworthy/brain-inbox),S30(…))
viewModulesNow [cloud-brain, cloud-brain-docs, cloud-brain-specs, brain-shell, brain-inbox, claude-code-pairing]
```

One event, and the address at that event is the intent alone. `navigate` of
`@tomlarkworthy/lopepage-urls` writes the intent with `pushState` and dispatches `hashchange`.
`@tomlarkworthy/lopepage-2` merges the intent into the layout and writes `view=` with
`history.replaceState` (`lp2_setHash`; its own prose: "`replaceState` is silent"). `brainWanted`
listened to `hashchange` and `popstate` and read `view=` only, so at the one event it got `[]`
(`probe.ts`, the run before: `brainWanted` went from `["@tomlarkworthy/cloud-brain"]` to `[]` across the
click) and was never told of the layout that followed. `viewModules` parses that layout correctly;
it was not asked again.

### The change

`brain-shell.ojs`, one new cell, one changed, one test, two rows of the reference:

- `wantedOf(hash, before)`: the layout's modules when the address has `view=`, or else `before`;
  then the module of `open=` is added and the module of `close=` is taken away. That is the order
  `lp2_syncFromUrl` applies them in. `focus=` is not read: lopepage-2 strips it and opens nothing.
- `brainWanted` keeps the last list and calls `wantedOf(location.hash, before)` at each event.
- `test_wantedOf_adds_the_module_a_link_asks_for`.

Not taken: a change to `moduleLink` in `cloud-brain.ojs`, which a deploy of `brain-x-page` would
have put on cb4 without the owner. The table of `brainBoot` in the shell has an "open" link built
the same way, with the same defect, and the cell whose description was false is `brainWanted`.

### After, 21:23:47 and 21:25:16

Two shells were built in the worktree, at `4af860c8` plus this change (`85906427`, before the rebase onto `e9161188`, which brought in no seed) and with
`git show HEAD:tools/cloud-brain/brain-shell.ojs` in the seed's place, and `repro.ts brain-x-inbox
--file` was run on each:

```
shell of HEAD's seed   2 s, 10 s, 30 s: isMain false  block false  vars null   pane: loading @tomlarkworthy/brain-inbox…
shell with the change  2 s, 10 s, 30 s: isMain true   block true   vars 34     pane: the module's title and its method table
```

`bun more.ts <shell with the change>`, 21:25:16, one page, in this order, 6 s after each click:

| Act | `brainWanted` after | mains among the Brain's modules |
|---|---|---|
| opened | cloud-brain | cloud-brain |
| click `brain-x-inbox` in Services | cloud-brain, brain-inbox | brain-inbox, cloud-brain |
| click `brain-x-git` in Services | …, brain-git | brain-git, brain-inbox, cloud-brain |
| click "open" of `brain-logs` in the shell's table | …, brain-logs | brain-git, brain-inbox, brain-logs, cloud-brain |
| `navigate("#close=@tomlarkworthy/brain-inbox")` | cloud-brain, brain-git, brain-logs | the same four (a main is not removed) |
| click `brain-x-inbox` again | …, brain-inbox | the same four |

No element with the text `loading @…` at any of the six, and no page error.

### Tests

The shell is no Worker's module, so `cloud-brain-dev/test.ts` does not take it (`--with takes a
Worker of one module, or the module's name`) and `verify-run.ts` does not apply. The snippet of the
brief's step 8 on `$W/tools/cloud-brain/.emitted/cloud-brain.html`, layout
`C100(S70(@tomlarkworthy/brain-shell),S30(@tomlarkworthy/claude-code-pairing))`, in three fresh
loads of one QA session (`r=7101`, `7102`, `7103`; the last two at 21:26:30 and 21:26:45):
`[10,[]]` each time. 10 is the count of `grep -c "^test_" tools/cloud-brain/brain-shell.ojs`.

The page the deployer opens after a deploy joins the Worker's module through the changed cell, so
it was run on the built `verify.html`, 21:29:36:
`BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell $W/tools/cloud-brain/.emitted/verify.html --times 3`

```
{"worker":"brain-x-page","runs":3,"passed":3,"failed":0,"none":0,"from":["brain"],"hashes":["2d5bfe692895"],"byChance":[],"everyTime":[],…,"exit":0}
```

Each run: `tests` 23 of `@tomlarkworthy/cloud-brain`, which imports `brainJoined` from the shell,
and 9 of the shell's own beside them. `from` is `brain`: the module was the deployed one, joined
by the built shell. Other Workers were not run this way.

That no Worker's module is built from another text than before:
`git diff 4af860c8 HEAD --stat -- 'tools/cloud-brain/*.ojs'` names `brain-shell.ojs` alone.

The new test cannot be run against the seed before: `wantedOf` is not a cell there. What was run
without the fix is the click on the shell of HEAD's seed, above.

### Not tried

- The page on cb4 after the change: it needs the shell posted.
- Signed in as the owner. There `assembled` of `cloud-brain.ojs` also loads and runs the tests of
  a module that joins; every run here was signed out.
- The cluster's Chrome 128, and any browser but the local Chromium 1234 build.
- The Back button after a click, a click before `infra.getModules` has answered, and a link to a
  Worker's module from `cloud-brain-docs` or `cloud-brain-specs`.
- A portal, where `brainWanted` is `[]` by its first line, and a fork on `blob:`.
- An address with `view=` and `open=` together, in a browser. `wantedOf` is tested on it as a
  function; no link of the page writes one.
