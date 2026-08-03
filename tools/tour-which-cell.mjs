import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
await p.goto("file:///tmp/tour-hooked-qa.html");
await p.waitForFunction(() => !!window.__ojs_hooks?.policy, null, { timeout: 90000 });
await p.waitForTimeout(22000);
console.log(await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const st = [...rt._variables].find((v) => v._name === "policyState")?._value;
  const names = ["all_decompiled", "decompile", "allCells", "cellMaps", "test_all_cells_decompilable",
                 "all_compiled", "roundtripped", "decompileImport"];
  const rows = {};
  for (const n of names) {
    const r = st?.byCell.get(n);
    rows[n] = r ? ("tries=" + r.tries + " ok=" + r.ok + " fail=" + r.fail + " :: " + r.reason) : "never seen by policy";
  }
  return rows;
}));
await b.close();
process.exit(0);
