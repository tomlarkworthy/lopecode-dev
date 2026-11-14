# suminagashi: original variable → port

Source: `modules/@tomlarkworthy/suminagashi.js` (2317 lines, 85 variables: 83 `$def` + 2 `main.define`).
Ported 2026-11-14. The tier of each checked cell is the one `bun check.ts ports/suminagashi --json`
reports. `status` says what was done with the row:

- **run**: a checked cell; `bun run.ts` computed it in both orders, and `differential.ts` compared it
  with the original where it has logic.
- **run, writes not exercised**: a ref cell written only by a widget; computed with its initial
  value, but `Inputs` is not loaded headless, so no write to it ran.
- **run, writes exercised**: a ref cell written by actions; `drive-actions.ts` called every action
  that writes it, both orders, and checked the committed values (GAPS §8).
- **shell, not run**: ported into `shell.ts` and type-checked; never executed (it needs `DOM`,
  `width`, `Inputs`, `html` or a WebGL2 context, all absent under Bun).
- **classified-only**: tier assigned by reading, not ported. No row has this status.

| original variable | tier | status | port cell(s) | note |
|---|---|---|---|---|
| `_1` (md title) | prose | shell, not run | shell `_1` | extracted verbatim; raw text compared in `differential.ts` |
| `canvas` | shell | shell, not run | shell `canvas` | `DOM.canvas`, `devicePixelRatio`, `width`; pointer events call the `pointerDown/Move/Up` actions; reads `live.turn`, `live.finished`, `tool_view.value`, `reset_view` button |
| `nextFluid` | shell | shell, not run | shell `nextFluid` | `html`; takes `turn` and `finished` as values, as the original does |
| `viewof tool` | shell | shell, not run | shell `tool_view` | `Inputs.radio`; `tool.set` in an action |
| `tool` | ref | run, writes not exercised | `tool` | no cell consumes the value: `canvas` reads the widget's `.value`, as the original reads `$2.value` |
| `viewof reset` | shell | shell, not run | shell `reset_view` | `Inputs.button`; `reset.set` in an action |
| `reset` | ref | run, writes not exercised | `reset` | `tray` takes the value, so a click rebuilds the tray |
| `viewof view` | shell | shell, not run | shell `view_view` | `Inputs.radio` |
| `view` | ref | run, writes not exercised | `view` | |
| `download` | shell | shell, not run | shell `download` | `canvas.toBlob`, `Date`, `URL.createObjectURL`, `setTimeout` |
| `viewof params` | shell | shell, not run | shell `params_view` | `Inputs.form` of 19 inputs, `html` template |
| `params` | ref | run, writes not exercised | `params` | `ref(defaults)`: a ref with a dependency; the form's 19 keys are the 19 keys of `defaults` |
| `viewof height` | shell | shell, not run | shell `height_view` | `Inputs.range`; initial 570 written twice (ref and widget), GAPS §6 |
| `height` | ref | run, writes not exercised | `height` | |
| `viewof cellSize` | shell | shell, not run | shell `cellSize_view` | `Inputs.range` |
| `cellSize` | ref | run, writes not exercised | `cellSize` | |
| `viewof backgroundFilm` | shell | shell, not run | shell `backgroundFilm_view` | `Inputs.range` |
| `backgroundFilm` | ref | run, writes not exercised | `backgroundFilm` | |
| `_m_intro` | prose | shell, not run | shell `_m_intro` | |
| `_m_position` | prose | shell, not run | shell `_m_position` | |
| `_m_marangoni` | prose | shell, not run | shell `_m_marangoni` | |
| `divergenceShader` | default | run | `divergenceShader` | GLSL string, extracted verbatim, compared |
| `reduceShader` | default | run | `reduceShader` | as above |
| `_m_solve` | prose | shell, not run | shell `_m_solve` | |
| `shiftShader` | default | run | `shiftShader` | |
| `pressureShader` | default | run | `pressureShader` | |
| `restrictShader` | default | run | `restrictShader` | |
| `prolongShader` | default | run | `prolongShader` | |
| `projectShader` | default | run | `projectShader` | |
| `_m_swirl` | prose | shell, not run | shell `_m_swirl` | |
| `velocityShader` | default | run | `velocityShader` | |
| `confinementShader` | default | run | `confinementShader` | |
| `_m_transport` | prose | shell, not run | shell `_m_transport` | |
| `transportShader` | default | run | `transportShader` | |
| `_m_transport_evidence` | prose | shell, not run | shell `_m_transport_evidence` | |
| `_m_brush` | prose | shell, not run | shell `_m_brush` | |
| `brushShader` | default | run | `brushShader` | |
| `fluids` | default | run | `fluids` | typed `readonly Fluid[]` |
| `sequence` | default | run | `sequence` | unchanged |
| `_m_display` | prose | shell, not run | shell `_m_display` | |
| `displayShader` | default | run | `displayShader` | |
| `absorbance` | mut-local | run | `absorbance` | `Mut<Float32Array>`; `forEach` callback became a `for` loop (a Mut may not be captured) |
| `_m_lines` | prose | shell, not run | shell `_m_lines` | |
| `createContours` | mut-local | run | `createContours` | the original returns an object mutated in place; the port returns an immutable value whose `birth/advect/resample/unpack` return the next value. Every new buffer is a Mut local. Spare-buffer reuse dropped. GAPS §1, §2 |
| `_m_lines_gpu` | prose | shell, not run | shell `_m_lines_gpu` | |
| `contourAdvectShader` | default | run | `contourAdvectShader` | |
| `contourVertexShader` | default | run | `contourVertexShader` | |
| `contourFragmentShader` | default | run | `contourFragmentShader` | |
| `contourPainter` | shell | shell, not run | shell `contourPainter` | WebGL buffers, VAOs, transform feedback, stencil fill. Re-keyed by `contours.lineage` and curve index (was: contours object and curve object); `respace` returns the next contours value. Behavioural rewrite that nothing executed |
| `_m_lines_evidence` | prose | shell, not run | shell `_m_lines_evidence` | |
| `_m_limits` | prose | shell, not run | shell `_m_limits` | |
| `_m_settings` | prose | shell, not run | shell `_m_settings` | |
| `defaults` | default | run | `defaults` | |
| `_m_plumbing` | prose | shell, not run | shell `_m_plumbing` | |
| `initial turn` | ref | run, writes exercised | `turn` | the `ref(0)` initial value |
| `mutable turn` | ref | run, writes exercised | `turn`; actions `pointerDown`, `resetPicture` | writes: `turn + 1` on pointerdown (`canvas`), `0` in `tray` |
| `turn` | ref | run, writes exercised | `turn` | consumers: `nextFluid`, mirror `live_turn` |
| `initial finished` | ref | run, writes exercised | `finished` | `ref<Finished>(false)` |
| `mutable finished` | ref | run, writes exercised | `finished`; actions `finishPicture`, `resetPicture` | writes: `{at, why}` in `mainLoop`, `false` in `tray`. Both writers run during an evaluation; GAPS §4 |
| `finished` | ref | run, writes exercised | `finished` | consumers: `nextFluid`, mirror `live_finished` |
| `initial pointer` | ref | run, writes exercised | `pointer` | `ref<Pointer>(undefined)` |
| `mutable pointer` | ref | run, writes exercised | `pointer`; actions `pointerDown`, `pointerMove`, `pointerUp` | move and release are `update` (read-modify-write of the one ref) |
| `pointer` | ref | run, writes exercised | `pointer` | the original has no value consumer; the port's mirror `live_pointer` is one |
| `ctx` | shell | shell, not run | shell `ctx` | `canvas.getContext("webgl2")`, float render-target probe |
| `gl` | shell | shell, not run | shell `gl` | the WebGL2 context |
| `vertexShader` | default | run | `vertexShader` | |
| `programs` | shell | shell, not run | shell `programs` | shader compile/link, uniform upload |
| `createTray` | shell | shell, not run | shell `createTray` | textures, framebuffers, multigrid solve, `readPixels`. Its `read` interleave loop is CPU code left in the shell (GAPS §10) |
| `tray` | shell | shell, not run | shell `tray` | builds a GPU tray; calls `resetPicture` in a microtask (the original writes two mutables during its evaluation) |
| `mainLoop` | shell | shell, not run | shell `mainLoop` | the per-frame generator (`performance.now`, GPU solve, paint). Holds the current contours in a `let` and writes it back to `tray.contours`; reads `live.pointer`/`live.finished`; `finishPicture` in a microtask. Behavioural rewrite that nothing executed |
| `_m_tests` | prose | shell, not run | shell `_m_tests` | |
| `viewof runTests` | shell | shell, not run | shell `runTests_view` | `Inputs.toggle`, initial `true` here (original `false`) |
| `runTests` | ref | run, writes not exercised | `runTests` | initial value changed from `false` to `true` to match the baseline's override; GAPS §7 |
| `ringExperiment` | shell | shell, not run | shell `ringExperiment` | drives a private GPU tray; its summary loop over the read-back film is CPU code left in the shell (GAPS §10) |
| `test_film_is_conserved` | shell | shell, not run | shell `test_film_is_conserved` | body unchanged; needs `ctx` and `ringExperiment` (GPU) |
| `test_ink_becomes_a_ring` | shell | shell, not run | shell `test_ink_becomes_a_ring` | body unchanged; `ringExperiment` (GPU) |
| `test_fluids_stay_apart` | shell | shell, not run | shell `test_fluids_stay_apart` | body unchanged; `ringExperiment` (GPU) |
| `test_film_settles_flat` | shell | shell, not run | shell `test_film_settles_flat` | body unchanged; `ringExperiment` (GPU) |
| `test_water_settles_on_an_odd_tray` | shell | shell, not run | shell `test_water_settles_on_an_odd_tray` | body unchanged; `createTray` (GPU) |
| `test_pressure_stays_centred` | shell | shell, not run | shell `test_pressure_stays_centred` | body unchanged; `ringExperiment` (GPU) |
| `test_lines_keep_their_area` | mut-local | run | `test_lines_keep_their_area` | assertions unchanged; the velocity field is built in a `Mut` and frozen; `contours.advect(…)` became `contours = contours.advect(…)` |
| `test_gpu_and_cpu_carry_lines_alike` | shell | shell, not run | shell `test_gpu_and_cpu_carry_lines_alike` | assertions unchanged; contours calls reassign; needs `createTray`, `contourPainter` (GPU) |
| `_1u110bc` (displays `footer`) | prose | shell, not run | shell `_43` | page footer from an import; no logic |
| `module @tomlarkworthy/footer` | import | shell, not run | none | module variable |
| `footer` | import | shell, not run | foreign `footer` (effect) | not supplied, as in the baseline |

