// complete.ts behaviour the cp cells reproduced until 2026-11-22; bugs 1 to 3 are fixed since the cells read the cursor's
// position on a Lezer tree (cp-lezer.ts). bun lite/infer/repro/cp-complete-bugs.ts prints both sides.
// 1. scan reads `//`, `/*`, `"` and `'` as a comment or string even inside a template literal's text, so after
//    `http://` or `don't` in a template the cursor counts as quoted and nothing is offered inside a later `${…}`.
// 2. paramListAt counts the `>` of `=>` as a closing bracket, so after a parameter whose default is an arrow function
//    the position is not read as the parameter list (typeAt does skip `=>`).
// 3. HEAD's block comment is lazy and can backtrack past a later `*/`, so text between two comments before the
//    head is taken as part of one comment and the position is still read as the parameter list.
// 4. Not a difference seen: membersOf reads `m.args[0]` of a Mut or Borrowed, which is undefined with no type argument;
//    the cells read `args[0] ?? m`. For `m: Mut` both give member [] (the type reaching membersOf is not a Mut with no
//    argument); no input was found where the two differ.
import * as live from "../frozen/ts/complete.ts";
import * as cp from "../../complete.ts";
const MODULE = ["const count = () => 1;"];
const cases: [string, string][] = [
  ["1 template with //", "const f = (x: { readonly a: number }) => `http://h/${x.‸}`;"],
  ["1 template with '", "const f = (x: { readonly a: number }) => `don't ${x.‸}`;"],
  ["1 control: no // in the template", "const f = (x: { readonly a: number }) => `h/${x.‸}`;"],
  ["2 arrow default", "const f = (cb = () => 1, co‸"],
  ["2 control: no arrow default", "const f = (cb = 1, co‸"],
  ["3 text between comments", "/* a */ x /* b */ const f = (co‸"],
  ["4 Mut with no type argument", "const f = (m: Mut) => m.‸"],
];
for (const [what, t] of cases) {
  const off = t.indexOf("‸"), cells = [...MODULE, t.split("‸").join("")];
  const run = (f: typeof live.completionsAt) => { try { const r = f(cells, 1, off, true); return `${r.mode} ${JSON.stringify(r.options.map((o) => o.label))}`; } catch (e) { return `threw ${(e as Error).message}`; } };
  console.log(`${what}\n  complete.ts ${run(live.completionsAt)}\n  cp          ${run(cp.completionsAt)}`);
}
