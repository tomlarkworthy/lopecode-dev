// Re-export a notebook through exporter-3, headlessly.
//
// Same thing the channel's export_notebook does (action "fork" with
// _save_in_place), but driven from a script: it boots the notebook, calls the
// live exportToHTML, and writes the result WHERE I SAY rather than back over
// the source. The foreground-browser route wedged with two 15MB notebooks and
// twelve detection workers open at once, and a save-in-place that writes over
// its own source is a bad thing to retry blind.
//
// Boots with the PUBLISHED hash and no pairing token, because exportToHTML
// bakes location.hash into the new bootconf and snapshots the live #lopepage-2
// for the prerender -- so whatever layout is on screen at export time is the
// layout every future reader gets, and any &cc= token in the URL ships with it.
//
//   bun scratch/rmbt/save-in-place.ts --in <src.html> --out <dst.html> [--hash '#view=...']
import { chromium } from "playwright";
import { resolve } from "node:path";

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const IN = resolve(arg("in", "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html"));
const OUT = resolve(arg("out", "scratch/rmbt/sip-out.html"));
const HASH = arg("hash", "#view=R100(S100(@tomlarkworthy/coded-landmark-tracking))");
const SETTLE = Number(arg("settle", "45000"));
// The prerender is a clone of the RENDERED page, so the export waits for cells to be on
// screen. "More than 20 cells" is a fine proxy for a notebook whose module IS the content,
// but not for one whose landing module is a few cells in front of an imported app — pass
// --ready-cells, or --ready-selector for something the page only shows once it is alive.
const READY_CELLS = Number(arg("ready-cells", "20"));
const READY_SELECTOR = arg("ready-selector", "");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
console.log(`booting ${IN}${HASH}`);
await page.goto(`file://${IN}${HASH}`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });

// The prerender is a clone of the RENDERED page, so wait for cells to actually
// be on screen, not merely for the runtime to exist.
await page.waitForFunction(
  ([n, sel]) => document.querySelectorAll("#lopepage-2 .observablehq").length > (n as number)
    && (!sel || !!document.querySelector(sel as string)),
  [READY_CELLS, READY_SELECTOR] as const,
  { timeout: 300000 }
);
await page.waitForTimeout(SETTLE);
const pre = await page.evaluate(() => ({
  cells: document.querySelectorAll("#lopepage-2 .observablehq").length,
  vars: (window as any).__ojs_runtime._variables.length,
  hash: location.hash
}));
console.log(`rendered ${pre.cells} cells, ${pre.vars} variables`);

// Hand the HTML out over HTTP rather than as an evaluate() return value:
// 15MB through the CDP JSON channel is slow and has bitten this workflow
// before (eval results elide long strings in the middle).
const chunks: string[] = [];
let resolveDone: (v: unknown) => void;
const done = new Promise((r) => { resolveDone = r; });
const server = Bun.serve({
  port: 0,
  async fetch(req) {
    chunks.push(await req.text());
    resolveDone!(null);
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }
});

// --- boot extra modules into the export ------------------------------------
//
// exportToHTML serialises what the RUNTIME holds, so the way to add a module
// to the file is to boot it before exporting rather than to splice a block in
// afterwards. Doing it here rather than in a paired tab is the point: the
// export takes its hash and its prerender from the live page, so anything done
// in a tab with a `cc=` token in the URL ships that token in the prerender.
//
//   --boot @tomlarkworthy/annotate            (add to runtime.mains, so bootconf lists it)
//   --import md=@tomlarkworthy/editable-md    (import a binding into the notebook's module)
const BOOT = arg("boot", "").split(",").map((s) => s.trim()).filter(Boolean);
const IMPORTS = arg("import", "").split(",").map((s) => s.trim()).filter(Boolean);
const TARGET = arg("target-module", "@tomlarkworthy/coded-landmark-tracking");
if (BOOT.length || IMPORTS.length) {
  const res = await page.evaluate(
    async ({ boot, imports, target }) => {
      const rt = (window as any).__ojs_runtime;
      const out: any = { booted: [], imported: [], errors: [] };
      for (const name of boot) {
        try {
          const define = (await (window as any).importShim(name)).default;
          rt.mains.set(name, rt.module(define));
          out.booted.push(name);
        } catch (e: any) { out.errors.push(`${name}: ${String((e && e.message) || e)}`); }
      }
      for (const spec of imports) {
        const [binding, from] = spec.split("=");
        try {
          const host = rt.mains.get(target);
          if (!host) throw new Error(`target module ${target} not in mains`);
          const child = rt.module((await (window as any).importShim(from)).default);
          host.import(binding, binding, child);
          out.imported.push(spec);
        } catch (e: any) { out.errors.push(`${spec}: ${String((e && e.message) || e)}`); }
      }
      return out;
    },
    { boot: BOOT, imports: IMPORTS, target: TARGET }
  );
  console.log(`booted: ${JSON.stringify(res.booted)}  imported: ${JSON.stringify(res.imported)}`);
  if (res.errors.length) { console.error("BOOT FAILED: " + res.errors.join("; ")); await browser.close(); process.exit(1); }
  await page.waitForTimeout(8000);
}

