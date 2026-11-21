// A typed-tree gap the registry port meets: `declare function nr(x: number);` (no return type) in foreign.d.ts.
// registry.ts reads returnType as undefined and gives the signature void; the typed tree's TSDeclareFunction row has
// returnType non-null, so acornParse makes the node Other and rg-load reports NOT COVERED.
// The declaration is inside a string, so lite/acorn/census.ts does not parse it as code.
// Fix (in lite/acorn): a synthetic.ts input with this declaration, then census.ts and gen.ts.
// bun lite/infer/repro/declare-no-return.ts
import { checkSources } from "../../core.ts";
import { rgLinkMd, linkRg, rgRunCheck } from "../rg-index.ts";
import { linkAcorn } from "../../acorn/index.ts";
const src = { cells: "export const a = (nr) => 1;", foreign: "declare function nr(x: number);" };
const p: any = linkAcorn().parseTree(src.foreign, false);
console.log("typed node:", p.ast.program.body[0].type, p.ast.program.body[0].kind ?? "");
console.log("checkSources:", JSON.stringify(checkSources(src).cells));
console.log("rg gap:", rgRunCheck(rgLinkMd(), linkRg(), src).rgGap);
