# Digest writer brief

You take one issue labeled `digest` from `ready` to `in-review`: the research digest of one day
of `brain-x-snapshot`'s files. Your prompt names the issue, `digest-<day>`. Read
`.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

Written 2026-10-11, the day `brain-x-snapshot` began to open these issues. No digest has been
written from this brief yet. The one digest that exists, `research-2026-10-09`, was written by a
session with Tom, and `tools/cloud-brain/digests/README.md` is the record of how. Read it whole
before step 3: its sections "Layout" and "What a digest is written from" are Tom's and bind you.

Your token is `issues-implementer-2`. `ia` is `tools/cloud-brain/issue-as.sh issues-implementer-2`,
defined as a function in each command, as in `agents/implementer.md`.

## What stops you today

Two steps of a digest are not open to an agent. Do the rest, then stop as step 7 says.

| Step | Why not | Read on |
|---|---|---|
| Publishing to the library | `library.put` is `allow: "caller.session", fixed: true` (`tools/cloud-brain/brain-library.ojs`, the `methods` of `library_service`): the owner's own session, and `rule.put` refuses a fixed rule. A token is not that. | 2026-10-11, in the seed; no call was sent |
| The summary to Tom by Bluesky DM | `rules.md`, Never: "Send a WhatsApp or Bluesky message." | 2026-10-11 |

When Tom changes either, this table and step 7 are edited in the same commit.

## Steps

1. **Read the issue.** `ia "get?id=digest-<day>"`. The body is the run's counts and the two
   addresses. A comment from the orchestrator may name earlier days this digest also covers.
2. **Claim it.** `ia move '{"key":"digest/<day>/start","id":"digest-<day>","to":"in-progress","reason":"…"}'`.
   Then `W=$(tools/cloud-brain/worktree.sh digest-<day>)` and work there.
3. **Read the day.** `https://cb4.endpointservices.workers.dev/static/snapshot/<day>/index.json`,
   then `papers.json` and each source file the index gives a `path` for. Public, no token. Not
   `arxiv.json` whole: it is marked `lookup`. For each day the digest covers, the same.
4. **Choose the leads and check them.** Research and the named writers lead; an aggregator says
   what people discussed. For each number you will quote, fetch the linked page that day and read
   the number there, or quote it from the stored `summary` and say so. An item you know by its
   title alone is marked as that. A page that would not load (`openai.com` answered a JavaScript
   check on 2026-10-09) is named in "What was not read".
5. **Write the seed**, `tools/cloud-brain/digests/<day>.ojs`, with `2026-10-09.ojs` open beside
   it: themes as `md` cells, `day`, the `picks` array (`id theme source title url why`), the cells
   that load the day's files, and last the section "How this was written" (who, which snapshot
   run by its `ranAt`, the days covered, what was fetched, what was not reproduced). A
   replication in the page is wanted when a lead ships something a page can run and you ran it;
   say "nothing was reproduced" otherwise. A day with little in it gets a short digest.
6. **Build and check.**
   `bun tools/cloud-brain/digests/build.ts <day> "Research digest, <D Month YYYY>"` writes
   `digests/research-<day>.html` (git-ignored). Open it in a QA tab under a session name of your
   own and count: the variables, those with an error (0), the items loaded, and how many of the
   `picks` are found among the items. Those four numbers are the count of your submit. The
   README does not name the tool its step 5 used; this is the check of its step 7, made on the
   file. Close the tab by name.
7. **Stop before publishing.** Commit the seed in the worktree and land it as
   `agents/implementer.md` step 10 lands a change with no deploy. Then one comment,
   `ia comment '{"key":"digest/<day>/built","id":"digest-<day>","body":"…"}'`, with: the four
   numbers; the path of the built file; the publish command of the README's step 6 with the day
   filled in; and the summary for Tom as you would send it, 300 characters at most, with the
   library address the page will have. Label the issue `needs-owner` and report. Do not submit:
   nothing is published for a reviewer to read.
8. **When publishing is open to you** (the table above is gone): publish, open the library
   address with no session and count the four numbers again there, then
   `ia move '{"key":"digest/<day>/submit-<round>","id":"digest-<day>","to":"in-review","reason":"…","refs":[{"kind":"commit","value":"lopecode-dev@<sha>"},{"kind":"url","value":"https://cb4.endpointservices.workers.dev/library/research-<day>"}]}'`.
   `tools/cloud-brain/digests/keep.ts` (the picks' sources into the Brain's files and knowledge
   base) calls with `--owner` and is not run by you; say in the comment that it was not run.

## What a digest may not do

- State a number that is in neither a stored summary nor a page you fetched that day.
- Call `snapshot.run`. A second run replaces the day's files, and a published digest reads them
  when it opens: `research-2026-10-09` says 843 items and loaded 823 after one
  (`plan/cloud-brain-backlog.md`, "Open 2026-10-09").
- Republish a kept source. Tom, 2026-10-09: kept PDFs and pages "are for private use, so they
  should stay private".
