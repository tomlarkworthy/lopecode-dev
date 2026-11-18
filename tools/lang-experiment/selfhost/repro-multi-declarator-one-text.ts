// one cell text holding two declarators (what an editor cell can hold): what does it compile to?
import { compileCell, contextFromCheck } from "../lite/toolchain/ss-toolchain.ts";
import { checkCells } from "../lite/stdlib/runtime.ts";
const text = "const A = (): number => 1, B = (A: number) => A + 1;";
const r = checkCells([text], true).result;
console.log("check:", r.cells.map((c: any) => `${c.name}:${c.status}`).join(","));
for (const v of compileCell(text, true, contextFromCheck(r))) console.log(v.name, v.definition.slice(0, 400));
