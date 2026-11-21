// bun lite/toolchain/comment-types.test.ts — round trip and runnability over every lite example and fixture
import { Glob } from "bun";
import * as acorn from "acorn";
import { compile, decompile, langOf } from "./comment-types.ts";
import { erase } from "../browser/erase.ts";
import { lowerJsx } from "../jsx/lower.ts";

const root = new URL("../..", import.meta.url).pathname;
const files = [...new Glob("lite/notebook/examples/*.ts*").scanSync(root), ...new Glob("fixtures/*/*/cells.ts*").scanSync(root)];
const toks = (js: string) => [...acorn.tokenizer(js, { ecmaVersion: "latest", sourceType: "module" })].map((t) => t.value ?? t.type.label).join(" ");
let ok = 0, bad = 0;
for (const f of files.sort()) {
  let src = await Bun.file(root + f).text();
  try {
    if (f.endsWith("x")) src = lowerJsx(src);
    const js = compile(src);
    if (langOf(js) !== "ss") throw new Error("compiled text does not open with the lang marker");
    if (langOf(erase(src)) !== null) throw new Error("plain erased JS detected as a language");
    if (decompile(js) !== src) throw new Error("decompile(compile(src)) !== src");
    if (toks(js) !== toks(erase(src))) throw new Error("compiled tokens differ from erase()");
    ok++;
  } catch (e) { bad++; console.log("FAIL", f, String((e as Error).message).slice(0, 120)); }
}
console.log(`${ok} pass, ${bad} fail of ${files.length}`);
// the marker counts only as the first comment
const cases: [string, string | null][] = [
  ['/*{lang:"ss"}*/ (a) => a', "ss"],
  ['(a /*{lang:"ss"}*/) => a', "ss"],
  ['/* note */ /*{lang:"ss"}*/ (a) => a', null],
  ['"/*{lang:\\"ss\\"}*/"', null],
  ["(a) => a", null],
];
for (const [js, want] of cases) if (langOf(js) !== want) { bad++; console.log("FAIL langOf", js, langOf(js)); }
console.log(`langOf: ${cases.length} cases`);
if (bad) process.exit(1);
