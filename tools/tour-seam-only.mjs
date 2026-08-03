import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
await p.goto("file:///tmp/tour-seamonly-qa.html");
await p.waitForFunction(() => !!window.__ojs_hooks, null, { timeout: 60000 });
await p.waitForTimeout(25000);
console.log(await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const v = [...rt._variables].find((x) => x._name === "all_decompiled");
  const t = [...rt._variables].find((x) => x._name === "test_all_cells_decompilable");
  const list = v ? await v._promise.catch(() => null) : null;
  const bad = list ? list.filter((s) => s.error) : null;
  return {
    policyInstalled: !!window.__ojs_hooks.policy,
    testValue: t ? (t._value !== undefined ? String(t._value) : "UNRESOLVED") : "missing",
    badCount: bad ? bad.length : "n/a",
    firstErrs: bad ? bad.slice(0, 3).map((s) => String(s.error?.message || s.error).slice(0, 90)) : []
  };
}));
await b.close();
process.exit(0);
