# Search by meaning in the knowledge base: what was built and measured

Record of 2026-10-10, 09:15 to 09:45 CEST, on `cb4`. The code is `tools/cloud-brain/brain-knowledge.ojs`
(search, embedding, who reads an entry), `brain-library.ojs` (`libraryCards`), `brain-deployer.ojs`
(`ownIndex`) and `cloudflare-iac.ojs` (the `vectors` cell). Every figure in the sections up to "Not done" is from a command run in
that half hour, except where a line says when it was read; "After the review" has its own window. Times are
UTC from `date -u`.

## What was asked

Tom, 2026-10-10: "I would want to index all modules (not the whole thing!) as vectors for finding
relevant modules for a task … also … articles and ATProto entries … maybe hackernews articles too. It
would be to help agents find relevant context to their task", then "no chunking", "a single central
index", "I don't really want an index per tenant".

## What is there now

- One Vectorize index, `cb4-x-knowledge-bge-base-en-768`: 768 dimensions, cosine. Three metadata indexes,
  `owner` and `kind` (string) and `day` (number, `20261010`), made by the deployer before the Worker was
  bound to the index.
- One vector for each entry of `brain-x-knowledge`, from the first 1500 characters of its title and text
  joined, by `@cf/baai/bge-base-en-v1.5` through `ai.v1/embeddings` at `usd=0.00005` a text.
- `knowledge.search?semantic=true&q=` answers entries without their text, each with a `score`.
- `library.put` enters one entry of kind `module` for each module of the notebook.
- `/llms.txt` has a section "Finding what it holds" when a Worker declares `knowledge.search`.

`day` is a number and not `"2026-10-10"` so that `$gte` compares it as a number does. A range over text
was not tried.

## The index on cb4

```
knowledge.stats   {"entries":173,"vectors":173,"kinds":{"module":100,"finding":28,"paper":27,"article":10,"post":8}
vectorize info    {"dimensions":768,"vectorCount":173,"processedUpToDatetime":"2026-10-10T07:40:44.764Z"
```

| entered | how | cards or entries | wall |
|---|---|---|---|
| the 73 entries kept before today | `knowledge.embed` two times, 50 then 23 | 73 | 2.44 s, 1.70 s |
| `research-2026-10-09` (4.8 MB, public) | `library.index` | 72 | 2.80 s |
| `fairy-dog-calendar` (45 MB, private) | `library.index` | 45 | 2.86 s |
| `cloud-brain` (7.9 MB, put today, private) | `library.put` | 97 | 5.04 s |
| `quick_start` (4.9 MB, put today, public) | `library.put` | 72 | 3.47 s |

286 cards made 100 entries: a module has one card whichever notebook holds it. 73 of the 100 were public.
One of the 100 was not a module (see "After the review"); the counts of 97 and 72 above each include it.

`lope-reader` lists 100 modules in the Cloud Brain notebook and 75 in `quick_start`. Four in each have no
card, because a card is made for a block named `@user/name`: `es-module-shims@2.6.2`,
`@observablehq/runtime@6.0.0`, `@observablehq/inspector@5.0.1` and the Observable id `d/57d79353bac56631`.
That leaves 96 and 71.

### What it cost, from the log lines (read 07:57 UTC)

`logs.query`, the sum of `price` over the day's priced calls, by the account a call began with (`origin`)
and the caller:

```
origin owner    caller owner                     81 calls  0.32635
origin owner    caller worker:brain-x-knowledge  43 calls  0.01175    ai.v1/embeddings, 235 texts
origin member   caller worker:brain-x-knowledge   5 calls  0.00025    the member's 5 searches by meaning
quota.list      owner spent 0.3381, 124 charges; did:plc:cb4testmember0000000000 spent 0.00025, 5 charges
```

0.32635 + 0.01175 = 0.3381 and 81 + 43 = 124: every embedding the knowledge Worker bought for the owner
is on the owner's account, and `quota.list` has no account for `brain-x-knowledge`. The index cost the
owner $0.01175 by then, not the $0.008 first written here: that figure was `quota.get` read as 0.33 and
0.338, and the first reading was not kept to its digits. 235 texts are the 173 entries and 62 more: each
search by meaning buys one, and so does each put that changes an entry's words.

A search by meaning is charged to whoever searches. The member's five cost the member $0.00005 each.

## Times, from this machine in Berlin (curl's `time_total`)

| call | runs | seconds |
|---|---|---|
| `knowledge.search?semantic=true` | 10 | 0.448 to 0.548, middle 0.478 |
| `knowledge.search` by words | 5 | 0.171 to 0.218 |
| `knowledge.put` of one new entry, embedded | 5 | 0.930 to 1.294 |
| `knowledge.put` that changes a tag (no embedding) | 3 | 0.195 to 0.221 |

A search by meaning is one embedding, one Vectorize query and one D1 read. The parts were not timed apart.

## A write is searched about a minute later

Vectorize answers an upsert at once and applies it later. Three writes, by the index's own count:

```
sent 07:36:15  vectorCount 0 at 07:36:56, 50 at 07:37:05      41 to 50 s
sent 07:37:36  145 at 07:38:28                                  under 52 s
sent 07:37:55  145 at 07:38:48, 173 at 07:38:58                53 to 63 s
```

A search for modules at 07:38:06 and 07:38:21 answered `{"entries":[]}` with status 200; the same search
at 07:39:28 answered four. Nothing says a write is pending. A search by words finds the entry at once.

The list of metadata indexes lags the same way: created at 07:34:36, it showed `day` alone at 07:35:57 and
all three at 07:36:04, and a second create of `kind` in between answered 400 `metadata index already
exists for this name`. No vector was sent before all three were listed.