Counts over the 85 rows: default 19, mut-local 3, ref 17, shell 26, prose 18, import 2. By status:
run 22 (19 default + 3 mut-local), run with writes exercised 9 (`turn`, `finished`, `pointer`
triples), run with writes not exercised 8 (widget refs), shell not run 46
(26 shell + 18 prose + 2 import), classified-only 0.

The 17 ref rows are 11 ref cells: each `viewof x`/`x` pair gives one ref cell (8), and each
`initial x`/`mutable x`/`x` triple gives one (3). `check` counts cells, not rows: default 24, mut-local
3, ref 11. Its default 24 is the 19 default rows plus the 5 port-only action cells below.

## Cells that exist only in the port

| port cell | file | tier (check) | status | why |
|---|---|---|---|---|
| `pointerDown` | cells.ts | default | run; called by `drive-actions.ts` | `mutable turn` and `mutable pointer` writes in canvas pointerdown |
| `pointerMove` | cells.ts | default | run; called by `drive-actions.ts` | `mutable pointer` write in pointermove; `update`, so it needs no read |
| `pointerUp` | cells.ts | default | run; called by `drive-actions.ts` | `mutable pointer` write in pointerup/pointercancel |
| `resetPicture` | cells.ts | default | run; called by `drive-actions.ts` | the two writes `tray` makes |
| `finishPicture` | cells.ts | default | run; called by `drive-actions.ts` | the write `mainLoop` makes |
| `live` | shell.ts | shell | run (fulfilled headless) | the box the handlers and the loop read current values from; GAPS §3 |
| `live_turn`, `live_pointer`, `live_finished` | shell.ts | shell | run (fulfilled headless) | copy each committed ref value into `live` |
