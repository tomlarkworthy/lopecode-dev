// Does WASM actually remove the warm-up, or does it just have a smaller one?
//
// The reason to want a WASM kernel here is that the JS one starts 8x slow and
// takes seconds to reach speed (project_coded_landmark_warmup_curve). AOT is
// supposed to fix that. But V8 tiers wasm as well -- Liftoff compiles every
// function eagerly at instantiate, TurboFan recompiles the hot ones in the
// background -- so "full speed on instruction one" is a claim, not a fact.
//
// Measure it: instantiate a FRESH module and time call 1, 2, 3 ... against the
// same module's steady state. Compare the shape to the JS curve, not just the
// endpoint.
//
//   bun scratch/rmbt/wasm-coldstart.ts --wasm scratch/rmbt/involution-as-unchecked.wasm
import { chromium } from "playwright";

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const WASM = arg("wasm", "scratch/rmbt/involution-as-unchecked.wasm");
const cases = await Bun.file("scratch/rmbt/involution-cases.json").json();
const b64 = Buffer.from(await Bun.file(WASM).arrayBuffer()).toString("base64");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("about:blank");

const out = await page.evaluate(async ({ calls, bin64 }) => {
  const bin = Uint8Array.from(atob(bin64), (c) => c.charCodeAt(0));

  const make = async () => {
    // compile() each time, not a cached Module: a reused Module keeps its
    // tiered-up code and would report a warm start as a cold one.
    const m = await WebAssembly.compile(bin);
    const imports: any = {};
    for (const im of WebAssembly.Module.imports(m)) {
      imports[im.module] ??= {};
      imports[im.module][im.name] = im.kind === "function"
        ? () => { throw new Error("host call " + im.name); }
        : im.kind === "memory" ? new WebAssembly.Memory({ initial: 4 }) : 0;
    }
    const inst = await WebAssembly.instantiate(m, imports);
    const ex = inst.exports as any;
    return {
      ex,
      XS: new Float64Array(ex.memory.buffer, ex.xsPtr(), 64),
      SS: new Int32Array(ex.memory.buffer, ex.ssPtr(), 64)
    };
  };

  // One "frame" = the calls one 960x720 frame makes, so the x axis is frames
  // and comparable to the JS warm-up curve.
  const perFrame = Math.round(calls.length / 16);
  const runFrame = (h: any, f: number) => {
    const t = performance.now();
    for (let k = f * perFrame; k < Math.min((f + 1) * perFrame, calls.length); k++) {
      const c = calls[k], n = c.xs.length;
      if (n > 64) continue;
      for (let i = 0; i < n; i++) { h.XS[i] = c.xs[i]; h.SS[i] = c.ss[i]; }
      h.ex.run(n, c.tolPx, c.minInliers);
    }
    return performance.now() - t;
  };

  // cold: brand-new module, timed from the very first call
  const cold: number[] = [];
  const h1 = await make();
  for (let f = 0; f < 16; f++) cold.push(runFrame(h1, f));
  // and the same instance once thoroughly warm
  for (let r = 0; r < 8; r++) for (let f = 0; f < 16; f++) runFrame(h1, f);
  const warm: number[] = [];
  for (let f = 0; f < 16; f++) warm.push(runFrame(h1, f));

  // instantiation cost itself, which a JS kernel does not pay at all
  const t0 = performance.now();
  await make();
  const instMs = performance.now() - t0;

  return { perFrame, cold, warm, instMs };
}, { calls: cases.calls, bin64: b64 });

await browser.close();
const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
console.log(`${WASM}\n${out.perFrame} calls per "frame", 16 frames\n`);
console.log("cold, per frame (ms): " + out.cold.map((x) => x.toFixed(2)).join(" "));
console.log("warm, per frame (ms): " + out.warm.map((x) => x.toFixed(2)).join(" "));
const c1 = out.cold[0], cm = med(out.cold), wm = med(out.warm);
console.log(`\nfirst frame     ${c1.toFixed(2)}ms`);
console.log(`cold median     ${cm.toFixed(2)}ms`);
console.log(`warm median     ${wm.toFixed(2)}ms`);
console.log(`\nfirst-frame penalty  ${(c1 / wm).toFixed(2)}x`);
console.log(`cold-run penalty     ${(cm / wm).toFixed(2)}x`);
console.log(`compile+instantiate  ${out.instMs.toFixed(1)}ms (paid once, per worker)`);
