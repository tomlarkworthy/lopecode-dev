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
- Tom's other notebooks are not in the library, so their modules have no card. 99 modules are (100 before
  the review, one of them not a module).
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
