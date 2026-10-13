# What Cloudflare bills the account, read with `usage.account`

Task 3 of `plan/cloud-brain-cloudflare-usage-read.md` (issue `cu-3-figures-and-the-price`). Read on 2026-10-13 between
05:10 and 05:13 UTC from cb4 with the token `loop-usage`, by the writer of that issue. Two answers are kept whole beside
this file, in `tools/cloud-brain/cloudflare-usage/`, and every table here is printed from one of them by

```
bun tools/cloud-brain/cloudflare-usage.ts tools/cloud-brain/cloudflare-usage/2026-08-19_2026-09-19.json
bun tools/cloud-brain/cloudflare-usage.ts tools/cloud-brain/cloudflare-usage/current-2026-10-13.json
```

Every `cost` in both is 0: the account's use of each product was inside what Cloudflare includes. The figures are
the whole account's (`endpointservices`), which has Workers that are not this Brain's. Which rows are the Brain's was
not counted, and the answer has no field to count it by: a row is a product and a day.

## One whole billing period: 2026-08-19 to 2026-09-19

The anchor is `2024-04-19T00:00:00Z`, so a period runs from a 19th to the next. This is the last one that had ended.
It has no row of Workers AI, Browser Rendering, Containers or Vectorize: in the period under way the first rows of
those are of 2026-10-07 to 2026-10-10 (the next table).

```
brain.ts curl "/xrpc/com.lopecode.brain.usage.account?from=2026-08-19&to=2026-09-19" --as loop-usage
```

Answered 200 at 05:10:52 UTC, `"cloudflare":{"status":200,"info":200,"ms":1113,"cached":false}`, 117,747 bytes,
SHA-256 `56d5e70e…` (the kept file). The tool's first line:

```
from 2026-08-19 to 2026-09-19 anchor 2024-04-19T00:00:00Z currency USD total 0 rows 475 products 18 first 2026-08-19T00:00:00Z newest 2026-09-19T00:00:00Z rows with a cost 0
```

475 rows, 18 products, `total` 0. The sums over the 31 days, a row a product:

| family | service | unit | days | quantity | pricingQuantity | cost | first day | last row ends |
|---|---|---|---|---|---|---|---|---|
| D1 | D1 - Rows Read (first 25 billion included) | Count | 31 | 93887 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| D1 | D1 - Rows Written (first 50 million included) | Count | 30 | 42119 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| D1 | D1 - Storage GB-mo (first 5GB included) | GB-months | 31 | 0.000369459 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| Durable Objects | Durable Objects Compute Duration (GB*S, First 400,000 GB*S is included) | GB-seconds | 27 | 38257.8 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| Durable Objects | Durable Objects Compute Requests (First 1M is included) | Count | 27 | 160128 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| Durable Objects | Durable Objects SQL Storage (First 5 GB-month included) | GB-months | 31 | 0.0010597 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| Durable Objects | Durable Objects Storage (First 1 GB-month included) | GB-months | 31 | 0.000122824 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| Durable Objects | Durable Objects Storage Reads (First 1M is included) | Count | 16 | 33 | 0 | 0 | 2026-08-19 | 2026-09-17 |
| Durable Objects | Durable Objects Storage Rows Read (First 25B included) | Count | 22 | 573872 | 0 | 0 | 2026-08-21 | 2026-09-19 |
| Durable Objects | Durable Objects Storage Rows Written (First 50M included) | Count | 23 | 884503 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| Durable Objects | Durable Objects Storage Writes (First 1M is included) | Count | 16 | 33 | 0 | 0 | 2026-08-19 | 2026-09-17 |
| Queues | Queues - Standard operations (First 1M included) | Count | 31 | 4226 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| R2 | R2 Data Storage (First 10GB-Month included) | GB-months | 31 | 0.160243 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| R2 | R2 Storage Class A Operations (First 1M included) | Count | 31 | 31490 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| R2 | R2 Storage Class B Operations (First 10M included) | Count | 31 | 146154 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| Workers | Worker Build Minutes (6000 minutes included per month) | Count | 4 | 10 | 0 | 0 | 2026-08-30 | 2026-09-09 |
| Workers | Workers CPU ms (first 30M are included) | Count | 31 | 2073620 | 0 | 0 | 2026-08-19 | 2026-09-19 |
| Workers | Workers Standard Requests (first 10M are included) | Count | 31 | 320772 | 0 | 0 | 2026-08-19 | 2026-09-19 |

