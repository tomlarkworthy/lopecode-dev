# spec-lock module sources (experimental, ahead of canonical)

Three robocoop-5 module sources carrying the **spec-lock v2** experiment. They are *not* deployed:
the declared canonical (`lopebooks/notebooks/@tomlarkworthy_robocoop-5.html`, per
`modules/canonical.json`) was never touched, and the modules were only ever booted from the
gitignored eval bundle `tools/robocoop-5/rc5-bundle.html`. They live here so the code survives the
campaign without creating undeclared drift in `modules/`.

| File | Carries |
|------|---------|
| `robocoop-5-engine.js` | write-feedback scorecard on every module write; completion gate blocking `task_complete` while the spec fails; `rc5_specGate` state |
| `robocoop-5-srctools.js` | `/src/@user/spec.js` execution, grounding audit against `/instructions.md`, `SPEC-WAIVER` handling, `/spec-scorecard.json` persistence |
| `robocoop-5-tools.js` | tool-surface and prompt wiring for the above |

Base: the canonical versions as of 2026-08-17 (`lope-sync.ts status` reported "local edits;
canonical unchanged" for all three when they were lifted here).

## Status: mechanisms validated, score unproven, no deployment

Full record in `tools/robocoop-5/eval/polyglot/README.md` § "Spec-lock experiment".

- **v1** A/B (11 slugs × 2 rolls per arm): 10/22 both arms, P = 1.00. The autopsy found three
  mechanism bugs, not a null effect — the scorecard laundered misreads, the spec was dropped at
  attempt 2, and the UNGROUNDED warning caused example deletion rather than correction.
- **v2** (this code) fixed all three, verified in-trajectory: compliance 13/22 → 17/22, mean
  examples 5.7 → 8.0, shrinkage events 1 → 0, completion gate fired 8×, zero waivers.
- **Score: 11/22 spec-lock vs 14/22 control, P = 0.51.** The byte-identical control arm swung
  10/22 → 14/22 between the two experiments, so slate noise (±4/22) exceeds anything this design
  could resolve.

**Retest is pending and cannot reuse these numbers.** Both A/Bs predate the 2026-08-18 polyglot
port fixes (jest code frames, untruncated test output, warm resume), which attack the same
hidden-convention failure spec-lock targets; under the U2 criterion stamps the pre-fix runs are
non-poolable history. A retest must run under the corrected protocol.

Functional check for the mechanisms: `node tools/robocoop-5/spec-lock-check.mjs <bundle.html>`
(no model calls; needs a bundle built with these modules).
