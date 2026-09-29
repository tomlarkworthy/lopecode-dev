---
scope: [local-development, in-notebook]
write-triggers:
  - "split\\(\\s*(?:/\\\\r\\?\\\\n/|[\"'`](?:\\\\r)?\\\\n[\"'`]|/\\\\n/)\\s*\\)[\\s\\S]{0,300}?split\\(\\s*(?:[\"'`](?:,|;|\\\\t)[\"'`]|/,/)\\s*\\)"
  - "([A-Za-z_$][\\w$]*)\\s*=[^;\\n]*split\\(\\s*(?:/\\\\r\\?\\\\n/|[\"'`](?:\\\\r)?\\\\n[\"'`]|/\\\\n/)\\s*\\)[\\s\\S]{0,2000}?[A-Za-z_$]*[Cc][Ss][Vv][\\w$]*\\(\\s*\\1\\b|split\\(\\s*(?:/\\\\r\\?\\\\n/|[\"'`](?:\\\\r)?\\\\n[\"'`]|/\\\\n/)\\s*\\)[^\\n]{0,120}?[Cc][Ss][Vv]"
---

# Reading CSV, TSV and other delimited text: parse it, do not split it

A CSV field may hold the delimiter, a quote or a line break when the field is quoted:
`"Thomas A. Garrett, Jr.",M,1972` is three fields, and `"Henry C. ""Hank"" Johnson, Jr."` is one
field whose value contains `"Hank"`. `text.split("\n").map(line => line.split(","))` reads the
first row as four fields and shifts every column after the name. The cells still compute, so no
error shows the shift. Quoted fields are ordinary: 18 of the 887 rows of `us-congress-members.csv`
are quoted like this, and 13 of the 23 distinct CSV attachments in the corpus have a field holding a
comma, a quote or a line break (counted by the m49 worker on 2026-09-29, not re-counted since).

A quoted field may also hold a line break, so splitting the text into lines first is wrong even when
each line is then parsed with quotes in mind. A tweet export in
`@tomlarkworthy/twitter-trending-notebook-bot-dataset-2022` has a tweet text of two paragraphs in one
field; 2 of the 23 distinct CSV attachments have such fields. A quote-aware parser for one line does not fix
this: the tweet still becomes two rows.

Observed, "Make .csv file attachments show as a table preview in the file panel", in
`@tomlarkworthy/fileattachments.file_browser`:

- run 20260929-0620-m49-before: `text.trim().split("\n").map(l => l.split(","))`. The file it had
  to look at had no quoted fields, and the agent reported the task done.
- eval run eval-fixed: a 20-line quote-aware `parseCSVRow(line)` applied to
  `text.split(/\r?\n/)`. Quoted commas were read correctly; the two-paragraph tweet became two rows.
- eval run eval-base: `d3.csvParse(text)`, correct on both files.

## Parse with the builtins

A file attachment, from `d/d2dffac0e42406e8._events` (lopebooks
`@tomlarkworthy_cloudevents-explorer.html`), which the same module shows with `Inputs.table(data)`:

```js
await FileAttachment("purchase_data.csv").csv({typed:true})
```

Text you already hold (fetched, pasted, read from another module), from
`@tomlarkworthy/bitcoin-energy._hashrate` (lopebooks `@tomlarkworthy_bitcoin-energy.html`):

```js
d3.csvParse(await FileAttachment("hash-rate.csv").text())
```

- `FileAttachment(name).csv()` returns strings; `{typed: true}` converts numbers and dates. `.tsv()`
  reads tab-separated files. `d3.csvParse`, `d3.tsvParse` and `d3.dsvFormat(";").parse` take text;
  `d3.autoType` as the second argument types the values. Each returns an array of objects keyed by
  the header row, with `.columns` in header order.
- An attachment belongs to one module and is read with that module's `FileAttachment`. In
  `@tomlarkworthy/fileattachments`, `getFileAttachment(name, module)` returns the same object, so
  `.csv()` works on it.
- `Inputs.table(rows)` renders the array; `{rows: 10}` limits the visible height. Typed numbers are
  shown with thousands separators (1947 as 1,947).

## Checking it

Put a row with a quoted comma (`"Garrett, Jr."`) and a row with a quoted line break in the test
data, and read the parsed row back: the name must be one field, and the row count must equal the
number of records, not the number of lines. A file with no quoted fields passes every parser,
which is how run `20260929-0620-m49-before` reported a split-based preview as done.

## Precedent and limits

Measured 2026-09-29 over the distinct JavaScript `<script>` blocks of `lopecode/notebooks` and
`lopebooks/notebooks` (597 blocks after de-duplicating by content):

```
FileAttachment(...).csv({typed      15 files
FileAttachment(...).csv(             9 files
d3.csvParse                          3 files
line split, then a comma split       0 files   (m49's counts; the last re-checked at merge)
```

The write-triggers match two hand-written parsers:

1. A line split followed within 300 characters by a split on `,`, `;` or a tab. Corpus: 2 cells,
   `@tomlarkworthy/sheet._sheet` and `@tomlarkworthy/spreadsheet._sheet`, which split pasted
   clipboard text on `/\r?\n/` and then on `"\t"`. Spreadsheet applications quote a copied cell
   that holds a tab or a line break (not tested here), so both are this defect, not false
   positives. Unrelated splits within 300 characters (a line count next to a tag list) also
   match; none was found in the corpus.
2. A line split whose result is passed to a function named with `csv` (`parseCSVRow(lines[0])`,
   up to 2000 characters later), or a line split with `csv` later on the same line
   (`.map(parseCsvRow)`). Corpus: 0 cells. The m49 draft matched any `csv` within 40 lines of a
   line split; that also refused a module with a `md` heading "Export as CSV" or a `"data.csv"`
   download next to an unrelated line split, so it was narrowed at merge. A per-line parser that
   has no `csv` in its name is not gated.

Only a match the write adds counts, so editing `sheet` or `spreadsheet` without adding a split does
not trip trigger 1.

Not verified: no model run has used the page. The runs above predate it, so whether the agent
reads it and switches to a parser, or rewrites its split until the trigger no longer matches, is
unknown.