`days` is the number of rows: a product has no row for a day with no use. `quantity` is the use itself, also inside an
included amount. Four rows as they were answered, for a reviewer to compare with a call of the same range:

```
{"service":"R2 Storage Class A Operations (First 1M included)","family":"R2","unit":"","quantity":1541,"pricingUnit":"Count","pricingQuantity":0,"cost":0,"cumulatedCost":0,"start":"2026-08-19T00:00:00Z","end":"2026-08-20T00:00:00Z"}
{"service":"R2 Storage Class A Operations (First 1M included)","family":"R2","unit":"","quantity":1100,"pricingUnit":"Count","pricingQuantity":0,"cost":0,"cumulatedCost":0,"start":"2026-09-01T00:00:00Z","end":"2026-09-02T00:00:00Z"}
{"service":"R2 Storage Class A Operations (First 1M included)","family":"R2","unit":"","quantity":442,"pricingUnit":"Count","pricingQuantity":0,"cost":0,"cumulatedCost":0,"start":"2026-09-18T00:00:00Z","end":"2026-09-19T00:00:00Z"}
{"service":"R2 Data Storage (First 10GB-Month included)","family":"R2","unit":"GB-months","quantity":0.005326898566666667,"pricingUnit":"GB-months","pricingQuantity":0,"cost":0,"cumulatedCost":0,"start":"2026-09-18T00:00:00Z","end":"2026-09-19T00:00:00Z"}
```

## The period under way, as it stood on 2026-10-13 05:10 UTC

`usage.account` with no dates, read between 05:10:29 and 05:10:40 UTC: 200,
`"cloudflare":{"status":200,"info":200,"ms":1501,"cached":false}`, 97,667 bytes, SHA-256 `79e2ecd7…`. Not a whole
period: 24 of its days. It is here because it is the only one with the products the Brain sells.

```
from null to null anchor 2024-04-19T00:00:00Z currency USD total 0 rows 389 products 27 first 2026-09-19T00:00:00Z newest 2026-10-13T00:00:00Z rows with a cost 0
```

389 rows, 27 products, `total` 0.

