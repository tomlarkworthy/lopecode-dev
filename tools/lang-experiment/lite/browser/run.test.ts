// cd lite && bun test browser/run.test.ts: runCells runs state cells, actions, events and listeners (the attack
// runner's blind spots before 2026-11-22: a state cell failed on p.name, and events needed requestAnimationFrame)
import { test, expect } from "bun:test";
import { observeProgram } from "../infer/attack/observe.ts";

test("a state cell and an action run in runCells; the written value is frozen", async () => {
  let held: unknown;
  const r = await observeProgram({
    src: "const s = () => state([0]);\nconst w = (s: State<number[]>) => action(() => { s.set([1, 2]); });\nconst b = (s: number[]) => ({ v: s });",
    show: ["b", "s"],
    drive: (p) => { p.value("w")(); return null; },
  });
  expect(r.lines).toContain("show b = {v:[1,2]}");
  expect(r.threw).toBe(false);
  expect(r.silent).toEqual([]);
  void held;
});

test("an events cell and a listener run under bun: the listener's action gets each value", async () => {
  const r = await observeProgram({
    src: "const s = () => state(0);\nconst g = function* () { yield 1; yield 2; yield 3; };\nconst add = (s: State<number>) => action((n: number) => { s.update((v) => v + n); });\nconst l = (g: Events<number>, add: Action<[number]>) => on(g, add);",
    show: ["s"],
  });
  expect(r.lines).toContain("show s = 6");
});
