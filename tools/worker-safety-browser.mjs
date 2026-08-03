// Run the REAL deployed @tomlarkworthy/observablejs-toolchain compile() in a browser
// to see exactly which free identifiers become cell dependencies.
import { chromium } from "playwright";

const nb = process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_belief-geometry.html";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("PAGEERR", e.message));
await p.goto("file://" + process.cwd() + "/" + nb);
await p.waitForFunction(() => !!window.__ojs_runtime && !!window.importShim, null, { timeout: 60000 });

const out = await p.evaluate(async () => {
  const def = (await window.importShim("@tomlarkworthy/observablejs-toolchain")).default;
  const mod = window.__ojs_runtime.module(def);
  const compile = await mod.value("compile");

  const cases = [
    ["plain literal", "a = 1 + 2"],
    ["dep on another cell", "b = a * 2"],
    ["window.URL member", 'c = { const u = window.URL.createObjectURL(new window.Blob(["x"])); return u; }'],
    ["bare document", 'd = document.createElement("div")'],
    ["bare self", "e = self.location.href"],
    ["bare globalThis", "f = globalThis.crypto.randomUUID()"],
    ["builtin md", "g = md`hello`"],
    ["builtin html", "h = html`<b>x</b>`"],
    ["builtin DOM", "i = DOM.canvas(10,10)"],
    ["builtin width", "j = width * 2"],
    ["builtin Inputs", "k = Inputs.range([0,1])"],
    ["builtin FileAttachment", 'l = FileAttachment("x.json").json()'],
    ["bare new Worker", 'n = new Worker("u")'],
    ["navigator", "o = navigator.hardwareConcurrency"],
    ["setTimeout", "p2 = setTimeout(()=>{},1)"],
    ["Math/JSON only", "q = Math.max(1, JSON.parse('2'))"],
    ["local shadow of window", "r = { const window = 1; return window; }"],
    ["pure arrow cell", "s = (x) => x*2"],
    ["arrow that uses document (deferred)", "t = () => document.body"],
    ["arrow closing over outer cell", "u = () => a + 1"],
  ];

  const rows = [];
  for (const [label, src] of cases) {
    try {
      const vars = compile(src);
      const list = Array.isArray(vars) ? vars : [vars];
      const deps = [...new Set(list.flatMap((v) => v._inputs ?? []))];
      rows.push([label, JSON.stringify(deps)]);
    } catch (e) {
      rows.push([label, "ERROR: " + e.message]);
    }
  }
  return rows;
});

console.log("cell source".padEnd(38) + "deps derived by the real compile()");
console.log("-".repeat(96));
for (const [k, v] of out) console.log(k.padEnd(38) + v);
await b.close();