## What a search answered, as the owner, `kind=module`, `limit=4`

```
run code in a container       0.631 runtime-sdk   0.623 brain-container   0.612 grid-container   0.608 invoke-variable
drag-and-drop layout          0.668 lopepage-2    0.631 sticky            0.629 spectral-layout  0.590 svg-lens
export a notebook             0.694 exporter-3    0.653 save-in-place     0.633 editor-5         0.613 blank-notebook
send a message on WhatsApp    0.690 brain-whatsapp 0.553 brain-bluesky    0.546 robocoop-5       0.522 brain-inbox
unit tests for cells          0.696 ui-testing    0.688 tests             0.679 cell-map         0.636 invoke-variable
keep a secret for a worker    0.581 brain-secrets 0.545 brain-core        0.534 brain-deployer   0.503 brain-proxy
lease a headless browser      0.647 brain-browser 0.600 brain-shell       0.574 lopepage-2       0.564 brain-kernel
```

(Read 07:38 to 07:40 UTC, before the review's changes. The first answer of two of the seven changed after them;
six of the seven rows differ somewhere. See "After the review".)

The wanted module is first in six of seven and second in one (`brain-container`, 0.008 behind
`runtime-sdk`). Scores sit between 0.50 and 0.70 for a match and a miss alike, so a score is an order and
not a threshold. Seven questions written by the session that built the index are not a measure of recall.

## One index, and who reads what

The filter `owner $in ["public", <caller>]` is made by the service from the caller the core names. Proof on
cb4, 07:40:12 to 07:40:30, with the test member `did:plc:cb4testmember0000000000`, granted
`knowledge.search`, `get` and `list` for those 18 seconds:

```
before the grant           403 "has no grant for com.lopecode.brain.knowledge.search"
send a message on WhatsApp 0.546 robocoop-5, 0.509 blank-notebook, …        (the owner's first: brain-whatsapp 0.690)
the same with &owner=owner the same four
search by words "whatsapp" {"entries":[]}
get module:tomlarkworthy:brain-whatsapp   404 EntryNotFound                   (the owner: 200)
list, limit 100            73 entries, 0 private, kinds ["module"]
semantic, limit 100        73 entries, 0 private                             (the owner: 100 entries, 64 private)
```

The grant was deleted (`grant.list` answers `[]`).

Until today `get`, `list` and search by words had no such check: a member granted `knowledge.search` would
have read the kept papers. All 73 entries from before are the Brain's and private.

## Decided without asking

- The model: `bge-base-en-v1.5`. The other 768-dimension model on the list, `embeddinggemma-300m`, is
  marked beta and lists no price, and `brain-x-ai` budgets a call from the listed price. It is English
  only. A text of 1500 characters with no repeated word was answered (200), so the model's 512 tokens cut
  a long text and do not refuse it.
- A question is sent with the prefix the model's makers give ("Represent this sentence for searching
  relevant passages: "); an entry is not. Not compared against no prefix.
- `semantic=true` on `knowledge.search` and not a new method: the filters, the rule and the answer's
  shape are the same, and a token that names `knowledge.search` has both.
- A kind is any name. `knowledgeKinds` was a closed list; `module` would have been refused.
- An entry has `public`. Left out, a new entry is private.
- A put whose title, text, kind and reader are unchanged keeps its vector and buys no embedding.
- A binding, not a token: the deployer makes the index and binds it, as it does the D1 database. The
  deployer's Cloudflare token already reached Vectorize (a list answered 200 before any change).
- Two notebooks were put in cb4's library to have modules to search: `cloud-brain`, not public, and
  `quick_start` from `lopecode`, public.

## Not done

- Articles from the web, ATProto records and Hacker News items are not entered. Only `brain-x-snapshot`'s
  papers, the digest's picks and module cards are. Each needs its feeder to call `knowledge.put`.
- ~~Tom's other notebooks are not in the library.~~ Put the same day: see "The notebooks are put" below.
  At the time of this section 99 modules had a card (100 before the review, one of them not a module).
- `library.setPublic` and `library.delete` leave the cards as they were.
- A member cannot enter: no rule opens `knowledge.put` to one. The service keeps a person's entries
  apart from the Brain's (tested under `simulate`, not on cb4).
- Who is charged when a Worker enters on its clock (the snapshot at 06:00 UTC) was not seen. A Worker's
  allowance is $0.10 a day, 2000 texts.
- The index of another model: the deployer makes it and leaves the old one. Nothing copies or deletes.
- Removing `brain-x-knowledge` leaves its index, as it leaves its database.

## After the review (2026-10-10, 09:50 to 10:05 CEST)

A fresh agent with the files and nothing else answered FIX with seven findings. All seven were checked
against the source and held. `brain-x-knowledge` `8aae9e661b15`, `brain-x-library` `8648967fa482`.

1. **A card for a module that does not exist.** `libraryCards` ran one regex over the whole file, and a
   line of prose in the wiki page `@tomlarkworthy/markdown-wiki/notebook-programming-concepts.md` quotes a
   module's opening tag with the id `@user/module-name`. cb4 held the entry `module:user:module-name`,
   public. The file is now read block by block from the top, as `tools/lib/notebook-blocks.ts` reads it,
   so a tag inside another block's text starts nothing. The entry was deleted at 07:57:41 UTC; `get`
   answers 404 and a search for its words answers three other modules.
