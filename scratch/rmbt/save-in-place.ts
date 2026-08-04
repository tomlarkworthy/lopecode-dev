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
  () => document.querySelectorAll("#lopepage-2 .observablehq").length > 20,
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

// --- put back what the export pruned -------------------------------------
//
// exportToHTML emits the modules reachable from the runtime plus their file
// attachments. Anything else embedded in the file is dropped: on this notebook
// that is the four AssemblyScript compiler blocks (reachable only by import id,
// and only when a button is pressed) and nine modules that simply were not
// booted in this layout -- whisper-input, modern-screenshot,
// openai-responses-api, tabbed-pane-view, @mootari/signature and two d/ hash
// notebooks. 4.1MB of a 15.5MB file, silently.
//
// So a save-in-place is LOSSY by default and has to be repaired, not trusted.
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
  // Anchor on the REAL bootconf.json block. `id="bootconf.json"` also occurs
  // inside other blocks' source text (the bootloader builds that markup as a
  // string), and matching the first occurrence splices 4MB into the middle of
  // a module's source -- which produced a file that parsed fine, passed a
  // module syntax check, and then booted to nothing at all: no runtime, no
  // cells. So identify it by content, not by position: short body that parses
  // as JSON and carries `mains`.
  let anchorAt = -1;
  const anchorRe = /<script\b[^>]*\bid="bootconf\.json"[^>]*>/g;
  let am: RegExpExecArray | null;
  while ((am = anchorRe.exec(html))) {
    const end = html.indexOf("</script>", am.index + am[0].length);
    const body = html.slice(am.index + am[0].length, end);
    if (body.length > 4000) continue;
    try { if (JSON.parse(body).mains) { anchorAt = am.index; } } catch { /* not the one */ }
  }
  const a = { index: anchorAt };
  if (anchorAt < 0) { console.error("cannot restore: no real bootconf.json block found"); process.exit(1); }
  const restored = dropped.map((k) => before.get(k)!.full).join("\n") + "\n";
  html = html.slice(0, a.index!) + restored + html.slice(a.index!);
  console.log(`\nrestored ${dropped.length} block(s) the export pruned:`);
  for (const k of dropped.sort((x, y) => before.get(y)!.body.length - before.get(x)!.body.length))
    console.log(`  ${before.get(k)!.body.length.toLocaleString().padStart(10)}  ${k}`);
}
const check = scan(html);
const stillMissing = [...before.keys()].filter((k) => !check.has(k));
if (stillMissing.length) { console.error("STILL MISSING: " + stillMissing.join(", ")); process.exit(1); }

await Bun.write(OUT, html);
console.log(`\nwrote ${OUT} (${(html.length / 1e6).toFixed(2)} MB, ${check.size} blocks; source had ${before.size})`);
