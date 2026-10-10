# owner-session-file-is-present

Rounds 1 and 2 are sections of `spec-as-built.md` dated 2026-10-10 19:21 and 19:32 (they were
written before this directory existed). `caller.present` is not changed by any round: the owner
chose at event 150 that an agent calls with a token, so the work is in `brain.ts` and the docs.

## Round 3, 2026-10-10 19:41 CEST

The one finding of review 2 (event 209). No seed changed, nothing was built, nothing was deployed.

**What was wrong.** `brain.ts curl <path> --as NAME` tested `!have[name]` on a plain object, so a
name every object inherits passed as a kept token. The test added this round, run against the file
before the change, with a base that has no state file and no token file:

```
Expected to contain: "no token \"toString\" is kept"      (the same for __proto__, constructor, hasOwnProperty, valueOf)
Received: " [000]\n"
 2 pass
 5 fail
```

`[000]` is curl started with a header built from the inherited property. The two that passed are
`--as` alone and `--as nobody`, which round 2 closed.

**What changed.** `tools/cloud-brain/brain.ts`: `keptToken(t, name)` returns the value only when
`Object.hasOwn(t, name)` and it is a string, else `""`. It is used in the three places a kept token
was read by name: the `curl --as` guard, the `authorization` header, and the "is kept already" test
of `token NAME <method…>`. `token revoke NAME` is not changed: it sends the name to `token.revoke`
and deletes the key from the file if the Brain answers 200.

**Tests.** `tests/tools/brain-cli.test.ts`, new, 7 cases (`cd tests/tools && bun test brain-cli.test.ts`):
7 pass against the file in the main checkout after the landing (19:45:38), 5 fail against the file
before. Run from the repo root the same file gives 0 pass, 7 fail, each with `EBADF: bad file
descriptor, posix_spawn '/opt/homebrew/bin/bun'` before `brain.ts` starts; a two-line test that
spawns `bun --version` fails there the same way, and both pass from `tests/tools`, `tools` or a
worktree. The cause was not found. The first commit of this round was pushed with the root command
in the test's header; the second corrects it. In a checkout with no `tools/scratch/cloud-brain-experiments/.cf-token` (a worktree) all 7
are skipped, because `brain.ts` reads that file when it starts; `BRAIN_TS=<path>` points the cases
at another copy. No `test_*` cell was run: no seed changed.

Run on cb4 with the changed file, 19:41:17, token `issues-implementer-2`:

| Call | Answer | Exit |
|---|---|---|
| `curl quota.get --as __proto__` | `no token "__proto__" is kept; make one with: …` | 1 |
| `curl quota.get --as toString` | `no token "toString" is kept; …` | 1 |
| `curl quota.get --as constructor` | `no token "constructor" is kept; …` | 1 |
| `curl quota.get --as nobody` | `no token "nobody" is kept; …` | 1 |
| `curl quota.get --as` | `--as needs a name: curl <path> --as NAME` | 1 |
| `curl quota.get --as issues-implementer-2` | 403 `this token does not name com.lopecode.brain.quota.get` | 0 |
| `curl issue.get?id=owner-session-file-is-present --as issues-implementer-2` | 200, 26085 bytes | 0 |
| `token toString x` | 400 `name is lower case letters, digits and -` | 1 |

The last row sent `token.create` with the owner's session. The kernel refused the name and no token
was made. Before the change the same line stops in `brain.ts` with "is kept already" (read in the
source, not run). It should have been checked without a call; it is recorded here because it was sent.

**Not done.** Nothing refuses a write sent with `--owner`; that is unchanged from round 1. The
example in the knowledge doc still names `'issue.*'` (review 1's note, not held against the change).

**Not tried.** `token constructor <method>` (a write with the owner's session). `token revoke` with
an inherited name. A token file that holds a non-string value. `--as` given twice (review 2 ran it:
the second reaches curl as an unknown option, nothing sent). No prefix such as `'issue.*'` has gone
through `brain.ts token`.
