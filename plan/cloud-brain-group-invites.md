# Cloud Brain: a guest invite for several people, on one link that ends

Spec of the feature `group-invites` on cb4's tracker. Round 1, written 2026-10-11 from 21:19 to
21:29 CEST (the take is event 2216, `at` 21:19:39; the end is from `date`), in a worktree of
`lopecode-dev` at `0ee963af`. Every `file:line` below is of that commit. Nothing here is built.
The design's two edits were made in the worktree, run, and taken back
(`git diff --stat -- tools/` printed nothing at 21:27:00); the diffs are attachments of the issue,
`kernel.diff` (130 lines) and `page-2.diff` (71 lines; `page.diff` is an earlier one, replaced).
What was run and what was not is said at each claim.

**Round 2**, 2026-10-11 from 21:36 to 21:43 CEST (both from `date`), in a worktree at `f7d03412`. The two seeds are the
same there as at `0ee963af` (`git diff --stat 0ee963af HEAD -- tools/cloud-brain/brain-kernel.ojs
tools/cloud-brain/cloud-brain.ojs` printed nothing), so every `file:line` holds. The review of round 1
(event 2289) held the spec for one thing, answered under "Round 2: a guest who asked for more" below.
The diffs of this round are `kernel-3.diff` (173 lines, sha256 `a78d52c3…`) and `page-3.diff` (73 lines,
`1ae34b10…`); an attachment's name is taken once, so `kernel.diff`, `kernel-2.diff` (the same code as
`kernel-3.diff` with one line of the test in another place, below) and `page-2.diff` stay on the issue
and are not the ones to build from. Every count under "How each requirement is known to be
met" is of a round 2 run.

## What was asked

The owner, 2026-10-11 21:16:43 CEST, in a note on the Brain's page at the text "Copy Guest Invite"
(cell `guestInvite` of `@tomlarkworthy/cloud-brain`; issue `fb-a24kt7jw3q`, event 2195). Whole:

> I would like to be able to group invite people. So  we would need a slightly different invite link and it would expire after 7 days

No other words of his on this are in the tracker, `philosophy.md` or `rules.md`.

## The gathered reports

| Report | Becomes |
|---|---|
| `fb-a24kt7jw3q`: the note above | R1 to R3. It is the only part (`list?parent=group-invites`, 1 issue). R4 to R7 are not his words: they are what the first of the seven ("secure from outsides and between members") asks of a link that more than one person holds. |

## The requirements

| | Requirement | From |
|---|---|---|
| R1 | One press makes one link that several people can each use. | "group invite people", "a slightly different invite link" |
| R2 | The link gives nothing 7 days after it is made. | "it would expire after 7 days" |
| R3 | It is made where the guest invite is made, and one person's invite works as it does today. | the note is on "Copy Guest Invite"; "slightly different" |
| R4 | Each person who uses the link gets a token of their own: its own cap on a day's spending, ended alone. | line 1, "between members" |
| R5 | The owner says how many people, and the link gives no more tokens than that, also when several use it in the same moment. | line 1, "from outsides": the link is sent to a group and can be passed on |
| R6 | The owner ends the link and every token it gave in one act. | line 1; W3C, below |
| R7 | A link for several never deploys. | line 1 |
| R8 | The page and the kernel reach cb4 by different hands. Between the two the page never copies a note that says "for 5 people" around a link that works once. | the fifth line (reliable) |

Three readings were taken to write these. Each is the side that changes less, and each can be
turned by a word on the issue.

- **Guests, not members.** The note is on the guest's button. A link that made its holder a member
  (their own Workers, their own allowance) would give `people.put` to whoever holds a link, which
  no token may name today (`brain-kernel.ojs:474`).
- **"Expire after 7 days" is the link.** A token it gives lasts 7 days from the POST that got it,
  as one guest's does today (`brain-kernel.ojs:543`, `Math.max(Date.now() + made.hours * 3600000, …)`).
  So the last token of a link ends at most 14 days after the link was made. The other reading,
  every token ends when the link does, is one line in the same place (`until: Math.min(…, made.until)`
  for a link with `uses`), and a guest who comes on day 6 then has one day.
- **At most 20 people a link.** Discord's invites take 0 to 100 uses, 0 for no limit (below). The
  owner named no number; 20 is a round number above any group named so far (none), and a cap is
  one constant, `USES`.

## Round 2: a guest who asked for more

