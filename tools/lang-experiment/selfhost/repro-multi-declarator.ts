// S1.8: one const statement may declare several cells. The checker accepts both; compileCell gives one
// variable, for A, a rejected stub holding the whole statement; B has no variable.
import { compileCell, contextFromCheck, splitCells } from "../lite/toolchain/ss-toolchain.ts";
import { checkSources } from "../lite/core.ts";
const src = "const A = (): number => 1, B = (A: number) => A + 1;";
const r = checkSources({ cells: src, tsx: true });
console.log("check:", r.cells.map((c) => `${c.name}:${c.status}`).join(","));
const ctx = contextFromCheck(r);
for (const t of splitCells(src, true)) console.log("compile:", JSON.stringify(compileCell(t, true, ctx).map((v) => [v.name, /ss\.(cell|rejected)/.exec(v.definition)?.[1]])));
