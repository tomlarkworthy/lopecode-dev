# gi-1-kernel-link-for-several

## Round 1, 2026-10-11

Task 1 of `plan/cloud-brain-group-invites.md`, which the owner approved at event 2351: the kernel's
half of a guest invite for several people. The loop does not deploy the kernel (`rules.md`, Never),
so the issue was held with `needs-owner` and three choices (comment 2363). The owner chose A to a
Claude Code session outside the loop, "yes A, please do it" (comment 2426), and that session wrote
this round. It used the token `issues-implementer-2` on the tracker, having none of its own.

### What changed

Two commits of `tools/cloud-brain/brain-kernel.ojs`, 92 lines added and 20 removed together
(`git diff --numstat HEAD~2 HEAD`): `bb012ae1` (2026-10-11 22:01:56 +0200) and `74c72486`
(22:06:24 +0200, `git log --format='%h %ci'`).

- `kernel-3.diff` of the issue `group-invites` (sha256 `a78d52c3…`, checked after the download with
  `shasum -a 256`), applied with `git apply`. `token.link` takes `uses`, a whole number 1 to 20.
  A link with `uses` over 1 gives each POST of `/auth/link` a token of its own, named `NAME-XXXX`,
  with the note `sign-in link NAME`. `token.revoke` of `NAME` ends the link, its places
  (`link-use/<hash>/<n>`) and every token of the group. `token.list` gives such a token `group`.
- One change to the diff's own lines: `groupOf` reads `(d.note || "")` where the diff read `d.note`.
  A delegation with no note would have thrown in `token.list`, `token.link` and `token.revoke`.
  The 12 delegations `delegation.list` answered the owner on cb4 that evening each had a text note,
  so nothing on cb4 needed it.
- Not in the diff and written here, as the spec's design section asks: the reference cell says
  `uses` in the paragraph "Sign-in links" (what `token.link` takes and answers, what each POST of a
  link for several gets, what `token.revoke` and `token.list` do with a group), "it is good once,
  or as many times as the `uses`" in the paragraph on what is kept, and one sentence under "Asking
  for more". The text a GET of `/auth/link` answers says a link for several gives each POST a
  token of its own.

### After the fresh review

`/review-notebook` on the build, module `@tomlarkworthy/brain-kernel`, changes since `f0ce499a`:
FIX, 6 findings, none of which breaks a caller of today by the reviewer's reading of the page's
`guestLink` and of the paths a link with no `uses` takes. Four taken in `74c72486`:

- `token.approve`'s sweep of ended links now deletes their places too, as `token.link`'s does.
- The GET text said "The link then stops working" for every link. It now says a link for one
  does and a link for several does when its uses are given, and that `name` from a link for
  several is the link's name, a hyphen and four characters.
- `token.create` is refused (400) a name that a live link for several has, or that a live token
  has as its group. Before, the owner could make a token named as the group, and ending that one
  token by name would have ended the group.
- A link that `token.approve` made for a token of a group holds the group's name against
  `token.link` while it waits (30 minutes).

Two not taken:

- A POST that has taken its place and passed the second read of the link's row, and whose
  `delegation.create` lands after a `token.revoke` of the group has finished, leaves one live
  token of the group; a second revoke ends it. A link for one has the same window today. Not changed.
- No test makes the core refuse the `delegation.create` of a link for several, so "A use is not
  spent when no token was made" in the reference rests on reading line `place ? await
  rows.delete(place) : await rows.put(key, made)` and not on a run. The rig refuses a name that is
  taken, and a group token's name ends in four random characters.

### Tests

- `cd cloud-brain-dev && bun test.ts brain --with <the built module>` after the last change:
  `passed 29, failed 0, needsBrowser 0`.
- `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-kernel --emit kernel_service=…`
  after the last change, once: `tests 29, passed 29, failed []`, Chrome 151.0.7922.34. The same
  command without `--emit` gave 29 of 29 three times on `bb012ae1`, before the review's changes.
- The new test is `test_a_link_for_several_gives_each_a_token_of_their_own`; the other 28 are
  unchanged. `74c72486` adds to it two calls of `token.create` with the group's name, each 400:
  while the link has uses left, and when its uses are given.
- `verify-run.ts` was not run: the kernel has no run of the deployer (`knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 4).

### Not tried

- A link for several on cb4. The spec leaves the one run of the whole path to the owner (its
  "What only the owner can do", 3): Copy Guest Invite with people at 2, two POSTs and a third.
- The spec writer's count that each of three edits taken out fails a test was not made again.
- Two POSTs racing for one place against the real database. The test runs four POSTs at once
  against the rig's rows; the reviewer read `putIfAbsent` as `INSERT OR IGNORE` on a primary key
  in `cloudflare-iac.ojs` and did not ask cb4 which `brain-db` runs.