| family | service | unit | days | quantity | pricingQuantity | cost | first day | last row ends |
|---|---|---|---|---|---|---|---|---|
| Browser Rendering | Browser Run - Average Concurrent Browsers (First 10 browsers included) | per day | 6 | 0.333333 | 0 | 0 | 2026-10-07 | 2026-10-13 |
| Browser Rendering | Browser Run - Browser Hours (First 10 hours included) | Hours | 6 | 6.80556 | 6 | 0 | 2026-10-07 | 2026-10-13 |
| Containers | Container Disk, per GB second (First 200 GB hours included) | Count | 2 | 1238 | 1238 | 0 | 2026-10-09 | 2026-10-11 |
| Containers | Container Egress, North America + Europe, per GB (First 1 TB included) | Gigabytes | 2 | 0.000245896 | 0 | 0 | 2026-10-09 | 2026-10-11 |
| Containers | Container Memory, per GiB-Second (First 25 GiB-hours included) | Count | 2 | 153 | 153 | 0 | 2026-10-09 | 2026-10-11 |
| Containers | Container vCPU (First 375 vCPU-minutes included) | vCPU-seconds | 2 | 17.89 | 18 | 0 | 2026-10-09 | 2026-10-11 |
| D1 | D1 - Rows Read (first 25 billion included) | Count | 24 | 24452259 | 0 | 0 | 2026-09-19 | 2026-10-13 |
| D1 | D1 - Rows Written (first 50 million included) | Count | 21 | 355656 | 0 | 0 | 2026-09-19 | 2026-10-13 |
| D1 | D1 - Storage GB-mo (first 5GB included) | GB-months | 24 | 0.00184999 | 0 | 0 | 2026-09-19 | 2026-10-13 |
| Durable Objects | Durable Objects Compute Duration (GB*S, First 400,000 GB*S is included) | GB-seconds | 23 | 78194.9 | 0 | 0 | 2026-09-19 | 2026-10-12 |
| Durable Objects | Durable Objects Compute Requests (First 1M is included) | Count | 23 | 936477 | 0 | 0 | 2026-09-19 | 2026-10-12 |
| Durable Objects | Durable Objects SQL Storage (First 5 GB-month included) | GB-months | 23 | 0.00229627 | 0 | 0 | 2026-09-19 | 2026-10-12 |
| Durable Objects | Durable Objects Storage (First 1 GB-month included) | GB-months | 23 | 0.0000932157 | 0 | 0 | 2026-09-19 | 2026-10-12 |
| Durable Objects | Durable Objects Storage Reads (First 1M is included) | Count | 7 | 17 | 0 | 0 | 2026-09-19 | 2026-10-07 |
| Durable Objects | Durable Objects Storage Rows Read (First 25B included) | Count | 23 | 2598961 | 0 | 0 | 2026-09-19 | 2026-10-12 |
| Durable Objects | Durable Objects Storage Rows Written (First 50M included) | Count | 23 | 1994940 | 0 | 0 | 2026-09-19 | 2026-10-12 |
| Durable Objects | Durable Objects Storage Writes (First 1M is included) | Count | 7 | 17 | 0 | 0 | 2026-09-19 | 2026-10-07 |
| Queues | Queues - Standard operations (First 1M included) | Count | 24 | 3236 | 0 | 0 | 2026-09-19 | 2026-10-13 |
| R2 | R2 Data Storage (First 10GB-Month included) | GB-months | 23 | 0.311613 | 0 | 0 | 2026-09-19 | 2026-10-12 |
| R2 | R2 Storage Class A Operations (First 1M included) | Count | 24 | 31240 | 0 | 0 | 2026-09-19 | 2026-10-13 |
| R2 | R2 Storage Class B Operations (First 10M included) | Count | 23 | 99376 | 0 | 0 | 2026-09-19 | 2026-10-12 |
| Vectorize | Vectorize - Queried Dimensions (First 50 million included) | Count | 2 | 792576 | 0 | 0 | 2026-10-10 | 2026-10-12 |
| Vectorize | Vectorize - Stored Dimensions (First 10 million dimension-month included) | Dimension-months | 2 | 24545.1 | 0 | 0 | 2026-10-10 | 2026-10-12 |
| Workers | Dynamic Workers (First 1,000 are included) | Count | 1 | 1 | 1 | 0 | 2026-10-04 | 2026-10-05 |
| Workers | Workers CPU ms (first 30M are included) | Count | 23 | 6380423 | 0 | 0 | 2026-09-19 | 2026-10-12 |
| Workers | Workers Standard Requests (first 10M are included) | Count | 23 | 641332 | 0 | 0 | 2026-09-19 | 2026-10-12 |
| Workers AI | Regular Twitch Neurons (RTN) | Count | 3 | 15748 | 0 | 0 | 2026-10-09 | 2026-10-12 |

No row has the family Artifacts, or a service that names it, in either answer. `pricingQuantity` is other than 0 in
10 rows of this answer and in none of the whole period's: Browser Run hours (6, beside a `quantity` of 6.80556),
three of the four Container products, and Dynamic Workers. Each of those has `cost` 0. What it counts was not worked out.

## How late the newest row is

The newest row of the answer of 05:10 UTC on 2026-10-13 ends `2026-10-13T00:00:00Z`: the day 2026-10-12, which had
ended 5 h 10 min before the read. 7 of the 27 products had a row for that day (the two of Browser Rendering, the
three of D1, Queues, R2 Class A). For 13 the newest row was the day 2026-10-11, which had ended 29 h 10 min before.
The other 7 had their last use earlier. So a day's row was between 5 and 29 hours behind in this one read, by
product. Whether the 13 get a row for 2026-10-12 later was not read again.

## The Brain's own price beside Cloudflare's product

The Brain's rate is from the seed at this commit. Cloudflare's side is the period under way, above. What the Brain
charged its callers over those days was not read: no token of the loop names `quota.list`.

