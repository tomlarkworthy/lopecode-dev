import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
await p.goto("file:///tmp/tour-hooked-qa.html");
await p.waitForFunction(() => !!window.__ojs_hooks?.policy, null, { timeout: 90000 });
await p.waitForTimeout(20000);
console.log(await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const v = [...rt._variables].find((x) => x._name === "all_decompiled");
  if (!v) return "all_decompiled not found";
  const list = await v._promise.catch((e) => null);
  if (!list) return "all_decompiled rejected";
  const bad = list.filter((s) => s.error);
  return bad.slice(0, 6).map((s) => ({
    cell: s.cell?.[0]?._name,
    defType: typeof s.cell?.[0]?._definition,
    isWrapped: !!s.cell?.[0]?._definition?.[Symbol.for("lopecode.hooks.original")],
    err: String(s.error?.message || s.error).slice(0, 160)
  }));
}));
await b.close();
process.exit(0);
