# tm-2-what-the-conversion-does

Task 2 of `plan/cloud-brain-ai-tomarkdown-pass-through.md`: what Cloudflare's Markdown conversion takes, costs and
gives, measured through `ai.tomarkdown` as deployed on cb4 (`brain-x-ai@41bc808efa00`), and what that changed in the
seed. Written 2026-10-12. The measurements, with each call's row and the texts quoted, are in
`tools/cloud-brain/tomarkdown.md`; this file is what changed and how it was tested.

No defect was reproduced: the task is a measurement. Every call to cb4 was made before the seed was edited.

## What was measured, in four lines

2026-10-12, 02:06 to 02:12 UTC, 15 calls with `loop-markdown`, 14 answered, `x-brain-price: 0.01` on each.

- Cloudflare converted a body of 37,000,116 bytes and refused 38,500,116, 39,663,828 and 39,663,910 (400, code
  6006, "Error converting to markdown"). The paper the spec names, `arxiv:2608.11350`, is the one of 39,663,828.
- No answer had `cf-ai-neurons`: 9 PDFs converted, 3 refused, and 2 calls of image files. No cost was read.
- A paper comes back as the text of its pages, close to `pdftotext`'s. A scanned page comes back empty, 200.
- One image file took 20.8 s, two in one call 22.2 s, each described by a model.

## What changed

`tools/cloud-brain/brain-ai.ojs`, in the commit before the one this file is in:

- `aiDefaults.markdownMaxBody` from 50000000 to 37000000. The spec: "`markdownMaxBody` is set to what was taken." A
  body between the two was sent, charged, and came back as Cloudflare's 400 with no size in it; it is now 413
  `TooLarge` from the service, with the body's size and the limit. The number is the largest body seen to pass, to
  the million under it. The owner's `config.set` of `markdownMaxBody` still goes over it.
- `aiMeasured.markdown`: the ten rows of size, the two calls of image files, and three sentences (neurons, a PDF's
  images and the scan, the text). The spec calls it a cell; it is a key of the cell `aiMeasured`, as the other
  measurements of that service are.
- The cell `## A conversion to Markdown`: the price bullet no longer says "An image was not sent", the size bullet
  no longer says "The largest body Cloudflare takes was not measured" or names `brain-static`, and a new bullet says
  what comes back for a paper.
- A new test, `test_ai_markdown_default_size_is_one_cloudflare_took`: the rows of `aiMeasured.markdown.size` have one
  edge (every taken body smaller than every refused one), the default is no more than the largest taken, and a stored
  number still replaces the default.

Other files: `tools/cloud-brain/tomarkdown.md` (new), a row for it in the "Measured records" of
`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, the line of `tools/cloud-brain/running-a-cloud-brain.md`
that gave 50,000,000, a pointer in `tools/cloud-brain/spec-as-built-short.md`, and four "(As built …)" notes in the spec.

## The tests

The new test before the default and the measurement were written, in the worktree
(`bun test.ts brain-x-ai --with …/tm-2.js` in `cloud-brain-dev/`, after `build.ts --out` and `lope-reader.ts --get-module`):

```
"passed":9,"failed":1,"needsBrowser":1
test_ai_markdown_default_size_is_one_cloudflare_took: - Expected [true, true]  + Received [false, false]
```

After the edit, the same command: `"passed":10,"failed":0,"needsBrowser":1`. The one that needs a browser is
`test_ai_panel_lists_priced_text_models_and_runs_one`.

In a browser, `bun tools/cloud-brain/tab-tests.ts …/cloud-brain.html @tomlarkworthy/brain-ai`:
`"tests":11,"passed":11,"failed":[]`, Chrome 151.0.7922.34.

`BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-ai --shell …/cloud-brain.html --times 20`, from the main
checkout, before the deploy, on the build made after the worktree was brought up to `main` (which brought in a
changed `build.ts`), 02:20:16 to 02:20:37 UTC:

```
"mains":["@tomlarkworthy/brain-shell","@tomlarkworthy/brain-ai"]
"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]
```

The same command on the build before that, 02:14:40 to 02:15:00 UTC, gave the same line, and each run's line there
had `"@tomlarkworthy/brain-ai":11` and `"tests":11`. `test.ts` and `tab-tests.ts` were also run again on the later
build, the second with `--emit`: `"passed":10,"failed":0,"needsBrowser":1` and `"tests":11,"passed":11,"failed":[]`.

The test reads two cells and calls no rig: it holds the default to the rows written in the seed. It does not ask
Cloudflare, so it does not see Cloudflare's edge move.

## Read

`knowledge.search?semantic=true` with `loop-knowledge`, three searches: "tomarkdown markdown conversion pdf quality",
"pdftotext compared with arxiv html text", "measured body size limit cloudflare neurons cost". They answered this
task's spec, `doc:cloud-brain-paper-summarizer-persona` and `brain-ai`. Used: `compareTexts` and `pdfParagraphs` of
`tools/cloud-brain/summarize-papers.ts`, by import, for the comparison with the HTML's text, and the files that tool's
`text` command had written for the three papers. Nothing else bore on it.

## Where the spec was silent or the task went another way

- **Which papers.** The spec names one, and "one of about 10 MB, one of about 1 MB". arXiv's `content-length` was
  asked for the 61 arXiv papers that have a text file in `.emitted/papers/` of the main checkout, and 50 of the PDFs were fetched to
  find one of two columns: `arxiv:2410.04444` (1,150,916 bytes) is that and the 1 MB one, `arxiv:2603.13131`
  (10,050,251) is the 10 MB one and the one with tables, `arxiv:2609.26457` the one with display equations and with
  no image in it.
- **More calls than "about 12".** 15, because the paper of 39,663,618 bytes was refused: two more papers (22 and 32 MB)
  and six padded files were sent to tell the size from the file and to find the edge.
- **The scanned page** is not of a kept paper; none of the 50 looked like a scan. One call more was made with a
  page of a scanned thesis from the checkout, because the owner's first question for the spec names a scanned page.
  Philosophy line 2 (the smaller side, said in the reason): $0.01.
- **The owner's read of the cost.** The spec names `logs.query` of `at: "ai.tomarkdown"`. With no header from
  Cloudflare those lines have `neurons: null`, so that read does not show the cost; Cloudflare's own usage page does.
  Filed as `tomarkdown-image-cost-unread`, with `tomarkdown.md` as its report, as the spec says of a floor per image.

## Not tried

The list at the end of `tools/cloud-brain/tomarkdown.md` is the list for the measurements. For the change:

- A body between 37,000,000 and 37,000,116 bytes. The service's 413 at the new default through cb4 is the check
  made after the deploy, and its answer is in the writer's comment on the issue, not here: this file landed with the
  seed. In the seed's tests the 413 is asserted with a stored limit of 10 bytes, as before.
- `config.set` of `markdownMaxBody` on cb4. It is the owner's.
- The log lines of the 14 calls. `logs.query` is the owner's session's.
- Whether the call that ended with no status (02:09:06 UTC) was charged.
