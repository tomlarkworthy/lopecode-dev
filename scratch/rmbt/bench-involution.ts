// JS findInvolution vs the Zig port, on the 42984 calls the 16 bank frames
// actually make. Two questions, in this order: does it agree, and is it faster.
//
// Run inside the notebook's own page, in Chromium. Benchmarking the JS arm in
// bun would measure JavaScriptCore while the notebook ships on V8, and the
// whole point of the comparison is what a browser does with this code.
//
// The wasm arm pays for the marshalling too -- xs and ss are copied into linear
// memory on every call, because that is what a real integration would do.
//
//   bun scratch/rmbt/bench-involution.ts [--reps 6]
import { chromium } from "playwright";
import { resolve } from "node:path";

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const NB = resolve(arg("nb", "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html"));
const REPS = +arg("reps", "6");
const WASM = arg("wasm", "scratch/rmbt/involution.wasm");
const cases = await Bun.file("scratch/rmbt/involution-cases.json").json();
const wasmB64 = Buffer.from(await Bun.file(WASM).arrayBuffer()).toString("base64");
console.log(`wasm: ${WASM} (${(await Bun.file(WASM).arrayBuffer()).byteLength} bytes)`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 300)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async ({ calls, b64, reps }) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const findInvolution = await mod.value("findInvolution");

  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const m = await WebAssembly.compile(bin);
  // Stub whatever the module asks for rather than naming a toolchain's imports:
  // Zig wants wasi_snapshot_preview1.proc_exit, AssemblyScript wants env.abort,
  // and a hardcoded list makes the arms non-comparable for no reason. Every
  // stub throws, so a kernel that actually reaches for the host says so.
  const wanted = WebAssembly.Module.imports(m);
  const imports: any = {};
  for (const im of wanted) {
    imports[im.module] ??= {};
    imports[im.module][im.name] = im.kind === "function"
      ? (...a: any[]) => { throw new Error(`host call: ${im.module}.${im.name}(${a.join(",")})`); }
      : im.kind === "memory" ? new WebAssembly.Memory({ initial: 4 })
      : im.kind === "global" ? 0 : new WebAssembly.Table({ initial: 0, element: "anyfunc" });
  }
  const inst = await WebAssembly.instantiate(m, imports);
  const ex = inst.exports as any;
  if (typeof ex.run !== "function" || !ex.memory || typeof ex.xsPtr !== "function")
    return { err: "module lacks run/memory/xsPtr; exports: " + Object.keys(ex).join(", "),
      imports: wanted.map((i) => `${i.module}.${i.name}`).join(", ") };
  const XS = new Float64Array(ex.memory.buffer, ex.xsPtr(), 64);
  const SS = new Int32Array(ex.memory.buffer, ex.ssPtr(), 64);
  const U = new Float64Array(ex.memory.buffer, ex.uPtr(), 64);

  // Rebuild the JS arm's input in the shape the cell expects. This is the
  // recorded input, not a re-derivation of it.
  const inputs = calls.map((c: any) => c.xs.map((x: number, k: number) => ({ x, s: c.ss[k] })));

  const runJs = (k: number) => findInvolution(inputs[k], { tolPx: calls[k].tolPx, minInliers: calls[k].minInliers });
  const runWasm = (k: number) => {
    const c = calls[k];
    const n = c.xs.length;
    if (n > 64) return -1;
    for (let i = 0; i < n; i++) { XS[i] = c.xs[i]; SS[i] = c.ss[i]; }
    return ex.run(n, c.tolPx, c.minInliers);
  };

  // agreement first -- a faster wrong answer is not interesting
  const bad: any[] = [];
  let nNull = 0, nReal = 0;
  const close = (a: number, b: number) => {
    if (a === b) return true;
    if (!isFinite(a) || !isFinite(b)) return false;
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  };
  for (let k = 0; k < calls.length; k++) {
    const js = runJs(k);
    const wi = runWasm(k);
    if (!js) {
      nNull++;
      if (wi !== -1) bad.push({ k, why: "js null, wasm " + wi });
      continue;
    }
    nReal++;
    if (wi === -1) { bad.push({ k, why: "js ok (inl " + js.inl + "), wasm null" }); continue; }
    if (wi !== js.inl) { bad.push({ k, why: `inl ${js.inl} vs ${wi}` }); continue; }
    if (!close(ex.getP(), js.P)) { bad.push({ k, why: `P ${js.P} vs ${ex.getP()}` }); continue; }
    const q = ex.getQ();
    if (!(js.Q === Infinity ? q === Infinity : close(q, js.Q))) { bad.push({ k, why: `Q ${js.Q} vs ${q}` }); continue; }
    if (ex.getNUp() !== js.up.length) { bad.push({ k, why: `nUp ${js.up.length} vs ${ex.getNUp()}` }); continue; }
    for (let t = 0; t < js.up.length; t++)
      if (!close(U[t], js.up[t].u)) { bad.push({ k, why: `u[${t}] ${js.up[t].u} vs ${U[t]}` }); break; }
    if (bad.length > 40) break;
  }

  // then speed, interleaved and warmed
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < calls.length; k++) { runJs(k); runWasm(k); }

  const tj: number[] = [], tw: number[] = [];
  for (let r = 0; r < reps; r++) {
    let t = performance.now();
    for (let k = 0; k < calls.length; k++) runJs(k);
    tj.push(performance.now() - t);
    t = performance.now();
    for (let k = 0; k < calls.length; k++) runWasm(k);
    tw.push(performance.now() - t);
  }
  const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  return { n: calls.length, nNull, nReal, bad: bad.slice(0, 12), nBad: bad.length,
    js: med(tj), wasm: med(tw), jsAll: tj.map((x) => +x.toFixed(0)), wasmAll: tw.map((x) => +x.toFixed(0)) };
}, { calls: cases.calls, b64: wasmB64, reps: REPS });

await browser.close();

if ((out as any).err) {
  console.error((out as any).err);
  console.error("imports: " + (out as any).imports);
  process.exit(1);
}
console.log(`${out.n} recorded calls (${out.nReal} returned an involution, ${out.nNull} null)\n`);
if (out.nBad) {
  console.log(`DISAGREEMENTS: ${out.nBad}${out.nBad > 40 ? "+" : ""}`);
  for (const b of out.bad) console.log(`  case ${b.k}: ${b.why}`);
  console.log();
} else {
  console.log("agreement: identical on every call — P, Q, inliers, and every u to 1e-9\n");
}
console.log(`js    ${out.js.toFixed(0).padStart(6)}ms   ${out.jsAll.join(" ")}`);
console.log(`wasm  ${out.wasm.toFixed(0).padStart(6)}ms   ${out.wasmAll.join(" ")}`);
console.log(`\nspeedup ${(out.js / out.wasm).toFixed(2)}x  (marshalling included)`);
console.log(`per call: ${((out.js / out.n) * 1000).toFixed(2)}us js -> ${((out.wasm / out.n) * 1000).toFixed(2)}us wasm`);
