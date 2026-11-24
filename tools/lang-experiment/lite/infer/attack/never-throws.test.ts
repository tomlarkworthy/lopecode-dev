// w1 (2026-11-24, C-1): checkSources reports, never throws: over every standing set's program (run-sets.ts progs, with
// its controls) and every freeze-attack4..11 candidate, a program that parses must give a result. bun test this file
import { test, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../core.ts";
import { parse } from "../../parse.ts";
import { progs, loadProgs } from "./run-sets.ts";

await loadProgs();
const SELF = join(import.meta.dir, "../../../selfhost");
const cands: { name: string; src: string }[] = [];
for (let d = 4; d <= 11; d++) {
  const dir = join(SELF, `freeze-attack${d}`);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".ts")).sort()) {
    if (!readFileSync(join(dir, f), "utf8").includes("export const cands")) continue;
    for (const c of (await import(join(dir, f))).cands) cands.push({ name: `fa${d}/${f}:${c.name}`, src: c.src });
  }
}

test(`checkSources never throws (${progs.length} set programs, ${cands.length} candidates)`, () => {
  const threw: string[] = [];
  for (const p of [...progs.map((p) => ({ name: `${p.set}:${p.name}`, src: p.src })), ...cands]) {
    let parses = true;
    try { parse(p.src, { jsx: true }); } catch { parses = false; }
    if (!parses) continue;
    try { checkSources({ cells: p.src, tsx: true, outside: [], foreign: null } as never); } catch (x) { threw.push(`${p.name}: ${(x as Error).message.slice(0, 120)}`); }
  }
  expect(threw).toEqual([]);
}, 600000);
