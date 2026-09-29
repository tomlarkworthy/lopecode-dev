// Boot a local-change-history notebook two ways: file:// and a blob: URL (opaque origin, as a fork).
// Report erroring variables in the module and the fs cell's rendered text.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_local-change-history.html");
const MOD = "@tomlarkworthy/local-change-history";
const browser = await chromium.launch();
const probe = async (page) => {
  await page.waitForFunction(() => window.__ojs_runtime, null, { timeout: 60000 });
  await page.waitForTimeout(8000);
  return page.evaluate(async (MOD) => {
    const rt = window.__ojs_runtime;
    const m = rt.mains?.get(MOD);
    const vs = [...rt._variables].filter(v => v._module === m && v._name);
    const errs = [];
    for (const v of vs) {
      const r = await Promise.race([v._promise.then(() => null, e => String(e?.message ?? e)), new Promise(r => setTimeout(() => r(null), 200))]);
      if (r) errs.push(v._name + ": " + r.slice(0, 120));
    }
    const fsv = vs.find(v => v._name === "viewof fs");
    const fsEl = fsv && await Promise.race([fsv._promise.catch(() => null), new Promise(r => setTimeout(() => r(null), 200))]);
    const cfg = vs.find(v => v._name === "config");
    const cfgVal = cfg && await Promise.race([cfg._promise.then(x => JSON.stringify(x), e => "ERR " + e.message), new Promise(r => setTimeout(() => r("pending"), 3000))]);
    return { origin: self.origin, href: location.href.slice(0, 40), errs, fsText: fsEl?.textContent?.slice(0, 200) ?? null, config: cfgVal };
  }, MOD);
};
const p1 = await browser.newPage();
await p1.goto("file://" + NB + "#view=" + encodeURIComponent(MOD));
const a = await probe(p1);
const p2 = await browser.newPage();
await p2.goto("about:blank");
const html = readFileSync(NB, "utf8");
await p2.evaluate((html) => {
  const u = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  location.href = u + "#view=@tomlarkworthy/local-change-history";
}, html);
const b = await probe(p2);
console.log(JSON.stringify({ file: a, blob: b }, null, 1));
await browser.close();
const base = new Set(["selected_files: branch is required","selected_commits: branch is required"]);
const pass = a.errs.every(e => base.has(e)) && /^\{/.test(a.config) && b.errs.length === 0 && /IndexedDB/.test(b.fsText || "");
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
