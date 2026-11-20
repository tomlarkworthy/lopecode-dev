// Single small cells tested alone. Run: bun test selfhost/sched-cells/cells.test.ts
import { test, expect } from "bun:test";
import { link } from "../../lite/link.ts";
import { mut, freeze } from "../../lite/runtime-ss.ts";
import * as rtCells from "../../lite/runtime.ss.ts";
import * as cells from "./step.ss.ts";
const S = link({ ...rtCells, ...cells }, { mut, freeze });

test("sweepVerdict: a value is released only in the generation after the one that marked it", () => {
  expect(S.sweepVerdict(true, false, 1, 5)).toBe("spare");
  expect(S.sweepVerdict(false, true, undefined, 5)).toBe("release");
  expect(S.sweepVerdict(false, false, undefined, 5)).toBe("mark");
  expect(S.sweepVerdict(false, false, 5, 5)).toBe("keep");
  expect(S.sweepVerdict(false, false, 4, 5)).toBe("release");
});
test("nextListener skips a listener detached mid-value and one no longer attached", () => {
  const h = { ...S.blank("k", "e"), listeners: [1, 3], rest: [2, 1, 3] };
  const ls = new Map([[1, { hid: 9, key: "a", cell: "a", aid: 0, parked: false }], [3, { hid: 9, key: "c", cell: "c", aid: 0, parked: false }]]);
  expect(S.nextListener(h, ls)).toEqual({ lid: 1, rest: [3] });
  expect(S.nextListener({ ...h, listeners: [3] }, ls)).toEqual({ lid: 3, rest: [] });
  expect(S.nextListener({ ...h, listeners: [] }, ls)).toEqual({ lid: null, rest: [] });
});
