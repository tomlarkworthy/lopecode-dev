# Research digests

A digest is a dated notebook in the Brain's library, written from one day of `brain-snapshot`'s
files. The first is `research-2026-10-09`:
<https://cb4.endpointservices.workers.dev/library/research-2026-10-09> (public, 4.8 MB).
Written 2026-10-09.

## How the first one was made

Claude Code wrote it in a local session. No part of it ran on the cluster.

1. Read the day's files, `/static/snapshot/<day>/*.json`, from a local copy. 843 items.
2. Chose the leads. Tom's request named the subject; the parent session proposed the six leads from
   titles and scores; this session read the stored summaries and fetched 15 linked pages to check
   each number it quotes.
3. Wrote the seed, `<day>.ojs`: prose as `md` cells, a `picks` array, and cells that load the day's
   files from the Brain when the page opens.
4. `bun tools/cloud-brain/digests/build.ts 2026-10-09 "Research digest, 9 October 2026"` writes
   `research-<day>.html` here (git-ignored; the library keeps it).
5. Opened the file headless and checked that every cell resolved.
6. `BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.library.put?name=research-<day>&public=true" --owner -X POST -H "content-type: text/html" --data-binary @tools/cloud-brain/digests/research-<day>.html`
7. Opened the library address in a browser with no session: 46 variables, no errors, 843 items in
   the table, 28 of 28 picks found among them.

## The replication

NeuDecide (audio and a tool list in, a tool call out) runs in the notebook. Its three ONNX graphs
and its authors' `neudecide.js` and `tokenizer.js` come from the authors' Hugging Face Space when
the button is pressed; onnxruntime-web 1.30.0 comes from jsDelivr. It runs in a sandboxed frame
(`sandbox="allow-scripts"`) because a library notebook runs as whoever is signed in.

Measured 2026-10-09 from the library address, headless Chromium on this Mac, one thread: 42.6 MB
loaded in 6.1 s; the three sample clips (3.0 to 4.2 s of audio) each took 0.52 to 0.55 s and
returned the expected call (`returnToBase`, `cleanRoom {room: "kitchen"}`, `getBinLevel`). Three
clips are not a check of the authors' 72.4%.

Whistle was not chosen: its file is a `.cact` container for the authors' C++ engine, and no
JavaScript or WASM build of that engine was found in its Hugging Face repository.

## What is manual

- Choosing the leads and writing the prose.
- Fetching linked pages. `openai.com` returned a JavaScript check, so that item rests on its feed
  summary.
- The build, the check and the `library.put`.
- The summary to Tom by Bluesky DM. It was drafted and not sent.
- arXiv's 611 items were not read; Hugging Face's 50 daily papers stood in for them.

## What must exist before the cluster does this on a schedule

- A place for the turn to run. No agent loop runs in a Worker; the turn needs a notebook in a
  cluster browser or the Containers workstream (`plan/cloud-brain-backlog.md`).
- A model the notebook can call under the Brain's quota, and a page fetch (`brain-proxy`) for the
  linked pages.
- The seed compiler in the page. `build.ts` uses the toolchain notebook's `compile` headless on
  this machine.
- A rule for what a digest may claim: each number from a stored summary or a page fetched that day,
  title-only items marked. Today that rule is in the prompt.
- A trigger after the snapshot's daily run, and a way to send the DM as the Brain.
- Something that reads past digests' `picks` back. Until then "self improve" is a person reading
  the backlog section of each digest.

## Layout, from Tom on 2026-10-09

- The page opens on the first theme. The paragraph on how the digest was written (who, from which snapshot run, what was and was not reproduced) is the last section, "How this was written".
- A digest opens with editing off. `build.ts` sets `__attachMenu: false` in editor-5's `cell_options.json`; the reader turns editing on from the menu.
- A link that leaves the Brain opens a new tab, and the page sends no referrer.

## What a digest is written from, from Tom on 2026-10-09

"yes, we want curated data". The papers of a digest come from `snapshot/<day>/papers.json`, the papers with a signal (votes on Hugging Face, a link from a lab's feed, a mention in another source), not from the full `arxiv.json`. The 2026-10-09 digest was written before that file existed, from all 611 arXiv items.

## Keeping the sources, and entering them in the knowledge base

```
BRAIN_BASE=cb4 bun tools/cloud-brain/digests/keep.ts <YYYY-MM-DD>
```

Reads the `picks` cell of that day's seed. Each pick is kept as a private file under `corpus/<day>/<source>/` (a paper as arXiv's PDF, a Reddit thread as its `.rss`, anything else as the page, stored as `text/plain`), and `corpus/<day>/index.json` names where each came from. A second run fetches only what is missing.

It then calls `knowledge.put` with two entries a pick: the source (`arxiv:<id>` for a paper, else `<source>:<id>`; the text is the snapshot's summary when the day's snapshot has one; `file` and `sha256` of the kept copy) and a `finding` whose text is the pick's `why` and which cites the source. Both have method `digest:research-<day>`.

2026-10-09, 08:41 CEST: 25 of 28 kept, 28.7 MB; 56 entries put, 54 new and 2 changed. Not kept: two Reddit threads (429) and openai.com (403); their entries have no `file`.

09:24 CEST, run again: 26 of 28 kept. One Reddit thread came through; the other answered 429 again and openai.com 403. The 56 entries were put again, all as changes.
