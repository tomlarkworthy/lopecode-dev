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
import { VARIANTS, type Program } from "./variants.ts";
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
test("the programs that need the owner (printed)", () => {
  for (const p of OWNER) console.log(`owner ${p.hole} ${p.name}: ${verdict(p.src, p.foreign ?? null)}`);
});
