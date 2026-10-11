# Cloud Brain: Cloudflare's Markdown conversion as a method of `brain-x-ai`

Spec of the issue `ai-tomarkdown-pass-through` on cb4's tracker. Written 2026-10-12 from 00:05 to
00:45 CEST (`date`), from the seeds at `lopecode-dev` `038c25bd` and from what cb4 answered that
night. Nothing in "The design" is deployed. The design's edit was made in a worktree, its tests
were run, and the edit was taken back (see "How each requirement is known to be met").
No call was made to Cloudflare's conversion: no agent of the loop holds a Cloudflare token, and no
method of the Brain reaches that address today. Every statement about Cloudflare's side is from a
summary of its page made by a fetch tool, and is listed so in "Read". Names are proposals.

## What was asked

Tom, 2026-10-11, to a session outside the loop, which opened the issue (event 1552):

> We need a pdf2text service I guess? Is there not one already? Can;t models themselves do this?

The session answered that no service of the Brain reads a PDF's text, that an agent on this
machine could not either, and that Cloudflare Workers AI has a conversion to Markdown which
`brain-x-ai` does not expose. He wrote:

> yes lets expose clouadflares.

The rest of the issue's body is that session's reading and is treated here as a report.

### The first user no longer needs it

The body names `paper-summarizer-persona` as the first user: 4 of 63 papers had no HTML version to
read. The same day the owner installed poppler on this machine (comment 1571 of that issue: "ok I
also installed poppler for the big ones"), and `pdftotext` read those four in 2 s or less each.
That project's spec, approved and now `building`, lists this method under "Not chosen": "Not
needed for these 63 on this machine. A summarizer run where there is no `pdftotext` would need it."

So no work of the loop waits for this method on 2026-10-12. Who would call it:

- an agent on a machine with no `pdftotext`. `worker-machine-on-fly` (at `spec`) plans an image
  with poppler in it, so not that one;
- a notebook page in a browser, or a member's Worker, which have no extractor of their own;
- a caller with a `.docx`, `.xlsx`, `.ods` or `.numbers` file. Nothing on this machine or in the
  Brain reads those to text. I know of no such file kept in the Brain today.

None of the three is a caller that exists. The case for building it is the owner's word and its
size: the edit under "The design" is 18 lines of service code and one test. If he would rather
not carry a method nobody calls, the answer to this spec is `owner-reject`, and nothing is lost.

## The reports gathered

`list?parent=ai-tomarkdown-pass-through` answers no parts. The issue is the one report, with its
comment 1554. Its body lists four things "for the spec to settle"; each is a row.

| what the report says | becomes |
|---|---|
| A method that passes a file to Cloudflare's conversion and answers what Cloudflare answers, on `brain-x-ai`. | R1 |
| `GET …/ai/tomarkdown/supported` lists the formats. | R2 |
| The price of a call: a PDF is said to be free, an image is not, a PDF with images was not measured. | R3; the measuring is task 2 |
| The body: `ai.run` refuses over `maxBody`, 1,000,000 bytes (comment 1554); 15 of the 61 kept PDFs are under it, 7 are over 10 MB, the largest is 39,663,618 bytes. | R4 |
| Bytes only, or also a `path` in `brain-static`. | Bytes only. "Not chosen" has why. |
| What Cloudflare makes of a paper (two columns, equations, tables, a scanned page), on three kept PDFs against arXiv's HTML. | Task 2. No requirement: it is a measurement, and nothing of the design turns on it. |
| Who calls it: a token that names it, as `ai.run`. | R5 |
| Whether the token the deployer mints for `brain-x-ai` reaches this path was not tried. | The first branch of task 1. |

The counts of the kept PDFs are the report's. I did not count them again.

## The requirements

- **R1.** `ai.tomarkdown` sends the caller's body and its `content-type` to
  `POST /ai/tomarkdown` unchanged, and answers Cloudflare's body and status.
- **R2.** `ai.tomarkdown/supported` answers Cloudflare's list of formats.
- **R3.** A call is charged, and the charge is no less than for a model `ai.run` cannot bound.
- **R4.** A body up to the largest file `brain-static` keeps (50 MB) is not refused by the Brain.
- **R5.** The owner, a Worker of the Brain, and a token or member the owner gave the method may
  call it. A token that does not name it is refused.

## What exists today, measured

`brain-x-ai` on cb4 is hash `e5b71e79…` (`cloud-brain-dev/deploy/services.json` after
`worktree.sh`, 2026-10-12 00:10 CEST).

- No method reaches the conversion. `curl -s ".../xrpc/com.lopecode.brain.getSource?worker=brain-x-ai&part=reference" | grep -c tomarkdown`
  answered `0` (status 200) at 00:31 CEST. The service's handler sends to three addresses,
  `/ai/models/search`, `/ai/run/<model>` and `/ai/v1/<path>` (`brain-ai.ojs`, `ai_service`), and
  the model name is held to `^@[a-z0-9-]{1,20}(\/[A-Za-z0-9._-]{1,80}){1,3}$`.
- The seed's tests, in the worktree, as cb4 runs the other modules
  (`bun test.ts brain-x-ai --with <the seed's build>`, 00:31 CEST): `passed 8, failed 0, needsBrowser 1`.
  The one that needs a browser is `test_ai_panel_lists_priced_text_models_and_runs_one`.
- The service declares one Cloudflare permission, `Workers AI Read`. The deployer mints a token
  for a permission only when it is one of three (`brain-deployer.ojs:245`,
  `GROUPS = ["Workers Observability Read", "Workers AI Read", "Artifacts Write"]`).
- A body over 1,000,000 bytes is not held by the kernel or the core: both read a body whole only
  when its `content-length` is 1e6 or less, and pass the stream otherwise (`bodyOf`,
  `brain-kernel.ojs:201`, `brain-core.ojs:639`). A call to `static.put` passes the same two, and a
  PDF of 39,663,618 bytes is kept there (the report).
- `cloudflareApi.fetch` sets `content-type: application/json` first and the caller's headers
  after it (`cloudflare-iac.ojs:992`), so a `content-type` the service passes is the one sent.
- The page's client sends a body that is not JSON: `procedure(name, input, { params, raw: true })`
  posts `input` as it is (`xrpc-client.ojs:37`). With a `FormData` the browser writes the
  `content-type`. Read in the source; no such call was run.
- Allowances (`brain-core.ojs:682`): a token $0.10 a day, the owner $1.00, and 2000 priced calls
  a day for one account. The owner's 2000 were used up on 2026-10-11: at 22:25 UTC
  `knowledge.search?semantic=true` answered 502, "ai.v1/embeddings answered 402 owner has made
  2000 priced calls today". A token's call is charged to the owner's account too, so a priced
  call of this design would have been refused that evening.

## Read

**The Brain.** The semantic search was refused (above), so the searches were by words:
`knowledge.search?q=` with `loop-knowledge`, 2026-10-11 22:25 UTC. It was not run again after
00:00 UTC.

| searched | found | used |
|---|---|---|
| `pdf` | 14: `sign-a-pdf`, `brain-knowledge`, a paper, others | none bears on it |
| `markdown conversion` | 20: `editable-md`, `markdown-wiki`, `doc:exporting-the-notebooks-writing` | none |
| `tomarkdown` | 2: `doc:cloud-brain-loop-order-of-service` (names this issue in a list), `doc:exporting-the-notebooks-writing` | none |
| `pdftotext` | 2: `doc:cloud-brain-paper-summarizer-persona` | yes: "Not chosen" there, and comment 1571 of its issue |
| `pass-through body limit` | 20: `doc:cloud-brain-cloudflare-usage-read`, `brain-logs`, `brain-blob` | the usage spec, for the shape of a spec whose Cloudflare call cannot be tried |
| `multipart`, `maxBody` | 1 (`doc:pushing-cells-to-observablehq`), 0 | none |
| `static.get path` | 20: `brain-static` | its limit of 50 MB a file |

Also read in the checkout: `tools/cloud-brain/brain-ai.ojs` whole, `records/ps-1-paper-text.md`
(how `pdftotext` and arXiv's HTML were turned into text for the summarizer), and
`spec-as-built.md` at 2026-10-09 23:35 (why the service uses a minted token and not the `AI` binding).

**Outside.** Four pages of Cloudflare's documents, each through a fetch tool that answers a
summary with quotes, 2026-10-11 about 22:35 UTC. I read no page whole.

| page | what the summary gave |
|---|---|
| [REST API](https://developers.cloudflare.com/workers-ai/features/markdown-conversion/usage/rest-api/) | `POST /accounts/{ACCOUNT_ID}/ai/tomarkdown`, multipart, `files` repeated once a file, optional `conversionOptions` (the object as a string). Answer `{ success, result: [{ id, name, mimeType, format, tokens, data }] }`; a file that failed has `format: "error"` and `error`. `GET …/ai/tomarkdown/supported` answers `[{ extension, mimeType }]`. The token: "an API token with permissions for the Workers AI REST API", no permission named. No limit of size or count. |
| [Markdown conversion](https://developers.cloudflare.com/workers-ai/features/markdown-conversion/) | "`toMarkdown` is free for most format conversions." Image conversion "can use Workers AI models for object detection and summarization … which may incur additional costs if it exceeds the Workers AI free allocation limits." No figure. |
| [Conversion options](https://developers.cloudflare.com/workers-ai/features/markdown-conversion/conversion-options/) | `output.format` (`markdown` or `text`), `image.descriptionLanguage`, `html.hostname`, `html.cssSelector`, `pdf.metadata`. No option for images inside a PDF. |
| [How it works](https://developers.cloudflare.com/workers-ai/features/markdown-conversion/how-it-works/) | A PDF: "Each page is parsed in sequence." "We try to obtain a `StructTree` object from the PDF file." "If none is obtained, we extract the text of the page *as-is* and return it." An image file: `@cf/facebook/detr-resnet-50`, then `@cf/google/gemma-4-26b-a4b-it`. Nothing on a scanned page, a table, an equation, or an image inside a PDF. |

One web search for a size limit of the conversion found none. The one number it gave, 4 MB, is of
AI Search, another product. So three things are not known from reading: whether `Workers AI Read`
reaches the address, the largest body Cloudflare takes, and what a PDF with images costs.

No literature was searched. The design is one forwarded call.

## The design

Two methods on `brain-x-ai`, in `tools/cloud-brain/brain-ai.ojs`. This is the edit that was run
(the two branches go before the line `const v1 = …` of the handler):

```js
if (what === "tomarkdown/supported") {
  const r = await cloudflareApi.fetch("/ai/tomarkdown/supported");
  return new Response(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") || "application/json" } });
}
if (what === "tomarkdown") {
  const usd = Number(url.searchParams.get("usd")), s = aiSettings({ flatUsd: config.flatUsd, markdownMaxBody: config.markdownMaxBody });
  const said = (status, error, message, more = {}) => (log({ at: "ai.tomarkdown", usd, neurons: null, status, error }), json(status, error, message, more));
  if (!(usd >= s.flatUsd)) return said(402, "BudgetTooSmall", `a conversion is not priced by the token: usd is at least ${s.flatUsd}`, { needs: s.flatUsd });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > s.markdownMaxBody) return said(413, "TooLarge", `the body is ${bytes.byteLength} bytes, at most ${s.markdownMaxBody}`);
  const r = await cloudflareApi.fetch("/ai/tomarkdown", { method: "POST", body: bytes, headers: { "content-type": request.headers.get("content-type") || "" } });
  const neurons = r.headers.has("cf-ai-neurons") ? Number(r.headers.get("cf-ai-neurons")) : null;
  log({ at: "ai.tomarkdown", usd, neurons, status: r.status, bytes: bytes.byteLength });
  return new Response(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") || "application/json", "cache-control": "no-store", ...(neurons !== null && neurons >= 0 ? { "x-ai-neurons": String(neurons), "x-ai-usd": (neurons * aiDefaults.usdPerNeuron).toFixed(8) } : {}) } });
}
```

```js
// in methods
"com.lopecode.brain.ai.tomarkdown": { type: "procedure", who: "workers", price: "double(request.params.usd)" },
"com.lopecode.brain.ai.tomarkdown/supported": { type: "query", who: "workers" },
// in aiDefaults
markdownMaxBody: 50000000
```

A caller's call:

```
curl -X POST -H "Authorization: Bearer $BRAIN_TOKEN" \
  "https://HOST/xrpc/com.lopecode.brain.ai.tomarkdown?usd=0.01" \
  -F "files=@paper.pdf" -F 'conversionOptions={"pdf":{"metadata":false}}'
```

- **The body is not parsed** (R1). The multipart text, its boundary and `conversionOptions` are
  the caller's bytes. More than one file in a call is Cloudflare's to take or refuse.
- **The price** (R3) is `usd`, and `usd` is at least `flatUsd`, $0.01: the rule `ai.run` already
  has for "any other model", which the service "cannot bound". **This does not hold Cloudflare's
  cost under the charge.** A call carries any number of files, an image file runs two models, and
  the service does not count the parts. The same sentence is true today of an image model through
  `ai.run`. What an image costs is measured in task 2; the neurons, when Cloudflare gives the
  header, are in the log line and in `x-ai-neurons`. Whether Cloudflare gives that header for a
  conversion is not known.
  The cost of this floor: a token with the default $0.10 a day converts 10 files a day one at a
  time, and the owner's account 100, for a conversion Cloudflare says is free. `flatUsd` is a
  stored setting of the Worker (`config.set`), shared with `ai.run`.
- **The body is read whole**, up to `markdownMaxBody`, a setting of its own with the default
  50,000,000: the largest file `brain-static` keeps (R4). `maxBody` stays what `ai.run` counts by.
  Whether Cloudflare takes 39,663,618 bytes is measured in task 2, and the default is then
  written down to what it took.
- **Who** (R5): `who: "workers"`, as the five methods beside it.
- **The permission**: none is added. If `Workers AI Read` does not reach the address, task 1 stops.
- **No panel.** He asked for a method.
- **Docs in the seed**: a row each in `## Methods`, a paragraph in `## The price`, the setting in
  the list of settings, a line in `## Limits`.

This adds a method, so a caller can do what it could not. The approval of this spec is the
owner's word for that; the tasks are not labeled `major`. The loop deploys `brain-x-ai` under the
clarification of 2026-10-11 ("yes if its behind a multi tenant interface and thoroughly designed
acording to the principles"): the method reaches one fixed address of Cloudflare, keeps nothing,
and so shows no caller another's file. The edit changes one test cell of `brain-ai.ojs`
(below). That moves `brain-x-ai` alone, not a Worker the loop may not deploy.

### Not chosen

- **A `path` in `brain-static`**, so a kept file is not downloaded and sent again. `brain-x-ai`
  would call `static.get` as itself, and a Worker of the owner reads every file: the service
  would have to decide for the caller who may read which, which is `brain-static`'s rule written
  a second time. The caller's two calls (`GET /static/<path>`, then this one) need none of that.
  Its cost: a 40 MB file crosses the network twice. Reopen it when a caller that cannot hold the
  bytes exists.
- **Counting the image parts** (`request.formData()`, refuse when `usd` is under the images times
  `flatUsd`). It is the one way to hold Cloudflare's cost under the charge. Not taken now: what
  Cloudflare reads as an image (the part's type, the file's name, its first bytes) is not in the
  pages, so the count would be a guess at its rule; and the body is then parsed and held twice.
  Task 2 measures an image; if one costs more than `flatUsd`, that record says so and this is the
  fix it names.
- **Any `usd` over 0**, with no floor. A PDF would cost a millionth of a dollar, and an image
  would be converted for the same.
- **A stream in place of `arrayBuffer`.** No limit of the Brain's own and no copy held. Not known:
  whether Cloudflare's API takes a multipart body with no `content-length`. Reading whole is what
  the service does for every other body.
- **The `AI` binding** (`env.AI.toMarkdown`). The service was built on a minted token and not the
  binding (`spec-as-built.md`, 2026-10-09 23:35); a binding is a change to the wrapper, which the
  deployer's hash covers.
- **A method of its own Worker**, `brain-x-markdown`. A new Worker, for one forwarded call that
  needs the token `brain-x-ai` has.
- **`pdftotext` in a container** (`brain-x-container`). A leased container a call, for what
  Cloudflare gives in one request. It would be the way if task 2 finds the conversion poor on papers.

## How each requirement is known to be met

Run before this spec was submitted, 2026-10-12 00:30 CEST, in the worktree
`.claude/worktrees/bm-ai-tomarkdown-pass-through` at `038c25bd`: the edit above, a branch for the
two addresses in `aiRig`'s `fetch`, a new test, and the two lists of
`test_ai_models_is_cloudflares_list_and_the_service_declares_one_permission` with the new names. Then

```
cd $W && bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html \
  && bun tools/lope-reader.ts tools/cloud-brain/.emitted/cloud-brain.html --get-module @tomlarkworthy/brain-ai > tools/cloud-brain/.emitted/tm.js \
  && (cd cloud-brain-dev && bun test.ts brain-x-ai --with $W/tools/cloud-brain/.emitted/tm.js)
```

answered `passed 9, failed 0, needsBrowser 1`. Before the two lists were changed it answered
`passed 8, failed 1`: the list of priced methods had `tomarkdown` and the test did not. The edit was
taken back with `git checkout tools/cloud-brain/brain-ai.ojs`, and the same command then answered
`passed 8, failed 0, needsBrowser 1`.

The new test, `test_ai_tomarkdown_passes_the_files_on_and_gives_cloudflares_answer`, builds a
`FormData` of one file and `conversionOptions` and asserts: the address is `/ai/tomarkdown`, the
token is the minted one, the `content-type` with its boundary and every byte are the caller's
(R1); `usd=0.009` and no `usd` are 402 and a body over a stored `markdownMaxBody` of 10 is 413,
with Cloudflare not asked (R3, R4); `tomarkdown/supported` answers the stand-in's list from
`/ai/tomarkdown/supported` (R2); the price rule gives 0.01 for `usd=0.01` (R3). The second test
asserts the rule of both names for the owner, a token, a member, a Worker and a stranger (R5).
The stand-in for Cloudflare is the rig's own. None of this shows what Cloudflare does.

**The checks that cannot be run before task 1 is deployed.** Each is run by the task's writer from
the main checkout with `--as loop-markdown`, after the deploy, and its answer goes in the record.

| | check | passes when |
|---|---|---|
| C1 | `bun test.ts brain-x-ai --with …` in the worktree, as above | `passed 9, failed 0, needsBrowser 1` |
| C2 | `brain.ts curl "/xrpc/com.lopecode.brain.ai.tomarkdown/supported" --as loop-markdown` | 200, and `result` has an entry with `extension` `.pdf` (R2). 401 or 403 with Cloudflare's error body is the branch of task 1. |
| C3 | `brain.ts curl "/xrpc/com.lopecode.brain.ai.tomarkdown?usd=0.01" --as loop-markdown -X POST -F files=@FILE.pdf`, FILE a PDF under 1 MB with text | 200, `result[0].format` is `markdown`, and `result[0].data` has a sentence of the PDF (R1) |
| C4 | C3 with `usd=0.001` | 402 `BudgetTooSmall`, `needs` 0.01 (R3) |
| C5 | C2 with `--as loop-knowledge` | 403 "this token does not name …" (R5). Today's answer is the same 403 (run 00:31 CEST), so this check shows a refusal only together with C2's 200. |
| C6 | `curl -s ".../getSource?worker=brain-x-ai&part=reference" \| grep -c tomarkdown` | more than 0. Today 0. |

That `brain.ts curl` passes `-F` on with no `content-type` of its own was not run. If it does not,
the writer calls with `curl` and the token as `brain.ts` would send it, without printing it.

R4 has no check an agent can run before task 2: C1's 413 shows the Brain's limit, and task 2
shows Cloudflare's.

## The tasks

In this order. Each is one writer and one review.

**`tm-1-ai-tomarkdown-method`.** The edit above in `brain-ai.ojs`, the test, the docs of the seed,
C1, then the deploy of `brain-x-ai` and C2 to C6. A record, `tools/cloud-brain/records/tm-1-ai-tomarkdown-method.md`.
- First branch. If C2 or C3 answers 401 or 403 from Cloudflare (the body is Cloudflare's
  `{ success: false, errors: […] }`, not the Brain's `{ error, message }`): `Workers AI Read` does
  not reach the conversion. The writer puts the Worker back (`brain.ts rollback brain-x-ai --reason=…`),
  lands nothing but the record, comments with Cloudflare's error text, and the issue gets
  `needs-owner`: a permission that is not one of the deployer's three is his (the list below).
- The token `loop-markdown` is made before this task starts (below).

**`tm-2-what-the-conversion-does`.** Measurements through the deployed method, and what they change.
A record, `tools/cloud-brain/tomarkdown.md`, and a cell `aiMeasured.markdown` in the seed.
- Size: the PDF of `arxiv:2608.11350` (39,663,618 bytes as kept), one of about 10 MB, one of
  about 1 MB. The status of each and the time. `markdownMaxBody` is set to what was taken.
- Cost: `x-ai-neurons` of a PDF of text, of a PDF with figures, of one `.png`, and of two `.png`
  in one call. If the header is not given, the record says so and names the owner's read (below).
- Quality, on three kept papers that have arXiv's HTML: one of two columns, one with tables, one
  with display equations. For each, the conversion beside `pdftotext` on the same bytes and
  beside the HTML's text (`summarize-papers.ts text` writes that): the characters of each, whether
  the columns are in reading order, and one table and one equation quoted from all three. And one
  scanned page, if a kept paper has one; else the record says none was tried.
- The PDFs are fetched from `https://arxiv.org/pdf/<id>`, with the SHA-256 of each beside the
  kept entry's. No token reads the kept files for this task.
- About 12 priced calls, $0.12 at the floor.
- What it may change in the seed: the default of `markdownMaxBody`, and sentences of the docs. A
  floor per image, or a `path`, is a new issue with this record as its report, not this task.

## What only the owner can do

- Approve this spec, or reject it for the reason under "The first user no longer needs it".
- Only if task 1 takes its first branch: add a Cloudflare permission to the deployer's `GROUPS`
  and deploy the deployer. Which permission is not known; Cloudflare's page names none.
- Read `logs.query` for the lines `at: "ai.tomarkdown"`, to compare `usd` with `neurons`. It is
  his session's alone. No task waits for it.
- `config.set` of `flatUsd` or `markdownMaxBody` for `brain-x-ai`, if he wants another number.

## What the orchestrator makes

One token. The spec names it, and the approval comment should say so.

- **`loop-markdown`**, methods `ai.tomarkdown` and `ai.tomarkdown/supported`, and no more:
  `brain.ts token loop-markdown ai.tomarkdown ai.tomarkdown/supported --daily=0.5`.
- Needed by `tm-1-ai-tomarkdown-method` (C2 to C5) and `tm-2-what-the-conversion-does`. It can be
  made before the deploy: a token names a method whether or not a Worker serves it yet. That was
  not tried.
- `--daily=0.5` is 50 calls at the floor: the two tasks are about 16, and a round of rework is
  not refused by the default of $0.10.
- What holds it to its use: its two methods reach nothing else, and the day's $0.50. What it does
  not hold: the files a holder sends are the holder's choice, images among them.

## What misled or slowed the writing

- `knowledge.search?semantic=true` was refused for the evening by the owner's 2000 priced calls
  (above). The brief's step 4 gives that one command; the search by words, without `semantic=true`,
  is not in it.
- The issue's body was written before poppler was installed and still names a first user that
  has since read all 63 papers another way.