2. **The counts.** Restated above: 100 modules, 96 cards, four named another way.
3. **A private notebook's put wrote over a public card.** The card stayed public and took the private
   copy's title, first prose, cell names and address. Now such a put sends `unlessPublic`, and
   `knowledge.put` leaves a public entry whole and counts it in `skipped`. On cb4 no card was in that
   state when checked at 07:56 UTC: the 73 public cards pointed at `quick_start` (72, the one that was
   not a module among them) and `research-2026-10-09` (1). It did happen once. `research-2026-10-09`,
   public, was indexed first; `cloud-brain`, private, was put at 07:37:49 UTC and wrote its copy into
   the cards the two share; `quick_start`, public, was put at 07:37:53 and wrote over those it holds.
   For those four seconds, and after them for any module in `research-2026-10-09` and `cloud-brain` but
   not in `quick_start` (none was found at 07:56), a public card carried the private notebook's words.
   Nobody but the owner could read one: no member held a grant on a knowledge method until 07:40:12, and
   the methods answer anyone else 403. The rule was then run on cb4: `cloud-brain` indexed last answered
   `cards: 26`, and the 71 public cards of `quick_start` still point at it.
   The other way round is left as it was: a public notebook put after a private one makes the card public,
   with the public copy's words.
4. **The cost did not add up.** It does from the log lines; see "What it cost".
5. **Cards with no prose.** 16 of the 100 cards on cb4 were a title and cell names, because the first
   prose cell of those modules is the heading alone. The card now takes the first prose cell that says
   something once its headings are removed. After `library.index` of the four notebooks: 3 of 99
   (`bootloader`, `observable-runtime-v6`, `blank-notebook`), 25 texts embedded again, $0.00125.
6. **A put says an id is taken.** A person granted `knowledge.put` is answered 403 for an id another
   entered and 404 by `get`. Not changed: one thing has one id. Stated in the module under "Who reads an
   entry". No person holds the grant.
7. **This file** said "the title and the first 1500 characters of title and text" and "Not reviewed".

The index after: `knowledge.stats` 172 entries, 172 vectors, 99 modules, 72 of them public.

The seven questions again at 07:59:29 UTC, 100 s after the cards were entered (at 07:58:44, 55 s after,
every answer was still the old one):

```
run code in a container       0.638 grid-container 0.631 runtime-sdk     0.623 brain-container 0.614 claude-code-pairing
drag-and-drop layout          0.668 lopepage-2     0.631 sticky          0.629 spectral-layout 0.606 grid-container
export a notebook             0.736 exporter-3     0.653 save-in-place   0.630 editor-5        0.620 cloud-brain
send a message on WhatsApp    0.690 brain-whatsapp 0.553 brain-bluesky   0.522 brain-inbox     0.509 blank-notebook
unit tests for cells          0.710 tests          0.696 ui-testing      0.675 cell-map        0.636 invoke-variable
keep a secret for a worker    0.581 brain-secrets  0.545 brain-core      0.534 brain-deployer  0.503 brain-proxy
lease a headless browser      0.647 brain-browser  0.600 brain-shell     0.574 lopepage-2      0.567 brain-kernel
```

The module first written down as wanted is now first in five of seven. `brain-container` went from
second to third: `grid-container`, whose card had no prose before, now says it is a container and scores
above it. `tests` passed `ui-testing` for the same reason, and either answers the question. Nothing was
changed to move a rank. A card is the module's own opening prose, and a question that shares a word with
another module's prose finds that module.

## The second review (2026-10-10, about 10:05 CEST)

The changes since the first review went to a second fresh agent. It answered FIX with five findings, all
prose, and found no defect in the `unlessPublic` path, the block-by-block reader or the counts. It could
not run a `test_*` cell (Playwright's Chromium is not installed) and read nothing from cb4. All five held
and were applied:

1. The header said every figure was from 09:15 to 09:45 CEST; "After the review" has later readings.
2. "Two of the seven answer differently" was the count of changed first answers; six rows differ.
3. "Not done" said 100 modules; 99 after the review.
4. The library's prose named no writer for a card that only private notebooks have.
5. The module said "88 charges", a reading written down nowhere; the recorded one is 124 at 07:57 UTC.

## The notebooks are put (2026-10-10, 10:08 to 10:23 CEST)

Tom asked whether the notebook modules were in the index. They were not: four notebooks were in the
library. `tools/cloud-brain/library-backfill.ts` put the rest through `brain.ts curl` and `library.put`.
What was put, as told to Tom before the run:

- `lopecode/notebooks/*.html`, the published ones, public, first.
- `lopebooks/notebooks/*.html`, staging, private, after. A private put leaves a public card whole.
- The whole file is kept in the library. Only the card is embedded.

```
                      files   bytes         started   ended     cards answered
lopecode, public        51    130 222 244   08:08:38  08:11:11  UTC
lopebooks, private     187    725 878 864   08:11:29  08:20:50  UTC (8 retried from 08:20:15)
together               238    856 101 108                       3071
```

- **Names.** A notebook's name is its file name without `.html`. 23 names are in both repos: 14 staging
  files are the same bytes as the published one and were skipped; 9 differ and are kept beside it as
  `<name>.staging`. `@tomlarkworthy_cloud-brain` was put as `cloud-brain`, the name it already had.
- **Not put.** Two files in `lopebooks/notebooks` have no `bootconf.json` block (saved web pages, an
  IRS form and a stock image page). The library would have refused them with 400.
- **The largest.** `linux-claude`, 50 495 891 bytes, under the 50 MiB limit of `brain-static`: 15.0 s, 1 card.
  The median put took 2.5 s.
- **Order.** Public notebooks went in the order of how many modules `modules/canonical.json` names them the
  home of, fewest first, because the last public put that has a module writes its card.

### Eleven tries answered nothing

Eleven puts of ten files ended in under a second with curl's status `000` and no answer (`linux-claude`
after 10.8 s). Each went through when tried again, the same bytes. The cause was not found: the script
did not keep curl's error text on those tries. It now passes `-S --retry 2` and logs stderr. The log is
`tools/cloud-brain/.emitted/cb4-library-backfill.jsonl` (git-ignored); a file whose SHA-256 is in it with
status 200 is skipped on the next run.

