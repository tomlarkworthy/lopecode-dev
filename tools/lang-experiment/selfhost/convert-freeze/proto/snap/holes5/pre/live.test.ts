// cd lite && bun test infer/attack/live.test.ts: the live arm of selfhost/mut-groups-attack. The minimal programs of
// breaks.ts, the attack programs of the families each hole belongs to, and the variants written for each hole
// (variants.ts), checked by the shipped checker (lite/core.ts); every one must be rejected. The programs that need
// the owner (owner.ts) are checked and their verdicts printed, not asserted.
import { test, expect } from "bun:test";
import { checkSources } from "../../core.ts";
import { attacks as breaks } from "../../../selfhost/mut-groups-attack/breaks.ts";
import { attacks as a1 } from "../../../selfhost/mut-groups-attack/a1-prelude-values.ts";
import { attacks as a5 } from "../../../selfhost/mut-groups-attack/a5-prelude2.ts";
import { attacks as a18 } from "../../../selfhost/mut-groups-attack/a18-holders.ts";
import { VARIANTS, RUNTIME_FREEZE, type Program } from "./variants.ts";
import { runAttack } from "../../../selfhost/mut-groups-attack2/harness.ts";
import { OWNER } from "./owner.ts";

// a verdict: ACCEPT, or REJECT with each cell that is not ok and its rules
export const verdict = (src: string, foreign: string | null = null): string => {
  const r = checkSources({ cells: src, tsx: true, outside: [], foreign });
  const bad = r.cells.filter((c) => c.status !== "ok" || c.errors.length);
  if (!bad.length && !r.module.length && r.cells.length) return "ACCEPT";
  return `REJECT ${[...r.module.map((m) => `module[${m.rule}]`), ...bad.map((c) => `${c.name}:${c.status}${c.errors.map((e) => `[${e.rule}]`).join("")}`)].join(" ")}`;
};
// B3 (f(m, m)) needs the owner; FAMILY: the families of the holes closed so far (group-generic-field: B4, holes2 step C)
const OWNER_BREAKS = new Set(["B3-same-mut-twice"]);
const FAMILY = new Set(["prelude-as-value", "mut-holder", "known-base-hole", "hidden-intrinsic-state", "group-generic-field"]);
const fromAttack: Program[] = [...breaks, ...a1, ...a5, ...a18]
  .filter((a) => !OWNER_BREAKS.has(a.name) && FAMILY.has(a.family))
  .map((a) => ({ name: `attack:${a.name}`, hole: a.family, src: a.src }));

for (const p of [...fromAttack, ...VARIANTS])
  test(`${p.hole} ${p.name} is rejected`, () => {
    const v = verdict(p.src, p.foreign ?? null);
    expect(v.startsWith("REJECT") ? "REJECT" : v).toBe("REJECT");
    if (p.rule) expect(v).toContain(`[${p.rule}]`);
  });
// holes3 step 1: freeze is real at run time. Each C1-C3 program is accepted by the checker and, run in the Runtime
// (selfhost/mut-groups-attack2/harness.ts runAttack), throws at the write; no cell's value changes after it was seen
for (const fam of ["C1", "C2", "C3"])
  test(`run time, family ${fam}: accepted, and each run throws at the write with no value changed`, async () => {
    const ps = RUNTIME_FREEZE.filter((p) => p.hole === fam);
    expect(ps.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const p of ps) {
      const r = await runAttack({ name: p.name, src: p.src, show: p.show });
      // runCells cannot run a state cell (selfhost/mut-groups-attack2/RESULTS.md); such a program is checked only
      if (r.out.some((l) => l.includes("evaluating 'p.name'"))) { console.log(`run time ${fam}: not run (state cell): ${p.name}: ${r.verdict}`); if (r.verdict !== "ACCEPT") bad.push(p.name); continue; }
      const threw = r.out.some((l) => /^error \S+: /.test(l));
      if (r.verdict !== "ACCEPT" || r.broke || threw === !!p.caught) bad.push(`${p.name}: ${r.verdict.slice(0, 60)} ${r.out.join(" ; ").slice(0, 160)}`);
    }
    expect(bad).toEqual([]);
  });
test("run time, D: every accepted program changes no value; those that throw are counted (printed)", async () => {
  let acc = 0, threw = 0;
  const changed: string[] = [];
  for (const p of RUNTIME_FREEZE.filter((p) => p.hole === "D")) {
    const r = await runAttack({ name: p.name, src: p.src, show: p.show });
    if (r.verdict !== "ACCEPT") continue;
    acc++;
    if (r.out.some((l) => /^error \S+: /.test(l))) threw++;
    else console.log(`D accepted, did not throw: ${p.name}: ${r.out.join(" ; ")}`);
    if (r.broke) changed.push(p.name);
  }
  console.log(`D: ${acc} accepted by the checker, ${threw} of them throw at run time`);
  expect(changed).toEqual([]);
});
test("the programs that need the owner (printed)", () => {
  for (const p of OWNER) console.log(`owner ${p.hole} ${p.name}: ${verdict(p.src, p.foreign ?? null)}`);
});
