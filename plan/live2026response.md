---
scope: [local-development]
---

# LIVE 2026 — revision plan

Acceptance mail received **2026-09-09**. Submission #8, *Source-last programming*, accepted to the
12th Workshop on Live Programming; 7 of 15 submissions accepted. Merit **5 (strong accept, expertise
3) / 5 (strong accept, expertise 4) / 4 (accept, expertise 3)**. Reviews are archived at
<https://submissions.liveprog.org/paper/8>; quotes below are copied from the acceptance mail.

The mail says "You will be able to revise your submission … and we will archive these" but gives no
date. **The revision deadline is unknown as of 2026-09-09** — everything below is ordered by
leverage, not by a schedule.

## The artifact being revised

`lopebooks/notebooks/@tomlarkworthy_lopecode-live-2026.html`, working copy
`modules/@tomlarkworthy/lopecode-live-2026.js` (728 lines). `bun tools/lope-sync.ts status` reports
`clean` for `@tomlarkworthy/lopecode-live-2026` on 2026-09-09, so the working copy can be edited and
pushed with `sync-module.ts` without a `pull` first.

Prose cells are named by section, so a review item can be aimed at a cell id. From the `define()`
block (`modules/@tomlarkworthy/lopecode-live-2026.js:624-711`) and the `sections` array (`:556`):

| § key | title | prose cells |
|---|---|---|
| — | abstract | `p0`, `_abstract`, `p1` |
| `ship` | Ship the code to the data | `s1p1` `s1p2` `s1p3` |
| `claim` | Runtime-first, not format-first | `s2p1` `s2x1` `_claimDiagram` |
| `cell` | A cell is a function that carries its source | `s3p1` `s3x1` `s3p2` + `_cellSource` |
| `modular` | The runtime is modular | `s4p1` |
| `copy` | Copying the live system | `s5p1` `s5p2` `s5x1` `_lv38man` `_stickyDiagram` `s5p3` |
| `mappings` | Formats are mappings from the runtime | `s6p1` |
| `html` | HTML: the document mapping | `s6bp1` `s6bx1` |
| `atproto` | ATProto: the record mapping | `s6ap1` |
| `iife` | IIFE: an unloader for the HTML | `s6cp1` `_0otyjzt` |
| `liberation` | Liberation | `s7p1` `s7p2` |
| `jam` | The jam: serializing a moment | `s9p1` `s9p2` |
| `agent` | One bundle | `s10p1` |
| `waist` | The thin waist | `s11p1` `s11p2` |
| `related` | Related work | `s12p1`–`s12p7` |
| `limits` | Problematic examples | `s13p1` (one cell, eight bolded items) |
| `questions` | The three questions | `s14p1` |

## The annotated working copy

`plan/live2026-annotated.js` — a byte-identical copy of the essay module with a
`── ANNOTATION ──` block at each of the 21 sites that needs an edit, carrying the reviewer quote,
the Pangram window, and bullet suggestions. It contains no replacement prose: Tom writes, this
file only marks. It parses as ESM, and stripping every annotation block returns the original
byte-for-byte (verified 2026-09-09), so it round-trips:

```
cp plan/live2026-annotated.js modules/@tomlarkworthy/lopecode-live-2026.js   # after stripping
bun tools/channel/sync-module.ts --module @tomlarkworthy/lopecode-live-2026 \
  --source modules/@tomlarkworthy/lopecode-live-2026.js \
  --target lopebooks/notebooks/@tomlarkworthy_lopecode-live-2026.html
```

## Ranked items

Status as of **2026-09-09**. Only the code half of R6 has been done; nothing in the essay text has
been touched, and nothing is committed.

| item | what it is | status |
|---|---|---|
| R1 | thesis + abstract do not land (8A, 8C) | open |
| R2 | LLM prose from §9 onward (8C) | open |
| R3 | define `viewof` / decompilation / waist; cut *lens* + BootstrapLab (8C) | open |
| R4 | re-select the eight `s13p1` items (8B, 8C) | open |
| R5 | Smalltalk modularity, ColorForth, Lisp code/data (8B, 8A) | open |
| R6 | already-open editors did not hot-replace (8C) | **code shipped**; the text is open |
| R7 | seven questions only Tom can answer | open |
| R8 | demos | open (deadline-dependent) |
| R9 | praise not to break | n/a — a constraint on the others |

R6 in detail: fixed in the two `editor-5` canonicals, on ObservableHQ (v4021) and in the essay
itself, guarded by two `ui.scenario` tests with a published upstream — verified by
`grep -c "editors.factory"` in all four artifacts. Still open: (a) 8C's wider question *"to what
extent can a live system be modified by itself?"* is unanswered in the essay — the boundary the repro
established (dataflow refreshes; a constructor call cached in a Map did not) is written down only
here; (b) 231 other notebooks still carry the unfixed block
(`lope-sync audit --module @tomlarkworthy/editor-5`), so a reader who opens some other lopebook still
sees the old behaviour; (c) the guard fires on `cellEditor` identity — whether a third path exists
through a clone sandbox was not tested.


