// Does the cell dep-list alone reveal DOM access, or is acorn genuinely needed?
// Uses the REAL toolchain compile() via notebook-import (no copied logic).
import { importNotebookModule } from "./notebook-import.ts";

const jsPath = process.argv[2] ?? "/private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/1fa66ae3-78ea-4728-9e21-2bcb480549a1/scratchpad/tc.js";
const m = await importNotebookModule(jsPath, {});
const compile: any = await m.value("compile");

const cases: [string, string][] = [
  ["plain pure", `a = 1 + 2`],
  ["dep on another cell", `b = a * 2`],
  ["window member access", `c = { const u = window.URL.createObjectURL(new window.Blob(["x"])); return u; }`],
  ["bare document", `d = document.createElement("div")`],
  ["bare self", `e = self.location.href`],
  ["bare globalThis", `f = globalThis.crypto.randomUUID()`],
  ["builtin md", `g = md\`hello\``],
  ["builtin html", `h = html\`<b>x</b>\``],
  ["builtin DOM", `i = DOM.canvas(10,10)`],
  ["builtin width", `j = width * 2`],
  ["builtin Inputs", `k = Inputs.range([0,1])`],
  ["builtin FileAttachment", `l = FileAttachment("x.json").json()`],
  ["new Worker (bare)", `n = new Worker("u")`],
  ["navigator", `o = navigator.hardwareConcurrency`],
  ["setTimeout", `p = setTimeout(()=>{},1)`],
  ["local shadow of window", `q = { const window = 1; return window; }`],
  ["pure fn cell", `r = (x) => x*2`],
  ["fn touching document, no free ref", `s = () => { const el = document.body; return el; }`],
];

console.log("cell".padEnd(34) + "deps derived by compile()");
console.log("-".repeat(90));
const results: Record<string, string[]> = {};
for (const [label, src] of cases) {
  try {
    const out = compile(src);
    const vars = Array.isArray(out) ? out : [out];
    const deps = vars.flatMap((v: any) => v._inputs ?? []);
    results[label] = deps;
    console.log(label.padEnd(34) + JSON.stringify(deps));
  } catch (e: any) {
    console.log(label.padEnd(34) + "COMPILE ERROR: " + e.message);
  }
}

console.log("\n--- verdict ---");
const domGlobals = ["window member access", "bare document", "bare self", "bare globalThis", "navigator", "setTimeout", "new Worker (bare)"];
for (const k of domGlobals) {
  const d = results[k] ?? [];
  console.log(`${k.padEnd(34)} ${d.length ? "VISIBLE in deps -> " + JSON.stringify(d) : "INVISIBLE in deps -> needs AST"}`);
}
console.log(`${"fn touching document, no free ref".padEnd(34)} ${(results["fn touching document, no free ref"] ?? []).length ? "VISIBLE" : "INVISIBLE"}  (deferred DOM use inside a returned fn)`);
process.exit(0);
