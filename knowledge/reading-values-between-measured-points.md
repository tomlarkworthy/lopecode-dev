---
scope: [local-development, in-notebook]
write-triggers:
  - "[<>]=?\\s*[A-Za-z_$][\\w$]*\\[\\s*[A-Za-z_$][\\w$]*\\s*\\+\\s*1\\s*\\]\\s*\\.\\s*[A-Za-z_$]"
---

# Reading a value between measured points: device curves and calibration tables

A pump curve, a fan curve, a battery discharge table or a sensor calibration is a list of measured
points. Between two points, interpolate. Past the last point (or before the first) there is no
data: the value is unknown. Returning the end point's value, or extending the last segment, reports
a measurement nobody made, and every cell downstream computes without an error.

Observed (run 20260929-0620-m57 eval-base, pump sizing from pumps.csv): the lookup returned the last
point's head for any flow past it. The agent then chose a 1.5 kW pump tested only up to 36 m³/h for
a 40 m³/h duty. At 80 m³/h it chose a pump tested only up to 72 m³/h, when a larger pump that was
tested at 80 m³/h met the duty. The summary said it "interpolates each pump curve at the duty flow".

## The lookup

Return `null` outside the measured range:

```js
const _headAt = function headAt(){return(
(pts, q) => {                       // pts sorted by q
  if (q < pts[0].q || q > pts[pts.length - 1].q) return null;
  for (let i = 1; i < pts.length; i++)
    if (q <= pts[i].q) return pts[i - 1].h + (pts[i].h - pts[i - 1].h) * (q - pts[i - 1].q) / (pts[i].q - pts[i - 1].q);
  return pts[0].h;
}
)};
```

Every consumer handles `null`:

- **Selection** ("the smallest pump that meets the duty point"): a candidate with no data at the
  duty point does not qualify. When no candidate qualifies, show that no candidate qualifies. Do not
  fall back to the largest one.
- **Display**: show "no data past <last measured x>" or leave the value blank. Do not show a
  number.
- **Plot**: draw each curve over its measured points only. A curve drawn past its data looks like
  data.

Convert units before the lookup. Convert the table's column to the unit the user works in, or the
user's value to the table's unit, and not both.

If the user asks for extrapolation, label every extrapolated value in the output as extrapolated.

## Checking it

`try_control` the input to just past the smallest candidate's last measured point. The candidate
must drop out, and the output must name the next one or say that none qualifies.

## Precedent and limits

No notebook in the corpus does this lookup. On 2026-09-29, `lopecode/notebooks` and
`lopebooks/notebooks` held no tabulated lookup with out-of-range handling. "extrapolat" occurs in
24 files: a chart-scale comment ("Scales extrapolate happily past their domain") copied into all
24, plus prose in `coded-landmark-tracking`. None of them is a lookup in a table of points. The `headAt` above was written for this page; it is not taken
from existing code.

The write-trigger matches a comparison against the next point's field (`q <= pts[i + 1].q`), the
step of a hand-written piecewise-linear lookup. Measured 2026-09-29 against every `<script>` block
of both repos (248 files, 23377 blocks): 0 matches. A lookup written with `d3.bisector`,
`findIndex` or `.at(-1)` is not gated. Adding `bisector` would gate 16 corpus files, mostly chart
hover code (m57's count, not re-measured).

Evidence for the page is one model run per side (eval `rc5t-pump-sizing`, 0.40 before, 0.80
after), which is an anecdote, not a rate.
