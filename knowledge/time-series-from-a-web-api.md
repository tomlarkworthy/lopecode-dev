---
scope: [local-development, in-notebook]
write-triggers:
  - "^(?=[\\s\\S]*\\b(fetch|d3\\.(json|csv|tsv|text))\\()(?=[\\s\\S]*[\"'`]https?://)(?=[\\s\\S]*(new Date\\(|Date\\.parse|[tT]imeParse|isoParse|utcParse))"
---

# Time windows and time zones in data fetched from a web API

A cell that fetches timestamped rows (a forecast, prices, sensor readings, metrics) and charts them
has two ways to be wrong while every cell computes without error: the window is not the one asked
for, or every point sits at the wrong instant. Neither shows up as an error, and both are hidden
when the page happens to run at midnight or in the API's own time zone.

## "Next N hours" and "last N days" start at now

A relative window is rolling: "the next 48 hours" at 15:30 runs from 15:30 today to 15:30 in two
days. API parameters counted in calendar days start at 00:00 of the current day, so they include
the hours already past.

Measured on Open-Meteo, 2026-09-28 (`api.open-meteo.com/v1/forecast?...&hourly=temperature_2m`):

| parameter | first row | rows |
|---|---|---|
| `forecast_days=2` | 00:00 today | 48, of which the hours before now are in the past |
| `forecast_days=3` | 00:00 today | 72 |
| `forecast_hours=48` | the current hour | 48 |

In three runs of the robocoop-5 agent on "the next 48 hours" (2026-09-28, mimo-v2.5-pro) it used
`forecast_days=3` once and `forecast_days=2` twice; at 15:30 all three charts began at 00:00, one
with its own "now" marker drawn a third of the way along the axis.

Either request an hour-based range, or compute the window from the clock and filter **both** ends.
The house form, from `@tomlarkworthy/cw-share-auth` (aws-dashboard.html), sends absolute instants:

```js
const end = new Date(), start = new Date(end - 3 * 3600 * 1000);
```

and the filter for data that arrives in whole days:

```js
rows.filter(r => r.time >= start && r.time <= end)
```

## A timestamp without an offset is read as the viewer's local time

`new Date("2026-09-28T13:00")` is 13:00 in the browser's time zone, whatever zone the API meant.
Open-Meteo returns such strings in the zone named by its `timezone` parameter, `GMT` when it is
absent, so omitting `timezone` and parsing with `new Date(t)` moves every point by the viewer's
UTC offset (two hours in Berlin in summer).

Ask for a form that carries its own instant, and convert once, in the cell that builds the rows:

- epoch seconds: Open-Meteo `timeformat=unixtime`, then `new Date(t * 1000)`
- an ISO string with `Z` or `+02:00`: `new Date(t)` is then exact

`@tomlarkworthy/cw-metrics.cwDashboard` (aws-dashboard.html) normalises both shapes the same way:

```js
const toDate = (t) => {
  if (t instanceof Date) return t;
  const n = Number(t);
  return new Date(Number.isFinite(n) && n < 1e12 ? n * 1000 : (Number.isFinite(n) ? n : t));
};
```

## The axis shows the viewer's zone

Plot draws a time axis in the browser's local zone; `x: {type: "utc"}` draws it in UTC. A reader
asking about a place in another zone needs to know which one they are looking at: label the axis
(`x: {label: "Time (your local time)"}`) or format ticks in the place's zone with
`tickFormat: d => d.toLocaleString("en-GB", {timeZone: "Europe/Berlin", hour: "2-digit", day: "numeric"})`.

## Check it before finishing

Inspect the rows cell and compare its first and last `time` with the current time shown in the
environment block: for "next 48 hours" the first is within the current hour and the last about 47
hours later.
