# token-revoke-no-name-ends-links

## Round 1, 2026-10-12

A defect of `gi-1-kernel-link-for-several`, found by its reviewer (event 2578): since the kernel
`brain` `18ab224bd54b`, `token.revoke` with a body that has no `name` deleted every sign-in link
that had no `group`. The kernel is not deployed by the loop (`rules.md`, Never). The owner chose A
of comment 2582 at event 3742: a writer of the loop writes the mend and its test and has it
reviewed, and the kernel is deployed with him present. This round is the first half. **Nothing
was applied to cb4: the kernel there is still `18ab224bd54b` and still has the defect.**

### The defect, seen again

The test below, written before the fix, on a build of the seed with only the test added
(`cd cloud-brain-dev && bun test.ts brain --with <the built module>`, 2026-10-12):

```
"passed":29,"failed":1
test_token_revoke_is_refused_a_body_with_no_name
    Object {},          the body
-   400,  +   200,      the status
-   2, 1  +   0, 0      rows link/, rows link-use/
    2, 200, 200         delegations in the rig, the owner's token, the guest's token
```

So `{}` took both links and the one place a guest had taken of the link for several, and ended
no token, as the issue says. The rig is the kernel's own (`kernelRig`): its rows are a map, and
the core's `delegation.*` is a stand-in.

### What changed

`tools/cloud-brain/brain-kernel.ojs`, 26 lines added and 2 removed (`git diff --numstat` of the
seed commit):

- `token.revoke` reads its body with `(await c.req.json().catch(() => null)) || {}` and answers
  400 `InvalidRequest`, "name is lower case letters, digits and -", unless `name` is a string that
  matches `/^[a-z0-9-]{1,40}$/`. The check is before both loops.
  The message is the one `token.create` and `token.link` give.
- `typeof name !== "string"` is there because `RegExp.test` makes text of what it is given: `5`
  and `["one"]` pass the pattern alone. What the deployed kernel answers to a body that is not
  JSON, or to no body, was not run: the test, before the fix, stopped at its first body.
- The reference cell, paragraph "Sign-in links": one sentence that such a body is answered 400 and
  ends nothing.
- A new cell, `test_token_revoke_is_refused_a_body_with_no_name`. Two links (`one`; `many` with
  `uses: 2`, one place taken), a token `kept`. Fifteen calls are each 400 and leave the rows and
  both tokens as they were: `{}`, `{name:null}`, `{name:""}`, `{name:5}`, `{name:["one"]}`,
  `{name:"One"}`, `{name:"one "}`, a name of 41 characters, `{group:"many"}`, the JSON bodies
  `null`, `"one"` and `[]`, the text `not json`, an empty body with a JSON content type, and a POST
  with no body. Then `none` answers `{ revoked: 0 }`, `one` `{ revoked: 1 }` and its link 401, and
  `many` `{ revoked: 2 }` with the guest's token 401 and `kept` 200.

No other cell changed. `plan/cloud-brain-group-invites.md` has an "(As built …)" note under the
four edits of `kernel-3.diff`.

### Can a name that exists be refused

A token or a link whose name is outside the pattern could no longer be ended by `token.revoke`.
Read in the seeds on 2026-10-12, not run:

- `token.create` and `token.link` refuse such a name (`brain-kernel.ojs`, the same pattern).
- `token.request` with no token takes 1 to 30 of the same characters, and `token.approve` names its
  link that base, a hyphen and four hex.
- A token of a link for several is the link's name (35 at most), a hyphen and four hex.
- The core refuses any other name in `delegation.create` and `delegation.adopt`
  (`brain-core.ojs`, `/^[a-z0-9-]{1,40}$/` in both).

Not looked at: the names of the delegations and link rows that cb4 keeps today.

### Who calls it

`git grep -n -F 'token.revoke' -- 'tools/cloud-brain/*.ojs' 'tools/cloud-brain/*.ts' tests`, less the
kernel's own seed: `brain.ts token revoke NAME` (asks for a name first), the page's `guestLink`
(`cloud-brain.ojs`, a name `guest-` and up to 24 of `a-z0-9-`, twice), and a stand-in in
`tests/tools/agent-token.test.ts`. `brain.ts token revoke` with a name outside the pattern now
prints `400` and leaves its kept entry; before, it printed `200 {"revoked":0}` and removed the
entry. Read, not run.

### Tests

Each after the last change to the seed and after the rebase onto `main`, 2026-10-12:

- `cd cloud-brain-dev && bun test.ts brain --with <the built module>`: `passed 30, failed 0,
  needsBrowser 0`. The same without `--with`, the kernel as deployed: hash `18ab224bd54b…`,
  `passed 29, failed 0`.
- `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-kernel --emit kernel_service=…`:
  `tests 30, passed 30, failed []`, Chrome 151.0.7922.34. Before the rebase the same command with no
  `--emit` gave 30 of 30 three times.
- `verify-run.ts` was not run: the kernel has no run of the deployer
  (`knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 4).

### For the owner: the deploy

The emit wrote `tools/cloud-brain/.emitted/token-revoke-no-name-ends-links-brain.json` in the main
checkout, hash `c1129bf0ed8e`, 701,954 bytes. `diff` of the built module and `cloud-brain-dev/deploy/@tomlarkworthy/brain-kernel.js` (what cb4 ran at
08:32 CEST): the cell bodies differ in the reference's paragraph, the two lines of `token.revoke` and the
new test. The rest of its lines are the list of definitions at the end, which the two files write in two forms. The file
is stale once another change to `brain-kernel.ojs` lands or the kernel is deployed from elsewhere:
build and emit again then. From the main checkout, with a token of the session's own for the lock:

```
LOCK_TOKEN=<token> tools/cloud-brain/lock.sh take cb4 token-revoke-no-name-ends-links
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts apply token-revoke-no-name-ends-links-brain.json --reason="token-revoke-no-name-ends-links: token.revoke answers 400 to a body with no name"
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts confirm brain
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts redistil
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts saw brain
LOCK_TOKEN=<token> tools/cloud-brain/lock.sh release cb4 token-revoke-no-name-ends-links
```

`confirm` within 10 minutes of the apply, or the version is put back. `seen.json` is then committed.
The check on cb4, with the owner's session: `token.revoke` with `{}` answers 400, and `token.list`
and the waiting links are as before it.

### Not tried

- Anything on cb4. Not run on cb4: needs the owner present.
- The emitted file was not applied anywhere, and its `source.text` was not compared with
  `getSource?worker=brain`; the comparison made is of the two module files above.
- The real core and the real database: the rig's stand-ins only.
- The page's Copy Guest Invite and `brain.ts token revoke` against a kernel with the check.
- The test with the pattern and no `typeof`: that `{name:5}` and `{name:["one"]}` then fail it is
  read from the line, not run.
  Run by the reviewer of round 1 (2026-10-12, `bun test.ts brain --with <a copy without the
  typeof>`): `passed 29, failed 1`, and the test stops at its first body, `{}`, with 200 and both
  links gone. `undefined` is the text `undefined` to `RegExp.test` and passes the pattern, so
  without the `typeof` the defect itself is still there.
