# cu-3-figures-and-the-price: one whole billing period read, and the price of a stored write

Issue `cu-3-figures-and-the-price`, task 3 of `plan/cloud-brain-cloudflare-usage-read.md` (approved by the owner,
event 3378). Written 2026-10-13 by the writer of the change (token `impl-40ca56`). No seed changed and nothing was
deployed.

## What changed

- `tools/cloud-brain/cloudflare-usage.md`, new: the period 2026-08-19 to 2026-09-19 by product, the period under way
  as it stood at 05:10 UTC on 2026-10-13, how late the newest row was, the Brain's price beside four of Cloudflare's
  products, the price of a stored write with its division, and what five ranges answered.
- `tools/cloud-brain/cloudflare-usage/2026-08-19_2026-09-19.json` and `current-2026-10-13.json`, new: the two answers
  of `usage.account` as cb4 sent them, 117,747 and 97,667 bytes (`wc -c`).
- `tools/cloud-brain/cloudflare-usage.ts`, new: prints the head, a row a product and the price from a kept answer.
  It calls nothing. `products`, `line`, `num` and `storedWritePrice` are exported for the test.
- `knowledge/calling-a-cloud-brain-from-this-checkout.md`: a section of one line, "What Cloudflare bills the
  account", and a phrase in the frontmatter's `topics`.
- `plan/cloud-brain-cloudflare-usage-read.md`: one "(As built …)" note under task 3.
- `tests/tools/cu-3-cloudflare-usage.test.ts`, new.

## What was read

Five calls of `usage.account` with `loop-usage`, each 200, between 05:10:29 and 05:12:12 UTC (`date -u` before each):

```
no dates                          389 rows   27 products   total 0
from=2026-08-19&to=2026-09-18     460 rows   the last ends 2026-09-18
from=2026-08-19&to=2026-09-19     475 rows   18 products   total 0   the whole period
from=2026-09-01&to=2026-09-10     0 rows     "currency":null
from=2026-07-19&to=2026-08-19     441 rows
```

The first and the third are the two kept files. The second, fourth and fifth were not kept: their counts are of the
answers as they were read then.

## The price

`bun tools/cloud-brain/cloudflare-usage.ts tools/cloud-brain/cloudflare-usage/2026-08-19_2026-09-19.json`, last line:

```
stored write: cost 0 / 31490 Class A operations = 0; price "0.00018" (the bill gave nothing to divide)
```

So task 4's text is `price: "0.00018"`: the spec's number for a bill with nothing to divide.

**One choice of mine.** The spec gives that number as "12 months of a 1 MB file at list price with one operation,
$0.00018". Worked out at its list prices it is $0.00018028, which rounded up to a whole millionth is $0.000181. I
took $0.00018 as the spec states it: its "rounded up to a whole millionth" is said of the quotient, and the owner
approved the text with that number in it. The other reading differs by one millionth of a dollar a write.

## Two differences from the spec

- **The whole answer is kept as a file and not quoted in the doc.** The spec's row R4: the doc "quotes one whole
  answer with its time". The answer is 475 rows and 117,747 bytes. The doc has its tables, printed from the file by
  the tool, and four rows as answered for the reviewer's comparison; the test holds each table row to the file.
- **The Brain's prices are beside the products of the period under way.** The whole period has no row of Workers
  AI, Browser Rendering or Containers. No row of either answer is of Artifacts, so `git.create` stands beside "no row".

## Tests

`cd $W && bun test --timeout=30000 ./tests/tools/cu-3-cloudflare-usage.test.ts`, 2026-10-13 07:17 CEST: `8 pass`,
`0 fail`, `Ran 8 tests across 1 file`.

Before the doc and the line of the knowledge page were written, with the tool and the two files in place: `5 pass`,
`3 fail` (the three tests that read the doc).

Four runs with one line of the tool changed and then taken back, 07:17 CEST:

```
the price is rounded, not rounded up             7 of 8   a bill with a cost is divided …
the storage rows are left out of the cost        6 of 8   a bill with a cost is divided …; with no operations, or no rows …
"0.0002" where nothing is divided                7 of 8   the price of a stored write is the rule's …
a product's quantity is its last row's           7 of 8   the doc has a row for each product …
```

The whole suite, `tests/tools/suite.sh`, run after the rebase and the last edit of a file it reads, ended 07:23:33
CEST: `1090 pass`, `0 fail`, `Ran 1090 tests across 111 files`, and no line `skipped:`. A run before the rebase, ended
07:19:33, had 1096 in 111 files: the rebase brought in changes to three test files.

## Not tried

- A period with a cost: none of the three periods read has one. The dividing side of `storedWritePrice` ran on rows
  made in the test.
- A range over two periods, a range that holds a 19th and starts on another day (the spec's own example,
  `from=2026-09-05&to=2026-10-04`), and how far back a range goes.
- A second read of the period under way, so whether a day's rows change after they first appear is not known.
- What the Brain charged its callers over the same days: no token of the loop names `quota.list`.
- Which rows are this Brain's and which another Worker's of the account.
- The tool on rows of another shape: it checks that `rows` is a list and nothing more. Run by hand at 07:21 CEST:
  with no file and with `{"error":"Forbidden"}` it is exit 2 with one line; with `"rows":[]` it prints the head, no
  product and `price "0.00018" (the bill gave nothing to divide)`, exit 0, so the price it prints for a range that
  answered no rows is not a reading of a bill.
- No row in the table "Measured records" of `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`: the
  task names one line, in the calling page.
- `/review-notebook` was not run on the doc: the loop's reviewer is its fresh read.
