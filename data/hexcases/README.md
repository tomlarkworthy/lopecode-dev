# hexRig capture archive

Real camera captures of the printed §11.3 seven-mark calibration target,
collected through §11.5's rig in `@tomlarkworthy/coded-landmark-tracking`.

Two files per case:

- `<name>.gray` — raw 8-bit luma, `w*h` bytes, row-major. **These are the exact
  bytes the detector was handed**, not a re-encoding of them. No image codec is
  involved in either direction, which is the point: a JPEG round trip moves
  measured centres by up to 10px, and these cases exist to *be* the ground truth.
- `<name>.json` — the labels frozen at capture (`truth`), the settings that
  produced them (`cfg`), and the capture-time verdict (`capture`).

Written by `scratch/rmbt/case-receiver.ts` (a local receiver on :8787) from the
notebook's `hexRigAutosave` cell, which ships each case the moment it is kept.
Replay and grade them offline with `scratch/rmbt/replay-cases.ts`.

Why this exists: `hexRigCases` is an `Inputs.input([])`, so it holds pixels at
runtime and exports as empty. Captures used to live only in the tab, and the set
rotated silently as new positions evicted old frames. Collecting these costs
someone standing in front of a camera holding a printed sheet at arm's length.
