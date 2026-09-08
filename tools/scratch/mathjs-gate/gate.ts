// Run @tomlarkworthy/glpk-canonicalization's own assertion corpus against a given mathjs build.
// Usage: bun tools/scratch/mathjs-gate/gate.ts <mathjs-esm-url> [modulePath]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const mathUrl = process.argv[2] ?? "https://cdn.jsdelivr.net/npm/mathjs@9.4.4/+esm";
const modPath = process.argv[3] ?? "modules/@tomlarkworthy/glpk-canonicalization.js";
const src = readFileSync(modPath, "utf8");

const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto("https://cdn.jsdelivr.net/npm/mathjs/package.json");   // an origin that can import from jsdelivr
p.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 200)));

const out = await p.evaluate(async ([src, mathUrl]) => {
  const { Runtime } = await import("https://cdn.jsdelivr.net/npm/@observablehq/runtime@6/+esm");
  let math: any;
  if (mathUrl.startsWith("umd:")) {          // the vendored UMD bundle, loaded the way the cell will
    const src2 = await (await fetch(mathUrl.slice(4))).text();
    (globalThis as any).define = Object.assign(function () {}, { amd: true });
    const mod: any = { exports: {} };
    new Function("module", "exports", src2)(mod, mod.exports);
    math = mod.exports;
  } else {
    math = await import(/* @vite-ignore */ mathUrl);
  }
  const define = (await import(URL.createObjectURL(new Blob([src], { type: "text/javascript" })))).default;

  const eq = (a: any, b: any): boolean => {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || !a || !b) return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => k in b && eq(a[k], b[k]));
  };
  const expect = (actual: any) => ({
    toBe: (v: any) => { if (!Object.is(actual, v)) throw new Error(`expected ${JSON.stringify(v)}, got ${JSON.stringify(actual)}`); },
    toEqual: (v: any) => { if (!eq(actual, v)) throw new Error(`expected ${JSON.stringify(v)}, got ${JSON.stringify(actual)}`); }
  });
  const recorded: { name: string; fn: () => any }[] = [];
  const suiteStub = { test: (name: string, fn: any) => { recorded.push({ name, fn }); return name; } };

  const cellErrors: string[] = [];
  const observer = (name: string) => ({
    pending() {}, fulfilled() {},
    rejected(err: any) { cellErrors.push(`${name ?? "(anon)"}: ${err?.message ?? err}`); }
  });

  const lodash: any = (await import("https://cdn.jsdelivr.net/npm/lodash/+esm")).default;
  const noop = () => (...a: any[]) => "";
  const runtime = new Runtime({
    md: noop, tex: noop, html: noop,
    Generators: () => ({ input: () => (async function* () {})() })
  });
  const main = runtime.module(define, observer);
  const set = (name: string, value: unknown) => { try { main.redefine(name, [], () => value); } catch { /* cell gone */ } };
  set("math", math);
  set("tests", suiteStub);
  set("expect", expect);
  set("DEBUG", false);
  set("_", lodash);
  set("useConstantsToRHSFn", true);

  await new Promise((r) => setTimeout(r, 4000));

  const results: { name: string; err: string | null }[] = [];
  for (const t of recorded) {
    try { await t.fn(); results.push({ name: t.name, err: null }); }
    catch (e: any) { results.push({ name: t.name, err: String(e?.message ?? e).slice(0, 160) }); }
  }
  return { mathVersion: math.version, registered: recorded.length, results, cellErrors: cellErrors.slice(0, 15) };
}, [src, mathUrl] as const);

const fails = out.results.filter((r) => r.err);
console.log(`mathjs ${out.mathVersion} — ${out.registered} assertions registered, ${out.results.length - fails.length} pass, ${fails.length} fail`);
for (const f of fails) console.log("  FAIL", f.name, "\n        ", f.err);
if (out.cellErrors.length) { console.log("cell errors:"); for (const e of out.cellErrors) console.log("  ", e); }
await b.close();