| Cloudflare's product | used, 2026-09-19 to 2026-10-13 | billed | the Brain's method | the Brain's price |
|---|---|---|---|---|
| Workers AI, Regular Twitch Neurons | 15748 neurons in 3 days | $0 | `ai.run` | `usd` of the call, $0.01 at least (`brain-ai.ojs`, `aiDefaults.flatUsd`); the service counts a neuron at $0.000011 (`usdPerNeuron`), by which 15748 are $0.173 |
| Browser Rendering, Browser Hours | 6.80556 hours in 6 days | $0 | `browser.extend` | $0.000025 a second, $0.09 an hour (`brain-browser.ojs`, `browserLimits.dollarsPerSecond`), by which 6.80556 hours are $0.61 |
| Containers: vCPU, memory, disk, egress | 17.89 vCPU-seconds, 153 GiB-seconds, 1238 GB-seconds of disk, in 2 days | $0 | `container.extend` | $0.000002 a second of the image `node` (`brain-container.ojs`, `containerImageList`) |
| Artifacts | no row | | `git.create` | $0.001 a call (`brain-git.ojs`, `gitDefaults.usd`) |
| R2: storage, Class A | 0.311613 GB-months, 31240 operations | $0 | `static.put`, `blob.upload` | none today; the next section |

The two dollar figures in the last column are the Brain's rate times the account's use, which is not what the Brain
took: the use is every Worker's of the account and not all of it was bought through these methods.

## The price of a stored write

The rule is the spec's, "A price on a stored write": the cost of the R2 storage and Class A rows of one whole
billing period, divided by the Class A operations of that period, rounded up to a whole millionth of a dollar; and
when that cost is 0, "12 months of a 1 MB file at list price with one operation, $0.00018". From the period
2026-08-19 to 2026-09-19, the tool's last line:

```
stored write: cost 0 / 31490 Class A operations = 0; price "0.00018" (the bill gave nothing to divide)
```

```
R2 Data Storage                  0.160243 GB-months   cost $0
R2 Storage Class A Operations    31490                cost $0
                                 $0 / 31490 = $0      nothing to divide
```

So the price is the spec's other number, and task 4 writes it in the two seeds as

```
price: "0.00018"
```

which is 180 of the core's smallest unit. The arithmetic behind that number, at the list prices the spec quotes
($0.015 a GB-month, $4.50 a million Class A operations), is 12 x $0.015 / 1024 = $0.00017578 for the megabyte and
$0.0000045 for the operation, $0.00018028 together. Rounded up to a whole millionth that is $0.000181; the spec
states $0.00018 and that is what is taken, since the rounding in its rule is of the quotient.

For scale, not by the rule: with the included amounts ignored, that period at list price is 0.160243 x $0.015 +
31490 x $0.0000045 = $0.1441, which is $0.0000046 an operation. The price taken is 39 times that.

The same rule on the period under way gives the same: `stored write: cost 0 / 31240 Class A operations = 0; price "0.00018" (the bill gave nothing to divide)`.

## What a range answers

Each read on 2026-10-13 with `loop-usage`, 200 every time:

```
no dates                          05:10:29  389 rows, 2026-09-19 to the row that ends 2026-10-13
from=2026-08-19&to=2026-09-18     05:10:40  460 rows, the last ends 2026-09-18: `to` is the end of the last row, so this is a day short
from=2026-08-19&to=2026-09-19     05:10:52  475 rows, the whole period
from=2026-09-01&to=2026-09-10     05:12:12  0 rows, "currency":null, "total":0: a range with no 19th in it is answered empty, with no error
from=2026-07-19&to=2026-08-19     05:12:12  441 rows: the period before is still answered
```

The times are of `date -u` before each call; the last two were one command, with one time.

## Not tried

- A period with a cost. No row of the three periods read has one, so the dividing side of the rule ran on rows made
  for the test only (`tests/tools/cu-3-cloudflare-usage.test.ts`).
- A range over two periods, a range that starts on a day other than a 19th and holds one, and how far back a range goes.
- A second read of the period under way, to see whether a day's rows change after they first appear.
- Which rows are this Brain's. The dashboard of Cloudflare was not opened to compare.
