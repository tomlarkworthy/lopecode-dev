// Local lopecode leg: importShim IS present here, so realize must still take the shim branch
// and the edit must still apply.
import { chromium } from "playwright";
const b = await chromium.launch({ headless: true, args: ["--disable-web-security", "--allow-file-access-from-files"] });
const p = await (await b.newContext()).newPage();
const errs: string[] = [];
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
await p.goto("file://" + process.argv[2], { waitUntil: "domcontentloaded", timeout: 120000 });
let prev = -1;
for (let i = 0; i < 45; i++) {
  const n = await p.evaluate(() => document.querySelectorAll(".cm-editor").length);
  if (n === prev && n > 0) break; prev = n; await p.waitForTimeout(1000);
}
const titleOf = () => p.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const tv = [...rt._variables].find((x: any) => x._name === "title_variable" && x._value !== undefined)?._value;
  return String(tv?._value?.textContent ?? tv?._value).slice(0, 70).replace(/\n/g, " ");
});
const shimBranch = await p.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  let probe: any; try { probe = typeof rt._global("importShim"); } catch (e) { probe = "THREW"; }
  return { globalHook: String(rt._global).slice(0, 90), importShimProbe: probe };
});
const before = await titleOf();
const ok = await p.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const v = [...rt._variables].find((x: any) => /cellEditor\s*\(\s*title_variable/.test(String(x._definition)));
  if (!v?._value) return false;
  v._value.setAttribute("data-edit-probe", "1");
  return v._value.querySelectorAll(".cm-content").length > 0;
});
if (!ok) { console.log(JSON.stringify({ error: "no CodeMirror", ...shimBranch })); await b.close(); process.exit(0); }
const cm = p.locator('[data-edit-probe="1"] .cm-content').first();
await cm.click();
await p.keyboard.press("Meta+A");
await p.keyboard.type("title = md`# LOCAL EDIT OK`");
await p.waitForTimeout(400);
await p.evaluate(() => {
  const host = document.querySelector('[data-edit-probe="1"]')!;
  ([...host.querySelectorAll("button")].find((x) => x.textContent?.includes("▶")) as HTMLButtonElement)?.click();
});
await p.waitForTimeout(6000);
const after = await titleOf();
console.log(JSON.stringify({ ...shimBranch, titleBefore: before, titleAfter: after,
  applied: after.includes("LOCAL EDIT OK"), errors: errs.slice(-3) }, null, 1));
await b.close();
