# ps-1-paper-text: `summarize-papers.ts text`, a paper's text and each entry kept as entered

Task 1 of `plan/cloud-brain-paper-summarizer-persona.md`. Written 2026-10-11, 20:55 CEST (`date`), by the task's
writer. A local tool and its test file: no seed, no deploy, nothing put to the Brain.

`P` below is `<main checkout>/tools/cloud-brain/.emitted/papers`. A count of characters is the length of the
JavaScript string (UTF-16 units), which is what the tool measures. Python's `len` gave a smaller number for some of
the texts (an assertion of this session failed on `arxiv:2303.17651`), so a count is checked as `len(t.encode('utf-16-le'))//2`.

## What was built

`tools/cloud-brain/summarize-papers.ts`, with `text` and `compare`. Its header is the reference. `run`, `check` and
`restore` are task 2's and answer exit 2, "is not built".

`text --tag T` or `--ids a,b`, in two passes:

1. Each entry, read with `loop-knowledge`, is written to `P/<id>.entry.json` (`id`, `title`, `text`, `tags`,
   `changed`, `length`, `sha256` of `text`) with the open flag `wx`, so a file that is there is not written over. An
   entry with the tag `paper-summary` or the line `Summary by paper-summarizer` gets no file.
2. The paper's text goes to `P/<id>.txt`, with `P/<id>.text.json` beside it (route, address, the version the page
   names, characters, lines, SHA-256). `arxiv.org/html/<id>` first; on a 404, and for an id that is not arXiv's,
   the kept PDF through `static.get` with `loop-papers`, given to `pdftotext` only when its SHA-256 is the entry's.

Choices the plan left to the writer. Task 2's number rule searches the `.txt`, so the ones that touch digits are first.

- **Math.** arXiv's page carries each formula twice, as MathML and as TeX in `alttext`. A formula with no structure
  (no `msub`, `msup`, `mfrac`, `msqrt`, `mtable` and the like) is written as the characters of its MathML: `28.2%`,
  where the TeX is `28.2\%`. A formula with structure is written as its TeX. In the fixture:
  `overconfidence is substantial (48, 28.2%)` and `improved from 0.672→0.795 (+18.3%)`. Not chosen: TeX for all, which
  would have the rule refuse `28.2%` in a summary. A number inside structured math is
  in TeX's form, whatever that is; how many of the corpus' numbers are was not counted.
- **No line over 1500 characters** (`wrap`). The plan says "one paragraph a line, so that Read pages it"; `pdftotext`
  gives no blank line between the paragraphs of a column, and the first run on the PDF fixture had a line of 3289
  characters. A line is cut after a sentence's end, else at a space, never inside a run without a space. That Read
  cuts a long line was not measured here; the limit is a guess at a safe width.
- **What of the page is left out**: `script`, `style`, `nav`, `header`, `footer`, `button`, `svg`, `img`, and the
  classes `ltx_page_navbar`, `ltx_TOC`, `ltx_page_logo`, `ltx_page_footer`, `ltx_pagination`. Text inside an `svg`
  figure is lost with it.
- **What is kept**: everything else inside `article.ltx_document`: title, authors, abstract, body, references,
  appendices. All 59 HTML texts have a line `References` or `Bibliography`; the median share of a text from the last
  such line to its end is 0.481 (0.095 to 0.844), by the command under "The run on cb4". So about half of what a summarizer will read is references and
  appendices. Not cut: an appendix is the paper, and the PDF route has no structure to cut by. Task 3's measured
  cost is where to weigh it.
- **PDF**: `pdftotext -enc UTF-8`, without `-layout`. With `-layout` the two-column test fails (run as a mutation).
  Section numbers are on lines of their own (`1`, then `Introduction`), and page numbers and running heads are in
  the text.
- **A text under 5000 characters** is named and not written. None of the 63 was.
- **arXiv is asked once every 3 s** (`--delay`), with a user-agent that names this repository. Any answer but 200
  or 404 stops the run with exit 1.

## The tests

