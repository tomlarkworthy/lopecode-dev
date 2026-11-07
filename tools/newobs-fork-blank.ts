// "fork on the latest exporter-3 on new Observable forks to a blank page".
// Exports G1 from new.observablehq.com via the real actionHandler("tab") path, then boots it as a
// real blob: (file:// has different origin semantics). HEADED=1 recommended (headless crashes on 2MB+ blobs).
//   HEADED=1 bun tools/newobs-fork-blank.ts [url]
import { chromium } from "playwright";
const URL_ = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/exporter-3";
const browser = await chromium.launch({ headless: !process.env.HEADED, executablePath: process.env.CHROME_BIN, ignoreDefaultArgs: ["--enable-automation"], args: ["--disable-blink-features=AutomationControlled", 
  "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--js-flags=--max-old-space-size=4096"] });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
let out: any;
if (process.env.BOOT_FILE) out = { source: await Bun.file(process.env.BOOT_FILE).text() };
else {
const page = await ctx.newPage();
await page.goto(URL_, { waitUntil: "domcontentloaded", timeout: 120000 });
let fr: any = null;
for (let i = 0; i < 120 && !fr; i++) {
  for (const f of page.frames()) {
    try { if (await f.evaluate(() => !!document.querySelector(".moldbook-exporter") && !!(window as any).__ojs_runtime)) { fr = f; break; } } catch {}
  }
  if (!fr) { await page.mouse.wheel(0, 900); await page.waitForTimeout(1000); }
}
if (!fr) { console.log("no exporter UI frame"); process.exit(1); }
console.log("frame", fr.url().slice(0, 100));
if (process.env.PATCH) await fr.evaluate((src: string) => { (window as any).__PATCH = (0, eval)("(" + src + ")"); }, await Bun.file("tools/newobs-getFileAttachments-patch.js").text());
out = await fr.evaluate(async () => {
  const rt: any = (window as any).__ojs_runtime;
  const opened: string[] = [];
  (window as any).open = (u: string) => { opened.push(String(u).slice(0, 200)); return null; };
  const ah = [...rt._variables].find((v: any) => v._name === "actionHandler" && v._value !== undefined)?._value;
  const ui: any = document.querySelector(".moldbook-exporter");
  let patched = "no";
  if ((window as any).__PATCH) {
    const v = [...rt._variables].find((x: any) => x._name === "getFileAttachments");
    v._module.redefine("getFileAttachments", [], () => (window as any).__PATCH);
    patched = "yes";
    await new Promise((r) => setTimeout(r, 2000));
  }
  const warns: string[] = []; const _w = console.warn, _e = console.error;
  console.warn = (...a: any[]) => { warns.push("W " + a.map(String).join(" ").slice(0, 220)); return _w.apply(console, a); };
  console.error = (...a: any[]) => { warns.push("E " + a.map(String).join(" ").slice(0, 220)); return _e.apply(console, a); };
  let captured: any = null, threw: string | null = null;
  try {
    await Promise.race([ah("tab", ui.value, { output: (r: any) => (captured = r) }, () => {}),
      new Promise((_, rej) => setTimeout(() => rej(new Error("HUNG 120s")), 120000))]);
  } catch (e: any) { threw = String(e?.message ?? e).slice(0, 300); }
  console.warn = _w; console.error = _e;
  return { patched, threw, opened, uiValue: JSON.stringify(ui.value).slice(0, 300), warns: [...new Set(warns)].slice(0, 20), source: String(captured?.source ?? "") };
});
console.log(JSON.stringify({ ...out, source: out.source.length }, null, 1));
if (!out.source) { await browser.close(); process.exit(1); }
if (!process.env.BOOT_FILE) await Bun.write(`scratch/newobs-fork-g1${process.env.PATCH ? "-patched" : ""}.html`, out.source);
}
const bc = out.source.match(/<script id="bootconf.json"[^>]*>([\s\S]*?)<\/script>/);
console.log("bootconf:", bc?.[1].trim().slice(0, 400));
const opener = await ctx.newPage();
await opener.goto("file://" + process.cwd() + "/scratch/fork-opener.html");
const popP = opener.waitForEvent("popup");
let hash = ""; try { hash = JSON.parse(bc![1]).hash || ""; } catch {}
await opener.evaluate(([h, f]) => { window.open(URL.createObjectURL(new Blob([h], { type: "text/html" })) + f, "_blank"); }, [out.source, hash]);
const pop = await popP;
const scripts: any[] = [];
if (process.env.CDP) {
  const cdp = await ctx.newCDPSession(pop);
  cdp.on("Debugger.scriptParsed", (e: any) => { if (!e.url && e.endLine >= 1466) scripts.push(e); });
  await cdp.send("Debugger.enable");
  (globalThis as any).__cdp = cdp;
}
const errs: string[] = [];
pop.on("pageerror", (e) => errs.push("PE " + String(e.message).slice(0, 220) + " @@ " + String(e.stack).split("\n").slice(1, 5).join(" / ").slice(0, 400)));
pop.on("console", (m) => { if (m.type() !== "debug") errs.push(m.type() + " " + m.text().slice(0, 220)); });
for (let i = 0; i < 60; i++) {
  if (await pop.evaluate(() => !!document.querySelector(".moldbook-exporter")).catch(() => false)) break;
  await pop.waitForTimeout(1000);
}
await pop.waitForTimeout(Number(process.env.SETTLE ?? 3000));
const st = await pop.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime; const vars = rt ? [...rt._variables] : [];
  return { href: location.href.slice(0, 160), hasRuntime: !!rt, totalVars: vars.length,
    textLen: (document.body?.innerText || "").trim().length, firstText: (document.body?.innerText || "").trim().slice(0, 200),
    exporterUI: !!document.querySelector(".moldbook-exporter"), observablehq: document.querySelectorAll(".observablehq").length,
    errored: vars.filter((v: any) => v._error).slice(0, 12).map((v: any) => (v._name ?? "(anon)") + ": " + String(v._error?.message ?? v._error).slice(0, 100)),
    modules: rt ? [...new Set(vars.map((v: any) => v._module))].length : 0 };
}).catch((e) => ({ evalFailed: String(e) }));
if (process.env.EVAL) console.log("EVAL:", await pop.evaluate(async (src: string) => { try { return JSON.stringify(await (0, eval)(src)); } catch (e: any) { return "THREW " + e?.stack; } }, await Bun.file(process.env.EVAL).text()));
if (process.env.GEN2) { const n = await pop.evaluate(() => (window as any).__gen2?.length ?? 0); if (n) { await Bun.write("scratch/fork-gen2.html", await pop.evaluate(() => (window as any).__gen2)); console.log("wrote scratch/fork-gen2.html", n); } }
await pop.screenshot({ path: `tools/screenshots/newobs-fork-g1${process.env.PATCH ? "-patched" : ""}.png` });
console.log(JSON.stringify(st, null, 1));
if (process.env.CDP) {
  const cdp = (globalThis as any).__cdp;
  for (const e of scripts) {
    const { scriptSource } = await cdp.send("Debugger.getScriptSource", { scriptId: e.scriptId });
    const L = scriptSource.split("\n");
    for (const n of [1112, 1467]) { const l = L[n - 1] ?? ""; if (l.length > 130) console.log(`script ${e.scriptId} (${L.length} lines) L${n}: ${l.slice(90, 200)}`); }
  }
}
console.log("console:\n  " + [...new Set(errs)].slice(0, 40).join("\n  "));
await browser.close();