### R1 — The thesis does not land (2 of 3 reviewers, and it is the title)

8A: *"I'm not sure if the opening criticism, source being the original sin of programming, is
actually addressed. A very cool system is built, but why source code is evil (and why runtime first
is virtuous) is not totally argued. … Source code is still there; it's just taken on a different
form, its not last its just different."*

8C: *"I was not able to either find or follow a story 'that the concept of source code itself was the
original sin that drove a wedge between user and developer'."* and *"am not convinced that the idea
of 'Source-last programming' underlies the ideas presented in the bulk of the paper"*, asking for the
abstract and thesis to be revised and *"Please consider cutting some of these generalizations to
focus on explaining the system and its consequences."*

8C also disputes the format-first premise on facts: *"ipynbs are probably not stored in memory during
editing of Jupyter notebooks, they are created on the fly by serializing the running notebook."*

That objection is answerable but the current wording in `_abstract` invites it, because it reads as a
claim about *where the bytes live*:

> Most existing programming systems are format-first: a canonical saved representation — `.ipynb`, an
> image dump, a document schema that the system loads.

The defensible version is about what the format *admits*: the save format bounds the ontology of the
system. Anything not expressible in `.ipynb` — an open editor, a pinned view, a slider position, a
live binding — cannot survive a reload, whatever the frontend holds in memory at the time. The essay
already demonstrates exactly this with `sticky` in §*Copying the live system* (`_dialView`, `:101`),
and cites Horowitz & Heer's non-persistent tools at `s5p2` for the same phenomenon. The demo is
present; the abstract does not claim it.

Proposed: rewrite `_abstract` and `s2p1` so the claim is "the save format bounds what can exist", with
sticky named as the discriminating case, and either drop "original sin" or actually argue it in
`s2p1`. Then check `s14p1` (the three questions) still answers the new Q1.

**Port the newsletter-002 diagram (author's call, 2026-09-09).** `source_last_diagram`
(`modules/@tomlarkworthy/lopecode-newsletter-002.js:58`, cell pid `_16mb9oy`) is an inline SVG that
states the thesis pictorially, and better than the essay's own `_claimDiagram`: the top band is
FORMAT-FIRST / UNIDIRECTIONAL — developer -> `source` -> compilation -> `program` -> end user, with a
dashed line at x=335 labelled **THE WEDGE**; the lower band is SOURCE-LAST / THE RUNNING PROGRAM IS
THE ARTIFACT, one *end-user programmer* against one `program` box, arrows both ways. It draws the
"original sin / wedge" claim that 8A says is asserted but never argued. Plain `svg` cell, no
dependency beyond the `svg` builtin, so it ports as a cell copy; it uses `--theme-foreground`,
`--syntax-keyword` and `--syntax-string`, which the essay's theme also defines.

Unverified: whether Jupyter's frontend holds the notebook model in memory during editing. If the
final version keeps any factual claim about Jupyter's internals, check it against the source rather
than restating it.

### R2 — Prose reads as machine-written from §8 onward

8C: *"I found it a bit painful to get through section 8 and onwards, possibly because of poor LLM
writing? Ctrl+f 'the point' for some LLM-writing-isms that were hard to read."*

`grep -c "the point"` on the module returns **4**, at `s9p2:211`, `s10p1:219`, `s12p4:279`,
`s12p6:281` — all in the back half, which is where the reviewer says the reading got painful. Their
"ctrl+f" was a real signal, not a guess.

**Scored 2026-09-09** with Pangram 4 (`bun tools/prose-qa/pangram-score.ts … --score --min 0.5`;
81 paragraphs, 4090 words, $2.05; report at
`tools/prose-qa/reports/@tomlarkworthy_lopecode-live-2026-lopecode-live-2026-2026-09-09.json`).
Headline **AI Detected**, `fraction_ai` **0.647**, `fraction_human` 0.353, in six windows:

```
chars          words  verdict          covers
0–4189           672  Human    0.14    title, abstract, §ship, §claim, §cell (opening)
4189–6321        336  AI       0.77    §cell tail (s3p1 list, cellSource, s3x1, s3p2), §modular
6321–11125       790  Human    0.23    §copy, §mappings, §html, §atproto, §iife
11125–12410      216  AI       0.86    §liberation (s7p1, s7p2)
12410–12624       38  Human    0.41    the Adversarial-Extension line + the first sentence of §jam
12624–26114     2087  AI       0.95    §jam tail → §agent → §waist → §related → §limits → §questions
```

The 0.95 window starts at the *second sentence of `s9p1`* and runs to the end of the document.
8C wrote *"I found it a bit painful to get through section 8 and onwards"*; the detector puts the
boundary in the same place and holds it for 2087 words — 65% of the essay by volume. Their ctrl+f
was corroborated by an instrument that had not read their review.

Two limits on what that number means. Pangram scores **windows, not paragraphs**, so every
paragraph inherits its window's score and the per-cell table cannot rank paragraphs against each
other; and it is a detector, not a judge — §related is one long string of quotations from other
papers, which is a known false-positive shape, while §limits was praised by name by two reviewers.
Rewrite by hand, rescore, and compare `fraction_ai` across reports; never run a loop against the
score.

**A defect in the scorer had to be fixed first.** `extractParagraphs` matched
`$def("pid", name, [deps], (_[\w$]+))` — the compiled function identifier had to begin with an
underscore. This essay names most of its prose cells `s1p1`, `s2p1`, … so 44 md `$def`s were
present and only 7 were scanned: the first dry run reported *17 paragraphs, 456 words* for a
4090-word essay and would have missed every section the reviewer complained about. Widened to
`([\w$]+)` in `tools/prose-qa/pangram-score.ts`. Any earlier score taken with this tool on a
module that does not use `_`-prefixed cell functions is an undercount.

### R3 — Undefined terminology (8C, cheap, unambiguous)

*"Please define: Observable JS syntax (`viewof` etc., examples can be included, many people are not
familiar); decompilation (decompiling from what to what? I was lost on this for quite a while until I
read the sequence diagram very carefully and logged some values when cells are edited to see what is
happening); waist (is it 'thin waist' or 'reflective waist'? What is this exactly in Lopecode?)"*