```
cd <worktree> && bun test ./tests/tools/summarize-papers.test.ts
 11 pass  0 fail  136 expect() calls        (2026-10-11 20:54 CEST, after the rebase onto 41843f71)
```

The two fixtures are under `tests/tools/fixtures/summarize-papers/`, both CC BY 4.0, named with their authors in
the test's header: `arxiv-2603.06333v1.html` (the page as arXiv answered it, 257,012 bytes) and
`arxiv-2308.10144v3-page2.pdf` (page 2 of a two-column paper, 90,288 bytes). The PDF is not arXiv's bytes:
`pdfseparate` gave a page of 10 MB, so the page was written again with `pdftocairo -pdf -f 2 -l 2`.

What the issue names, and the case that has it:

| Asked | Case |
|---|---|
| an arXiv HTML page | "the arXiv HTML fixture": 61,090 characters, title first, `1 Introduction` the fifth line, no tag, the two numbers above |
| a PDF of two columns | "the two-column PDF fixture": seven strings of the left then the right column in order, and a sentence that runs over line ends of the left column whole |
| no `.entry.json` for a summarized entry | "keepEntry" (by the tag, by the line alone) and "text --tag" (the tool as run: three files for four entries) |
| the main checkout's `.emitted/` from a worktree | "from a worktree": a repository and `git worktree add` in a temporary directory; the files are in the first, the worktree has no `.emitted/`, and `brain.ts` is given the first's state |

Three mutations of the tool, each run once on 2026-10-11 and taken out: `-layout` added (2 fail), the summarized
check removed (4 fail), the state taken from the copy's own directory (1 fail).

The cases that run the tool use a fake `brain.ts` and a local server in arXiv's place. No test calls cb4 or arXiv.

## The run on cb4

