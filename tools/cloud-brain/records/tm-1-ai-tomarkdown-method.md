# tm-1-ai-tomarkdown-method

Task 1 of `plan/cloud-brain-ai-tomarkdown-pass-through.md` (approved for the owner at event 3381):
two methods on `brain-x-ai`, `ai.tomarkdown` and `ai.tomarkdown/supported`, which pass a call to
Cloudflare's Markdown conversion. The task's first branch was not taken: the minted token with
`Workers AI Read` reaches both addresses (C2 and C3 below answered 200). Written 2026-10-12.

## What changed

`tools/cloud-brain/brain-ai.ojs`, in two commits.

`75aee265` (2026-10-12 03:42:24 +0200, `git log --format=%ci`): the handler's two branches as the
spec's "The design" has them, the two entries of `methods`, `markdownMaxBody: 50000000` in
`aiDefaults`, two branches for Cloudflare's addresses in the test rig `aiRig`, the new test
`test_ai_tomarkdown_passes_the_files_on_and_gives_cloudflares_answer`, the two lists of
`test_ai_models_is_cloudflares_list_and_the_service_declares_one_permission`, and the seed's docs:
a row each in `## Methods`, the log line in the Storage row, a new cell `## A conversion to Markdown`,
a paragraph in `## The price`, the setting, `## Who can call`, `## Limits`, the first sentence of the
module, and the 404 message's list of methods.

The second commit, the one this record is in, mends three sentences of that new cell with what cb4
answered after the first deploy, and puts the answer of C3 where an answer copied from Cloudflare's
page was. One of the three was false as deployed, from the first deploy to the second: "Under it, or with no
number, the answer is 402". With no `usd` the core answers 403 before the service is asked (C4b
below). No code and no test changed in it.

One line differs from what the spec's test paragraph names: the stand-in gives `cf-ai-neurons` only
for a body that has the text `picture.png`, so that the test holds both cases, the header passed on
and no header.

## The tests

