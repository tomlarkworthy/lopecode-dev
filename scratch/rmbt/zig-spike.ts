// Can @tomlarkworthy/compile-zig produce a callable LIBRARY, or only a program?
//
// This is the blocker for a WASM detector and it is cheap to settle. The
// notebook is shaped as a playground -- source with main(), compiled, then run
// through a WASI runner that prints. What a detector needs instead is an
// `export fn` operating on shared linear memory, called from JS thousands of
// times a second, with no entry point involved.
//
// So: compile a module that has both, take the bytes back, and instantiate
// them here with nothing but stubs. If the export is callable the path is
// open; if the compiler refuses a module without main, or strips exports, it
// is closed and no amount of Zig-writing will help.
//
//   bun scratch/rmbt/zig-spike.ts
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/@tomlarkworthy_compile-zig.html");

const SRC = `const std = @import("std");

// The shape a detector kernel would need: a fixed buffer JS can write into,
// and functions that work on it without ever allocating or printing.
var buf: [4096]u8 = undefined;

export fn bufPtr() [*]u8 {
    return &buf;
}

export fn sumRow(len: usize) u32 {
    var total: u32 = 0;
    var i: usize = 0;
    while (i < len) : (i += 1) total += buf[i];
    return total;
}

export fn edgeCount(len: usize, thr: u8) u32 {
    var n: u32 = 0;
    var i: usize = 1;
    while (i < len) : (i += 1) {
        const d = if (buf[i] > buf[i - 1]) buf[i] - buf[i - 1] else buf[i - 1] - buf[i];
        if (d >= thr) n += 1;
    }
    return n;
}

pub fn main() void {}
`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(10000);

const res = await page.evaluate(async (src) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/compile-zig");
  if (!mod) return { err: "compile-zig is not booted; mains: " + [...rt.mains.keys()].join(", ") };
  const compileZig = await mod.value("compile_zig");
  const t0 = performance.now();
  try {
    const out = await compileZig(src);
    return {
      ms: Math.round(performance.now() - t0),
      stderr: String(out.stderr || "").slice(0, 1200),
      bytes: out.compiled ? Array.from(new Uint8Array(out.compiled)) : null
    };
  } catch (e: any) {
    return { err: String(e && e.message || e), ms: Math.round(performance.now() - t0) };
  }
}, SRC);

await browser.close();

if ((res as any).err) { console.error("compile failed:", (res as any).err); process.exit(1); }
console.log(`compiled in ${(res as any).ms}ms`);
if ((res as any).stderr) console.log("stderr:\n" + (res as any).stderr);
const bytes = (res as any).bytes;
if (!bytes) { console.error("no wasm produced -- the compiler rejected it"); process.exit(1); }

const wasm = new Uint8Array(bytes);
console.log(`wasm: ${wasm.length} bytes, magic ${[...wasm.slice(0, 4)].map((b) => b.toString(16)).join(" ")}`);
await Bun.write("scratch/rmbt/zig-spike.wasm", wasm);

// Instantiate with nothing real: any WASI import it wants gets a stub that
// throws, so if an export needs the runtime we find out by it throwing rather
// than by guessing.
const m = await WebAssembly.compile(wasm);
const wanted = WebAssembly.Module.imports(m);
console.log("imports:", wanted.length ? wanted.map((i) => `${i.module}.${i.name}`).join(", ") : "(none)");
const imports: any = {};
for (const i of wanted) {
  imports[i.module] ??= {};
  imports[i.module][i.name] = i.kind === "function"
    ? (...a: any[]) => { throw new Error(`called ${i.module}.${i.name}`); }
    : i.kind === "memory" ? new WebAssembly.Memory({ initial: 2 }) : 0;
}
const inst = await WebAssembly.instantiate(m, imports);
const ex = inst.exports as any;
console.log("exports:", Object.keys(ex).join(", "));

const missing = ["bufPtr", "sumRow", "edgeCount"].filter((n) => typeof ex[n] !== "function");
if (missing.length) { console.error(`\nBLOCKED: exports missing: ${missing.join(", ")}`); process.exit(1); }
if (!ex.memory) { console.error("\nBLOCKED: memory is not exported, JS cannot write the frame in"); process.exit(1); }

// The real test: write a row from JS, read a result back.
const mem = new Uint8Array(ex.memory.buffer, ex.bufPtr(), 4096);
const row = new Uint8Array(512);
for (let i = 0; i < row.length; i++) row[i] = (i * i + i * 3) % 23 < 9 ? 40 : 210;
mem.set(row);
let jsSum = 0, jsEdges = 0;
for (let i = 0; i < row.length; i++) jsSum += row[i];
for (let i = 1; i < row.length; i++) if (Math.abs(row[i] - row[i - 1]) >= 12) jsEdges++;
const wSum = ex.sumRow(row.length), wEdges = ex.edgeCount(row.length, 12);
console.log(`\nsumRow    wasm ${wSum}  js ${jsSum}  ${wSum === jsSum ? "MATCH" : "MISMATCH"}`);
console.log(`edgeCount wasm ${wEdges}  js ${jsEdges}  ${wEdges === jsEdges ? "MATCH" : "MISMATCH"}`);
console.log(wSum === jsSum && wEdges === jsEdges
  ? "\nOPEN: compile-zig emits a callable library over shared memory."
  : "\nBLOCKED: the export ran but disagreed with JS.");