The finding of review 2289: R6 was not met for a guest whose token was replaced after asking for
more. `token.approve` (`brain-kernel.ojs:659-682`) names the replacing token `NAME-YYYY` and wrote
a link row with no group, the POST made it with the note "sign-in link", and so
`token.revoke { name: NAME }` did not end it and `token.list` gave it no group. The invite's own
note tells each guest how to ask. The review offered two answers: the upgrade keeps the group, or
R6 says such a token is ended by its own name and the owner approves that.

**Taken: the upgrade keeps the group.** The kernel's deploy is the owner's in either case, so the
first costs him nothing more, and the second leaves `token.list` showing a `team-XXXX` token made
by a link with no group. Four edits to the kernel, all in `kernel-3.diff`:

```js
token.approve   // upgrade: group = groupOf(old); the link's row gains { group } when there is one
POST /auth/link // note: place ? LINK + " " + made.name : made.group ? LINK + " " + made.group : LINK
token.revoke    // a link row goes when r.value.name === name || r.value.group === name
token.link      // refused 400 while a live token of the owner has groupOf(d) === name
```

The third was not in the review. Without it a link approved for a guest of the group and not yet
used outlives a revoke of the group for its 30 minutes: its row is named `team-YYYY`, the POST
does not ask whether the token it replaces is alive (`:552`), and a token of the group is made
after the group was ended. The run with that one edit left out:

```
passed 28, failed 1   test_a_link_for_several_gives_each_a_token_of_their_own
-     "revoked": 4,
+     "revoked": 3,
```

and with all four left out (round 1's code under round 2's test), 28 passed and 1 failed at the
line before: `token.list` gave one token of group `team`, `["link"]`, where two were expected
(the third guest's, and the one that replaced the second's). With the four
edits: 29 passed, 0 failed. These three runs 21:38 CEST, with `kernel-2.diff`.

The fourth answers the review's second note. A link named `team` made while tokens of an earlier
`team` link lived would have taken them into its group; now it is refused with the words a taken
name gets today, "a token or a link is named team; token.revoke ends it". The page revokes before
it links and does not meet it. In `kernel-2.diff` the test asked for a second `team` link while the
first link's row was alive, which is refused without this edit too. `kernel-3.diff` moves the line:
the link `pair` is past its `until` with one token given, and a new link named `pair` is asked for.
With the edit, 29 passed and 0 failed; without it (21:42 CEST):

```
passed 28, failed 1   test_a_link_for_several_gives_each_a_token_of_their_own
Expected: 400
Received: 200
```

What the fix leaves as it was:

- A token revoked by its own name while a link approved for it waits: that link gives a token for
  its 30 minutes. It is so for one guest's token today (`:552`, `:558`) and is not changed here;
  the group's revoke is the case R6 names.
- A guest of a group may ask for a cap (`deploy`) as any token may, and the owner may approve it in
  his tab. The replacing token is then of the group and deploys. R7 is of the link; what the owner
  approves for one named guest is his act.
- `token.approve` cuts the base of the new name to 30 characters (`:663`), so a group named with 31
  to 35 has replacing tokens named from the first 30. The group is read from the note, not the
  name, so the revoke still ends them. Read, not run: the test's group is `team`.

The review's other notes: `guestLink`'s test now asserts the `minutes: 10080` and `hours: 168` it
sends (`page-3.diff`, one line; R2). The 20 `INSERT OR IGNORE` of a POST to a full link are left.
"24 lines added and 11 removed outside the test" was round 1's and uncounted; round 2's count is
from `git diff --numstat`, under "The kernel" below.

## What exists today

**The invite is a sign-in link with a cap.** `guestInvite` (`cloud-brain.ojs:320-341`) takes a name,
a list of methods (`ai.models ai.run`, `GUEST_METHODS`, `:318`) and dollars a day (`0.10`), calls
`token.revoke { name }` and then `token.link { name, methods, minutes: 10080, hours: 168, daily }`
with the owner's session, and copies the link inside a note (`guestBrief`, `:344-355`).

**Where a link is kept and checked: the kernel, and nowhere else.** `brain-kernel.ojs`:

```
483-508  token.link     validates, then rows.put("link/" + sha256(code), { name, methods, until, hours, deploy, unattended, daily })
509-535  GET  /auth/link   text that says what to do; spends nothing
536-554  POST /auth/link   rows.get, then rows.delete(key): "The delete says whether this caller is the one that spent it."
                           then delegation.create { name: made.name, holder: { secret: true }, …, note: "sign-in link" } in the core
555-562  token.revoke   deletes link rows of that name, revokes the owner's tokens of that name
```

