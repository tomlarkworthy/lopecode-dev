---
scope: [local-development, in-notebook]
write-triggers:
  - "toISOString\\(\\)\\s*\\.\\s*(slice|substring|substr)\\(\\s*0\\s*,\\s*10\\s*\\)"
  - "toISOString\\(\\)\\s*\\.\\s*split\\(\\s*[\"'`]T[\"'`]\\s*\\)\\s*\\[\\s*0\\s*\\]"
---

# Calendar days in the user's time zone: today, the last N days, streaks

A habit tracker, a diary, a daily log or a "last 14 days" grid keys its data by the user's
calendar day. `new Date().toISOString().slice(0, 10)` is not that day: `toISOString()` is UTC.
East of Greenwich it names the previous day from local midnight until the offset has passed (00:00
to 02:00 in Berlin in summer); west of it, the next day from the evening on (after 20:00 in New
York). Every cell computes, and the result is wrong only at those hours.

Observed (run 20260928-0240-w36, habit tracker, clock at 00:20 Berlin): both modules the agent
wrote keyed days with `toISOString().slice(0, 10)`. One stepped back from
`new Date(today + "T00:00:00")`, the local midnight, which is 22:00 of the previous day in UTC, so
every key was one day early. The grid ran 2026-09-14 to 2026-09-27, today had no cell, and the
exported CSV carried the same wrong dates.

## The local day key

From `@tomlarkworthy/robocoop-5-core` (the environment block's timestamp, lopebooks
`@tomlarkworthy_robocoop-5.html`):

```js
const pad = (n) => String(n).padStart(2, '0');
const stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
```

`getFullYear`, `getMonth` and `getDate` read the browser's zone, which is the user's.

## Stepping and parsing days

- N days back: `new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)`. The
  constructor takes local fields and carries across month ends. Subtracting `i * 86400000` is off
  by an hour across a daylight-saving change, and near midnight that is a different day.
- A key back to a date: `const [y, m, d] = key.split("-").map(Number); new Date(y, m - 1, d)`.
  `new Date("2026-09-28")` (date only) is parsed as UTC midnight, not local midnight, and
  `new Date("2026-09-28T00:00")` is local.
- A streak counts back from today while the key is marked. Decide what an unmarked today means
  and say it in the notebook: the streak is 0, or it still counts from yesterday.

## Check it

The environment block gives the user's local time. The last day of the window must be the date
shown there, including in the first hours after midnight: inspect the cell that lists the days,
and the date in the CSV or export if there is one.