### The index after

`knowledge.stats` at 08:21:00 UTC, and every module card listed with `knowledge.list?kind=module`:

| | before (07:59 UTC) | after |
|---|---|---|
| Entries, vectors | 172, 172 | 473, 473 |
| Module cards | 99 | 400 |
| of them public | 72 | 118 |
| of them private | 27 | 282 |
| Notebooks in the library | 4 | 240 (52 public, 188 private) |
| Bytes in the library | 62 937 148 | 906 278 578 |

- **Public cards that point at a private notebook: 0** of 118. No card points at a notebook the library
  does not have.
- **Cost: $0.0239**, `quota.get` 0.34035 at 08:08 to 0.36425 at 08:21, which is 478 texts at $0.00005.
  3071 cards were sent; a card whose title and text are as they were is not embedded again. `library.put`
  itself is not priced.
- **Most cards are private.** 282 of 400. A module that only staging has is found by the owner and by no
  one else, and `canonical.json` names lopebooks as the home of most modules.
- **A public card is often not from the module's home.** Of the 66 public cards whose module has a home in
  lopecode by `canonical.json`, 27 point at it. The others carry the words and address of whichever public
  notebook was put last with a copy. The order above is a heuristic: two homes that each embed the other's
  module cannot both be last. Nothing in `library.put` knows which notebook is a module's home.
- **47 of 400 cards have no prose**, cell names alone (3 of 99 before).
- **Modules by namespace:** `tomlarkworthy` 344, `endpointservices` 13, `bumbeishvili` 11, `mbostock` 9, and
  14 others with 1 to 4.

### A write was searched after two minutes, not one

The last eight puts ended at 08:20:50 UTC. By the index's own count (Cloudflare's `info`):

```
08:22:41  vectorCount 467, processedUpToDatetime 08:20:35
08:22:48  467
08:23:04  473, processedUpToDatetime 08:20:50        118 to 134 s after the last write
```

A search for "votes for women history" at 08:21:46, 08:22:16, 08:22:24 and 08:22:31 did not answer
`womens-suffrage`, entered at 08:20:44; at 08:23:11 it was first, 0.653. Earlier in the day the lag was
41 to 63 s. Search by meaning took 0.44 to 0.50 s over four runs, 1.07 s on the first, with 400 cards.

### What a search answered, as the owner, `kind=module`, `limit=4`, 08:21:24 UTC

A `*` is a private card. The first seven are the questions asked before; the last five were written
before they were run, about modules that had no card until today.

| Question | Answered |
|---|---|
| run code in a container | `compile-zig*` 0.660, `endpointservices/serverless-cells*` 0.648, `serverless-cells*` 0.644, `lopecode-live-2026*` 0.643 |
| drag-and-drop layout | `lopepage-2` 0.668, `sticky` 0.631, `spectral-layout` 0.629, `vertical-sliders*` 0.620 |
| export a notebook | `exporter-3` 0.731, `exporter*` 0.720, `exporter-2` 0.715, `save-in-place` 0.653 |
| send a message on WhatsApp | `brain-whatsapp*` 0.690, `firestore-messaging*` 0.573, `foc-chat*` 0.567, `tom-larkworthy*` 0.559 |
| unit tests for cells | `tester*` 0.733, `notebook-semantics*` 0.720, `tests` 0.710, `ui-testing` 0.696 |
| keep a secret for a worker | `brain-secrets*` 0.581, `brain-core*` 0.545, `secrets` 0.537, `brain-deployer*` 0.534 |
| lease a headless browser | `brain-browser*` 0.647, `brain-shell*` 0.600, `serverless-cells*` 0.576, `webxr-dom-overlay*` 0.575 |
| solve a mixed integer linear program | `mip*` 0.769, `expression-fuzzer*` 0.556, `spectral-layout` 0.552, `linear-app-technical-deep-dive*` 0.540 |
| draw a state machine | `fsm*` 0.695, `belief-geometry*` 0.644, `svg-boinger*` 0.617, `p5-sandbox*` 0.614 |
| run Python in the browser | `brain-browser*` 0.658, `pyodide*` 0.649, `claude-code-browser*` 0.614, `compile-zig*` 0.612 |
| shortest path in a graph | `dijkstra*` 0.648, `spectral-layout` 0.644, `ego-graph*` 0.598, `mip*` 0.581 |
| music sequencer with audio tracks | `sequencer*` 0.773, `daw*` 0.695, `audio-inputs*` 0.684, `butter-synth*` 0.646 |

- Of the first seven the wanted module is first in five, as after the review, with four times the cards.
  `brain-container` is no longer in the four for "run code in a container"; asked "container" alone it is
  first of 100. `tester` (staging only) now leads "unit tests for cells".
- Of the five new ones the module I had in mind is first in three (`mip`, `fsm`, `dijkstra`) and second in
  two (`pyodide`, `daw`). At 08:23:11, once the index had the last writes, "run Python in the browser"
  answered `monty*` 0.693 first ("Monty: sandboxed Python in the browser"), entered at 08:20:49.
- I wrote all twelve questions. This is not a recall measure.

### Not done by the backfill

- Staging stayed private, so 282 modules are found by the owner alone. Making a module's card public is a
  put of a public notebook that has it, or `{ id, public: true }`. Which staging notebooks may be public
  is Tom's to say.
