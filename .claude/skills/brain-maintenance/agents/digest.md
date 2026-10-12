# Digest writer brief

You take one issue labeled `digest` from `ready` to `in-review`: the research digest of one day
of `brain-x-snapshot`'s files. Your prompt names the issue, `digest-<day>`. Read
`.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

Written 2026-10-11, the day `brain-x-snapshot` began to open these issues. Two digests exist:
`research-2026-10-09`, written by a session with Tom, and `research-2026-10-11`, the first
written from this brief. `tools/cloud-brain/digests/README.md` is the record of how the first
was made. Read it whole before step 3: its sections "Layout" and "What a digest is written
from" are Tom's and bind you. Its step 6 puts with `--owner`, which is how the first was
published; yours is step 8 here, and `rules.md` forbids the other.

Your token is the one your prompt names, `dig-` and six hex digits (`issues-implementer-2` when it
names none); `<token>` below is that name, written out. `ia` is `tools/cloud-brain/issue-as.sh <token>`,
defined as a function in each command, as in `agents/implementer.md`. Write nothing with another
token. It names `issue.*` alone: `loop-library` and `loop-bluesky` are the tokens of step 8, as before.

## Nothing stops you today

Until 2026-10-11 two steps were not open to an agent, and the first digest written from this
brief (`digest-2026-10-11`) stopped before publishing. Both were lifted that day by Tom:

- The summary by Bluesky DM: "bluesky DMs to the owner or member owning the service are allowed"
  (`rules.md`, "A Bluesky DM").
- Publishing: "Why can't it be published automatically. I think this should be automated too".
  `library.put` takes a token since then, and a notebook the owner's own tab did not put is
  served with scripts and no origin, so it has no session of whoever opens it
  (`tools/cloud-brain/records/library-token-put-sandboxed.md`). What that costs your page:
  nothing is kept in the browser between visits, and it reads only public files.

## Steps

1. **Read the issue.** `ia "get?id=digest-<day>"`. The body is the counts and the two addresses
   of the run that opened it. A later `snapshot.run` that day replaces the files and not the
   body: take counts and `ranAt` from `index.json`. A comment may name earlier days this digest
   also covers. Every key you write is `digest/digest-<day>/<what>`, as `rules.md` shapes keys.
2. **Claim it.** `ia move '{"key":"digest/digest-<day>/start","id":"digest-<day>","to":"in-progress","reason":"…"}'`.
   Only the token that made `start` can submit. An issue already `in-progress` whose last `start` has another
   `by.holder` than `secret:<token>` is not yours to submit: comment, report, and stop
   (`agents/implementer.md`, step 4).
   Then work in your worktree, `$W`: the directory the first line of your prompt names, which the
   orchestrator made (`agents/implementer.md`, "Where you work"; when the prompt names the main checkout,
   `W=$(tools/cloud-brain/worktree.sh digest-<day>)`). `<root>` below is the main checkout.
3. **Read the day.** `https://cb4.endpointservices.workers.dev/static/snapshot/<day>/index.json`,
   then `papers.json` and each source file the index gives a `path` for. Public, no token. Not
   `arxiv.json` whole: it is marked `lookup`. For each day the digest covers, the same.
4. **Choose the leads and check them.** Research and the named writers lead; an aggregator says
   what people discussed. For each number you will quote, fetch the linked page that day and read
   the number there, or quote it from the stored `summary` and say so. An item you know by its
   title alone is marked as that. A page that would not load (`openai.com` answered a JavaScript
   check on 2026-10-09) is named in "What was not read".
5. **Write the seed**, `tools/cloud-brain/digests/<day>.ojs`, with `2026-10-11.ojs` open beside
   it: themes as `md` cells, `day`, the `picks` array (`id theme source title url why`), the cells
   that load the day's files, and last the section "How this was written" (who, which snapshot
   run by its `ranAt`, the days covered, what was fetched, what was not reproduced). A
   replication in the page is wanted when a lead ships something a page can run and you ran it;
   say "nothing was reproduced" otherwise. A day with little in it gets a short digest.
   Take the loading cells from that seed, not from `2026-10-09.ojs`, which was written before
   `papers.json` existed: it loads every source with a `path`, `arxiv.json` whole among them,
   and never `papers.json`. The loader of 2026-10-11 leaves out the rows marked `lookup` and
   loads `papers.json`; a pick that is a paper is looked for among its `papers` by the arXiv id
   (an item of `arxiv.json` has the feed's guid as its id, not that).
6. **Build and check.**
   `bun tools/cloud-brain/digests/build.ts <day> "Research digest, <D Month YYYY>"` writes
   `digests/research-<day>.html` (git-ignored). Open it in a QA tab under a session name of your
   own and count four numbers: the module's variables, those with an error (0), the items
   loaded, and the picks found among the items and papers. A `file://` page reads the
   snapshot's public files since they allow any origin (2026-10-11, the built file of that
   day: 55, 0, 216 items and 14 papers, 28 of 28). Do not publish a digest whose picks are
   not all found. Close the tab by name.
7. **Land the seed.** Commit it in the worktree. Copy the built file to
   `<root>/tools/cloud-brain/digests/`: it is git-ignored, and the
   publish command reads it from the main checkout. Land as `agents/implementer.md` step 10
   lands a change with no deploy.
8. **Publish, count, tell the owner, submit.** From the main checkout:
   ```
   BRAIN_BASE=cb4 bun <root>/tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.library.put?name=research-<day>&public=true" \
     --as loop-library -X POST -H "content-type: text/html" --data-binary @<root>/tools/cloud-brain/digests/research-<day>.html
   ```
   The answer has `"sandboxed":true`. `loop-library` names `library.put` alone; if `brain.ts`
   says no such token is kept, do not make one: comment, label `needs-owner`, report.
   Open `https://cb4.endpointservices.workers.dev/library/research-<day>` with no session in a QA
   tab (`chromium_args: ["--disable-features=LocalNetworkAccessChecks"]`, or the tab does not
   pair) and count the same four numbers there; they are the ones you report. On 2026-10-11
   they equalled the file's.
   Send the owner one Bluesky message (`rules.md`, "A Bluesky DM"): the summary, 300 characters
   at most, and the library address. Then one comment,
   `ia comment '{"key":"digest/digest-<day>/published","id":"digest-<day>","body":"…"}'`, with the
   four numbers, the answer of the put and of the send, and that `keep.ts` was not run (it
   calls with `--owner`). Then
   `ia move '{"key":"digest/digest-<day>/submit-<round>","id":"digest-<day>","to":"in-review","reason":"…","refs":[{"kind":"commit","value":"lopecode-dev@<sha>"},{"kind":"url","value":"https://cb4.endpointservices.workers.dev/library/research-<day>"}]}'`.
   Sent back by a review: fix the seed, build, land, and publish again; a second put by the
   token over its own first is taken. A 403 on that put means the owner has put the notebook
   since, and it is theirs: comment, label `needs-owner`, report.

## What a digest may not do

- State a number that is in neither a stored summary nor a page you fetched that day.
- Call `snapshot.run`. A second run replaces the day's files, and a published digest reads them
  when it opens: `research-2026-10-09` says 843 items and loaded 823 after one
  (`plan/cloud-brain-backlog.md`, "Open 2026-10-09").
- Republish a kept source. Tom, 2026-10-09: kept PDFs and pages "are for private use, so they
  should stay private".
