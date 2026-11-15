// bun lite/soundscript/raw-cells.test.ts [notebook.html]
// The pure cells of @tomlarkworthy/raw-cells (raw_parse, raw_compile, raw_decompile), loaded from the
// built notebook's module block into a headless runtime (tools/notebook-import.ts), with acorn injected.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import { blockContent } from "../../../lib/notebook-blocks.ts";
import { importNotebookModule } from "../../../notebook-import.ts";
import { readFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(process.argv[2] ?? join(HERE, "../../../../lopebooks/notebooks/soundscript.html")), "utf8");
const src = blockContent(html, "@tomlarkworthy/raw-cells");
if (!src) throw new Error("no @tomlarkworthy/raw-cells block");
mkdirSync(join(HERE, ".scratch"), { recursive: true });
const path = join(HERE, ".scratch/raw-cells.module.js");
writeFileSync(path, src.replace(/^  main\.builtin\("FileAttachment".*$/m, ""));
const m = await importNotebookModule(path, { overrides: { acorn } });
const [compile, decompile, parse, mark] = await Promise.all(["raw_compile", "raw_decompile", "raw_parse", "raw_mark"].map((n) => m.value(n)));
let pass = 0, fail = 0;
const t = (ok: boolean, what: string) => { console.log(`${ok ? "pass" : "FAIL"} ${what}`); ok ? pass++ : fail++; };
const realize = (text: string) => new Function(`return (${text});`)();

const exact = [
  'define("area", ["width", "height"], function (width, height) { return width * height; })',
  "define(null, [], () => 1)",
  'define("x", ["a"], async (a) => {\n  // a comment kept\n  return await a;\n})',
  'define("g", [], function* () { yield 1; yield 2; })',
  'define("h", ["viewof k", "mutable m"], async function* named(k, m) { /* c */ yield k; })',
  'define("t", [], x => x)',
  'define("u", [], async x => x)',
  'define("w", ["a", "b"], (a, b) => a + b)',
];
for (const s of exact) {
  const d = compile(s);
  const fn = realize(d.definition);
  const at = String(fn).indexOf(mark);
  t(!d.error && at > 0 && !/^\s*\/\*/.test(String(fn)) && decompile(d.name, d.inputs, fn) === s, `round trip ${JSON.stringify(s.slice(0, 50))}`);
}
// outside the function the form is fixed
const loose = "  define( 'area' , [ 'width','height' ] ,(w, h) => w * h ) ;";
const dl = compile(loose);
t(decompile(dl.name, dl.inputs, realize(dl.definition)) === 'define("area", ["width", "height"], (w, h) => w * h)', `outside the function the text is normalised: ${JSON.stringify(decompile(dl.name, dl.inputs, realize(dl.definition)))}`);
// a broken cell: the text is kept, the definition throws, the label is kept when it can be read
for (const [s, name, fallback] of [
  ['define("bad", ["a"], (a) => { return a + ; })', "bad", null],
  ["define(", "kept", "kept"],
  ['define("two", [], () => 1); x = 2', "two", null],
  ['define("n", [1], () => 1)', "n", null],
  ['define("f", [], 42)', "f", null],
  ['area = 3', null, null],
] as const) {
  const d = compile(s, fallback);
  const fn = realize(d.definition);
  let threw: any = null;
  try { fn(); } catch (e) { threw = e; }
  t(!!d.error && d.name === name && threw instanceof SyntaxError && decompile(d.name, d.inputs, fn) === s, `broken ${JSON.stringify(s)}: ${d.error} (name ${d.name})`);
}
const st = compile('define("s", [], () => "</script>")');
t(!!st.error && !/<\/script/i.test(st.definition) && decompile(st.name, st.inputs, realize(st.definition)) === 'define("s", [], () => "</script>")', `a closing script tag is stored escaped, as an error: ${st.error}`);
const p = parse('define("a", ["x", "y"], (x) => x)');
t(p.params === 1 && p.inputs.length === 2, "parse counts parameters and inputs");
t(parse('define("a", [], (...r) => r)').params === null, "a rest parameter takes any number of inputs");
m.dispose();
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
