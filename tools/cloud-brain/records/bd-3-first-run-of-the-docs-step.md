# bd-3-first-run-of-the-docs-step

2026-10-11. Task 3 of `plan/cloud-brain-brain-docs-entered-by-hand.md`: the first put of the docs with
the token `loop-docs`, and the check after it. An act, with no seed, no build and no deploy. One doc
is changed with it (part 4).

The first put was not this writer's. Another landing released 114 s before my `put --stale` and its
release entered the 12 docs that were behind. What follows says which of the numbers I read myself
and which I did not.

## 1. Before

The token was made at event 1952. From the main checkout, 2026-10-11 20:48:08 CEST:

```
$ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check | grep -v '^fresh'
stale    private calling-a-cloud-brain-from-this-checkout stale 0.5 h (since 2026-10-11T18:17Z, commit 8ec143e9)
stale    private changing-and-deploying-a-cloud-brain-worker stale 2.3 h (since 2026-10-11T16:28Z, commit b63b1675)
missing  private cloud-brain-brain-docs-entered-by-hand
missing  private cloud-brain-dashboard-service
missing  private cloud-brain-i1842
stale    private cloud-brain-locks-held-in-the-cluster stale 2.4 h (since 2026-10-11T16:26Z, commit 4afeac1e)
missing  private cloud-brain-paper-summarizer-persona
missing  private cloud-brain-record-checked-by-review-alone
missing  private cloud-brain-record-names-token-not-agent
missing  private cloud-brain-dev-agents
missing  private cloud-brain-dev-readme
missing  private cloud-brain-dev-philosophy
{"docs":70,"fresh":58,"stale":3,"missing":9,"entriesWithNoFile":[],"source":"origin/main@c5d4617f"}
exit 1
$ tools/cloud-brain/lock.sh show land
land is held by record-checked-by-review-alone since 2026-10-11 20:48:09 CEST, until 2026-10-11 20:58:09 CEST
```

Exit 1 and not 2: the token is kept and `knowledge.list` answers it. 12 docs behind.

## 2. The put

The issue was started at event 1971. Then, 20:50:20 CEST, after `git fetch origin` (`origin/main` at `49fa9983`):

```
$ time (BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --stale)
nothing to put
exit 0, 1.629 s total
```

Who had put them, read from the entries (`knowledge.list?kind=doc&limit=100` with `loop-docs`, 20:50:46):
74 entries of kind `doc`, 70 of `method: knowledge-docs`. 12 of them carry the time 1791744508184,
2026-10-11 20:48:28.184 CEST: 9 in `at` and `wordsAt` with `changed` null (the 9 that were missing),
and 3 in `wordsAt` and `changed.at`, with `at` still 2026-10-11 18:09:26 (the 3
that were stale). One time for all 12, so one call of `knowledge.put`. Every one reads `by: owner`,
as `knowledge-by-says-owner-for-a-token` says a token's put does.

The lock of 20:48:09 was the landing of `49fa9983` (`git log --format='%h %ci' origin/main`: committed
20:48:06 +0200). Its writer's journal, `tools/cloud-brain/.emitted/issue-loop/record-checked-by-review-alone.md`,
has "Lock 20:48:09 to 20:48:26. The release printed docs (cb4): {"put":12,...}". I did not see that
line printed; the journal cuts it, so the `ms` of that put is not known to me. The entries' time is 2 s
after the release the journal gives.

So the step did what the spec designed it for before the task that was to try it had run: R5, "a doc
that fell behind by any other way … is entered by the next landing".

**The time a put took** is therefore not measured here for the 12. What I have: a `put --stale` with
nothing behind is 1.629 s wall (one `knowledge.list` and the git reads of 70 docs). The release of
this task's own landing changes one doc (part 4) and its line has `ms`; it is printed after this file
is committed and is in the issue's comment. Not done: a `put --all` to get a time. It would write 70
entries that are fresh, and its time would be of a put that embeds nothing.

## 3. After: the count that is this task's test

2026-10-11 20:50:28 CEST, main checkout:

```
$ BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status --check | grep -v '^fresh'
{"docs":70,"fresh":70,"stale":0,"missing":0,"entriesWithNoFile":[],"source":"origin/main@49fa9983"}
exit 0
$ … | grep -c '^fresh'
70
```