The new test before the handler had its branches, with the rig's branches in place
(`bun test.ts brain-x-ai --with …/tm-1.js` in the worktree's `cloud-brain-dev/`):

```
-   200,
+   404,
"passed":8,"failed":1,"needsBrowser":1
```

After the edit, the same command: `"passed":9,"failed":0,"needsBrowser":1` (C1). The one that needs
a browser is `test_ai_panel_lists_priced_text_models_and_runs_one`.

In a browser, `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-ai`:
`"tests":10,"passed":10,"failed":[]`, Chrome 151.0.7922.34. Run twice on the first commit's
seed (once alone, once with `--emit`) and once more with `--emit` after the second commit's edit;
10 of 10 each time.

`BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-ai --shell …/cloud-brain.html --times 20`
from the main checkout, on the first commit's build, before the deploy:

```
"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]
```

`mains` of its first line was a list and each run counted 10 tests of `@tomlarkworthy/brain-ai`. It
was not run again for the second commit, which changes no test cell.

The deployer's own run, in the answer of each apply: `"state":"verified","tests":10`.

## The deploys

Both under the landing lock and the deploy lock, by `impl-45e3d0`.

| | hash | apply answered |
|---|---|---|
| before | `e5b71e79cf8f` | |
| first, 2026-10-12 03:43 CEST | `cd14b32950d2` | `"state":"verified","version":"fe90c57e-255a-4272-8bfe-be6c896eeee0","tests":10`, 18976 ms |
| second | the `deploy` ref of the submit | in the comment of the submit |

The first apply was not sent at once: `seen.json` had no entry for `brain-x-ai`. The deployed
module (`cloud-brain-dev/deploy/@tomlarkworthy/brain-ai.js`, read by `worktree.sh --rebase` under
the lock) was compared with the build by `diff`. Every cell that differed was one this change
touched; the other differing lines were the `$def` and `main.define` lines, which the two files
write with different spacing. Then `brain.ts saw brain-x-ai` and the same apply.

After the first deploy, `bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts brain-x-ai`:
`"hash":"cd14b32950d2…","passed":9,"failed":0,"needsBrowser":1`. `brain.ts redistil`:
`brain-x-ai  same  cd14b32950d2`. `issue.verify?guards=true`: `"ok":true,"seq":3523`.

## The spec's checks on cb4

All on 2026-10-12 between 01:43 and 01:46 UTC, against hash `cd14b32950d2`, from the main checkout
with `brain.ts curl … --as loop-markdown` unless the row names another caller. `brain.ts curl`
passes `-F` to `curl` as it is, so C3 was run as the spec writes it. The file of C3 is a PDF of 624
bytes written by hand for this task: one page, Helvetica, the sentence "The heron of tm-1 stands in
the reed bed at dawn." `pdftotext` reads that sentence from it.

| | call | answer |
|---|---|---|
| C2 | `ai.tomarkdown/supported` | 200, `result` of 28 entries, among them `{"extension":".pdf","mimeType":"application/pdf"}`; also `.docx`, `.xlsx`, `.ods`, `.numbers`, `.png`, `.html`, `.csv` |
| C3 | `ai.tomarkdown?usd=0.01 -X POST -F files=@tm1.pdf` | 200, `result[0]`: `"format":"markdown","tokens":62`, and `data` ends `## Contents\n### Page 1\nThe heron of tm-1 stands in the reed bed at dawn.\n\n`. `x-brain-price: 0.01`, `x-brain-served-by: brain-x-ai@cd14b32950d2`. No `x-ai-neurons` and no `x-ai-usd` on the answer |
| C4 | C3 with `usd=0.001` | 402 `{"error":"BudgetTooSmall","message":"a conversion is not priced by the token: usd is at least 0.01","needs":0.01}` |
| C4b | C3 with no `usd` | 403 `the price of com.lopecode.brain.ai.tomarkdown could not be decided: No such key: usd`, the core's |
| C5 | C2 with `--as loop-knowledge` | 403 `this token does not name com.lopecode.brain.ai.tomarkdown/supported` |
| | C3 with `--as loop-knowledge` | 403 `this token does not name com.lopecode.brain.ai.tomarkdown` |
| | C2 with no token (`curl`) | 401 `AuthRequired` |
| | `ai.models?per_page=1` with `loop-markdown` | 403 `this token does not name com.lopecode.brain.ai.models` |
| C6 | `curl -s ".../getSource?worker=brain-x-ai&part=reference" \| grep -c tomarkdown` | `10` |

Two calls more, not in the spec:

- A PDF of 2,000,703 bytes (the same page and a stream of 2,000,000 bytes that no page uses):
  200, `"tokens":63`, the same sentence. So a body over the 1,000,000 bytes of `maxBody` passes the
  kernel, the core and this service. R4's 50 MB is not shown by it.
- The 624 bytes sent with `content-type: application/pdf` and no multipart: Cloudflare's 400,
  `{"errors":[{"message":"Request body is not valid multipart/form-data","code":6005}],"success":false,…}`,
  passed on with its status.

Priced calls made with `loop-markdown`: C3, C4 (charged `usd`, 0.001, by the core before the
refusal, as the seed's "The price" says of a refused call; the charge itself was not read), the
2 MB file and the body that was no multipart.

## Read

`knowledge.search?semantic=true` with `loop-knowledge`, three searches: "tomarkdown markdown
conversion pdf", "pass a multipart body through to Cloudflare", "ai.run price flatUsd body limit".
They answered the spec of this task, `brain-ai` and `cloudflare-iac`, which were read, and nothing
else that bears on it (`editable-md`, `sign-a-pdf`, `brain-logs`, `brain-blob`).

## Not tried

- A body near `markdownMaxBody`, or any body over 2,000,703 bytes, through cb4. The 413 of this
  service was seen in the test only, with a stored `markdownMaxBody` of 10. Task 2 measures the size.
- An image file, a PDF with images, and more than one file in a call. So whether Cloudflare gives
  `cf-ai-neurons` for a conversion that runs a model is not known. One PDF of text came without it.
- `conversionOptions` through cb4. The test sends the part and checks the bytes; no call to
  Cloudflare had one.
- A call from a page in a browser (`client.procedure(…, { raw: true })` with a `FormData`), a
  member, and a Worker of the Brain. The rule for each is asserted in the test and no such call
  was made.
- The owner's own call. No call was made with `--owner`.
- The log lines `at: "ai.tomarkdown"`. `logs.query` is the owner's session's; the lines were seen
  in the output of `test.ts` only.
- A `content-type` that is absent. The service then sends an empty one to Cloudflare; what
  Cloudflare answers was not asked.

## For the next writer

- `seen.json` had no entry for `brain-x-ai`, so the first apply from this checkout is refused with
  the commands to run. It cost one compare inside the landing lock. `brain.ts saw` with no change
  lists five Workers that still have none: `brain-db`, `brain-x-feed`, `brain-x-inbox`,
  `brain-x-proxy` and `brain-x-whatsapp`.
- The checks C2 to C6 need the deploy, and the record needs the checks, so this task landed twice:
  the seed, then the record with the mended sentences.
