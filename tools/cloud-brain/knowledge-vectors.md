# Search by meaning in the knowledge base: what was built and measured

Record of 2026-10-10, 09:15 to 09:45 CEST, on `cb4`. The code is `tools/cloud-brain/brain-knowledge.ojs`
(search, embedding, who reads an entry), `brain-library.ojs` (`libraryCards`), `brain-deployer.ojs`
(`ownIndex`) and `cloudflare-iac.ojs` (the `vectors` cell). Every figure below is from a command run in
that half hour; times are UTC from `date -u`.

## What was asked

Tom, 2026-10-10: "I would want to index all modules (not the whole thing!) as vectors for finding
relevant modules for a task … also … articles and ATProto entries … maybe hackernews articles too. It
would be to help agents find relevant context to their task", then "no chunking", "a single central
index", "I don't really want an index per tenant".

## What is there now

- One Vectorize index, `cb4-x-knowledge-bge-base-en-768`: 768 dimensions, cosine. Three metadata indexes,
  `owner` and `kind` (string) and `day` (number, `20261010`), made by the deployer before the Worker was
  bound to the index.
- One vector for each entry of `brain-x-knowledge`, from its title and the first 1500 characters of title
  and text, by `@cf/baai/bge-base-en-v1.5` through `ai.v1/embeddings` at `usd=0.00005` a text.
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

286 cards made 100 entries: a module has one card whichever notebook holds it. 73 of the 100 are public.
The Cloud Brain notebook has 98 module blocks; the one with no card is named `d/57d79353bac56631`.

All of it cost the owner's account $0.008 that day (`quota.get` 0.33 before the first embedding, 0.338
after the last search). The charge went to the owner, the account each call began with: `quota.list`
listed no account for `brain-x-knowledge`.

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
- Tom's other notebooks are not in the library, so their modules have no card. 100 modules are.
- `library.setPublic` and `library.delete` leave the cards as they were.
- A member cannot enter: no rule opens `knowledge.put` to one. The service keeps a person's entries
  apart from the Brain's (tested under `simulate`, not on cb4).
- Who is charged when a Worker enters on its clock (the snapshot at 06:00 UTC) was not seen. A Worker's
  allowance is $0.10 a day, 2000 texts.
- The index of another model: the deployer makes it and leaves the old one. Nothing copies or deletes.
- Removing `brain-x-knowledge` leaves its index, as it leaves its database.
- Not reviewed by a fresh agent.
