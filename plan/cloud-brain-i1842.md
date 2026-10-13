# Cloud Brain: the Operator in a tab of its own, in the place claude-code-pairing has when the page opens

Spec of the feature `i1842` on cb4's tracker. Round 1 was written 2026-10-11 from 20:27 CEST and
committed at 20:44:47 (`git log --format=%ci -1 56d7db1a`), in a worktree of `lopecode-dev` at
`1094614b` (every `file:line` below is of that commit) and the tracker at event 1863. Round 2 was
written at `41843f71`. Of the twelve files cited by line, `git diff --stat 1094614b 41843f71 --`
over `tools/cloud-brain/{brain-shell.ojs,cloud-brain.ojs,build.ts,brain.ts,brain-kernel.ojs,cloud-brain-docs.ojs,cloud-brain-specs.ojs,verify-run.ts}`,
`knowledge/{pairing-with-the-cloud-brain-page,notebook-programming-concepts}.md` and
`.claude/skills/brain-maintenance/{agents/implementer.md,oversight.md}` names one, `implementer.md`
(36 lines in, 13 out), whose line 107 reads the same at both.
Round 2 answers review 1951 and was written the same day from 20:48 to 20:56 CEST, both read
from `date`; what it changed is listed under "Round 2" at the end. Nothing here is built. Every
number under "What exists today" is from a command run in those times, named beside it. The design
was not run: what in it is a reading and not a measurement is marked so.

The issue has no parts (`list?parent=i1842` answered `{"issues":[]}`), so there are no gathered
reports to list. Its body is the one report, and it is taken as data: one line of it is not what
the Brain serves (below).

## What was asked

The issue was opened 2026-10-11 from the owner's tab (event 1842, `by: owner, via: session, tab: true`).
Its body speaks of him in the third person, so it is a session's wording of what he said and not
his words. No words of his on this are in the issue, in `philosophy.md` or in `rules.md`. The body, whole:

> The user wants the Operator (the chat/assistant view) to be in its own dedicated tab in the layout, and for claude-code-pairing to no longer be the default AI shown on page load. Instead, the Operator should be the primary AI interface that loads by default.
>
> Current layout: C100(S50(cloud-brain, docs, specs, shell, issues), S50(claude-code-pairing))
>
> Requested change: Give Operator its own tab position so it is visible/focused on page load, replacing claude-code-pairing as the default.

The "current layout" there is not the one the Brain opens with. It names `issues`, which no default
names, and weights of 50 and 50. It reads as the address of his tab at the time: a pane dragged
to half and the issues tab opened by a link. It is used below for one thing, the size he had given
the lower pane.

## The requirements

| | Requirement | From |
|---|---|---|
| R1 | The Operator's chat is in a tab of its own: a tab that holds the chat and nothing else of the page module. | "its own dedicated tab" |
| R2 | The address with no hash opens with that tab showing, in the pane claude-code-pairing has today, and the chat's input is on screen without scrolling. | "visible/focused on page load", "replacing claude-code-pairing as the default" |
| R3 | claude-code-pairing has no pane when the page opens. An address that names it still shows it, and a `cc=` token still pairs, with the pane and without it. | "no longer be the default AI"; the loop's own pairing addresses (`brain.ts:391`, `knowledge/pairing-with-the-cloud-brain-page.md:22`, `agents/implementer.md:107`) |
| R4 | There is one Operator chat on a page, not two. | `cloud-brain.ojs:369`: "One chat on a page can host [the settings fold]" |
| R5 | The Operator keeps its brief, its tools, its watch of the Brain and its session group. | nothing in the request changes what the Operator is |
| R6 | Messages from a channel are answered as before. | the inbox pump is a cell of the same module as the chat (`cloud-brain.ojs:1086`) |
| R7 | At every step between today and the end the live page has a working Operator. | the page module and the shell reach cb4 by different hands (below); `philosophy.md`, the fifth of the seven (reliable) |

## What exists today

**The layout.** `curl -s https://cb4.endpointservices.workers.dev/` at 20:27:15 CEST: 5,095,425 bytes,
sha256 `db1e6bad657b…`, the same file the record `dv-4-owner-install-and-shell` says was posted at
16:41:51. `bun tools/lope-reader.ts` on it:

