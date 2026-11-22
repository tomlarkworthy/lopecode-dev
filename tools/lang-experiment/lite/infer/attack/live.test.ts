// cd lite && bun test infer/attack/live.test.ts: the live arm of selfhost/mut-groups-attack. The minimal programs of
// breaks.ts, the attack programs of the families each hole belongs to, and the variants written for each hole
// (variants.ts), checked by the shipped checker (lite/core.ts). Since the S4 change, see below. The programs that need
// the owner (owner.ts) are checked and their verdicts printed, not asserted.
import { test, expect } from "bun:test";
import { checkSources } from "../../core.ts";
import { attacks as breaks } from "../../../selfhost/mut-groups-attack/breaks.ts";
import { attacks as a1 } from "../../../selfhost/mut-groups-attack/a1-prelude-values.ts";
import { attacks as a5 } from "../../../selfhost/mut-groups-attack/a5-prelude2.ts";
import { attacks as a18 } from "../../../selfhost/mut-groups-attack/a18-holders.ts";
import { VARIANTS, RUNTIME_FREEZE } from "./variants.ts";
import { attacks as B_ATTACKS } from "./b-attacks.ts";
import { rewriteSS } from "./strip-calls.ts";
import { observe } from "./observe.ts";
import { OWNER } from "./owner.ts";

// a verdict: ACCEPT, or REJECT with each cell that is not ok and its rules
export const verdict = (src: string, foreign: string | null = null): string => {
  const r = checkSources({ cells: src, tsx: true, outside: [], foreign });
  const bad = r.cells.filter((c) => c.status !== "ok" || c.errors.length);
  if (!bad.length && !r.module.length && r.cells.length) return "ACCEPT";
  return `REJECT ${[...r.module.map((m) => `module[${m.rule}]`), ...bad.map((c) => `${c.name}:${c.status}${c.errors.map((e) => `[${e.rule}]`).join("")}`)].join(" ")}`;
};
// S4 language change (2026-11-22): a value another cell holds is deep-frozen at run time, and most ownership rules are
// gone. Every program (the attack families, the variants, the run-time programs, and the stage B attacks of
// b-attacks.ts) is checked with mut/freeze/borrow(e) rewritten to e (strip-calls.ts); one the checker accepts is run,
// and no value a cell was fulfilled with (a function: what calling it returns) may change unless that cell is in error.
const OWNER_BREAKS = new Set(["B3-same-mut-twice"]);
const FAMILY = new Set(["prelude-as-value", "mut-holder", "known-base-hole", "hidden-intrinsic-state", "group-generic-field"]);
type Run = { name: string; hole: string; src: string; foreign?: string | null; lent?: string[] };
const fromAttack: Run[] = [...breaks, ...a1, ...a5, ...a18]
  .filter((a) => !OWNER_BREAKS.has(a.name) && FAMILY.has(a.family))
  .map((a) => ({ name: `attack:${a.name}`, hole: a.family, src: a.src }));
const ALL: Run[] = [...fromAttack, ...VARIANTS, ...RUNTIME_FREEZE.map((p) => ({ name: p.name, hole: `run-${p.hole}`, src: p.src })), ...B_ATTACKS.map((a) => ({ name: a.name, hole: "B", src: a.src }))];
const stripped = (src: string): string => rewriteSS(src, true, "")?.out ?? src;
const tally = { n: 0, accepted: 0, threw: 0 };
for (const p of ALL)
  test(`${p.hole} ${p.name}: rejected, or accepted with no value changed silently`, async () => {
    const src = stripped(p.src), v = verdict(src, p.foreign ?? null);
    tally.n++;
    if (v !== "ACCEPT" || p.foreign) return;
    tally.accepted++;
    const r = await observe(src, p.lent ?? []);
    if (r.threw) tally.threw++;
    expect(r.silent).toEqual([]);
  });
test("counts (printed)", () => console.log(`live: ${tally.n} programs, ${tally.accepted} accepted and run, ${tally.threw} of them with a cell in error`));
// the stage B rules each reject the program written for them
const MUST: Record<string, string> = { "b4-kept-fn-writes": "mut-capture", "b4-typed-array-captured": "mut-capture", "b4-typed-array-subarray": "mut-capture", "b4-let-reassign-after": "let-capture", "b4-alias-write-after-gen": "mut-capture", "b5-yield-typed-array": "mut-yield", "b5-yield-in-record": "mut-yield", "b6-url-input": "member-write", "b6-map-input": "mutating-method", "b6-url-yield-then-set": "mut-yield", "b6-url-captured-gen": "mut-capture", "b4-fn-returns-captured": "mut-capture", "b4-async-helper-alias-many-awaits": "mut-capture" };
for (const [name, rule] of Object.entries(MUST))
  test(`B ${name} is rejected by [${rule}]`, () => expect(verdict(B_ATTACKS.find((a) => a.name === name)!.src)).toContain(`[${rule}]`));
test("the programs that need the owner (printed)", () => {
  for (const p of OWNER) console.log(`owner ${p.hole} ${p.name}: ${verdict(p.src, p.foreign ?? null)}`);
});
// holes6 (2026-11-22): the break families of selfhost/freeze-attack (b1-b7: aliases and helpers in kept functions, the
// freeze skip, async helpers after return, Error), this round's own (h6-attacks.ts), and holes7's: selfhost/freeze-attack2
// (thenables, a typed-array copy in the cell's own container, searchParams, the dead zone) and h7-attacks.ts; run by run-sets.ts in a child
// process (a late write that throws is an unhandled rejection, which bun:test would count against this test):
// accepted by the checker; running it changes nothing another cell holds, or throws.
test("freeze-attack, h6, freeze-attack2 and h7 families: accepted programs change nothing another cell holds, or throw", () => {
  const r = Bun.spawnSync(["bun", new URL("./run-sets.ts", import.meta.url).pathname, "--sets", "freeze,h6,freeze2,h7"], { stdout: "pipe", stderr: "pipe" });
  const out = r.stdout.toString(), lines = out.split("\n");
  console.log(lines.filter((l) => l.startsWith("-- ")).join("\n"));
  expect(lines.filter((l) => l.startsWith("SILENT "))).toEqual([]);
  expect(out).toMatch(/^-- freeze: 315 programs/m);
  expect(out).toMatch(/^-- freeze2: 309 programs/m);
  expect(out).toMatch(/^-- h7: \d+ programs/m);
}, 300000); // the child run takes about 15 s, over bun's default limit