And to cut: *"examples of terminology and citation that I think is unnecessary: lens; BootstrapLab
stuff around Platform, substrate, product."* — `lens` is `s5p3`, the BootstrapLab vocabulary is in
`s12*`.

A reviewer had to instrument the notebook to work out what "decompilation" meant. That is a defect in
`s3p1`/`s5p3`, not in the reviewer.

### R4 — §Problematic examples: keep it, re-select it

8B: *"I greatly appreciated the Problematic Examples section."* 8C wants a different cut of the same
list — too implementation-detail-y and unmotivated: *"The browser has its own limitations, No
closures means not general JavaScript, Decompilation has edge cases"*; too underdeveloped, and the
interesting ones: *"Offline-first is manual labour, The moldability gradient is steep"* — *"The
underdeveloped ones are interesting, please explain and elaborate those."*

All eight items live in one cell, `s13p1`. The two to expand are two sentences each today. The
moldability-gradient item is also the answer 8A is asking for in R6, so expanding it does double duty.

### R5 — Related work: one specific addition each

8B: *"although the connection with Smalltalk is acknowledged I felt it was still a little underplayed.
Code in the Smalltalk image is stored as an AST and imported/exported as text only when needed. Images
were in practice shared and copied in order to collaborate and deploy. OTOH it appears that Lopecode
has a better approach to modularity, which could be discussed more."* — i.e. the round trip is not the
differentiator; modularity is. That is `s12p4` (currently the Smalltalk paragraph) and it interacts
with R2, since `s12p4` is one of the four "the point" cells.

8B: *"Related work: ColorForth rewrites its source to update state."* — new citation, `_bibliography`
(`:324`).

8A: *"A reductive take on this work would observe that this is just the blurring of code and data
taken to a particular extreme. The comparison with LISP is rightly noted in the related work, but I
think there's more to examine there. … how does a system that makes the notion of data versus source
code meaningless compare?"*

### R6 — A reviewer found a live defect by using the artifact

8C: *"I tried modifying the text editor in Lopecode but I noticed my definition change did not change
any of the already open text editors, only editors that get created after the change, or if I fork the
notebook. I would be excited to see 'hot' replacement. Conceptually speaking, to what extent can a
live system be modified by itself?"*

A liveness gap found by hand in a liveness paper. **Code done 2026-09-09, text still open.**
Repro'd and fixed in both `editor-5` canonicals, with two `ui.scenario` tests guarding it — see the
*Repro log* and *The fix*.
Outcome in one line: the editor's panel cells *do* hot-replace into open editors, and
have since before submission; the editor *host* does not, because `auto_attach` memoises one editor
per variable and never rebuilds it, so any change to `cellEditor` or to a cell it closes over reaches
only editors attached afterwards. Which of the two the reviewer edited is unknown.