From the worktree, 2026-10-11 20:49:15 to 20:52:30 CEST (`date` before and after), with `loop-knowledge` and
`loop-papers`:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts text --tag awesome-rsi
{"papers":"/Users/tom.larkworthy/dev/lopecode-dev/tools/cloud-brain/.emitted/papers","entries":63,"keptNow":60,"keptBefore":3,"summarized":0,"differs":0,"html":59,"pdf":4,"skipped":[]}
```

`keptBefore: 3` are the three of a first run at 20:47 with `--ids` (one HTML, two PDF), made to try the tool. The
worktree has no `.emitted/`; the files are the main checkout's:

```
ls <main checkout>/tools/cloud-brain/.emitted/papers/*.entry.json | wc -l     63
ls <main checkout>/tools/cloud-brain/.emitted/papers/*.txt | wc -l            63
```

**The token `loop-papers` existed.** It was not kept when the task was started (the names of
`cb4-tokens.json`, read with `json.load(...).keys()`, had no such name) and was at 20:47:15, the file's time; the
comment of event 1955 says it was made on the owner's word. So the four from a kept PDF were run, and the comparison.

The two memento-3 entries, for which the plan says arXiv's HTML was "not tried", both answered 200
(`arxiv:2303.11366`, `arxiv:2605.09998`). The two that answered 404 are the two the plan names.

The 59 HTML texts: 35,414 to 333,339 characters, median 81,907. The share from the references on:

```
python3 - <<'X'
import json,glob,statistics
P='tools/cloud-brain/.emitted/papers/'; h=[]; n=0
for f in sorted(glob.glob(P+'*.text.json')):
    r=json.load(open(f))
    if r['route']!='html': continue
    n+=1; t=open(P+r['id']+'.txt').read(); L=t.split('\n')
    k=[i for i,l in enumerate(L) if l.strip() in('References','Bibliography')]
    if k: h.append(sum(len(l)+1 for l in L[k[-1]:])/len(t))
print(n,len(h),round(statistics.median(h),3),round(min(h),3),round(max(h),3))
X
59 59 0.481 0.095 0.844
```
 The plan's "median body 32,660" is the filing
session's and is of another cut; it was not reproduced.

### The text read, for each of the 63

`python3 -c "import json,glob;[print(r['id'],r['route'],r['address'],r.get('version'),r['chars'],r['sha256'][:16]) for r in map(lambda f:json.load(open(f)),sorted(glob.glob('P/*.text.json')))]"`

The address is the one asked; arXiv serves its newest version there, and the version is the one the page's text
names. For a PDF the address is the entry's `file`; which version of the paper that file is was not read.

| id | route | address read | version the page names | characters | sha256 of the text, first 16 |
|---|---|---|---|---|---|
| `arxiv:2303.11366` | html | `https://arxiv.org/html/2303.11366` | v4 | 56822 | `aa7664ee9b25ed43` |
| `arxiv:2303.17651` | html | `https://arxiv.org/html/2303.17651` | v2 | 126265 | `7959f0e68f3348c7` |
| `arxiv:2304.05128` | html | `https://arxiv.org/html/2304.05128` | v2 | 68286 | `291d090f85635660` |
| `arxiv:2305.11738` | html | `https://arxiv.org/html/2305.11738` | v4 | 210535 | `26dfd3cf8cedcd2c` |
| `arxiv:2305.16291` | html | `https://arxiv.org/html/2305.16291` | v2 | 113896 | `38a72e48baa5965b` |
| `arxiv:2308.10144` | html | `https://arxiv.org/html/2308.10144` | v3 | 75485 | `233941ece173b168` |
| `arxiv:2309.03409` | html | `https://arxiv.org/html/2309.03409` | v3 | 141799 | `2f345843240123e9` |
| `arxiv:2309.11495` | html | `https://arxiv.org/html/2309.11495` | v2 | 49268 | `92946bf96a6720c0` |
| `arxiv:2309.16797` | html | `https://arxiv.org/html/2309.16797` | v1 | 100892 | `71f097d6668d99c2` |
| `arxiv:2310.01798` | html | `https://arxiv.org/html/2310.01798` | v2 | 56111 | `5c4999004659194b` |
| `arxiv:2310.02304` | pdf | `static:corpus/research-awesome-rsi/arxiv/2310.02304.pdf` |  | 136808 | `98b504956113a5fd` |
| `arxiv:2310.03714` | html | `https://arxiv.org/html/2310.03714` | v1 | 108604 | `f34cf0f9e0ff676b` |
| `arxiv:2312.13010` | html | `https://arxiv.org/html/2312.13010` | v3 | 54444 | `a906d9f9b6d5dc6a` |
| `arxiv:2406.07496` | html | `https://arxiv.org/html/2406.07496` | v1 | 110277 | `2bed8fdfc718720d` |
| `arxiv:2408.06292` | html | `https://arxiv.org/html/2408.06292` | v3 | 103185 | `56808ca2dca2a7a6` |
| `arxiv:2408.08435` | html | `https://arxiv.org/html/2408.08435` | v2 | 104067 | `ab16edbe0982815f` |
| `arxiv:2410.04444` | html | `https://arxiv.org/html/2410.04444` | v4 | 71098 | `30ea6c83c3864f25` |
| `arxiv:2502.12110` | html | `https://arxiv.org/html/2502.12110` | v11 | 80313 | `e4299ae505dd92fc` |
| `arxiv:2503.14499` | html | `https://arxiv.org/html/2503.14499` | v4 | 126830 | `17caa10d8a7b0311` |
| `arxiv:2504.15228` | html | `https://arxiv.org/html/2504.15228` | v2 | 46811 | `cd66ea8ead17566a` |
| `arxiv:2505.02709` | html | `https://arxiv.org/html/2505.02709` | v1 | 74968 | `c6ce828ea81ae988` |
| `arxiv:2505.22954` | html | `https://arxiv.org/html/2505.22954` | v3 | 220806 | `f9cbaae085fa8d72` |
| `arxiv:2506.13131` | html | `https://arxiv.org/html/2506.13131` | v1 | 118263 | `588d6749b4e3f56f` |
| `arxiv:2507.03616` | html | `https://arxiv.org/html/2507.03616` | v2 | 49799 | `f4a3da8089492b33` |
| `arxiv:2507.21046` | html | `https://arxiv.org/html/2507.21046` | v4 | 311828 | `04d01f2016751d85` |
| `arxiv:2508.07407` | pdf | `static:corpus/research-awesome-rsi/arxiv/2508.07407.pdf` |  | 247482 | `576707752f4b1c3e` |
| `arxiv:2509.26354` | html | `https://arxiv.org/html/2509.26354` | v2 | 131945 | `d70c9cbed9b71345` |
| `arxiv:2510.04618` | html | `https://arxiv.org/html/2510.04618` | v3 | 86310 | `04eb1b3a11182a1c` |
| `arxiv:2510.16079` | html | `https://arxiv.org/html/2510.16079` | v3 | 76083 | `a27cb04dd6bc89de` |
| `arxiv:2510.23601` | html | `https://arxiv.org/html/2510.23601` | v1 | 53133 | `ff5e6fb15862bd6c` |
| `arxiv:2512.18746` | html | `https://arxiv.org/html/2512.18746` | v1 | 72440 | `522b5930f46695a6` |
| `arxiv:2601.10657` | html | `https://arxiv.org/html/2601.10657` | v3 | 201845 | `0ca243df80a41ad1` |
| `arxiv:2601.21557` | html | `https://arxiv.org/html/2601.21557` | v2 | 80685 | `c294e2ad45dbd313` |
| `arxiv:2602.07755` | html | `https://arxiv.org/html/2602.07755` | v1 | 159896 | `99a28bf06af2a037` |
| `arxiv:2603.03329` | html | `https://arxiv.org/html/2603.03329` | v1 | 43959 | `d12d9b40a7dead9c` |
| `arxiv:2603.06333` | html | `https://arxiv.org/html/2603.06333` | v1 | 61090 | `314ce5afb23784a6` |
| `arxiv:2603.13131` | html | `https://arxiv.org/html/2603.13131` | v3 | 86237 | `08c8df9c3cac3a76` |
| `arxiv:2603.18000` | html | `https://arxiv.org/html/2603.18000` | v1 | 40064 | `89781b9391bc40f7` |
| `arxiv:2603.19461` | html | `https://arxiv.org/html/2603.19461` | v1 | 209339 | `d6871436d1cceef7` |
| `arxiv:2604.15097` | html | `https://arxiv.org/html/2604.15097` | v4 | 89618 | `eda94a33b231cd5a` |
| `arxiv:2604.20133` | html | `https://arxiv.org/html/2604.20133` | v3 | 56004 | `f3cef3d9706e118b` |
| `arxiv:2604.25850` | html | `https://arxiv.org/html/2604.25850` | v4 | 77488 | `62b5df86b070e49a` |
| `arxiv:2605.09998` | html | `https://arxiv.org/html/2605.09998` | v1 | 64451 | `fade1cec20b2a802` |
| `arxiv:2605.23904` | html | `https://arxiv.org/html/2605.23904` | v2 | 89713 | `e61b57b3954769eb` |
| `arxiv:2606.26294` | html | `https://arxiv.org/html/2606.26294` | v3 | 117288 | `982a3a29fcdf0c8c` |
| `arxiv:2607.05297` | html | `https://arxiv.org/html/2607.05297` | v1 | 57468 | `c4e8e31a06301492` |
| `arxiv:2607.07663` | html | `https://arxiv.org/html/2607.07663` | v2 | 144384 | `55283acc1801bab2` |
| `arxiv:2607.13104` | html | `https://arxiv.org/html/2607.13104` | v1 | 333339 | `31abd760c0dbf1c5` |
| `arxiv:2607.14159` | html | `https://arxiv.org/html/2607.14159` | v1 | 58094 | `58633ff10dabd41c` |
| `arxiv:2608.07645` | html | `https://arxiv.org/html/2608.07645` | v1 | 185584 | `09c909bb7d63119a` |
| `arxiv:2608.11350` | html | `https://arxiv.org/html/2608.11350` | v2 | 54485 | `1b7d6fe0c1a8bff7` |
| `arxiv:2608.12307` | html | `https://arxiv.org/html/2608.12307` | v1 | 90827 | `92716e31ad532ef1` |
| `arxiv:2608.17906` | html | `https://arxiv.org/html/2608.17906` | v4 | 35414 | `7abd3a1a75afdfd5` |
| `arxiv:2608.23200` | html | `https://arxiv.org/html/2608.23200` | v4 | 43916 | `8556d9144d35cb53` |
| `arxiv:2609.14857` | html | `https://arxiv.org/html/2609.14857` | v1 | 75365 | `07a570d292dfd963` |
| `arxiv:2609.15364` | html | `https://arxiv.org/html/2609.15364` | v2 | 117148 | `0bd7e840b63c23d8` |
| `arxiv:2609.20519` | html | `https://arxiv.org/html/2609.20519` | v1 | 51284 | `5bf8f6d0b9f5d011` |
| `arxiv:2609.24972` | html | `https://arxiv.org/html/2609.24972` | v3 | 81907 | `1c18d0b24f940b61` |
| `arxiv:2609.26457` | html | `https://arxiv.org/html/2609.26457` | v1 | 95537 | `a6727a2478cc24f6` |
| `arxiv:2609.31186` | html | `https://arxiv.org/html/2609.31186` | v1 | 107492 | `44fe830efb551033` |
| `arxiv:2609.35596` | html | `https://arxiv.org/html/2609.35596` | v2 | 71750 | `b7574fe965f0f22c` |
| `nature:s41586-023-06924-6` | pdf | `static:corpus/research-awesome-rsi/nature/s41586-023-06924-6.pdf` |  | 73839 | `bc1f3861ffe88bdb` |
| `nature:s41586-026-10265-5` | pdf | `static:corpus/research-awesome-rsi/nature/s41586-026-10265-5.pdf` |  | 61835 | `5b4a45a9b4b0ab9e` |

### The text as entered, for each of the 63 (R8)

`python3 -c "import json,glob;[print(e['id'],e['length'],e['sha256']) for e in map(lambda f:json.load(open(f)),sorted(glob.glob('P/*.entry.json')))]"`

56 of the 63 have a length of 16,000. The files are on this machine and git-ignored; this table is what is committed.
The hash is of `text` as UTF-8.

| id | length | sha256 of the text as entered |
|---|---|---|
| `arxiv:2303.11366` | 3890 | `7487821229dfb371e916771aeaba343a8313d1761ceec740371636545fbae650` |
| `arxiv:2303.17651` | 16000 | `f078a6f635ced64fc854d11ffac11f7b2996182da4c64f0c828879987aafd7db` |
| `arxiv:2304.05128` | 16000 | `314fc3f9b0ab3789f4a48a478454802e27958d4c870eb7ae17bf381652b59637` |
| `arxiv:2305.11738` | 16000 | `724de604144ca22ddcc13ecc28cf1466695ba325ac51d7bb53e74cfc613c549c` |
| `arxiv:2305.16291` | 16000 | `10d6edb2a90bba381a4a378bed90593ae457d06871d92bcde47c4494868e579b` |
| `arxiv:2308.10144` | 16000 | `89284115efb3fa34d2de83c8fe60e3693db5371ad3f285c5c80fb9323fd7c683` |
| `arxiv:2309.03409` | 16000 | `99621913f22b7fc511c9e5c9b246b3aa45a7d00776e06dcc543272827cb097d2` |
| `arxiv:2309.11495` | 16000 | `73ce288733d94e0a45e83411ce5e20d0ce0b99d689b2757df6b2e87155ab1e45` |
| `arxiv:2309.16797` | 16000 | `a6b7cef1f116a24236782a046b5f5d7ce7a1ef44c1cec2c6f6760a0fd4d91b8a` |
| `arxiv:2310.01798` | 16000 | `dd1794a8c5084f27b9947607ebfe6c72ad10d805f44464a49e09eb91a2a17c9c` |
| `arxiv:2310.02304` | 1446 | `d5214b1ca306b7ae97f37755b77f19bcca551cee8e2d7e9d4db5a6157e70d98e` |
| `arxiv:2310.03714` | 16000 | `4b7a6454baf18d45ad478453ad78fe6e102b1df71b256a53f5a0ea1566ba0237` |
| `arxiv:2312.13010` | 16000 | `fc96332cdaaad29bc4c3f53242b6bfd4ac73caf9bad5f720d221de52668ee14c` |
| `arxiv:2406.07496` | 16000 | `a39577262f82ae502e867b81865b797dfce89759080cd2b01151d8c0e37a384c` |
| `arxiv:2408.06292` | 16000 | `b973d7e2c1ff17cfcac64d9dc8aa2b8d3c108e0cb76e352c4dc7fd988bf45179` |
| `arxiv:2408.08435` | 16000 | `12c7e310b603eadf14c650ab9c122af2d6d1c619cf62936edbf867af883cfdd3` |
| `arxiv:2410.04444` | 16000 | `98c49901e8b4bfc8165e0e5b42efb9afc5d57dbe4be40f3021ffd22076da9fe5` |
| `arxiv:2502.12110` | 16000 | `e420fd9bcbfadd0038cd4ae907f12e0d001c9bb85819da3054790827465df8c3` |
| `arxiv:2503.14499` | 16000 | `620cdbbc0bd78dd85099426109490571fc05d3e41715f7cbddbee826847612c0` |
| `arxiv:2504.15228` | 16000 | `f11e8d7f7da2fb5cc90dd112d5cfaacdb6c24cc6070d9dcf6d3387bceea83eba` |
| `arxiv:2505.02709` | 16000 | `fdfe456fe7bf141cb3ae7e9f3e775ce3e23c55aa5e950a282b225b02d1adcf25` |
| `arxiv:2505.22954` | 16000 | `8fcc0a5b99818d5b3a03fbcd2e902d3378183c122dec760227362a4abcbcfd5a` |
| `arxiv:2506.13131` | 16000 | `9dde44c2dbe1d4904421ba6810f1752c1ed193d855968ec1ffb79f35e9a42154` |
| `arxiv:2507.03616` | 16000 | `87ca78198bc86a7c63734e66923da9486c56999348fa4c401df2d075683236ed` |
| `arxiv:2507.21046` | 16000 | `3f010385ff31387544ba791d23f359ebf92774596c83d32d9dd265f13ebfe4d1` |
| `arxiv:2508.07407` | 2079 | `b690443af5f66085cbe11a7d29b1817d3ee4633ea22387dd2fe6a5acd60417a5` |
| `arxiv:2509.26354` | 16000 | `44e42fd2f17c4274b176803dd0a3f7341f65ac35b7213f5d612c26f915bd894d` |
| `arxiv:2510.04618` | 16000 | `3210fe0063811b4ff5d41f47e556799b9e2044783f6e4cc7b6ff85786b3a7e29` |
| `arxiv:2510.16079` | 16000 | `70d7058bc479916990e22cd368960a7dcf7827c81441f45d80a1887e7d89ab6b` |
| `arxiv:2510.23601` | 16000 | `31545111363875f6f6b40e0acc3de2f0b913c487329bf8ed41bfea064f801f8b` |
| `arxiv:2512.18746` | 16000 | `a0fe8d93cbf1c53a7a8a5f12d96abc21c8c07bdbb5b4303520088eee974b443c` |
| `arxiv:2601.10657` | 16000 | `7453e2d9b1cceda70726de556df19669b3ec27d95650d8c2717b7fb8b5c2fd3d` |
| `arxiv:2601.21557` | 16000 | `6f42dd54921054b45680a594d59b1392e015f95f69c274bfa6410495d271784a` |
| `arxiv:2602.07755` | 16000 | `4042ceaf2c6f5b7024bc1de55e61a88566bd7872236197c88eef0d0b8177206a` |
| `arxiv:2603.03329` | 14903 | `3bd12fe44ca0089caf617785428e7944a694999ec5defc4c0a98d8799a7f5bf4` |
| `arxiv:2603.06333` | 16000 | `a17a49493c80ba1ba8130a71b69cd23e09311baba5e973a5dd9c9ccbe3ee83ac` |
| `arxiv:2603.13131` | 16000 | `5e95b8ebd1d3f140901c174fd207ed4dbd34473654132cca1045791fbd9347a2` |
| `arxiv:2603.18000` | 16000 | `4627fcf3df6ab2c7be9a9f9f18435cad5fef58c4873ecfa17798468ed0f8bfd6` |
| `arxiv:2603.19461` | 16000 | `61c796dcb18921a8406fc8cdb4e86766b118c36acace7f278946d7dd7d54f546` |
| `arxiv:2604.15097` | 16000 | `2c2c3d393374fe3296479955bdfd9a081ffc8fa3ee2a6f8aac29cd4041a6e1c7` |
| `arxiv:2604.20133` | 16000 | `edf8b939b500fad677c935e0d9a8dc715bea929310645f952179b5210b45c4f0` |
| `arxiv:2604.25850` | 16000 | `fc48113752a913327feebd0b6c8694c9e4c888e7b33f786e78b1317b027355ad` |
| `arxiv:2605.09998` | 4492 | `decac2d04ee161be0180ff2dfaf3caceb54fc9eccd9de306db93d07034041aa0` |
| `arxiv:2605.23904` | 16000 | `a3ef2e0939d42adcb9b5a19e1120e969978c45cd98720f71192c647314efbd1d` |
| `arxiv:2606.26294` | 16000 | `d56354b6453e935a8f507392189fd07cff12d4879fdc372e3bc0140803ded0a1` |
| `arxiv:2607.05297` | 16000 | `b3fff30a6f3f3967e96361c8e9c7e2fa4c496ac01052dd65adb8405af44d4268` |
| `arxiv:2607.07663` | 16000 | `ef3cde84cdd96dd9720eea28afb1783a4dfbbeea28a7edffa541dc8ad3ff5524` |
| `arxiv:2607.13104` | 16000 | `5db7a0faff8a6c9dab82847d22c25b0b9bde58fe0730b9f65d3e60b1dbe71ee9` |
| `arxiv:2607.14159` | 16000 | `9cb76c02d36837d59e4e173752eee53e5ee5ffbbb53290cff1d78412f85a5f5d` |
| `arxiv:2608.07645` | 16000 | `8aae463176f45f334e45d23c7fc7ab1cc99d5633db692248bddc34ebe09b70ae` |
| `arxiv:2608.11350` | 16000 | `32a71e8563cd9cdbb1f5986fb2d78120e57545160dd49599705ed897a74b01d2` |
| `arxiv:2608.12307` | 16000 | `ac255857740494b824f177e8271564353a678bd21e11849ff9ce5ff0e19c491a` |
| `arxiv:2608.17906` | 16000 | `7e02fa42ac0dc01149af572da4b81fa00a0c3f99f61004a84c940e2a0bc66905` |
| `arxiv:2608.23200` | 16000 | `8e2e0c683a4044da4b19d877b28f292c2567d009eb891ee63e6445681f9a5f64` |
| `arxiv:2609.14857` | 16000 | `325c4164e85e2bbf42247eb19ed8730e53144640f67c2cc7c7d33aee796c6d38` |
| `arxiv:2609.15364` | 16000 | `b9db9e164684f184d6573a17d42944f62817c08d73949e52d0f2ce23804fa630` |
| `arxiv:2609.20519` | 16000 | `b236fbb0bfbc001a651f2a8934ff1a522dbfdf55ba1396176c58a942fea0aab3` |
| `arxiv:2609.24972` | 16000 | `14424671a2888c152c4d8f4f703bff260a333120dd6295e3796b9ffc7e33151e` |
| `arxiv:2609.26457` | 16000 | `56b5ad202abed27a4c67f6f7bdb0978929e5a46d81cb5ec1c3e5d91e3fca296e` |
| `arxiv:2609.31186` | 16000 | `530cf087e0b8f83f05e5964cdfd0a3c4e1307ca896319a6e0d50db3967815d04` |
| `arxiv:2609.35596` | 16000 | `ae9375522288b1fd7d487c538333da29175a6a828c5dfdd3febe8dc106258779` |
| `nature:s41586-023-06924-6` | 249 | `c48afc97aaf9e7903e12657f35874ae3cac876db7f08d4e3afebe13a8ae1a16f` |
| `nature:s41586-026-10265-5` | 176 | `f14e75735362819807640d602ae46679663e62800da76d27c1d31ce1329513c7` |

## The two routes on three papers

`compare` reads both routes and writes nothing. 2026-10-11 20:53:05 CEST:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts compare --ids arxiv:2308.10144,arxiv:2603.06333,arxiv:2406.07496
                    chars            numbers       html's numbers  pdf's numbers  html's 8-word   pdf's 8-word
                    html     pdf     html  pdf     found in pdf    found in html  runs in pdf     runs in html
arxiv:2308.10144    75,485   72,455  236   237     0.996           0.992          0.778           0.818      two columns
arxiv:2603.06333    61,090   60,136  202   208     0.990           0.962          0.684           0.704      one column, formulas
arxiv:2406.07496   110,277  131,750  392   424     0.913           0.844          0.644           0.521      one column, 41 pages
```

That `arxiv:2308.10144` is the two-column one: page 2 of arXiv's PDF of it is the fixture, seen as an image. The
kept files were not looked at for their columns.

A number is counted as the plan's rule reads one (`numbers` in the tool). A run is eight words in a row; a text read
in another order, or with two columns side by side, has few of the other's runs.

What it says. The two-column paper agrees best of the three, so `pdftotext` without `-layout` did not lose the
order of columns there. On each paper 0.4% to 8.7% of the HTML's numbers are not in the PDF's text, and 0.8% to
15.6% the other way. A summary written from one route would have some true numbers refused if checked against the
other; the plan checks against the text the agent was given, which this does not disturb.

What it does not say. Why `arxiv:2406.07496` differs by 21,473 characters was not looked at (a later version on
arXiv than the kept file, or content one route drops). No text was read by eye for this comparison, and tables were
not compared apart. Three papers, one of them two-column.

**Which should be first: arXiv's HTML, as built.** For it: paragraphs and headings are lines of their own, with
no page numbers or running heads, and a formula with structure is its TeX. Against it: the page is arXiv's newest version and the
kept file may be an earlier one; the entry's line names what was read. The kept PDF first would be one route and
always the entry's file, and nothing above shows it reads worse. That is a preference by structure, with these
three rows behind it and no summary written from either.

## The observations of review 1868

- *A second summary assembled from the already-cut text.* `P/<id>.entry.json` holds the uncut text for task 2 to
  assemble from. Nothing here assembles.
- *`pdftotext` runs native code on bytes from outside.* The bytes are the Brain's kept file, given to `pdftotext`
  only when their SHA-256 is the entry's (tested: "a file that is not the entry's is not given to pdftotext"), as an
  argument list with no shell and a limit of 120 s. It runs with the writer's rights, in no sandbox. The PDFs were
  from outside when they were kept.
- The canary, `defaultMode`, and "no session twice" are of `agent.sh` and `run`: task 2's.

## Not tried

- `text` on an entry that is summarized on cb4: none is. The fake's entry is the only case.
- A 429 or 5xx from arXiv itself; the test's server answers one.
- A search that answers 100 entries (exit 1, "the set may be cut"): not tested and not met. The set is read by the
  words `the a of and we in`; a paper whose text has none of them is not in it.
- `--ids` with no `--tag` on cb4 was run for three ids at 20:47; an id the Brain lacks was tested with the fake only.
- Read on a line of 1500 characters, and the summarizer on any of these files.
- A machine with no `pdftotext`: the paper is named with the spawn's error; not run.
- Prior art, searched in the Brain with `loop-knowledge` (`semantic=true`) before the design: "extract text from
  arXiv HTML page", "pdftotext two column PDF text extraction", "keep entry text as entered before rewrite sha256".
  Nothing bore on it. `cheerio`, already in `package.json`, parses the page; no dependency was added.
