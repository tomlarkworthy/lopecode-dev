# What Cloudflare's Markdown conversion does, measured through `ai.tomarkdown`

Measured 2026-10-12, 02:06 to 02:12 UTC, from one machine in Berlin, through cb4: `brain-x-ai@41bc808efa00`
(`x-brain-served-by` of each answer), with the token `loop-markdown` and `usd=0.01`. Task 2 of
`plan/cloud-brain-ai-tomarkdown-pass-through.md` (`tm-2-what-the-conversion-does`). 15 calls were sent and 14 were
answered; each answered one carries `x-brain-price: 0.01`, $0.14 together.

What it changed: the default of `markdownMaxBody` in `brain-ai.ojs`, 50,000,000 to 37,000,000, and the sentences of
that seed's cell "A conversion to Markdown". The numbers are also in the seed, `aiMeasured.markdown`.

## What was found

- **Size.** A body of 37,000,116 bytes was converted. Bodies of 38,500,116 bytes and more were refused by Cloudflare:
  400, code 6006, after 9 s. The Brain passed each of them on.
- **Cost.** No answer had `cf-ai-neurons`, the two calls of image files among them. What an image costs Cloudflare's
  account is not known from here.
- **Quality.** For a paper it is the text of each page, about what `pdftotext` gives, with less cleaning: no
  table, no heading of the paper, line-end hyphens kept. Columns were in reading order.
- **A scanned page** came back 200 with no text and no error.

## How each call was made

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.ai.tomarkdown?usd=0.01" --as loop-markdown \
  -X POST -F "files=@FILE" -o NAME.json -D NAME.hdr --max-time 900 \
  -w '%{http_code} %{time_total}s up=%{size_upload} down=%{size_download}'
```

`-o` keeps the answer, `-D` its headers, and the line `-w` prints is the row below: the status, curl's `time_total`,
and the bytes sent, which are the multipart body (the file and about 210 bytes). The time is of one call, from Berlin,
the upload included. The script, its log and the two other scripts named below are attached to the issue
(`issue.attachment?id=tm-2-what-the-conversion-does&name=…`: `call.sh`, `log.txt`, `pad.py`, `compare.ts`).

Each paper is from `https://arxiv.org/pdf/<id>`, fetched that night with 3 s between two fetches. The SHA-256 of each
of the six sent is the `sha256` of its kept entry (`knowledge.search?q=arxiv:<id>` with `loop-knowledge`, the
field `sha256`), so the bytes are the kept files' bytes, and no kept file was read:

| paper | bytes | SHA-256, first 16 |
|---|---|---|
| `arxiv:2410.04444` | 1,150,916 | `f3e8e090d16bc530` |
| `arxiv:2609.26457` | 737,558 | `8ba79e0ad1028e43` |
| `arxiv:2603.13131` | 10,050,251 | `4587b08d1c988f12` |
| `arxiv:2602.07755` | 22,491,423 | `387766822f4fc3aa` |
| `arxiv:2605.09998` | 31,751,676 | `50f60996b0d962cd` |
| `arxiv:2608.11350` | 39,663,618 | `7e1b1792b081c6c5` |

## Size

In the order sent. "padded" is a PDF made for this (`pad.py`): one page with one sentence, and a stream of the
named size that no page uses, as the 2 MB file of `records/tm-1-ai-tomarkdown-method.md`.

| UTC | file | body, bytes | status | s | answer |
|---|---|---|---|---|---|
| 02:06:49 | `arxiv:2410.04444`, 24 pages | 1,151,126 | 200 | 1.59 | `tokens` 19686 |
| 02:06:56 | `arxiv:2603.13131`, 30 pages | 10,050,461 | 200 | 3.91 | `tokens` 21167 |
| 02:07:00 | `arxiv:2608.11350`, 26 pages | 39,663,828 | 400 | 9.63 | code 6006 |
| 02:07:51 | padded | 39,663,910 | 400 | 9.36 | code 6006 |
| 02:08:00 | `arxiv:2602.07755`, 71 pages | 22,491,633 | 200 | 6.68 | `tokens` 50638 |
| 02:08:12 | `arxiv:2605.09998`, 28 pages | 31,751,886 | 200 | 10.49 | `tokens` 21775 |
| 02:08:29 | padded | 33,000,116 | 200 | 7.34 | `tokens` 64, the sentence |
| 02:08:36 | padded | 34,000,116 | 200 | 8.04 | the same |
| 02:08:50 | padded | 37,000,116 | 200 | 9.84 | the same |
| 02:09:06 | padded | 38,500,116 | none | 2.17 | curl's status `000` after 13,500,070 bytes sent; no header, no body |
| 02:09:13 | padded, sent again | 38,500,116 | 400 | 8.81 | code 6006 |

