// Reopen a saved notebook from disk with the CDN/PDS/Observable blocked and report every named cell of one module.
import { chromium } from "playwright";
const [file, id] = process.argv.slice(2);
const b = await chromium.launch(); const page = await b.newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.route(/bsky\.network|observablehq\.com|jsdelivr|esm\.sh|unpkg/, r => r.abort());
await page.goto(file);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 });
await page.waitForTimeout(3000);
const out = await page.evaluate(async (id) => {
  const rt = window.__ojs_runtime; const m = rt.mains.get(id);
  if (!m) return { error: "not in mains" };
  const vs = [...rt._variables].filter(v => v._module === m && v._name && !String(v._name).startsWith("module "));
  for (const v of vs) if (!v._reachable) m.variable(true).define([v._name], x => x);
  const o = {};
  for (const v of vs) { try { const x = await Promise.race([v._promise, new Promise((_, r) => setTimeout(() => r(new Error("timeout 30s")), 30000))]);
    o[v._name] = x instanceof Element ? "<" + x.tagName.toLowerCase() + ">" : typeof x === "function" ? "function" : (JSON.stringify(x) ?? String(x)).slice(0, 160); } catch (e) { o[v._name] = "ERROR " + String(e?.message ?? e).slice(0, 200); } }
  return o;
}, id);
console.log(JSON.stringify({ out, errors: errors.slice(0, 5) }, null, 1));
await b.close();
