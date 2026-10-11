# gi-2-page-invite-for-several

## Round 1, 2026-10-11

Task 2 of `plan/cloud-brain-group-invites.md`, which the owner approved at event 2351: the page's
half of a guest invite for several people. The kernel's half (`gi-1-kernel-link-for-several`,
`token.link` taking `uses`) is the owner's deploy and was not on cb4 in this round. So on cb4 a
press for one person works as it did, and a press for several is refused by the page with one
sentence. Nothing in this round made a link for several against a real kernel.

### What changed

One commit of the seed and the guide (62 lines added and 11 removed in `tools/cloud-brain/cloud-brain.ojs`,
`git diff --numstat` of that commit; 2026-10-11 21:56:58 +0200 from `git log --format=%ci`).

- `page-3.diff` of the issue `group-invites` (sha256 `1ae34b10…`, the one review 2321 read), applied
  with `git apply`, which took it by its text at the seed's new lines. It gives `guestInvite` a
  fourth field, "people", value `1`; moves the two calls into `guestLink(client, { name, methods,
  daily, uses })`; and gives `guestBrief` a sentence for several.
- Changed from the diff: `guestInvite` reads the field once a press, and passes that one number to
  the note that is copied and to the line under the button. The diff read it twice inside `make`.
- `guestCopied(uses)`, a new cell: the line the button writes after copying. For one it is the
  sentence of before. For several it says the count, that each person gets a token of their own,
  that Access ends one token, and "another invite for the same name ends the link and every token
  it gave".
- `tokenOf(t)`, a new cell, drawn after a token's name in `accessPanel`: `" of GROUP"` when
  `token.list` gives the token a `group` that is a string with a character in it, nothing otherwise.
- The comment above `GUEST_METHODS` said one press makes a link "for one named person".
- `running-a-cloud-brain.md`, the sentence on Copy Guest Invite.

`guestLink`, in the order it runs: `uses` that is not a whole number 1 to 20 throws before any call;
`token.revoke { name }`; `token.link` with `uses` only when it is over 1; when `uses` is over 1 and
the answer's `uses` is another value, `token.revoke { name }` again and the error "this Brain's
kernel makes a link for one person only: no group link was made" (R8 of the spec).

### The tests

Two test cells are new and one is changed, all in `@tomlarkworthy/cloud-brain`:
`test_a_guest_link_for_several_is_not_copied_from_a_kernel_that_makes_one` (the diff's),
`test_the_page_says_how_many_an_invite_is_for_and_which_link_a_token_is_of` (`guestCopied`,
`tokenOf`), and five lines more in `test_the_guest_brief_says_what_a_guest_has_and_how_to_join`.

Each command was run in the issue's worktree `$W`, after the rebase onto `412fc043`, unless it says otherwise.

| Command | Result |
|---|---|
| `cd $W/cloud-brain-dev && bun test.ts brain-x-page`, before any edit (what cb4 ran, hash `51843bb7da90`) | `passed 12, failed 0, needsBrowser 16` |
| the three test cells put into the seed as `HEAD` had it, built, `bun test.ts brain-x-page --with …/gi2-tests-only.js` (21:55 CEST, before the rebase) | `passed 11, failed 3`: "Expected value: works for 5 people, once each, within 7 days", "guestLink is not defined", "tokenOf is not defined" |
| `bun tools/cloud-brain/build.ts --out …/cloud-brain.html`, `lope-reader.ts … --get-module @tomlarkworthy/cloud-brain > …/gi2.js`, `bun test.ts brain-x-page --with $W/tools/cloud-brain/.emitted/gi2.js` | `passed 14, failed 0, needsBrowser 16` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloud-brain --emit page_service=…` (21:57 CEST, Chrome 151) | `tests 30, passed 30, failed []` |
| from the main checkout, `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell $W/tools/cloud-brain/.emitted/cloud-brain.html --times 20` (21:58 CEST) | `runs 20, passed 20, failed 0, none 0, byChance [], from ["document"]`, `mains` brain-shell and cloud-brain, `tests` 30 a run |

The count submitted is 30 of 30.

### The button and the Access row, in a browser

`guestInvite` and `accessPanel` answer one line to a visitor who is not the owner, so neither is
drawn in a local tab as it stands. Each was made in a headless tab of the build (Chrome 151, 21:56
CEST, before the rebase, which did not change the seed) from a copy of the module with `brain` and
`client` put in its place (`mod.derive(["brain", "client"], side)`): `client` a fake that keeps its
calls, and answers `token.link` with `uses` or without it. The name field held "Team A". The
button was pressed and the note and the clipboard read:

```
people  kernel answers uses   calls                    line under the button                        clipboard
1       no                    revoke, link             Copied. … The link works once, in the next…  "The link in it works once,"
5       no                    revoke, link:5, revoke   Nothing copied: this Brain's kernel makes…   as before the press
5       yes                   revoke, link:5           Copied. … works for 5 people, once each, …   "The link in it works for 5 people,"
20      yes                   revoke, link:20          Copied. … works for 20 people, once each, …  not read to its end
"" abc 2.5 0 21   yes         none                     Nothing copied: people is a whole number, 1 to 20   as before the press
```

`accessPanel`, the same way, with a `token.list` of two tokens, the first with
`group: "guest-team"`: the first cells of its rows read `token guest-team-a1b2 of guest-team` and
`token guest-ada`.

That tab was paired, which the brief has asked a writer not to do since `412fc043`; it was closed by
name when the rebase brought that line in.

### Not tried

- A link for several on cb4. The kernel there takes no `uses`; the sentence of R8 is what a press
  for 2 or more gives until `gi-1-kernel-link-for-several` is deployed, and that press was not made
  on cb4 either: it needs the owner's session.
- Everything the two sentences for several say of the kernel: that each person gets a token of
  their own, that Revoke in Access on a `NAME-XXXX` token ends that one alone, that another invite
  for the name ends the link and each token it gave, and that `token.list` gives `group`. They are
  the design of `kernel-3.diff` and the spec's runs of it, not runs of this round.
- A press while an earlier press of the same button has not answered, and two answers out of order.
  `copyLater` is as it was and the button is not held while it waits.
- The field changed between the press and the answer: read in the code (one read, in the press),
  not run.
- Safari, where the clipboard takes a promise in the press. `copyLater` is unchanged.
- The "people" field shows `1` and its word "people" is a placeholder, so the word is not seen while
  the field has a value. The fields for methods and dollars are the same today. Left.
- No button ends a whole group from Access: its Revoke sends a token's own name. The spec names
  another invite for the same name as the way, and so does the line after copying.
