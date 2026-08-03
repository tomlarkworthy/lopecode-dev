// Compile a .zig file to .wasm using the @tomlarkworthy/compile-zig notebook.
// There is no zig on this machine -- the compiler IS the notebook (Zig 0.14
// self-hosted wasm backend, shipped as a file attachment, no network).
//
// The notebook's compiler runs with a hardcoded arg vector:
//
//   zig.wasm build-exe main.zig -fno-llvm -fno-lld -fno-ubsan-rt -fno-entry
//
// -fno-llvm is the self-hosted backend (no LLVM optimiser) and there is no -O,
// so the default is Debug: no optimisation passes AND full bounds/overflow
// checking. That is fine for a playground and useless for measuring whether
// AOT beats a JIT. --release injects -OReleaseFast into that vector by
// redefining zig_assets with a wrapper that string-patches the worker the
// notebook already string-patches. Nothing about the compile logic is copied.
//
//   bun scratch/rmbt/zigc.ts scratch/rmbt/involution.zig scratch/rmbt/involution.wasm [--release]
import { chromium } from "playwright";
import { resolve } from "node:path";

const SRC = process.argv[2];
const OUT = process.argv[3];
const RELEASE = process.argv.includes("--release");
if (!SRC || !OUT) { console.error("usage: zigc.ts <in.zig> <out.wasm> [--release]"); process.exit(2); }
const source = await Bun.file(SRC).text();
const NB = resolve("lopebooks/notebooks/@tomlarkworthy_compile-zig.html");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(8000);

const res: any = await page.evaluate(async ({ src, release }) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/compile-zig");
  let patched = false;
  if (release) {
    const realAssets = await mod.value("zig_assets");
    const base = await realAssets.load();
    const NEEDLE = '"-fno-entry"';
    if (!base.patchedWorker.includes(NEEDLE)) return { err: "arg vector not found — the worker build changed" };
    const worker = base.patchedWorker.replace(NEEDLE, '"-fno-entry","-OReleaseFast"');
    patched = worker !== base.patchedWorker;
    const cached = { ...base, patchedWorker: worker };
    mod.redefine("zig_assets", [], () => ({ load: async () => cached }));
  }
  const compileZig = await mod.value("compile_zig");
  try {
    const out = await compileZig(src);
    return { patched, stderr: String(out.stderr || ""), bytes: out.compiled ? Array.from(new Uint8Array(out.compiled)) : null };
  } catch (e: any) { return { err: String(e && e.message || e) }; }
}, { src: source, release: RELEASE });

await browser.close();
if (res.err) { console.error(res.err); process.exit(1); }
const noise = res.stderr.replace(/Compiling\.\.\.\s*/g, "").trim();
if (noise) console.error(noise);
if (!res.bytes) { console.error("compile failed"); process.exit(1); }
await Bun.write(OUT, new Uint8Array(res.bytes));
const mode = RELEASE ? (res.patched ? "-OReleaseFast" : "RELEASE PATCH DID NOT APPLY") : "Debug";
console.log(`${OUT}: ${res.bytes.length} bytes (${mode})`);