```
"hash": "#view=C100(S70(@tomlarkworthy/cloud-brain,@tomlarkworthy/cloud-brain-docs,@tomlarkworthy/cloud-brain-specs,@tomlarkworthy/brain-shell),S30(@tomlarkworthy/claude-code-pairing))"
```

`build.ts:190` writes that string without `brain-shell`; `shellOf` adds it as the last tab of the
first stack (`brain-shell.ojs:393`). `C` is a column (`knowledge/notebook-programming-concepts.md:496`),
so claude-code-pairing is the lower pane. In a 1400 × 900 window its tab bar is at y = 632, which
leaves it 268 px; at `S50` it is at y = 453 and has 447 px (a Playwright run on the built notebook, 20:35).

**The Operator is not a module.** It is one section of `@tomlarkworthy/cloud-brain`, two cells under
`md` "## Operator" (`cloud-brain.ojs:367-384`): `viewof assistant = robocoop5({ group: "brain", height: 420,
persist: true, settings: true, system, watches, invalidation })` and `assistantLine`, the line that
says whether this tab answers the inbox. A lopepage tab is a module, so "a tab of its own" needs a
module. In the file copy the heading "Operator" is 264 px below the top of the page module's pane
and the chat is 420 px high, so on opening the chat's input is below the fold of today's 632 px
upper pane (same run; on cb4, signed in, Health is taller and it is lower still; not measured there).

Nothing else in `cloud-brain.ojs` reads `assistant` or `viewof assistant` (`grep`, one hit, line 371).
The brief (`assistantPrompt`, 1147), the watch (`assistantWatches`, 1185), the rule and the tools
(`assistantRule`, `assistantTools`, registered with robocoop-5's own `registerRule` and
`registerTool`) and the inbox pump are other cells and stay. The module has 133 cells, 22 of them tests.

**Where a module of the live page comes from.** Two places, and this decides the design.

- The shell file holds it. The file served at `/` has blocks for `brain-shell`, `cloud-brain-docs`,
  `brain-secrets`, `robocoop-5`, `plugin-registry` and `claude-code-pairing` (1 each) and none for
  `cloud-brain` (0; `grep -c` on the fetched file).
- A Worker owns it. `infra.getModules` on the deployer lists 23 modules; `cloud-brain` is
  `brain-x-page`'s, hash `1a3d5c8c9e93`. `brain-shell` adds the ones the layout names, with what they
  import from that list, after the page has booted (`brainWanted`, `brainJoined`, `brain-shell.ojs:81-131`).

A module in the shell boots before any Worker's module is on the page, and the kernel does not serve
one by path: `curl …/@tomlarkworthy/cloud-brain.js?v=4` answered 404. The three shell modules of the
Brain import `brain-shell` and library modules only, never a Worker's (`grep "^import"` on
`brain-secrets.ojs`, `brain-feedback.ojs`, `cloud-brain-docs.ojs`). What the bootloader does with a
shell module that imports a Worker's module was not run.

**A module with no pane still runs.** A Playwright script opened
`lopebooks/notebooks/@tomlarkworthy_cloud-brain.html` from a file at 1400 × 900 under each of five
layouts, waited 15 s, and read `_version` of nine cells of the runtime (20:33; build 1234 of the
headless shell). The script was a scratch file and is not kept: task 1's probe makes the same read
(`[...runtime._variables].find((v) => v._name === NAME && v._module === runtime.mains.get(MODULE))._version`)
and is committed. All of what it printed, the layouts written short:

```
layout                                             cc_ws cc_status cc_change_forwarder | viewof assistant inboxPump inboxMirror assistantRule assistantTools | pairedEndpoint
C(S70(cloud-brain,docs,specs),S30(pairing)) today    4      1            4            |        7            8          8            3             7        |       1
C(S70(cloud-brain,docs,specs))                       4      1            4            |        8            9          9            3             8        |       1
C(S100(docs,cloud-brain))                            4      1            4            |        7            8          8            3             7        |       1
C(S100(docs))                                        4      1            4            |        7            8          8            3             7        |       1
C(S70(docs),S30(robocoop-5))                         4      1            4            |        7            8          8            3             7        |       1
```