The memo now evicts and disposes when the factory changes, on ObservableHQ and in the essay itself
(see *Deployment*). What is left is the wider question 8C asked alongside it. Note
that the answer to 8C's wider question — *"to what
extent can a live system be modified by itself?"* — is sharper than a yes/no once the boundary is
stated: the parts of the editor that are *data-flow* refresh live, the part that is a *constructor
call cached in a Map* does not.

### R7 — Questions to answer in the text

None of these can be answered from the code; they are Tom's positions.

- 8A: *"Why is this better than just an HTML file with a large JS script inlined?"* — mechanically
  answerable in this system (blocks, reflection, re-export), and worth a paragraph rather than a
  footnote.
- 8A: *"I wonder if this system is merely shuffling around a familiar kind of system, namely
  platforms. … How is this different than setting up more platforms with their own litany of problems
  (spec versioning, etc)? More generally, what is the role of standards in this? Does this merely
  create a new bottleneck?"*
- 8A, on the CSV episode: *"would it not have been easier to just fix the CSV for the person over the
  phone? When is this a technical band-aid for a social problem? … why couldn't this be better served
  by a centralized (or even a distributed) platform rather than a shipped one?"*
- 8A, on-ramps: *"someone's got to be able to use it. What tools could be provided to make the on-ramps
  smoother? I think I would be disappointed, but would understand, if the answer was just 'have LLMs
  do it'."* — note the pre-emptive strike at the answer the essay currently gives in §*One bundle*.
- 8B: *"The Achilles' heel of image-based programming is schema migration. Does Lopecode need to deal
  with that?"*
- 8C: *"Can divergent lopecode notebooks be merged? How could that go?"*
- 8C: *"What does lopecode say about the web platform … How does it limit lopecode? How does it empower
  lopecode? What might lopecode suggest about the future of the web platform?"*

### R8 — Demos (optional, scope depends on the unknown deadline)

- 8A: *"I wish that the code visualizations, e.g., cell map and module map, were better thought out. I
  don't know how much can be gleaned from them in their current state."*
- 8A: *"Injecting stuff into Google Maps is a cool demo for malleable software; however, I wish the
  injected essay did a little bit more. To me, effective malleability is not merely duplexing, but
  should involve real coordination."* — that is `_0otyjzt` (`:203`), the Copy-as-JS try-it.
- 8A: *"I was expecting a more focused demo for atproto. Like specifically connecting with bsky or
  something of that nature. A webpage in a post is appealing/interesting."*
- 8A: *"I'd also like to see a more dramatic killer example. Right now, some of the examples are a
  little bit abstract, whereas something really dramatic could be pretty eye-opening."*

