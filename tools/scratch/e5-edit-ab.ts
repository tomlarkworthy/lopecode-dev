// Live A/B of the runtime-sdk `realize` guard: does applying a cell edit work on the new site?
// runtime-sdk is an IMPORTED module there (/api/import/), and on classic (api.observablehq.com),
// so both are interceptable. NO_PATCH=1 for the baseline arm.
import { chromium } from "playwright";
const url = process.argv[2];
const PATCH = !process.env.NO_PATCH;
const NEW_TITLE = process.env.NEW_TITLE ?? "EDIT PROBE OK";

const OLD_HEAD = "if (runtime._global('importShim')) {";
const NEW_HEAD =
  "const globalOrUndefined = name => { try { return runtime._global(name); } catch (e) { return undefined; } };\n" +
  "    if (globalOrUndefined('importShim')) {";
const OLD_DOC = "const document = runtime._global('document');";
const NEW_DOC = "const document = globalOrUndefined('document');";
const OLD_WIN = "const window = runtime._global('window');";
const NEW_WIN = "const window = globalOrUndefined('window');";

const b = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-web-security"] });
const ctx = await b.newContext();
let served = 0;
if (PATCH) {
  await ctx.route("**runtime-sdk**", async (route) => {
    const u = route.request().url();
    if (!/\/api\/import\/|api\.observablehq\.com/.test(u)) return route.continue();
    const res = await route.fetch();
    let src = await res.text();
    for (const [o, n] of [[OLD_HEAD, NEW_HEAD], [OLD_DOC, NEW_DOC], [OLD_WIN, NEW_WIN]] as const) {
      if (!src.includes(o)) throw new Error(`patch target missing: ${o}`);
      src = src.replace(o, () => n);              // callback form: no $-substitution
    }
    served++;
    await route.fulfill({ body: src, headers: {
      "content-type": "text/javascript; charset=utf-8", "access-control-allow-origin": "*" } });
  });
}
const p = await ctx.newPage();
const errs: string[] = [];
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
const frame = await (async () => {
  for (let i = 0; i < 150; i++) {
    const f = p.frames().find((f) => /observableusercontent/.test(f.url()));
    if (f) { try { if (await f.evaluate(() => document.querySelectorAll(".observablehq").length > 0)) return f; } catch {} }
    await p.waitForTimeout(1000);
  }
  throw new Error("no notebook frame");
})();
for (let s = 0; s < 12; s++) { await frame.evaluate((k) => window.scrollTo(0, k * 1400), s).catch(() => {}); await p.waitForTimeout(600); }
await frame.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
let prev = -1;
for (let i = 0; i < 40; i++) {
  const n = await frame.evaluate(() => document.querySelectorAll(".cm-editor").length);
  if (n === prev && n > 0) break; prev = n; await p.waitForTimeout(1000);
}
const titleOf = () => frame.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const tv = [...rt._variables].find((x: any) => x._name === "title_variable" && x._value !== undefined)?._value;
  return String(tv?._value?.textContent ?? tv?._value).slice(0, 70).replace(/\n/g, " ");
});
const before = await titleOf();
const ok = await frame.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const v = [...rt._variables].find((x: any) => /cellEditor\s*\(\s*title_variable/.test(String(x._definition)));
  if (!v?._value) return false;
  v._value.setAttribute("data-edit-probe", "1");
  return v._value.querySelectorAll(".cm-content").length > 0;
});
if (!ok) { console.log(JSON.stringify({ arm: PATCH ? "FIXED" : "BASELINE", served, error: "no CodeMirror to drive" })); await b.close(); process.exit(0); }
const cm = frame.locator('[data-edit-probe="1"] .cm-content').first();
await cm.click();
await p.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
await p.keyboard.type("title = md\`# " + NEW_TITLE + "\`");
await p.waitForTimeout(400);
await frame.evaluate(() => {
  const host = document.querySelector('[data-edit-probe="1"]')!;
  ([...host.querySelectorAll("button")].find((x) => x.textContent?.includes("▶")) as HTMLButtonElement)?.click();
});
await p.waitForTimeout(7000);
const after = await titleOf();
console.log(JSON.stringify({
  arm: PATCH ? "FIXED" : "BASELINE", servedPatches: served,
  titleBefore: before, titleAfter: after,
  applied: after.includes(NEW_TITLE),
  staleSentinelLogged: errs.some((e) => /throw\s+\w+\s*\}/.test(e)),
  errors: errs.slice(-4),
}, null, 1));
await b.close();