The refusal, the same bytes all three times, with `x-brain-served-by: brain-x-ai@41bc808efa00` and
`x-brain-price: 0.01`:

```
{"errors":[{"message":"Error converting to markdown","code":6006}],"success":false,"result":{},"messages":[]}
```

**It is the size and not the paper.** The padded file of 39,663,910 bytes has one sentence in it and was refused as
the paper of that size was; the padded file of 37,000,116 was converted. The shape is Cloudflare's
(`{ success, errors }`), not the Brain's `{ error, message }`, and the answer has the service's hash: the kernel, the
core and `brain-x-ai` each passed 39.7 MB on.

**The edge is between 37,000,116 and 38,500,116 bytes**, seen once on each side. It was not looked for more closely.
Whether it is a count of bytes or a time at Cloudflare is not known: the three refusals came after 8.8 to 9.6 s, and
one paper that was converted took 10.5 s, which is against a plain limit of time on the whole call.

`markdownMaxBody` is now 37,000,000, the largest size seen to pass, in round figures under it. Before, a body
between that and 50,000,000 was sent and charged, and came back with a message that names no size. Now it is 413
`TooLarge` from the service with both numbers. The core charges `usd` in either case (the seed, "The price"). A stored
`markdownMaxBody` still goes over the default (`config.set`, the owner's).

The call with no status was not explained. curl printed nothing to stderr and the same file went through 7 s later.
Whether the core charged it was not read.

## Cost

| UTC | files | body, bytes | status | s | `tokens` |
|---|---|---|---|---|---|
| 02:09:36 | `arxiv:2609.26457`, a PDF with no image in it (`pdfimages -list`: 0), 28 pages | 737,768 | 200 | 2.20 | 24266 |
| 02:06:49 | `arxiv:2410.04444`, a PDF with 122 images (`pdfimages -list`) | 1,151,126 | 200 | 1.59 | 19686 |
| 02:09:38 | one image file, `tools/screenshots/tpl-blog.png`, 63,218 bytes, 1200 by 900 | 63,420 | 200 | 20.84 | 459 |
| 02:09:59 | two in one call, that file and `tools/screenshots/tpl-ui.png`, 63,235 bytes | 126,803 | 200 | 22.25 | 412 and 496 |

**None of the 14 answers has `cf-ai-neurons`**, so none has `x-ai-neurons` or `x-ai-usd` (`grep -iE "^(x-ai|cf-ai)" *.hdr`
prints nothing; the name is in each answer's `access-control-expose-headers` alone). The service's log line then has
`neurons: null` for each (`brain-ai.ojs`, the branch `tomarkdown`), so the owner's `logs.query` of
`at: "ai.tomarkdown"` gives `usd` and no neurons to compare it with. The read that would show the cost is
Cloudflare's own: the Workers AI usage of the account for 2026-10-12 around 02:09 UTC, where three image conversions
are the only calls of this task that ran a model. No token of the loop reads that; `plan/cloud-brain-cloudflare-usage-read.md`
is the spec about such a read.

What can be said without it:

- **An image file runs a model and a PDF does not.** One image took 20.8 s and came back as a description written
  by a model ("# Image Description … A minimalist, dark-themed user interface …", with the words on the screenshot
  quoted in it). The PDF with 122 images took 1.6 s and its answer has no description of any of them.
- **Two image files in a call cost the caller the same $0.01 as one** (`x-brain-price: 0.01` on both) and took
  22.2 s, not twice 20.8. Each got a description of its own. So the floor does not hold Cloudflare's cost under the
  charge when a call carries several images, as the spec says; by how much is the number not known.
- The two descriptions of `tpl-blog.png` differ (459 and 412 tokens, other headings): the answer for an image is not
  the same from one call to the next.

A floor for each image, or a count of the parts, is not in this task (the spec, "Not chosen"). It is filed as the issue
`tomarkdown-image-cost-unread`.

## Quality, on three papers

Each paper has arXiv's HTML. Three texts of each: Cloudflare's `result[0].data`; `pdftotext -enc UTF-8` (version
26.10.0) on the same bytes; and the HTML's text as `summarize-papers.ts text` wrote it, the files
`tools/cloud-brain/.emitted/papers/arxiv:<id>.txt` of the main checkout (their `.text.json`: route `html`, versions
v4, v3 and v1).

Characters of each (`wc -m`), and how much of the HTML's text each of the other two has, by
`compareTexts` of `summarize-papers.ts` (`compare.ts` imports it): the share of the HTML's numbers, of its distinct
words, and of its runs of 8 words, which a text read in another order does not have.

| paper | chosen for | Cloudflare | `pdftotext` | HTML | Cloudflare: numbers, words, runs | `pdftotext`: numbers, words, runs |
|---|---|---|---|---|---|---|
| `arxiv:2410.04444` | two columns | 78,744 | 77,944 | 71,092 | 0.991, 0.956, 0.569 | 1, 0.987, 0.585 |
| `arxiv:2603.13131` | tables (9 captions) | 84,666 | 83,822 | 86,219 | 0.994, 0.961, 0.730 | 0.996, 0.978, 0.677 |
| `arxiv:2609.26457` | display equations | 96,890 | 96,426 | 95,531 | 0.998, 0.987, 0.741 | 0.995, 0.992, 0.746 |

For Cloudflare the comparison is of the text from `## Contents` on, without the metadata list.

**The shape of an answer.** `# <file name>`, `## Metadata` (the PDF's own fields as a list, 19 of them for the first
paper), `## Contents`, then `### Page N` for each page with that page's text. Those are the only headings. A line of
the answer is a line of the PDF.

**Columns are in reading order.** Page 2 of `arxiv:2410.04444` was read whole: the left column, then the right, as
`pdftotext` has them. The runs of 8 words agree with that: 0.569 for Cloudflare and 0.585 for `pdftotext` on that
paper, where two columns set side by side would give far fewer. The other pages were not read.

**Blocks are joined with nothing between them**, and a footnote lands in the sentence the column broke. From that page:

```
to update the logic of the running main function,unlike the loop-iterative approach of traditional
…
back. The agent then proceeds to the subsequent1In this paper, self-awareness means that the agent can
introspect and read its own code and files, not to imply any
philosophical sense of consciousness or awareness.recursive depth and continues to optimize itself.
```

**Line-end hyphens are kept.** Lines that end in a letter and a hyphen, from `## Contents` on, against `pdftotext`'s
output: 276 and 5 for the paper of two columns, 21 and 0, 48 and 1 (`compare.ts`, `hyphenEnds`). So "responsi-" and
"ble" are two words in Cloudflare's text. That is where its share of the HTML's words is lower (0.956 against 0.987).

**A table is lines of text, not a Markdown table.** Table 2 of `arxiv:2603.13131`, from each:

Cloudflare (the caption's last line runs into the header row, and the last row into the next paragraph):

```
budget. Values denote SR (%).Source of Remedies Iron Redstone Diamond Armor Hard Avg.
Binary Feedback 42.36 24.72 10.28 18.36 27.06
Trajectory-level Reflection 46.88 26.79 11.94 20.36 29.98
Typed Execution Feedback 55.83 31.24 17.06 27.63 37.13Table 2 further examines how remedy effectiveness depends on the granularity of execution feedback.
```

`pdftotext` (one cell a line, by column: the header's six cells, the three row names, then each column's three
numbers; the rows are not together):

```
Source of Remedies
Iron
Redstone
…
Binary Feedback
Trajectory-level Reflection
Typed Execution Feedback
42.36
46.88
55.83
24.72
…
```

The HTML's text:

```
Source of Remedies Iron Redstone Diamond Armor Hard Avg.
Binary Feedback 42.36 24.72 10.28 18.36 27.06
Trajectory-level Reflection 46.88 26.79 11.94 20.36 29.98
Typed Execution Feedback 55.83 31.24 17.06 27.63 37.13
```

For this table Cloudflare's rows are the HTML's rows, and `pdftotext`'s are not rows. One table was looked at.
A `|` is in 8 lines of that answer, none of them a table's (pseudocode, two formulas, four lines of JSON).

**An equation is its letters in a line.** Equation 1 of `arxiv:2609.26457`, from each:

Cloudflare, where `␀` and `␁` stand for the characters U+0000 and U+0001 that are in the answer in place of the tall
brackets (6 of each in that answer; `file` calls the saved text "data", and `grep` needs `-a` to read it):

```
budget 𝑏𝑡 is spent, covering the agent’s tokens and the cost of executing its solutions.𝑥𝑖 = 𝑎␀𝑥<𝑖, 𝑟pub𝑡 (𝑥<𝑖)␁ (1)
```

`pdftotext` (U+0001 is there for the closing bracket, 6 in the text, and no U+0000):

```
pub
𝑥 𝑖 = 𝑎 𝑥 <𝑖 , 𝑟𝑡 ( 𝑥 <𝑖 )
(1)
```

The HTML's text:

```
x_{i}=a\big(x_{<i},\;r^{\mathrm{pub}}_{t}(x_{<i})\big) (1)
```

Subscripts and superscripts are flat in both texts of the PDF; only the HTML keeps what is under what.

**A scanned page.** No kept paper that was looked at is a scan: of the 50 PDFs fetched for this task, `pdftotext`
gave under 20 characters for pages of two (`arxiv:2309.16797`, `arxiv:2609.24972`), and those were not opened to see
why. So a scan was made: page 20 of a thesis of 1991 that is in the checkout
(`tools/robocoop-5/eval/tbs-src/tasks/earth-sciences/geosciences/duan-thesis/environment/data/duan1991.pdf`), as a
picture at 100 dpi (`pdftoppm -png -r 100`), then that picture as a PDF of one page (`sips -s format pdf`), 176,030
bytes, in which `pdftotext` finds no text. At 02:12:14 UTC: 200 in 0.55 s, `tokens` 85, and

```
## Contents
### Page 1


```

No OCR, and nothing in the answer says the page had no text. The same picture as an image file was not sent.

## What a caller should take from it

- For a paper with a text layer, `pdftotext` and this conversion give about the same text. `pdftotext` joins the
  words broken at a line's end and this does not; this kept the rows of the one table looked at and `pdftotext` did
  not. arXiv's HTML, where there is one, is the only one of the three with the equations' structure.
- A body over 37,000,000 bytes is refused before it is sent. arXiv gave the size of 61 kept papers (a `HEAD` each);
  three are over 20 MB: 39,663,618 bytes (refused), 31,751,676 and 22,491,423 (converted).
- A scan needs another way. An image file is described by a model, in 20 s a call here.

## Not tried

- The edge more closely than 37,000,116 to 38,500,116, each side more than once, and whether a file other than a PDF
  has the same edge.
- What an image costs. Cloudflare's usage for the account was not read.
- More than two files in a call, an image over 63,235 bytes, a `.jpg`, and a PDF and an image in one call.
- An office file (`.docx`, `.xlsx`, `.ods`, `.numbers`), HTML, CSV: any format of the 28 but PDF and PNG.
- `conversionOptions`: `pdf.metadata` false, `output.format` text.
- Two calls at once, and a call from a browser page or a Worker of the Brain.
- A PDF with a `StructTree`, which Cloudflare's page says it reads for structure. Whether any of the papers has one
  was not looked at; none of the three answers read for quality has a Markdown table or a heading of the paper.
- The tables and equations of the papers but the one of each quoted, and the reading order of any page but one.
- The scanned picture as an image file, and a scan at a higher resolution.