**A better demo exists and it is already built (author's call, 2026-09-09).** The AWS CloudWatch
shared-dashboard work of 2026-07-28 answers 8A's *"effective malleability is not merely duplexing,
but should involve real coordination"* literally, and is the *"more dramatic killer example"* asked
for in the same review. Record: `plan/aws-dashboard-viewer-design.md` (463 lines), memory
`project_aws_cloudwatch_dashboard_viewer`, artifact
`lopebooks/notebooks/@tomlarkworthy_aws-dashboard.html`, session
`af1aa31a-7710-49d1-9fde-617650fa64f7`.

The pairing session was injected into the *running* official dashboard page — `about:srcdoc` on the
`cloudwatch.amazonaws.com` origin — where it monkeypatched the host's `fetch`/`XHR`, captured the
app's own successful requests and read `parent.AWS.config.credentials`. Diffing those against ours
produced three undocumented requirements for `GetMetricData` on the console target, all inside the
SigV4 `SignedHeaders` set: a fixed `x-amz-user-agent` marker; `X-Amz-Sharing-MetaSum` /
`X-Amz-Sharing-MetaTime` with `MetaSum = SHA256hex(target + body + userAgent + metaTime)`; and
`X-CloudWatch-SharedDashboardToken`, a server-minted **per-widget** HMAC returned by `GetDashboard`.
It was then reimplemented standalone (SRP-6a on native BigInt+WebCrypto, share idToken +
`CustomRoleArn`) and proved without injection — 39-series `SEARCH()` expansion, 1,593 datapoints.

The paper-grade part is that the boundary was *measured*, eight probes with one widget's token
(`plan/aws-dashboard-viewer-design.md:373`): same expression re-windowed, re-aggregated and
re-periodised all 200; a different metric, a different `SEARCH`, a `SUM(...)` wrapper and an extra
query all `AccessDenied`. A shared dashboard grants read to exactly the metrics its widgets declare.
An earlier conclusion that the share role was misconfigured was **wrong and was retracted** on this
evidence.

Whether documenting the mechanism is a disclosure concern is the author's call; the reading here is
that it is not — the token is only obtainable by someone who already holds the share link, and the
finding is that the boundary works as intended.

**Anonymised 2026-09-09** on the author's rule: *customer* identifiers out, *Amazon-provisioned*
ones kept as evidence. Removed from the working tree — the AWS account id (3 occurrences in
`plan/aws-dashboard-viewer-design.md`), the dashboard name (2), the viewer login (1), and the live
share-link `context` blob baked into `lopebooks/notebooks/@tomlarkworthy_aws-dashboard.html` as
`defaultShareLink`, twice: once in the module cell and once in the prerender snapshot, carrying the
user pool id, app client id, identity pool id and role ARN. Replaced with a synthetic context of the
same shape. Two hardcoded pool ids in `tools/probe-cw-referer.mjs` now come from `CW_POOL_ID` /
`CW_IDENTITY_POOL`. Kept: `CWDBSharing-ReadOnlyAccess-YMGFGZNS`, the console targets, the header
names and the `MetaSum` construction — AWS's feature, not the customer's account, and the suffix is
opaque once the account id is gone. A whole-repo scan for the six customer strings returns clean;
`lope-preflight --baseline` reports no new findings and the spec was rebuilt.

**History (2026-09-09).** Both repositories are **public**. Three commits carried customer
identifiers:

```
lopecode-dev  1ac9749  2026-08-21  plan/aws-dashboard-viewer-design.md  account id x3, viewer login, dashboard name x2
lopecode-dev  3c9ec88  2026-08-03  tools/probe-cw-referer.mjs           user pool id, identity pool id
lopebooks     d0c4eca3 2026-08-02  @tomlarkworthy_aws-dashboard.html    the whole base64 `context` blob
```

**A first pass missed the third one and said so out loud, wrongly.** Searching history with
`git log -S'REsoKtwzI'` returned nothing for the notebook, and that was reported as "the pool ids
never reached GitHub". The pool id is inside a **base64** blob in that file, so a plain-text search
cannot see it; re-running the search against a distinctive substring of the *encoded* string
(`ImN3LWRiLTUzMzMxMDQzNjkxNSIsIlUiOiJ1cy1lYXN0LTFfUkVzb0t0d3pJIiwi`) found it immediately, in
`d0c4eca3`, public since 2026-08-02. Rule for next time: search for the stored encoding, not the
value.

No credential was ever committed — the id token has always come from `CW_IDTOKEN`.

The anonymised versions are committed (`lopebooks d136387a`, `lopecode-dev 132165f`) and pushed.

**The history rewrite was started and then called off (author, 2026-09-09), because a force-push
cannot finish the job.** GitHub serves `refs/pull/*` refs that a repository owner cannot push to or
delete, and five of them in `lopebooks` contain `d0c4eca3`:

```
refs/pull/107/merge   refs/pull/121/head   refs/pull/122/head   refs/pull/123/head   refs/pull/124/head
```

So `git filter-repo --replace-text` plus a force-push of every branch would remove the blob from
`main` and from all branch history and still leave it fetchable with
`git fetch origin refs/pull/124/head`. Finishing would require a GitHub Support ticket to purge
those refs and the unreachable objects, or deleting and recreating the repository — which costs its
issues, PRs, stars and forks. Neither is worth it for an AWS account id and an internal dashboard
name that carry no credential, so the rewrite was abandoned with **nothing force-pushed**: both
remotes are still at the ordinary anonymisation commits above.

Prepared and left in place should it ever be wanted: the 9 exact-string rules, and a filter-repo
`--file-info-callback` that remaps the `lopebooks` gitlinks in dev history through the rewritten
commit-map (without it, rewriting the submodule breaks `git submodule update` for every dev commit
after 2026-08-02). Both are described in [[project_aws_cloudwatch_dashboard_viewer]].

**What is actually fixed:** every current checkout, every future clone's working tree, and the tip of
both repositories. What remains is three historical commits and five PR refs.

Options in `plan/live2026-annotated.js` at `_0otyjzt`, cheapest first: retarget the existing
Copy-as-JS try-it prose from `maps.google.com` to CloudWatch; or make it a fourth field episode,
which changes *"three field episodes"* in `_abstract`.

### R9 — Praise worth not breaking in the rewrite

Recorded so a revision does not delete the parts that earned the accepts. 8A: *"Really like the
dynamic nature of the essay. It was rad getting to interact with all of the different demos … I liked
that pretty often when a point was being made, it was answered with an example."*; on the
self-containment sentence, *"chefs kiss"*; *"The limitation section is great; the candidness is
laudable."* 8B: *"I love how this essay tries to fundamentally rethink how we use software. It asks
some of the same foundational questions as Smalltalk but from a fresh perspective."*

So: the interleaved try-its and the candour of `s13p1` are load-bearing. R1's abstract rewrite must
not turn the essay into a system description — 8C asks to *"focus on explaining the system and its
consequences"*, which pulls the opposite way from 8A's *"splendid provocation"*. Where they conflict,
8A and 8B are the two strong accepts.

## Suggested order

1. R1 (thesis + abstract) — everything else is downstream of what the claim ends up being.
2. R3 (terminology) — cheap, and R1's rewrite touches the same cells.
3. R4 (`s13p1` re-selection). The defect *was* fixed, so R6 no longer needs a ninth limitation
   item — what it needs instead is the boundary stated somewhere in the text, and `s13p1` is one
   candidate site for it.
4. R2 (prose QA over §9 onward) — after the rewrites, so it scores the final text.
5. R5 (related work), R7 (the questions).
6. R8 last, and only what the deadline allows.

## Repro log

### R6 — hot replacement of already-open editors (2026-09-09)

**Reproduced as a mechanism, not as the reviewer described it.** The reviewer's own words — *"my
definition change did not change any of the already open text editors, only editors that get created
after the change"* — hold for one class of change to `@tomlarkworthy/editor-5` and are false for
another. Which class the reviewer hit is **not determined**; both are reachable from the fork UI.

Method: QA Chromium driven through the pairing channel, editors redefined with `update_cell`, state
read back with `eval_code`. Nothing was saved; both browsers were closed without export.

Two artifacts, because the reviewer did not run today's build:

- **A — current**: `lopebooks/notebooks/@tomlarkworthy_lopecode-live-2026.html`. 142 editor shells,
  3 open (the pinned `constant` / `fun` / `result` editors of *A cell is a function that carries its
  source*).
- **B — as submitted**: `git -C lopebooks show 85788161:notebooks/@tomlarkworthy_lopecode-live-2026.html`
  (2026-07-18, the last commit to the essay before the 21 Jul deadline). 137 shells, 3 open. Its
  `cellEditor` is a different cell from today's — `deabfe41` (2026-08-09, *"editor-5: cellEditor
  builds its panels through cloneViaSandbox"*) replaced the July `cloneDataflow` construction.

#### Test 1 — a template cell. Propagates. Not the reviewer's case.

`update_cell` on `toolbar` (pid `_1fwb5jc`), adding one `<span>HOTPATCH</span>` and changing nothing
else. In **both** artifacts, all three already-open editors showed the marker immediately:

```
A: {openEditors: 3, withHotpatch: 3, anyHotpatchInDoc: true}
B: {open: 3, hotpatch: 3, docHas: true}
```

Confirmed visually in A: the red HOTPATCH badge appears in the toolbar of all three open editors.

This is by design and predates the submission. `editorTemplate` and `shellTemplate` list every cell
they look up and take a reactive dependency on it, with the reason in a comment
(`editor5.js:343` and `:365` in today's build; the same comment at `:330` and `:352` in the July
copy):

> Force reactive deps on every looked-up variable so the cached lookup refreshes when any template
> cell is redefined. Without these, redefining e.g. `viewof apply` leaves heavies cloning against
> stale variable handles.

So the editor's *panel* — CodeMirror, toolbar, nav, the cell links — hot-replaces into open editors.

#### Test 2 — a cell the editor factory captures. Does not propagate.

`update_cell` on `pinOnCreate` (pid `_pinoncr`), an input of `cellEditor`, body unchanged apart from
a comment. In artifact B, before and after, comparing object identity:

```
{sameEditorsMap: true, cellEditorIsNewFunction: true, sameHostNodes: true,
 size: 137, hostsStillInDocument: 5}
```

`cellEditor` recomputed to a new function; every already-attached editor host is the *same DOM node*,
still in the document, still the one the old factory built.

#### Test 3 — "only editors that get created after the change". Confirmed.

Deleting one variable's entry from the `editors` map and letting `auto_attach` re-run rebuilt it
from the current factory:

```
{size: 137, rebuiltEntry: true, isDifferentNode: true, newHostInDoc: true, oldHostStillInDoc: true}
```

#### Cause

`auto_attach` memoises exactly one editor per variable and never reconsiders it
(`editor5.js:55-57`, byte-identical in the July copy at `editor5-july.js:56-58`):

```js
if (!editors.has(variable)) {
    editors.set(variable, cellEditor(variable));
}
const editor = editors.get(variable);
```

The map is keyed by the *variable*, not by (variable, factory). So a redefinition of `cellEditor`
itself, or of anything it closes over — in the current build `cloneViaSandbox`, `createCell`,
`findCell`, `dragReorder`, `pinOnCreate`, `getOption`, `setOption`, `Event`; in July `cloneDataflow`
in place of `cloneViaSandbox`, and no `dragReorder` — reaches only editors attached afterwards. A
fork rebuilds everything, which is why the reviewer saw the change there.

**Not fixed** (Tom asked for repro only). If it is fixed, the shape is to evict and dispose memoised
editors when the factory changes rather than to key the map more finely — `isDifferentNode: true`
above came with `oldHostStillInDoc: true`, i.e. the naive eviction leaks the old host into the
document.

#### The fix (2026-09-09)

One guard in `auto_attach`, in the lopebooks canonical
(`lopebooks/notebooks/@tomlarkworthy_editor-5.html`, working copy
`modules/@tomlarkworthy/editor-5.js`):

```js
if (editors.factory && editors.factory !== cellEditor) {
  for (const editor of editors.values()) {
    editor.dispose?.();
    editor.remove();
  }
  editors.clear();
}
editors.factory = cellEditor;
```

The map already carried `host.dispose`, and open state is persisted per cell through
`getOption/setOption("pinned")`, so a rebuilt editor comes back open if it was open. The rebuild only
runs when the factory identity actually changes, which is only when someone edits editor-5.

Measured on the editor-5 canonical (188 editor shells, 186 attached editors): the marker reached
**0/186** before the guard and **186/186** after, with all 186 still in the document. Verified twice —
live, and again on a cold boot from disk.

#### The tests

New module `@tomlarkworthy/editor-5-tests`, a sibling inside the editor-5 canonical notebook
(the shape `@tomlarkworthy/lopepage-2-tests` already uses inside the lopepage-2 canonical), declared
in `modules/canonical.json` and published under its own slug (see *Upstreams* below). It is in
`bootconf.mains` and gated by
`viewof e5_tests_enabled`, which reads `[#&]e5_tests` from the hash, so every test resolves to the
string `"skipped"` unless the notebook is opened with `&e5_tests`.

Both are `ui.scenario` tests over `@tomlarkworthy/ui-testing` (carried into the notebook along with
`@tomlarkworthy/testing` and `@tomlarkworthy/reconcile-nanomorph`):

- `test_e5_factory_change_reaches_attached_editors` — swaps `cellEditor` for a wrapper that stamps
  `dataset.e5probe`, settles, and asserts **every** memoised host carries the stamp and is still
  mounted. This is the reviewer's report as an executable test: it fails `Expected: 186, Received: 0`
  against the unfixed module.
- `test_e5_factory_change_keeps_an_open_editor_open` — opens a closed editor by clicking its
  `.hotbar`, swaps the factory, and asserts the rebuilt host is a different node and still open. This
  is the guard on the fix's own risk: a rebuild that closed the reader's editor would be a worse bug
  than the one being fixed.

Both restore `cellEditor` to its original inputs and definition in a `finally`.

`bun tools/lope-preflight.ts` reports no findings at all for the editor-5 notebook, and the 15 NEW
findings against `tools/preflight-baseline.json` are all in other notebooks (mermaid-lens, sheet,
ui-testing, spreadsheet) from other sessions' work — none in anything touched here.

#### Deployment (2026-09-09)

- **ObservableHQ** — `auto_attach` pushed alone with
  `lope-push-ws.js … --module @tomlarkworthy/editor-5 --cells auto_attach`; node 3552 modified,
  document version 4020 -> 4021. Verified from the published module:
  `curl https://api.observablehq.com/@tomlarkworthy/editor-5.js?v=4 | grep editors.factory` returns
  the guard.
- **The essay** — `sync-module.ts --module @tomlarkworthy/editor-5 --source modules/@tomlarkworthy/editor-5.js
  --target lopebooks/notebooks/@tomlarkworthy_lopecode-live-2026.html`. The essay's copy was already
  current, so the block diff is `auto_attach` alone (body plus its reordered `$def` input list).
  Verified in the booted essay with the same probe that exposed the bug: redefining `pinOnCreate`
  rebuilt **142/142** attached editors (0 unchanged nodes, all still mounted) and the three pinned
  editors stayed open, 3 -> 3.
- **The lopecode canonical** — jumpgated from Observable v4021
  (`node tools/lope-jumpgate.js --output lopecode/notebooks/@tomlarkworthy_editor-5.html`), then
  reconciled, see below. Boots clean: 186 attached editors, 186 rebuilt on a factory change, zero
  page errors, `lp2_reading_mode` (another session's uncommitted lopepage-2 work in that file) intact.
- **Not deployed**: the ~218 other consumers still carry the old `auto_attach`
  (`sync-module --all-canonical`).

#### Upstreams for the two test modules (2026-09-09)

Adding `editor-5-tests` to the editor-5 canonical's `bootconf.mains` made that notebook a jumpgate
*source*, so both it and everything it imports have to exist on ObservableHQ or the next jumpgate
follows a dead import. Neither did. Tom created the two documents; the modules were pushed into them.

```
@tomlarkworthy/editor-5-tests   doc 0459ec6af60581c4   v4  -> v10   39 -> 5 cells   (seed replaced)
@tomlarkworthy/ui-testing       doc 470cc22aba32ccec   v4  -> v44   1  -> 39 cells  (seed replaced)
```

A full push rather than `--cells` in both cases: the target held one seed cell, which is the one
shape the documented full-push footgun does not apply to.

`modules/canonical.json` records neither with an `upstream` key — absent means "published under its
own slug", which is what `upstreamFor` (`tools/lope-sync.ts:144`) resolves to. `ui-testing` had
`"upstream": null` (nothing to jumpgate); that is now wrong and was removed. The spec
`lopebooks/notebooks/@tomlarkworthy_ui-testing.json` did not exist at all — `spec-sync --rebuild`
created it (50 modules) and its `upstreams["observablehq.com"]` now names the URL, so a push needs
no `--target`.

**Publishing found two real defects in `ui-testing`.** Booting the published module in a bare
runtime (`node tools/probe-observable-annotate.mjs @tomlarkworthy/ui-testing`, the check the pushing
doc prescribes) reported 64 cells computed and 2 test failures:

```
test_ui_ambiguous_name_asks_for_scope: TypeError: Cannot read properties of undefined (reading 'get')
test_ui_unknown_cell_is_a_clear_error: expect(received).rejects.toThrow(expected)
                                       Expected pattern: /no cell named "nope" in @tomlarkworthy\/ui-testing/
```

One cause. `findVariable` reads `runtime.mains`, a Map the **lopecode bootloader** installs
(`modules/@tomlarkworthy/bootloader.js:81`); off-platform there is none, so `runtime.mains.get(...)`
threw a TypeError instead of the intended error, and `modName` spread `undefined`. `runtime-sdk`
already guards every one of its own reads with `if (runtime.mains)`; `ui-testing` did not.
Fixed by taking `const mains = runtime.mains ?? new Map()` once at the top of `findVariable`.

The second half of each test was genuinely not portable rather than broken: Observable modules carry
no name, so lookup *by module name* and an error message that *names the module* are lopecode
features. Both tests now assert the portable half unconditionally and the named-module half only
`if (runtime.mains)`, and say which branch they took in their return value.

After the fix, the same probe: **`ok: 66  errors: 0  PASS`**. In lopecode nothing changed — the
notebook booted with `hasMains: true` returns `"scoping works by element and by module name"` and
`"the error names the cell and the module it looked in"`, i.e. both took the lopecode branch.

`bun tools/triage/cellwise.ts @tomlarkworthy/ui-testing` -> `lopebooks canonical == OBSERVABLE`. The
three consumers that embed `ui-testing` (lopebooks editor-5, lopebooks mermaid-lens, lopecode
lopepage-2) still carry the pre-fix block; two of them belong to other sessions, so they were left
alone. The fix only changes off-platform behaviour, so nothing in the corpus is broken by the skew.

#### What the in-place jumpgate cost, and the reconciliation

The documented hazard is real and it is not small. Rebuilding the bundle to refresh **one** module
replaced 24 of the notebook's 76 blocks. Classifying each changed block against its declared
canonical (`tools/scratch/canonical-check.py`):

```
22 x REGRESSION: was canonical, now differs   (bootloader, lopepage-2, runtime-sdk,
                                               claude-code-pairing, themes, view, module-map, …)
 1 x differs from canonical before and after   (cell-map — pre-existing drift)
 1 x the point of the exercise                 (editor-5)
```

So the jumpgate pulled 22 modules *backwards* to whatever Observable last published, silently. The
fix was to restore every changed block except `editor-5` from a pre-jumpgate snapshot
(`tools/scratch/restore-blocks.py`), which put all 22 back on their canonical and left the
reconciliation check reporting only `editor-5`.

Two cells also came back with **fresh pids** — `auto_attach` `_ipx6cz -> _jnfral` and `cellEditor`
`_1p2yypw -> _wesdjx` — while the other 101 kept theirs. Pids address cells for pins and annotations
across the corpus, and every other copy of editor-5 uses the old ones, so both were renamed back.
After that the two editor-5 canonicals differ by a single brace-placement artifact of Observable's
recompile.

`lope-preflight` reports no findings for either editor-5 notebook, and the 15 NEW against the
baseline are the same ones other sessions' notebooks already had before any of this.

#### Two notes from doing this

- The probes read `window.__ojs_runtime._variables` directly. That is a private API (CLAUDE.md rule
  9) and fine for a throwaway diagnostic; it must not go into a cell.
- `update_cell` with `name: "toolbar"` did **not** hit `toolbar`. It landed on pid `_1jqft7q` — a
  *clone sandbox's* imported copy of the variable — and returned `update-cell realize failed:`. The
  editor's own clones carry variables with the same names as the module they clone, so editor-5 cells
  must be addressed by pid.