Only the hash of the code is kept. The page holds no link and no service does. The kernel is the
Worker `brain` (hash `b1049a69c17f` in `cloud-brain-dev/deploy/services.json`, read 21:20), and
`rules.md`, Never, keeps its deploy for the owner.

**Two things in that code make a link single-use, and both must change for R1.**

- The delete at `:540`. A second POST finds no row.
- The name. The core refuses a second live delegation of one name for the owner
  ("a name that no other delegation of the owner has", `brain-kernel.ojs:38`), and the kernel
  turns that into 409 "no token was made and the link is not spent" (`:545-549`). So a link that
  only stopped deleting its row would give the first caller a token and every later one a 409.
  The kernel already has the way round it: a link made by `token.approve` for a token that asked
  for more names its delegation `NAME-XXXX` (`:52`, "it is named `NAME-XXXX` from the token's name").

**Counting in one step exists.** `rows.putIfAbsent` and `rows.increment` are each one SQL statement
(`cloudflare-iac.ojs:479-481`: `INSERT OR IGNORE …`, and `INSERT … ON CONFLICT … DO UPDATE … RETURNING v`),
and `rows.deletePrefix` is said to be one by the comment above it (`:251`, "One step each, so two callers cannot interleave"; its SQL was not read). The kernel uses `increment` to count sign-in starts (`:414`).

**The tests, with no browser** (`cd cloud-brain-dev && bun test.ts <worker>`, 21:20, 0.75 s for the kernel):

```
{"worker":"brain","module":"@tomlarkworthy/brain-kernel","hash":"b1049a69c17f…","passed":28,"failed":0,"needsBrowser":0,…
{"worker":"brain-x-page","module":"@tomlarkworthy/cloud-brain","hash":"2d5bfe692895…","passed":10,"failed":0,"needsBrowser":13,…
```

