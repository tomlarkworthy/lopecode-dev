import { chromium } from "../../../../node_modules/playwright/index.mjs";
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/soundscript.html");
await p.waitForTimeout(15000);
const out = await p.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const v = [...rt._variables].find((v: any) => v._name === "spec_load");
  const load = await v._module.value("spec_load");
  const res: any = {};
  const run = async (key: string, src: string, cell: string) => {
    try { const L = await load(src, {}); const f = await L.value(cell); res[key] = typeof f === "function" ? (() => { try { return [f(), f()]; } catch (e: any) { return "throw: " + e.message; } })() : f; L.dispose(); }
    catch (e: any) { res[key] = "load error: " + e.message; }
  };
  await run("writer", "const a = () => {\n  const xs = [0];\n  const t = [xs, 1] as const;\n  return () => {\n    t[0].push(1);\n    return t[0].length;\n  };\n};", "a");
  await run("caller", "const a = () => {\n  const xs = [0];\n  const t = [xs, 1] as const;\n  return () => t[0].push(1);\n};\nconst b = (a: () => number) => a() + a();", "b");
  return res;
});
console.log(JSON.stringify(out));
await b.close();