The first three columns are claude-code-pairing's, the next five `cloud-brain`'s, the last
`robocoop-5-engine`'s. Every cell had `_reachable: true` in every layout. The pixel numbers above
(632, 453, 264) are from a second scratch script of the same kind that took a screenshot of four
layouts and read `getBoundingClientRect` of each tab label; it is not kept either, and R2's check
replaces it.

`cc_ws` is the cell of claude-code-pairing that dials the channel. It ran to the same version with
no pane. So taking the pane out of the layout does not stop the module, while it stays in `mains`.
Not tried: a real pairing with no pane (the script had no channel to dial); it is a check of R3. The Operator's own use
of a paired session does not go through that module: `pairedEndpoint` of `robocoop-5-engine` reads
the token from the address and asks `127.0.0.1:<port>/v1/models` itself.

**Who posts the shell.** `brain.ts shell` sends the file to `infra.shell` with the recovery key
(`brain.ts:299`), and the kernel keeps `infra.shell` from a deploy token that is not `unattended`
(`brain-kernel.ojs:451-456`). The loop has no such token. The last post was made for the owner by a
session on his word (`records/dv-4-owner-install-and-shell.md`, row 4). The page module is another
matter: `brain-x-page` is not in the Never list and the loop has deployed it (`oversight.md:364`, ds-1).

**The page at its own address, in a browser of this machine, with no session** (round 2, 20:49 to
20:53 CEST). Review 1951 found that a copy of the page opened from a file has no chat: `brainOrigin`
is null off https (`brain-shell.ojs:200`), `brainJoined` then answers `[]` (`:125-126`), and the
shell file holds no `cloud-brain`. So the path cb4 serves was read where it is served. A Playwright
script (headless shell build 1234, 1400 × 900, no `brain_session` in storage) opened an address,
read once a second until `viewof assistant` of `cloud-brain` held a node with an input, and printed
one line. Three runs:

```
address and document                                             cloud-brain in mains   viewof assistant           inboxPump
https://cb4…/ as served                                          at 1729 ms             _version 5, 3 fields       _version 6
https://cb4…/ with the document answered from a fetched copy     at 2125 ms             _version 5, 3 fields       _version 6
the same copy, #view=C100(S50(cloud-brain-docs),S50(robocoop-5)) not in 45 s            no such cell               no such cell
```

The copy is `curl -s https://cb4.endpointservices.workers.dev/` at 20:50:09 (5,095,425 bytes,
`db1e6bad657b`, 0 blocks of `cloud-brain`), answered to the document request with `page.route`; every
other request went to the Brain. `verify-run.ts --shell FILE` does the same (`routes`,
`verify-run.ts:99-102`), so this is a read the loop already makes. Three things follow.

- A signed-out page gets the Worker's modules. `brainModules` is a plain `fetch` of
  `infra.getModules` on the deployer (`brain-shell.ojs:236-243`), and the chat draws with no session.
- It is not the act the Never list names. That line is about a browser of the cluster (Chrome 128).
  (The line is out of the list since 2026-10-13, issue `never-page-up-line-after-a-check`.)
  This one is local, and the address has no `&verify=`, so `brainVerdict` returns null
  (`brain-shell.ojs:162-171`) and the deployer is told nothing.
- A layout that does not name `cloud-brain` never has it (row 3): `brainWanted` reads the modules
  the layout names (`brain-shell.ojs:81-93`). The layout of change 4 names it. An address that names
  `brain-operator` alone will show the line "with no part" and no chat, and today such an address
  has no inbox pump either.

In run 1 the heading "Operator" was at y = 278, the chat from 312 to 732, and its message field
(placeholder "Message robocoop-5…") from 655 to 713, under the tab bar of the lower pane at 632.
The other two fields are the settings' (349 and 449). So on the live page, signed out, the message
field is not on screen when the page opens, as in the file copy.

The script was a scratch file and is not kept; task 1's probe makes these reads in its `--base` mode.

Not measured: how often the Operator is used. `logs.query` answers the owner's session only.

## The design

Four changes. Three land together as one task and reach cb4 by a deploy of `brain-x-page`. The
fourth is the owner's post of the shell.

**1. The page module offers its chat by name.** The call at `cloud-brain.ojs:371` becomes a function
that makes the chat, added to the plugin set `"operator"`:

```js
operatorChat = {
  const part = { chat: ({ invalidation }) => robocoop5({ group: "brain", height: 420, persist: true, settings: true,
    system: () => assistantPrompt + "\n\n" + (promptView.value || ""),
    watches: () => [...defaultWatches(), ...assistantWatches()], invalidation }) };
  plugins.add("operator", part, { invalidation });
  return part;
}
```

The options are today's, unchanged, so R5 holds by construction. `plugins` is already imported there
(`cloud-brain.ojs:1645`) and this is how the Brain's modules already find each other without an
import: every service adds itself to `"workers"`, and `cloud-brain.ojs:1142` adds a handler to `"inbox"`.

**2. A module `@tomlarkworthy/brain-operator`, seed `tools/cloud-brain/brain-operator.ojs`.** In
`build.ts` `MODULES` with `main: true` and not in `OWNED`: a module of the shell, as `brain-secrets` and
`brain-feedback` are. It imports `plugins` and nothing of a Worker. Its cells:

- a title, and under the chat two sentences on what the Operator is and where its settings are
  (under it, or left out, so that they take none of the pane's height from R2);
- `operatorParts = plugins.get("operator")`, which yields again when the page module joins;
- `operatorView = (parts, { invalidation }) => …`, a function: the chat of the first part; with no
  part, a line that says the Operator belongs to the page module and a link that opens `cloud-brain`;
- `viewof operator = operatorView(operatorParts, { invalidation })`;
- three tests of `operatorView`: with a fake part, with none, and
  `test_operator_none_then_one` (round 2, review 1951). On cb4 the tab draws before the part exists
  (1.7 to 2.1 s, above), and the built file has `cloud-brain` at boot, so neither of the first two
  is that order. The third makes a registry of its own with `createPlugins()` (exported by
  `plugin-registry`; its own `test_get_reflects_add` has this shape), so that the page's real part
  is not in it, and reads `gen = registry.get("operator")`: the first value gives the line; after
  `registry.add("operator", fake)` the next value gives a view that contains the fake's node; after
  the remove that `add` returned, the line again. It needs a DOM and no Brain.

That test is of the function. That the cell `viewof operator` runs again when `operatorParts`
yields is the runtime's. Task 1's last step reads its end at the address (a chat in the tab of a
page whose part arrived after boot), not the line that came before it.

The tab's label is the module's name, `brain-operator`. Reading, not run: that a chat made by a
function of one module draws and works in a cell of another. It is a DOM node and robocoop-5 finds
its session by `group`, not by the cell that asked, so nothing known stands against it. The task's
first step proves it in the built file, before anything else is written; if it fails the task stops
and the spec comes back.

**3. The page module's own section steps aside.** Under "## Operator" in `cloud-brain`:
when `runtime.mains` has `@tomlarkworthy/brain-operator`, a link that opens that tab; when it has
not, the chat itself, from the same `operatorChat.chat`. `assistantLine` stays where it is: it
reports the inbox, whose pump is in this module. This condition is R7. The page module is deployed
by the loop and the shell is posted by the owner, so for some time cb4 runs the new page module in
the old shell, which has no `brain-operator`; there the chat is where it is today. A shell older
than its page happens again on every later deploy, so the condition is kept and not removed afterwards.

**4. The layout.** `build.ts:190` becomes

```
#view=C100(S50(@tomlarkworthy/cloud-brain,@tomlarkworthy/cloud-brain-docs,@tomlarkworthy/cloud-brain-specs),S50(@tomlarkworthy/brain-operator))
```

claude-code-pairing leaves the layout and stays in `mains`. `brain.ts:391`, the pairing doc and
`implementer.md:107` name their own layout with the pairing pane and are not changed. 50 and 50
are the weights of the address in the issue; at 30 the pane has 268 px for a 420 px chat. Whether
447 px holds the session bar, the chat and its input without a scroll is not known until it is
built: R2's check measures it, and the writer sets `height` in the part to what fits.

With these, `cloud-brain-docs.ojs:15` ("**Operator** in cloud-brain") names the new tab, and R17 of
`cloud-brain-specs.ojs:367` ("The page must open with the tabs cloud-brain, cloud-brain-docs and
cloud-brain-specs") gains the fourth tab in its text and its check. Its status is the owner's.

### Not chosen

- **Open `@tomlarkworthy/robocoop-5` in the pane.** No new module: it is in the shell already. Its
  chat has neither the brief nor the watch nor the group `brain`, the tab is named robocoop-5 and
  holds that module's own documentation, and the comment at `cloud-brain.ojs:369` is there because
  two chats cannot both host the settings.
- **A shell module that imports the brief from `cloud-brain`.** The plain way to split a module. On
  the live page `cloud-brain` is not there when the shell boots and its path answers 404 (above).
- **A Worker `brain-x-operator` to own the module**, so that it may import `cloud-brain` as
  `brain-issues` does. A Worker with no method, a row in Services and a test run on each deploy, to
  carry three cells; and a new Worker is the owner's to grant (`implementer.md` step 3). Reopen it
  if step 2's reading fails.
- **Move every cell of the Operator** (brief, tools, turns, pump: lines 980 to 1300). They read
  `brain`, `client`, `session` and `viewof services` of the page module. Same wall as the import.
- **The same module in two panes**, the second scrolled to the chat (`@a/b#cell` in a layout). That
  is the whole page module again, not a tab of the Operator. Not run.
- **A row, the chat beside the page** (`R100(S60(…),S40(brain-operator))`: 558 px wide and the full
  900 high in the same run). It fits a chat better than half a column does. Not taken because the
  issue's address shows he kept the column. One string in `build.ts` if he prefers it.
- **The Operator as the first tab of the upper stack.** `shellOf` and R17 put the page's own module
  first, and the request is the place claude-code-pairing has.

## How each requirement is known to be met

Each by a command an agent of the loop runs with no session. "The built file" is
`tools/cloud-brain/.emitted/cloud-brain.html` of the task's worktree; "the probe" is a Playwright
script the task adds, `tools/cloud-brain/operator-tab-check.ts`, which opens a page at
1400 × 900 with the hash its `bootconf.json` holds and prints one JSON line. It has two modes,
because a file has no Brain (round 2):

- `operator-tab-check.ts FILE` opens the file. In the built file `cloud-brain` is a block of the
  file and the part is there at boot. The table below is this mode.
- `operator-tab-check.ts --base cb4 [--shell FILE]` opens `https://cb4.endpointservices.workers.dev/`
  in the local browser with no session, the document answered from FILE when one is given
  (`routes` of `verify-run.ts`, imported). It reads once a second for 45 s and prints also
  `joinedMs`, the time at which `cloud-brain` was in `mains`, `operatorPane` (`"chat"`, `"no part"`
  or `null` when `brain-operator` has no pane) and `pageSection` (`"chat"` or `"link"`: what is
  under "## Operator" of `cloud-brain`). It passes, exit 0, when `joinedMs` is a number and the last
  read has `operatorPane: "chat"` with one message field and `pageSection: "link"`. With
  `--expect old-shell` it passes on the other pair, `operatorPane: null` and `pageSection: "chat"`:
  the new page module in a shell that has no `brain-operator`. It does not judge the order of
  none and one: with the join at 1.7 to 2.1 s and a read a second, a read before the join is not
  certain, and `test_operator_none_then_one` is what holds the order. With a FILE that holds
  `cloud-brain` it exits 64: the page would write the Worker's copy over the file's
  (`verify-run.ts`, header).

A file opened from disk that holds no `cloud-brain` (a copy of what cb4 serves, `.emitted/shell.html`)
is not a mode: its tab can only show the line "with no part". For such a file the reads are
`lope-reader.ts` (the hash, `brain-operator` in `mains`) and `--base cb4 --shell FILE`.

| | Check | Passes when |
|---|---|---|
| R1 | the probe; `bun tools/lope-tests.ts <built> --filter test_operator` | the pane of the tab `brain-operator` holds one message field; no heading of `cloud-brain` is in it; the three tests pass, `test_operator_none_then_one` among them |
| R2 | `bun tools/lope-reader.ts .emitted/shell.html`; the probe | `bootconf.hash` is the string of change 4 with `brain-shell` added by `shellOf`; the chat input's bottom edge is ≤ 900 and the pane's scroll offset is 0 |
| R3 | the same two; `git diff`; a pairing | the hash does not name claude-code-pairing and `mains` does; `cc_ws` has `_version > 0`; `brain.ts:391` is unchanged. A real pairing, both ways, by the reviewer: the built file opened with the hash of change 4 and `&cc=<token>` (no pairing pane) answers `connected` and a `list_cells`; and the QA tab opened as `implementer.md:107` says (with the pane) does as today. If the first fails, claude-code-pairing stays in the layout as a second tab of the lower stack and the spec's R3 is met that way |
| R4 | the probe | one settings fold on the page; the "## Operator" section of `cloud-brain` holds a link and no chat input |
| R5 | `cd $W/cloud-brain-dev && bun test.ts brain-x-page --with <built module>` | `failed` 0, and the count is 22 plus the tests the task adds; `test_the_operator_is_told_to_read_the_docs` and `test_the_operator_is_pointed_at_what_the_brain_holds` are among them, unchanged |
| R6 | the probe | `inboxPump` of `cloud-brain` is a cell of the page and has `_version > 0`. This says the cell is there and ran, and no more: with no session it yields `{ answering: false, reason: "no owner session" }` and returns (`cloud-brain.ojs:1087`), and it had `_version` 6 in the signed-out runs above. That a message is answered is in the owner's list |
| R7 | a test in `cloud-brain`, of the function that chooses between the link and the chat, given a `mains` with and without `brain-operator`; `test_operator_none_then_one`; and, after the task's deploy of `brain-x-page`, `operator-tab-check.ts --base cb4 --expect old-shell` (the old shell, as served) and `--base cb4 --shell .emitted/shell.html` (the new shell, before anyone posts it) | the tests pass; both runs exit 0 |

The second run of R7 is the page cb4 will serve after the post, read before the post: the new
shell at the Brain's address, with the page module the Worker then runs joining late. If it fails,
task 1 is not submitted and the owner is not asked to post. It is signed out, so it says nothing of
a session's conversation (below).

After the owner's post, at the address: `curl -s https://cb4.endpointservices.workers.dev/ -o live.html`, then
`bun tools/lope-reader.ts live.html` (the tool takes a path and no stdin) shows the hash of change 4
and `brain-operator` in `mains`; and `operator-tab-check.ts --base cb4`, with no `--shell`, passes.
Both are read by the loop and are the condition of closing the project, not of task 1 landing.

What no agent of the loop can check, and so is no condition: that his conversation in the group
`brain` is the one he sees in the new tab, and that the tab that answers his WhatsApp still does,
which is R6 in full (both need his signed-in tab; `lease.get` was not tried with a loop token).

## The tasks, in the order they land

1. **`operator-tab-module`** (one writer, one review; deploys `brain-x-page`). Changes 1 to 4 in the
   seeds and `build.ts`, the docs line, R17's text, the probe with its two modes, a record. First
   step: the proof named under change 2. Last step, after its deploy: the two `--base` runs of R7.
   Not `major`: no method, rule or kept data changes. After it lands cb4 has the new
   page module in the old shell, with the chat where it is today (R7).
2. **The owner's post of the shell** (below).
3. **`operator-tab-at-the-address`** (no code; the act is its own test, `rules.md`, "confirmation of
   action"). The `curl` and `lope-reader.ts` above, and `operator-tab-check.ts --base cb4` with no
   `--shell`: the address itself, in the local browser, signed out. Its count is the probe's line
   with `joinedMs`. Then the project closes. Round 1 had the probe opened on a file copy here, where
   it could not pass (review 1951, finding 1).

## What only the owner can do

1. Approve this spec, or say which of these to change. Each is one string or one word:
   the weights (50 and 50, taken from his own tab); column or row; the tab's name (`brain-operator`);
   `assistantLine` staying in the page module.
2. After task 1 has landed: build at `main` in a worktree and post the shell,
   `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts shell <shell.html> <verify.html>`, as row 4 of
   `records/dv-4-owner-install-and-shell.md`; or say so to a session, as he did then.
3. Open `/` and see that the Operator tab holds his conversation, and send it a line.

## Read

Searches of the Brain (`knowledge.search?semantic=true`, token `loop-knowledge`, 20:31 CEST), top answers:

| Searched | Found | Used |
|---|---|---|
| "default layout operator tab on page load" | `doc:what-a-saved-notebook-opens` (0.72), `module:lopepage-2` (1.0) | Read whole. "In a stack `S(a,b)` the reopened page shows the FIRST tab" and "Only modules named in it get a pane": why the Operator is a stack of its own and not a fourth tab |
| "lopepage hash layout which tab is shown first" | `module:lopepage-2`, `doc:links-to-cells-in-a-lopepage-notebook`, `doc:notebook-programming-concepts` | `notebook-programming-concepts.md:496` read: `C` is a column, a stack holds module names only. The links doc gave `@a/b#cell`, the fifth of "Not chosen" |
| "cells of a module not in the layout do not compute" | `doc:notebook-programming-concepts` (0.79) | Its line 15 says cells compute only when observed. The probe above found the opposite on this page for a module in `mains`; the measurement is used, the doc is not |
| "move a section of a notebook module into its own module" | `doc:links-to-cells…` (0.94), `doc:resyncing-modules-across-the-corpus` | Nothing on splitting a module |
| "robocoop-5 chat embedded in a page operator assistant" | `module:robocoop-5` (0.80), `module:robocoop-5-engine` | The source of `robocoop5` and `pairedEndpoint`, read in the built notebook (lines 37-67 and 384-404 of the two blocks): `group` finds the session, `system` is read each step, `watches` once a session |
| "claude code pairing connects when its pane is not open" | `doc:live-collaboration-with-claude-code-pairing` (0.94), `doc:pairing-with-the-cloud-brain-page` | The second, line 22: the loop's pairing address names its own layout. Neither says what happens with no pane; measured above |

`module:plugin-registry` was read in the built notebook (its "Contracts" cell: `add` returns a
remove, `get(name)` yields again on every add). Nothing was searched outside the Brain: a layout
string and a module split have no literature. Round 1 was sent back (event 1958) on two checks,
with the design and the four answers accepted, so no problem of the design has resisted a round.
Round 2 searched nothing new: what it needed was in `brain-shell.ojs` and `verify-run.ts`, and in
three runs at the address.

`issue-stats.ts` was not run. It measures the loop, and this project is about the page.

## Round 2: review 1951 (changes, two findings; the design and the four answers accepted)

| Finding | What was done | Where |
|---|---|---|
| 1a. Task 3 closed on the probe opened on a file copy of the fetched page, where `brainOrigin` is null and `cloud-brain` never joins, so a correct build fails | Confirmed by reading `brain-shell.ojs:200` and `:125-126`. Of the two ways the review offered, the page is opened with its origin: three runs at the address in a local browser with no session, and why the Never list does not name that. The probe has a `--base` mode, task 3 runs it at the address, and a file with no `cloud-brain` opened from disk is said not to be a check | "What exists today", the paragraph on the page at its own address; the two modes; task 3 |
| 1b. The order cb4 serves (the tab draws, then the part arrives) had no test | `operatorView` is a function of the parts, and `test_operator_none_then_one` reads it over a registry of its own: none, one, none. R1 and R7 name it. R7 also gains a run of the new shell at the Brain's address after task 1's deploy and before the post, which round 1 did not have | change 2; the table; task 1's last step |
| 2. Line 3 named an end time ten minutes after the commit | The estimate is gone. Round 1 is given by its commit's time from `git log`; round 2 by two outputs of `date` | the opening paragraph |

Found on the way, not asked: a layout that does not name `cloud-brain` never has it on the live
page (row 3 of the three runs), so the tab alone at an address has no chat. Nothing is built for
it: the default names both, and the line "with no part" carries the link.

A fresh review of the round's diff (one agent with the file alone, 20:55) had five findings, all
taken: the end time was a placeholder; the first `--base` run of R7 could not pass under the mode's
one rule (now `--expect old-shell`); the rule's clause on a read before the join was undefined when
no read came first (dropped, the test holds the order); "the five" named no files (the twelve are
listed, and one had changed); R6's check passes with no pump polling (said in the row, and R6 in
full is the owner's).

Not done in round 2: no run of the design (nothing is built), and no read with a session. The
`--base` mode is described from `verify-run.ts` and from the scratch script's three runs; the mode
itself does not exist yet.