`test_tokens_reach_only_their_methods` (`:1197`) and `test_a_program_asks_for_more` (`:1371`, the
guest's link at `:1409-1416`) cover links. `guestBrief` has one test (`cloud-brain.ojs:357`);
`guestInvite` is a DOM cell and has none.

**Nobody has used it on cb4.** `brain.ts curl …token.list --owner` (a read) at 21:21:39:

```
tokens 12 by link 0 guest- 0 with daily 0 with until 0
```

No token there was made by a link and none is named `guest-…`. A link nobody used is not in that
list, and how often `token.link` was called was not read (`logs.query` answers the owner's
session). So this feature rests on the owner's sentence and on no measured need. That is his to
ask; the number of people a group has, and whether guests pass links on, are guesses here.

## Read

Five searches of the Brain (`knowledge.search?semantic=true`, token `loop-knowledge`, 21:18):

| Words | Top answers | Used |
|---|---|---|
| invite link for several people that expires | `module:tomlarkworthy:brain-kernel` 0.823, `brain-bluesky` 0.679 | the kernel's reference cell, read whole for links. `brain-bluesky` is Bluesky's own group chats (`allowGroupInvites`), not this |
| sign-in link token guest one use | `brain-kernel` 0.868, `doc:cloud-brain-authority` 0.704 | `plan/cloud-brain-authority.md:317-362`, "Making one" and "A delegation made under a delegation" |
| multi-use invitation link expiry max uses capability url | `hacker-favourites-analysis` 0.799, `lopepage-urls` 0.703 | nothing bore on it |
| delegation token authority holder secret daily cap | `doc:cloud-brain-authority` 0.933 | `daily` is per delegation, so N tokens are N caps (`:441-446`) |
| group of guests shared allowance per person token | `doc:cloud-brain-authority` 0.634 | the same |

Outside, three pages. Each was read through a fetch that answers with quotations picked by a small
model, not the page whole: the quoted words are as that tool gave them, and nothing was checked
against the pages themselves.

- Tailscale, "Auth keys", `https://tailscale.com/kb/1085/auth-keys`. Keys are "One-off" or
  "Reusable"; of the second, "Be very careful with reusable keys! These can be very dangerous if
  stolen." And "Revoking a key does not deauthorize nodes using the key." Used twice: one shared
  token for a group is the reusable key and is not chosen; and R6 takes the other side on
  revoking, because a guest's token spends the owner's money and a Tailscale node does not.
- W3C, "Good Practices for Capability URLs", `https://www.w3.org/TR/capability-urls/`. §5.1:
  "Capability URLs should expire", "it may be suitable to have a capability URL that can only be
  accessed once, or one that expires after a week", and "it should be possible for that user to
  revoke the capability URLs". §4.1 lists where such a URL leaks: logs, the URL bar, `Referer`.
  R2, R5 and R6 are these. The kernel's reference already says of the code "in a query string,
  which Cloudflare keeps beside each log line; it is good once" (`:50`); a link for several is
  good `uses` times, and that sentence is changed with it.
- Discord, "Create Channel Invite", `https://docs.discord.com/developers/resources/channel`.
  `max_age`: "between 0 and 604800 (7 days)"; `max_uses`: "between 0 and 100", 0 for no limit.
  The same two numbers as R2 and R5, and where the bound of 20 was compared.

## The design

One new field of `token.link`, `uses`, and a place counted for each POST. Two Workers change.

### The kernel (`brain`), `kernel-3.diff`: 77 lines added and 14 removed (`git diff --numstat`), 47 of the added being the test cell and its separator

```js
token.link { name, methods, minutes, hours, daily, uses }   // uses: a whole number 1 to 20; left out is 1
  // 400: uses out of range or not a whole number; uses > 1 with deploy; uses > 1 and a name over 35 characters
  // the row gains { uses } and the answer gains uses, both only when uses > 1

POST /auth/link?code=…                                        // a link with uses > 1
  // for n = 1..uses: rows.putIfAbsent("link-use/<hash>/<n>") — the first that answers true is this caller's place
  // no place, no row, or past until: 401, the same words as today
  // the row is read again after the place is taken: a revoke between the two gives the place back and answers 401
  // delegation.create { name: NAME + "-" + 4 hex, …, note: "sign-in link NAME" }
  // the core does not answer or refuses: the place is deleted, so the use is not spent
  // answers { name: "NAME-XXXX", token, methods, until, deploy: false, unattended: false, daily }

token.revoke { name }    // also ends every token whose note is "sign-in link NAME", deletes link-use/<hash>/,
                         // and deletes a link token.approve made for a token of the group
token.list               // such a token has by: "link" and group: "NAME"
token.approve { id }     // for a token of a group: the link's row carries group, and its POST writes the same note
token.link { name }      // 400 while a live token has that name as its group
```

- A link with `uses` of 1, or none, takes the code path it takes today: the row has no `uses`, the
  POST deletes the row, the token has the link's name. The 28 tests of today pass unchanged (run, below).
  One thing differs for a caller of today: `token.link` of a name is refused while a live token has
  that name as its group, and no token has a group until a link for several is used.
- The link's row stays until `until` when its places are taken, and is swept with its places when
  the next link is made (`:499`, where ended links are deleted today). R2 is that `until`.
- A place is a row and not a counter because a counter cannot give a use back in one step when the
  core fails, and a row can be deleted.
- `token.revoke { name: "NAME-XXXX" }` ends one guest (R4). `token.revoke { name: "NAME" }` ends
  the link, the places and all of them (R6), within the 5 s a core instance remembers a row (`:38`).
  "All of them" includes a token that replaced one after its guest asked for more, and a link
  approved for one and not yet used ("Round 2", above).
- The group is read from the delegation's `note`, which only `delegation.create` in the owner's
  session sets for the owner's tokens. No field is added to the core's record, so `brain-core` is
  not deployed.
- Also in this task and not in `kernel-3.diff`: a sentence of the reference cell under "Asking for more"
  (`:52`) that a token of a group is replaced by one of the same group; the reference cell (`:36` "The first POST answers …
  and deletes the link", `:50` "it is good once"), and one sentence of the GET text (`:512`
  "POST to this same address, with no body, once"): "A link made for several people gives each
  POST a token of its own, until its uses are given."

What a link for several can cost: `uses × daily` a UTC day while its tokens live. For 5 people at the page's
$0.10 that is 5 × $0.10 = $0.50 a day; at the most the kernel takes, with $0.10, 20 × $0.10 =
$2.00 a day and 20 × $0.10 × 7 = $14.00 over the tokens' lives. `daily` is the owner's to type,
and the owner's own allowance bounds the sum (not read here).

### The page (`brain-x-page`), `page-3.diff` (`page-2.diff` with one line more in its test)

- `guestInvite` gets a fourth field, "people", value `1`. The name field stays: it names the guest
  or the group (`guest-<name>`).
- The call moves to a function with no DOM, `guestLink(client, { name, methods, daily, uses })`:
  `token.revoke`, then `token.link` with `uses` only when it is over 1. When the answer's `uses` is
  not the one asked, the kernel is one from before this spec and has made a link for one: that
  link is revoked and the press fails with "this Brain's kernel makes a link for one person only:
  no group link was made" (R8).
- `guestBrief(link, { methods, daily, uses })`: for several, "The link in it works for 5 people,
  once each, within 7 days, and is for the people it was sent to: do not pass it on. Each of you
  gets a token of your own." For one, today's sentence.
- Not in the diff, and in the task: the line the button writes after copying (`:339`, "The link
  works once …") says the count and "another invite for the same name ends the link and every
  token it gave"; a token's row in Access shows `of NAME` when `token.list` gives `group`; the
  sentence of `running-a-cloud-brain.md:133` on Copy Guest Invite.

### Not chosen

| Design | Cost |
|---|---|
| **One token for the whole group**, made by the page with `delegation.create { holder: { secret: true }, until, daily }` and pasted in the note. No kernel change: the loop could ship it today. | Tailscale's reusable key. One cap on spending for all, one row in a store (`d:<id>`) for all, the log cannot tell them apart, and ending one guest ends all: R4 fails. It is also not a link. This is the side the second line of the seven would take (smaller, easier to undo), and line 1 is why it is not taken; the owner's approval of this spec is where he can turn that. |
| **N single links in one note**, the page calling `token.link` N times. No kernel change. | Not one link (R1). In a group chat two people take the same one, and the second meets 401. |
| **A parent token with the cap `delegate`**, under which each guest makes their own (`plan/cloud-brain-authority.md:342`). | The first guest holds the parent and can make every child. A child has no `daily` of its own choosing above the parent's, and the scheme needs the guest's program to call `delegation.create`. |
| **A counter** (`rows.increment`) in place of the places. | A use counted before the core answers is spent when the core fails. |
| **Names `NAME-1` … `NAME-N`** from the place. | A token the owner later names `team-2` would make place 2 fail with 409 for every caller. Four random hex are the kernel's own pattern (`:52`). |
| **A new Worker for invites.** | The core refuses `delegation.create` from a keyed Worker (`plan/cloud-brain-authority.md:330`), so it could not make a token; and a new Worker is the owner's too. |
| **A link that makes members.** | Under "The requirements", first reading. |

## How each requirement is known to be met

The kernel's rows were run on 2026-10-11 at 21:42 CEST with `kernel-3.diff` applied, and the page's
at 21:39 with `kernel-2.diff` and `page-3.diff` applied, in the round 2 worktree, and the result written is the one the run gave; the two
rows "on today's code" are round 1's runs (21:23 to 21:27) and were not made again. The edits were
then taken back (`git diff --stat -- tools/` printed nothing at 21:42:21). `$W` is the task's worktree.
None needs a token.

| | Check | Result |
|---|---|---|
| R1, R4, R5, R6, R7 | `cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html && bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module @tomlarkworthy/brain-kernel > tools/cloud-brain/.emitted/k.js && (cd cloud-brain-dev && bun test.ts brain --with $W/tools/cloud-brain/.emitted/k.js)` | `"passed":29,"failed":0,"needsBrowser":0`. The 29th is `test_a_link_for_several_gives_each_a_token_of_their_own`. |
| the same test, on today's kernel code | round 1's test cell alone added to the seed at `0ee963af`, same command (round 1's run; round 2's cell begins with the same line) | `"passed":28,"failed":1`: `{ "uses": 0 }` expected 400, received 200 |
| R6 for a guest who asked for more | round 2's test on round 1's code, and on round 2's code less the edit to `token.revoke`, same command | each `"passed":28,"failed":1`, at the lines quoted under "Round 2" |
| R3 | in the first run, the 28 tests of today | all `ok`; `uses: 1` answers with no `uses` (asserted in the new test) |
| R3, R8 | the same build, `--get-module @tomlarkworthy/cloud-brain > p.js`, `bun test.ts brain-x-page --with $W/…/p.js` | `"passed":11,"failed":0,"needsBrowser":13`. The 11th is `test_a_guest_link_for_several_is_not_copied_from_a_kernel_that_makes_one`. |
| the changed `guestBrief` test, on today's page code | the six added lines of the test alone, same command | `"passed":9,"failed":1`: expected "works for 5 people, once each, within 7 days" |

What the new kernel test asserts, in the order it runs: six refused bodies (`uses` of 0, 21, 1.5
and `"3"`, `uses: 2` with `deploy`, `uses: 2` with a name of 36); a link with `uses: 3` and a
second of its name refused; **four POSTs sent together answer 200, 200, 200 and 401, with three
different tokens and three different names `team-XXXX`, each with `daily` 0.1** (R4, R5); each
token calls its method; `token.list` shows three with `group: "team"`; a revoke of one name ends
that one and leaves another working; **one of the two left asks for `inbox.list`, the owner approves, and the POST of that link
gives a token named `team-XXXX` with another name than the one it replaces, `daily` 0.1, the old
one 401, and `token.list` shows two of group `team`; the other asks and is approved, and its link
is left unused;** a revoke of `team` answers
`{ revoked: 4 }` (the link, the approved link, the replacing token and the one that had asked),
leaves no `link-use/` row and no delegation named `team…` in the rig's core, and the replacing
token, the other token, the POST of the approved link and the next POST of the group's link are
each 401 (R6); a link past its `until` with a place free answers 401 (R2), and a new link of its
name is refused 400 while the token it gave lives.

R2's seven days is the page's `minutes: 10080`, which `guestLink`'s test asserts as sent since
round 2; the kernel's bound on it is tested today (`:1220`, `minutes: 10081` is 400).

**Run only after the tasks are built, and where:**

- After the owner's deploy of the kernel (task 1), by any agent with no token:
  `cd $W/cloud-brain-dev && bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts brain`
  gives `"passed":29,"failed":0` with a hash that is not `b1049a69c17f`; and
  `curl -s https://cb4.endpointservices.workers.dev/auth/link | grep -c "for several people"` gives 1.
  Today (21:27:08) the second gives 0. The sentence it counts is not in `kernel-3.diff`, so the 1 has
  no run behind it.
- After the page's deploy (task 2):
  `curl -s "https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.getSource?worker=brain-x-page" | grep -c guestLink`
  is above 0. Today it gives 0. The task's own count is step 8 of the writer's brief, in a tab.

**Not tried, by name:**

- The core failing or refusing during a POST of a link for several (the place given back). The
  rig's core has no switch for it and the name is random; the code is the two words
  `rows.delete(place)` beside the existing `rows.put(key, made)`.
- The four POSTs "together" are four promises on one thread against the rig's `Map`. Two Workers
  racing on D1 was not run; the claim rests on `INSERT OR IGNORE` being one statement.
- A revoke that lands between a POST's place and its `delegation.create`: the token is made after
  the revoke and lives. The window is one call to the core. Closing it needs the revoke and the
  create to share a row, and was left.
- Places taken by a POST that never returns (the Worker dies between the place and the core's
  answer): that use is spent.
- A guest of a group approved for `deploy`, and a group whose name is over 30 characters asking
  for more ("Round 2", what the fix leaves).
- `guestInvite`'s field and the line after copying, in a browser. They are DOM and are the task's.
- A real link for several, used by real people on cb4. Only the owner can make one: it is in his list.

## The tasks, in the order they land

| | Task | Who | Reaches cb4 |
|---|---|---|---|
| 1 | `gi-1-kernel-link-for-several`: `kernel-3.diff` with the reference cell and the GET sentence, the test, a record. Labels `major` (a method other callers use takes a new field, and a link gives more than one token) and `needs-owner`. | Under the rules in force the loop does not start it (`rules.md`, Never: "A fix that needs one of them is written up on the issue, which gets the label `needs-owner` and is not started"; a `test_*` cell of `brain-kernel.ojs` moves the kernel's hash). This spec and the attachment are the write-up. A session builds and deploys it on the owner's word, as `44f9e5d0` was ("you can fix all those things, deploy to cb4"). | the owner's deploy of `brain` |
| 2 | `gi-2-page-invite-for-several`: `page-3.diff`, the line after copying, the Access row, `running-a-cloud-brain.md:133`, a record. | a writer of the loop | `brain-x-page`, which the loop deploys |

Task 2 does not wait for task 1. Landed first, a press for one person works as today and a press
for several fails with the sentence of R8; landed second, it works. Task 1 alone changes nothing a
caller of today sees. The owner's note `fb-a24kt7jw3q` stays open until both are on cb4.

## What only the owner can do

1. Approve this spec, or turn one of the three readings (guests; the link ends at 7 days and a
   token 7 days after its POST; at most 20) or the choice of a token each over one token for all.
2. Say the word that lets a session build and deploy task 1, and approve the deploy of `brain`.
   Until then a group link cannot be made.
3. After both are deployed: press Copy Guest Invite with people at 2, POST the link twice from two
   shells and a third time, and see two tokens in Access marked `of <name>` and a 401. This is the
   only run of the whole path on cb4; no task waits for it.