const meta = await page.evaluate(async (port) => {
  const rt = (window as any).__ojs_runtime;
  let exportToHTML: any = null;
  for (const v of rt._variables) if (v._name === "exportToHTML" && v._value) exportToHTML = v._value;
  if (!exportToHTML) return { err: "exportToHTML not found in runtime" };
  // mains MUST be passed. exportToHTML only self-populates it under
  // `if (runtime.module_names)`, a legacy-runtime branch that is false here --
  // so the default empty Map survives and the export lands with "mains": [],
  // which boots to a blank page. runtime.mains is already Map<name, module>,
  // the direction exportToHTML documents.
  const mains = new Map(rt.mains);
  if (!mains.size) return { err: "runtime.mains is empty; refusing to export a blank notebook" };
  const t0 = performance.now();
  let res: any;
  try {
    res = await exportToHTML({ mains });
  } catch (e: any) {
    return { err: "exportToHTML threw: " + String((e && e.message) || e) };
  }
  // exportToHTML returns {source, report}, not a bare string
  const html = res && res.source;
  if (typeof html !== "string")
    return { err: "no .source in result; keys=" + (res ? Object.keys(res).join(",") : String(res)) };
  const ms = Math.round(performance.now() - t0);
  await fetch(`http://localhost:${port}/`, { method: "POST", body: html });
  const m = html.match(/"mains"\s*:\s*\[([^\]]*)\]/);
  return {
    ms, bytes: html.length,
    mainsIn: [...mains.keys()],
    mainsOut: m ? m[1].replace(/\s+/g, " ").trim() : "(no mains in output)"
  };
}, server.port);

if ((meta as any).err) { console.error((meta as any).err); await browser.close(); server.stop(); process.exit(1); }
await done;
server.stop();
await browser.close();
let html = chunks.join("");
if (html.length !== (meta as any).bytes)
  console.error(`WARNING: received ${html.length} bytes, page reported ${(meta as any).bytes}`);
const mm = html.match(/"mains"\s*:\s*\[([^\]]*)\]/);
if (!mm || !mm[1].trim()) {
  console.error("REFUSING TO WRITE: exported bootconf has empty mains — this would boot blank.");
  process.exit(1);
}
console.log(`exported in ${(meta as any).ms}ms (${(html.length / 1e6).toFixed(2)} MB)`);
console.log(`mains in : ${JSON.stringify((meta as any).mainsIn)}`);
console.log(`mains out: ${(meta as any).mainsOut}`);

// --- account for what the export pruned -----------------------------------
//
// exportToHTML emits the modules reachable from the runtime plus THEIR FILE
// ATTACHMENTS. Nothing else survives. That is the right rule, and the fix for
// anything that matters is to make it an attachment of a module rather than to
// splice it back afterwards -- a block reachable only by import id belongs to
// no module, so no export will ever carry it.
//
// So the only thing this script does with the pruned set is print it and check
// a keep-list. Modules that were simply not booted in this layout
// (whisper-input, modern-screenshot, openai-responses-api, tabbed-pane-view,
// @mootari/signature, two d/ hash notebooks) are bloat and are meant to go.
const KEEP = [
  "@tomlarkworthy/coded-landmark-tracking/asc-0.28.20.js.gz",
  "@tomlarkworthy/coded-landmark-tracking/assemblyscript-0.28.20.js.gz",
  "@tomlarkworthy/coded-landmark-tracking/binaryen-131.js.gz",
  "@tomlarkworthy/coded-landmark-tracking/long-5.3.2.js.gz",
  "@tomlarkworthy/coded-landmark-tracking/detectrow.wasm"
];
const scan = (t: string) => {
  const out = new Map<string, { tag: string; body: string; full: string }>();
  const re = /<script\b[^>]*\bid="([^"]+)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const end = t.indexOf("</script>", m.index + m[0].length);
    if (end < 0) continue;
    if (!out.has(m[1]))
      out.set(m[1], { tag: m[0], body: t.slice(m.index + m[0].length, end), full: t.slice(m.index, end + 9) });
  }
  return out;
};
const srcText = await Bun.file(IN).text();
const before = scan(srcText), after = scan(html);
const dropped = [...before.keys()].filter((k) => !after.has(k));
if (dropped.length) {
  console.log(`\npruned ${dropped.length} block(s), ${(dropped.reduce((s, k) => s + before.get(k)!.body.length, 0) / 1e6).toFixed(2)} MB:`);
  for (const k of dropped.sort((x, y) => before.get(y)!.body.length - before.get(x)!.body.length))
    console.log(`  ${before.get(k)!.body.length.toLocaleString().padStart(10)}  ${k}`);
}
const lost = KEEP.filter((k) => before.has(k) && !after.has(k));
if (lost.length) {
  console.error("\nREFUSING TO WRITE: the export dropped blocks that must survive:");
  for (const k of lost) console.error("  " + k);
  console.error("Make each one a file attachment of a booted module (id `@mod/name`) and re-export.");
  process.exit(1);
}
const added = [...after.keys()].filter((k) => !before.has(k));
if (added.length) console.log(`\nnew block(s): ${added.join(", ")}`);

await Bun.write(OUT, html);
console.log(`\nwrote ${OUT} (${(html.length / 1e6).toFixed(2)} MB, ${after.size} blocks; source had ${before.size})`);