The two searches, with `loop-knowledge` (which names `knowledge.search` alone), 20:51:09 CEST:

| | Search | `sha256` of the entry | The file |
|---|---|---|---|
| R1 | `knowledge.search?q=doc:cloud-brain-brain-docs-entered-by-hand&kind=doc`, 1 entry | `9d78b58ae71b…7253b3f` | `git show origin/main:plan/cloud-brain-brain-docs-entered-by-hand.md \| shasum -a 256`: the same 64 characters |
| R6 | `knowledge.search?q=doc:cloud-brain-dev-philosophy&kind=doc`, 1 entry | `1e2464d4a08d…7ea47f8c` | `git -C cloud-brain-dev show 0ba1f450:philosophy.md \| shasum -a 256`: the same; `0ba1f450` is what `git ls-tree origin/main cloud-brain-dev` names |

A third, of a doc that had been stale and not missing: `q=doc:calling-a-cloud-brain-from-this-checkout`
answered 3 entries, that id first, `75aaa8355fdd…793f01b3`, the same as the file of `origin/main`.

The spec says of R6 that the hash does not show the entry holds the file's end. The search answers
`text`, so it was read: 15,987 characters, ending "added to it with this file, pointing here, and no
rule was changed.", which is the end of the file (`tail -c 120`). The file is 16,045 bytes; the entry
is 13 characters under the cut, as the spec counted. The entry is private, `url`
`https://cb4.endpointservices.workers.dev/git/cloud-brain-dev.git`.

## 4. The guide

`knowledge/calling-a-cloud-brain-from-this-checkout.md`, "The knowledge docs in the Brain's search",
said of the token "On 2026-10-11 20:14:45 CEST it had not been made". That bullet now says when it was
made, the first put as read above, and which of the three lines of the step has been seen from cb4
and which from a stub. `bun test ./tests/tools/docs-entered-by-the-landing.test.ts` in the worktree: 4 pass, 0 fail.

Since this is a doc of `knowledge/`, this landing is one "that changes a doc", which is R1's own
check for task 3: its release should print `docs (cb4): {"put":1,…}`.

## 5. The three reports

To be closed by this writer once this file has landed, each with its count in the reason (the events are in the issue's comment):
`seen-knowledge-docs-stale-in-search` (70 of 70 fresh, entered by a release with `loop-docs`),
`seen-doc-entries-with-no-file` (`entriesWithNoFile: []`; the four entries of other methods are still
there and are no longer counted, 74 - 70), `seen-operator-cannot-read-dev-repo` (the three
`doc:cloud-brain-dev-*` entries exist; whether the operator in the owner's tab reads them is his to try).
A feedback issue is reopened with `reopen` if the review of this task finds one was closed wrongly.

## Not tried

- The operator of the page reading `doc:cloud-brain-dev-philosophy` through `brain_call`: the owner's tab.
- `knowledge.get` of an entry: neither token names it. The text was read from the search's answer.
- A put that fails at a release with the token kept (cb4 not reached, a 403): seen only with stubs in `tests/tools/lock.test.ts`.
- Two landings whose puts cross (the spec, "After the release, not inside the lock").
- A push of `cloud-brain-dev` alone, and a commit pushed with no landing.
- `agents/overseer.md` gets `status --check` from the overseer, not from this task.

## Read before the act

`knowledge.search?semantic=true` with `loop-knowledge`, 2026-10-11 20:48 CEST:

| Searched | Found first | Used |
|---|---|---|
| "first run of put --stale with loop-docs after a landing" | `doc:cloud-brain-locks-held-in-the-cluster` 0.88 | nothing new: `lock.sh` is the cluster's lock since `lk-3` |
| "confirmation of an act is its test count from status" | `doc:calling-a-cloud-brain-from-this-checkout` 0.71 | the entry was the stale one; the file was read, for the exits of `status --check` |
| "knowledge docs stale in search entered by the landing" | `doc:cloud-brain-locks-held-in-the-cluster` 0.64, `doc:knowledge-reranking` 0.61 | nothing bore on it |

The spec of this project was not found by any of the three: it was one of the 9 missing.
