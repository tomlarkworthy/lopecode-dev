# Fresh-context review of `lite/soundscript/tutorial.ojs`, 2026-11-24 00:10

Verdict of the reviewer: FIX. Probe inputs: `p1.ts`–`p4.ts` here (`bun selfhost/freeze-attack4/probe.ts <file>`).
Line numbers are of tutorial.ojs at 1191 lines. Status column filled in as each is handled.

1. L17 CONFIRMED. First Try-it's repair: "use `Number(width)`" leaves `area` rejected (`[inject-type] width: string is not assignable to number`); the annotation must become `width: string` too.
2. `09-breakout.tsx` L73-75 (shown at tutorial L236) CONFIRMED. Comment says "bricksView runs once per broken brick, not once per frame"; L132, 279, 328, 687 say the view runs every frame and `mount` reuses nodes.
3. L206 CONFIRMED. "split into cells so that the bricks are not rebuilt … as in section 6": same wrong model.
4. L565 CONFIRMED. "Each test of this module takes `tests_on`": false for `test_shop_total` (L264-269) and `test_half`.
5. L56 CONFIRMED. "the dependency graph shows that this cell can differ": section 2 has no graph (depGraph only at L46, L234).
6. L341 CONFIRMED. "`app` is in four of them": five (examples 04, 05, 06, 07, 09).
7. L316 "refs" used for state handles beside compile's `refs`; L507 lists "borrowed values" though `borrow` was removed (L424, L467).
8. L351 ambiguity: "159 rejected sources (it has 434 on 2026-11-23) … for each of them".
9. L34: "Sections 6 to 9 show what they pay for" omits section 10.
10. L5, L11 PLAUSIBLE: "edit mode", "open its editor" never say where edit mode is switched on.
11. Minor: L142 `areaOf4` reads `areaFn`, not `scale`; L78 the view also rebuilds when `saved` changes; L208 `ticks` also stops when the game is `over`; L514 the row handler's stated cause differs from the checker's message.
12. PLAUSIBLE upkeep: tests/tables read private runtime fields (`_scope`, `_value`, `_variables`, `_promise`, `_definition`, `_inputs`) at L98, 630, 654, 926, 936, 970, 995, 1025, 1030.

Matched the prose under the probe: Try-it edits at L17 (first two steps), 58, 70, 84, 128, 242; the section 2 box; almost every sample and rule name in the reference (L365-514); the counts in `test_examples_check_as_expected`.
Not reviewed: the rendered page; measured numbers at L23, 318, 521-533.