- A card from the module's home notebook: it needs `library.put` to be told the home, or the puts to be
  ordered module by module. Not built.
- The 9 `.staging` notebooks and the 14 skipped ones are not reconciled with their published copies.
- A changed notebook is not put again by anything. The script is run by hand.


## The knowledge docs are entered (2026-10-10, 10:28 to 10:31 CEST)

Tom, 2026-10-10, on what else to index: "yeah I think knowledge docs are quite useful as well". The 50
files of `knowledge/*.md` in this checkout are entries of kind `doc`, id `doc:<file name>`, entered by
`tools/cloud-brain/knowledge-docs.ts` through `knowledge.put`. No seed changed and nothing was deployed.

```
08:29:07 UTC  put --all   {"put":50,"public":38,"private":12,"entered":50,"changed":0,"vectors":50,"ms":4444}
quota.get     spent 0.36555 -> 0.36805   (50 texts at 0.00005 = 0.0025)
knowledge.stats before    473 entries, 473 vectors   -> 523 after
```

- **What is embedded:** the H1 as the title, then the frontmatter `topics:` line where a doc has one,
  then the body from its top. The service embeds the first 1500 characters of title and text, and keeps
  16000 characters of text for the search by words. One vector a doc, no chunks: the three largest docs
  are 188 KB, 78 KB and 37 KB, and nothing past their opening is found by meaning.
- **Where the entry points:** `url` is the file on GitHub
  (`https://github.com/tomlarkworthy/lopecode-dev/blob/main/knowledge/<name>.md`) and `sha256` is of the
  local file. The file is not copied into `brain-static`. Rejected: a copy under `knowledge-docs/`, as
  the kept papers have. It would be a second copy to keep in step, and the repository is public
  (`gh api repos/tomlarkworthy/lopecode-dev` answers `"visibility":"public"`, and the unauthenticated
  API answers 200), so the address already serves the file. Cost: the address shows `main`, so between
  an edit here and its push the entry's `sha256` is of a file the address does not yet serve.
- **Who reads one:** `scope:` with `in-notebook` is public, 38 docs; those already ship inside the
  public markdown-wiki notebook. `local-development` alone is the Brain's and private, 12 docs. The
  private ones are still readable on GitHub by anyone with the address; private here means a member's
  search does not answer them. Whether they should be public too is Tom's to say.
- **Searchable** between 08:29:49 and 08:30:11 UTC, 38 to 64 s after the put.

### A changed doc is not entered again

Tom's rule for the module cards, the same morning: "I don't think we should auto reindex, but we should be able
to tell its state with hash or something, and know how long it has been stale". The script has the same
two halves, and the state is worked out on this machine from the entry's `sha256`:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status          # fresh / stale / missing, a line a doc
BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts put --stale     # or --all, or names
```

`stale` gives how long: the time of the first commit after the last one whose file has the entry's
`sha256`. When no commit has that file, or the change is not committed, it is the file's mtime, and the
line says which. Checked at 08:29 UTC by putting the SHA-256 of the file two commits back on one entry:

```
stale    private working-with-cloud-brain-remote-lopecode-cluster stale 2.6 h (since 2026-10-10T05:50Z, commit 2c31dc6a)
{"docs":50,"fresh":49,"stale":1,"missing":0,"entriesWithNoFile":[]}
put --stale   {"put":1,"public":0,"private":1,"entered":0,"changed":1,"vectors":0,"ms":298}
```

`vectors: 0` because the text was the same; the quota did not move. A put of a doc whose text changed
embeds it once, $0.00005. The entry's own `staleSince` field (added today for the module cards) is not
set by this script: the Brain cannot see this checkout, so the state would be as old as the last run.

### What a search answered, as the owner, `limit=3`, 08:30:17 UTC

Six questions, written before the first search. `*` is a private entry, `m:` a module card.

| question | `kind=doc` | no kind |
|---|---|---|
| how do I push a cell to ObservableHQ | `pushing-cells-to-observablehq` 0.798, `diagnosing-new-observable-platform-differences*` 0.707, `writing-cells-in-module-source` 0.668 | the same doc 0.798, `m:observablejs-reference` 0.724, `m:switch-dataflow*` 0.722 |
| why is my notebook blank after export | `exporting-the-notebooks-writing` 0.681, `bulk-exporting-lopebooks` 0.655, `what-a-saved-notebook-opens` 0.646 | `exporting-the-notebooks-writing` 0.681, `m:blank-notebook` 0.670, `m:exporter-3` 0.657 |
| how do file attachments work | `how-file-attachments-work` 0.768, `vendoring-npm-dependencies` 0.607, `keeping-user-state-in-the-saved-notebook` 0.588 | the same doc 0.768, `m:fileattachments` 0.688, `m:import-wizard-file` 0.659 |
| pair Claude with a notebook | `live-collaboration-with-claude-code-pairing` 0.664, `development-of-pairing-channel-and-claude-plugin` 0.636, `designer-resources-for-notebooks*` 0.614 | the same two docs, `m:claude-code-browser*` 0.636 |
| write a unit test in a notebook | `writing-unit-tests-in-a-notebook` 0.756, `exporting-the-notebooks-writing` 0.626, `keeping-user-state-in-the-saved-notebook` 0.625 | the same doc 0.756, `m:notebook-semantics*` 0.681, `m:tester*` 0.647 |
| deploy a change to the Cloud Brain | `working-with-cloud-brain-remote-lopecode-cluster*` 0.709, `querying-and-maintaining-the-lopecode-structured-knowledgebase` 0.528, `maintaining-and-updating-lopecode-and-lopebook-content-repositories` 0.517 | the same doc 0.709, `m:cloud-brain-specs*` 0.704, `m:brain-deployer*` 0.673 |

- The doc I had in mind is first in five of six. For "blank after export" it is third
  (`what-a-saved-notebook-opens`); `exporting-the-notebooks-writing` is about exporting prose.
- With no kind, the doc is first in all six and the next two are the modules the doc is about
  (`fileattachments`, `exporter-3`, `brain-deployer`). In these six a question phrased as "how do I"
  scored a doc above every module card, by 0.005 to 0.08.
- I wrote the questions, from the docs' subjects. This is not a recall measure.

### A member does not read a private doc

cb4, 08:30:37 to 08:30:41 UTC, the test member `did:plc:cb4testmember0000000000`, granted
`knowledge.search`, `get` and `list` for those 4 seconds:

```
before the grant                           403 "has no grant for com.lopecode.brain.knowledge.search"
semantic "deploy a change to the Cloud Brain", kind=doc
                                           3 entries, 0 private   (the owner's first: working-with-cloud-brain…* 0.709)
words "deployer", kind=doc                 0 entries              (the owner: 1, the private doc)
get doc:working-with-cloud-brain-remote-lopecode-cluster    404 EntryNotFound
get doc:how-file-attachments-work          200
list kind=doc, limit 100                   38 entries, 0 private  (the owner: 50, 12 private)
semantic "notebook", kind=doc, limit 100   38 entries, 0 private
after grant.delete                         grant.list {"grants":[]}, list 403
```

### Not done for the docs

- Run by hand. Nothing runs `status` on a commit or tells anyone a doc is stale.
- A doc deleted from `knowledge/` keeps its entry; `status` lists it under `entriesWithNoFile` and
  nothing deletes it.
- Only `knowledge/*.md`. Not `plan/`, the READMEs, `tools/cloud-brain/*.md`, the lopecode-plugin docs or
  the docs of the two content repositories.
- `knowledgeKinds` in the seed, the list the method reference prints as "in use", does not name `doc`.
  The service takes any kind; the list is prose and another session has that seed open.
- `/llms.txt` does not say that docs are among what the search answers.
- Not reviewed by a fresh agent.

## A card says when its module has changed (2026-10-10, 10:25 to 10:37 CEST)

Tom, after the notebooks were put: "what if a module gets updated? I don't think we should auto
reindex, but we should be able to tell its state with hash or something, and know how long it has
been stale." Until this change every `library.put` wrote the cards of its modules again and embedded
the ones whose words had changed.

What is there now (`brain-x-knowledge` `aae6f3ea23e8`, `brain-x-library` `437cab7a8afc`):

- A card's `sha256` is that of the module's block in the notebook file the card was read from, its
  `url` names that notebook and its `file` the kept file. `changed.at` is when it was last written.
- `library.put` sends its cards with `ifAbsent`. `knowledge.put` enters the ones that are new, leaves
  the kept ones whole and answers what each was made from. The library compares, and for a card made
  from this notebook whose block now differs it puts `{ id, staleSince }`. No text goes to the model.
- `staleSince` is on every answer that has the entry (`get`, `list`, both searches).
  `knowledge.list?kind=module&stale=true` lists the cards that differ, the longest so first.
  `libraryPanel` says how many.
- `library.index { name }` writes the notebook's cards from its kept file and clears the date.
  `{ name, rebuild: false }` does what a put does, from the kept file.

Where the state is kept was a choice. The entry already had `sha256`, `url` and `file`, so the hash
and the notebook went there, and one new field, `staleSince`, says the rest. `brain-x-knowledge` does
not read a notebook or compare anything: it keeps a date a writer gives it. The other way was a row
for each card in the library's own table; that is a second record of what the entry already says, and
a search would not have answered it.

### The 400 cards took their hashes without being written

The cards from the morning had no `sha256`. A card with none takes the hash of its module's block
when its `file` is the file the library still keeps for that notebook, which says the card was read
from that very file. `library.index { name, rebuild: false }` over the 240 notebooks, one after
another, 08:30:58 to 08:33:40 UTC (`.emitted/cb4-card-state-migration.jsonl`):

```
240 calls, 240 answered 200, each {"cards":0,"stale":0}
knowledge.list kind=module, all pages:   400 cards, 400 with sha256, 0 stale, 118 public
knowledge.list kind=module stale=true:   {"entries":[]}
```

### One module changed three times, on cb4 (08:31:21 to 08:31:40 UTC)

A scratch notebook `scratch-stale-proof` with one module, `@scratch/stale-proof`, put three times with
different prose, then indexed, then deleted with its card. `spent` is the owner's `quota.get`.

```
                      answer                 card's text      sha256      staleSince      spent
before                                                                                    0.36935
put v1   08:31:21     cards 1, stale 0       "…zebra…"        a0dabb60f0  null            0.36940
put v2   08:31:23     cards 0, stale 1       "…zebra…"        a0dabb60f0  1791621084163   0.36940
put v3   08:31:24     cards 0, stale 1       "…zebra…"        a0dabb60f0  1791621084163   0.36940
index    08:31:35     cards 1, stale 0       "…violin…"       b178fd1411  null            0.36945
index again           cards 1, stale 0                                                    0.36945
```

- The two puts of a changed module were charged nothing and left the card's words as they were.
- The second change did not move `staleSince` (08:31:24.163 UTC, the put of v2).
- While stale, a search by words for `zebra` answered the card with its `staleSince`; `lighthouse`,
  a word of v2 only, answered nothing. `list?stale=true` answered the one card.
- `library.index` embedded once ($0.00005). A second `index` of the same file was charged nothing.
- A search by meaning was not run against the stale card: a write is not in the index for a minute
  or two, and the test is the unit test's (`test_knowledge_says_since_when_an_entry_differs_from_its_source`).
- `quota.get` read 0.36950 at 08:34 UTC, one text more than the table ends on. The 240 migration
  calls changed no title or text, so they bought none; which call it was is not traced. Another
  session was entering docs in the same minutes.

Tests, forced from a side module in QA tab `kv-stale`: knowledge 9 of 9, library 7 of 7.

### Decided without asking

- **A card belongs to one notebook, and only that notebook makes it stale.** A module is in up to 218
  notebooks and most copies differ; counting any copy would leave nearly every card stale for good.
  How many other copies differ from a card is not counted: it would need each notebook's hashes kept,
  and nothing asks for it yet.
- **A module with no card still gets one from the first put that has it.** Otherwise a new module is
  not found until someone indexes its notebook.
- **A put that has the card's own block again clears the date.** The card matches its notebook again.
- **`library.index` takes a card from another notebook.** It always wrote every card of its notebook;
  now that a put does not, it is the way to move a module's card to its home (27 of 66 public cards
  point there). Seen in the unit test, not on cb4: no card was moved.
- **A notebook that is not public never takes a public card,** by put or by index, as before. Its put
  of a module whose public card is another notebook's records nothing at all, so nothing of a private
  notebook reaches a card a member reads.
- **The reverse case changed.** A public notebook put after a private one no longer makes the card
  public with its own words; the card stays the private notebook's until `library.index` of the
  public one.

### Not done

- Nothing reads `modules/canonical.json`: which notebook is a module's home is not known to the
  library, and no card was moved.
- A card's `file` may be a version the library no longer keeps (it keeps 10).
- `library.delete` and `library.setPublic` still leave cards as they were; a card whose notebook is
  deleted is never marked.
- A search does not rank a stale card lower or leave it out. It answers the date.
- `list?stale=true` is one page of 100 at most.
- Not reviewed by a fresh agent.

## The repos' notebooks are public and each card is at its module's home (2026-10-10, 10:44 to 10:51 CEST)

Tom, after the notebooks were put: "We should also probably index https://github.com/tomlarkworthy/lopecode
and https://github.com/tomlarkworthy/lopebooks they would all be public". The files were in the library
already; staging had been put private, so 282 of 400 cards were. `tools/cloud-brain/library-homes.ts`
(`plan`, `run`, `check`) did the rest with no change to a Worker. Log: `.emitted/cb4-library-homes.jsonl`.

### Which notebooks qualify

A notebook is public only when the file the library keeps is, byte for byte, the blob at `origin/main` of
one of the two repos, after a `git fetch` (lopecode `1c97371`, lopebooks `e051dfbb`). The GitHub API
answered `visibility: public` for both, unauthenticated. 234 of the 240 kept files matched a blob.

```
236 qualify      234 the kept file is the pushed blob (50 lopecode, 184 lopebooks)
                   2 tracked, kept in another version: put again from the pushed blob
  3 stay private   fairy-dog-calendar, linux-claude, tomlarkworthy_mermaid-9-2-2: in no repo's origin/main
  1 left as it is  research-2026-10-09: public since it was published, in neither repo
```

- **`quick_start` was public with a file that is not pushed.** The lopecode checkout is two commits ahead
  of `origin/main` (`2bbed08`, `5045424`, both change `quick_start.html`), and Tom has not said to push
  lopecode. The backfill put the checkout's file. It is now the pushed blob (`b18b3414…`, 08:44:14 UTC).
  The unpushed file is still one of the library's 10 kept versions of that name, opened by anyone who has
  its hash (`?v=`). Not deleted: `library.delete` removes every version.
- **`cloud-brain`** was an earlier build than the pushed one; put again from the blob (`e933a7ab…`).
- The 9 `.staging` copies are lopebooks files that differ from their published namesake. They are public
  and none is a module's home: 0 cards point at one.

### Where a card goes

The home of a module is `modules/canonical.json`'s lopecode notebook, else its lopebooks one
(`loadCanonical` of `tools/lope-sync.ts`). A module with none declared takes a qualifying notebook that
has it: one that is already some module's home first, lopecode before lopebooks. 398 modules are in the
236 notebooks; 279 have a declared home that has them, in 224 notebooks.

`library.index { name }` writes every card of its notebook, so one call cannot place one module. The 224
homes were indexed in an order that puts a notebook before the home of any other module it has. Two
homes that each have the other's module cannot both be last: that order leaves 55 modules (44 with a
declared home) with another notebook, 47 of them with `@tomlarkworthy_prosemirror`, the last indexed.
Those 55 the owner put with `knowledge.put`: the home's own card, read by `libraryCards` itself (the cell
is loaded from the built notebook with `tools/notebook-import.ts`, not copied into the script).

Alternative not taken: put all 398 cards as the owner in 8 calls and index nothing. It is 216 fewer
calls; it leaves `library.index`, the documented writer, unused, and the 55 would not be told apart.

### Measured (UTC)

```
08:44:09  before   400 cards: 118 public, 282 private, 0 stale; 176 of 279 at the declared home
08:44:12  put cloud-brain 200, stale 2;  08:44:14  put quick_start 200, stale 6
08:44:15 to 08:45:09  184 library.setPublic, all 200
08:45:09 to 08:49:32  224 library.index, all 200, 11,483 cards written, median 1.30 s, longest 2.14 s
08:49:36  knowledge.put of 55 cards: changed 55, vectors 13
08:49:40  after    400 cards: 399 public, 1 private, 0 stale; 279 of 279 at the declared home,
                   398 of 398 where the plan put them; 0 public cards at a notebook that is not public
```

- Of the 66 modules with a declared lopecode home, 66 have their card there (27 before).
- The private card is `module:fairy-dog:fairy-dog-calendar`. The modules of the other two private
  notebooks are in public ones too, and their cards point there.
- The library: 240 notebooks, 237 public.
- Cost: the owner's spent went 0.3695 to 0.40625, $0.03675, which is 735 texts at $0.00005. The plan
  counted 425 changes of words within the pass, plus a card's first write where the home's copy says
  something else than the card did. Another session entered 3 docs in the same minutes (50 to 53), so up
  to $0.00015 of it is not this run's. `library.setPublic` and `library.index` are not priced.
- Searchable: the owner's questions at 08:50:26, 46 s after the last write, answered from the new cards.

### The twelve questions again, as the owner, `kind=module`, `limit=4`, 08:50:26 UTC

No card in these answers is private now.

| Question | Answered |
|---|---|
| run code in a container | `compile-zig` 0.660, `serverless-cells` 0.649, `serverless-cells` 0.645, `serverside-cells` 0.639 |
| drag-and-drop layout | `lopepage-2` 0.668, `sticky` 0.631, `spectral-layout` 0.629, `vertical-sliders` 0.614 |
| export a notebook | `exporter-3` 0.731, `exporter-2` 0.715, `exporter` 0.711, `save-in-place` 0.653 |
| send a message on WhatsApp | `brain-whatsapp` 0.690, `firestore-messaging` 0.573, `foc-chat` 0.567, `tom-larkworthy` 0.557 |
| unit tests for cells | `tester` 0.733, `notebook-semantics` 0.720, `tests` 0.710, `ui-testing` 0.696 |
| keep a secret for a worker | `brain-secrets` 0.581, `brain-core` 0.545, `secrets` 0.537, `brain-deployer` 0.534 |
| lease a headless browser | `brain-browser` 0.647, `brain-shell` 0.600, `serverless-cells` 0.577, `webxr-dom-overlay` 0.575 |
| solve a mixed integer linear program | `mip` 0.742, `spectral-layout` 0.552, `linear-app-technical-deep-dive` 0.540, `expression-fuzzer` 0.540 |
| draw a state machine | `fsm` 0.695, `belief-geometry` 0.644, `svg-boinger` 0.617, `p5-sandbox` 0.607 |
| run Python in the browser | `monty` 0.693, `brain-browser` 0.658, `pyodide` 0.656, `compile-zig` 0.612 |
| shortest path in a graph | `dijkstra` 0.648, `spectral-layout` 0.644, `ego-graph` 0.598, `radial-tree` 0.573 |
| music sequencer with audio tracks | `sequencer` 0.766, `daw` 0.695, `audio-inputs` 0.665, `butter-synth` 0.646 |

First place: 5 of the first seven and 3 of the five new ones (`mip`, `fsm`, `dijkstra`), as before.
`pyodide` is third behind `monty`; `daw` second. The two `serverless-cells` are two users' modules of
that name. A few scores moved (`mip` 0.769 to 0.742) where the home's copy says something else.

### What a member reads now (08:50:51 to 08:51:07 UTC)

The test member `did:plc:cb4testmember0000000000`, granted `knowledge.search`, `get` and `list` for 15
seconds, then the grant deleted.

```
before the grant                         403 "has no grant for com.lopecode.brain.knowledge.search"
solve a mixed integer linear program     mip 0.742 first        (staging only: private until today)
draw a state machine                     fsm 0.695 first
deploy a change to the Cloud Brain       cloud-brain-specs 0.703, brain-deployer, cloud-brain-docs, cloud-brain
                                         (the owner's first: the private doc working-with-cloud-brain… 0.719)
fairy dog calendar                       svg-boinger 0.549, …   (the owner's first: fairy-dog-calendar 0.779, private)
get module:fairy-dog:fairy-dog-calendar  404          get doc:working-with-cloud-brain-…  404
get module:tomlarkworthy:mip             200          search by words "fairy"             {"entries":[]}
list, every page                         437 entries, 0 private: 399 modules, 38 docs
                                         (the owner: 526, 89 private)
after                                    grant.list {"grants":[]}, 403 again
```

### Decided without asking

- **Pushed means the blob at `origin/main`,** not "tracked in the checkout". That is what turned up
  `quick_start`.
- **`research-2026-10-09` is left public.** It was public before today and is in neither repo; its page
  cites kept sources, the kept files themselves are private entries. Whether a digest stays public is
  Tom's to say.
- **A module with no declared home** goes to a notebook that is already a home, so no extra notebook is
  indexed for it.
- **The owner's `knowledge.put` placed 55 cards.** Their `changed.by` is `owner`, not the library.

### Not done

- `library.index` takes a notebook, not a module, so the 55 are placed by a script. The next
  `library.index` of a notebook that has one of them takes it back; `library-homes.ts run` puts it right
  again. A `modules` list on `library.index` would remove the script's second step; it is a seed change.
- Nothing runs `library-homes.ts` when a notebook is pushed or `canonical.json` changes.
- A notebook pushed after today is not put: `library-backfill.ts` reads the checkout, not `origin/main`,
  and puts lopebooks private.
- The unpushed `quick_start` version is still kept (above). The 14 staging files that are the same as
  the published one are not in the library under a second name.
- `/library/cloud-brain` now serves the Brain's own notebook to anyone, as GitHub does.
- Not reviewed by a fresh agent.
