// Prove: cell-map's importedModule() hangs on notebook-kit-compiled import cells,
// and that the probe-stub version resolves them.
import { chromium } from "playwright";
const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/grid-container";
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[3] ?? 30000));
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
console.log(JSON.stringify(await frame.evaluate(async () => {
  const rt: any = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const isImportCell = (v: any) =>
    v._inputs?.length === 1 && v._inputs[0]._name === "@variable" &&
    String(v._definition).includes("import(");
  const cells = vars.filter(isImportCell);

  const withTimeout = (p: Promise<any>, ms = 3000) =>
    Promise.race([p.then((v) => ({ settled: "resolved", v })).catch((e) => ({ settled: "rejected", e: String(e).slice(0, 80) })),
                  new Promise((r) => setTimeout(() => r({ settled: "HUNG" }), ms))]);

  // current implementation, verbatim
  const current = (v: any) => new Promise(async (resolve, reject) => {
    try { await v._definition({ import: (...a: any[]) => resolve(a[2]) }); }
    catch (err) {
      if (String(v._definition).includes("derive")) { const d = await v._definition(v); resolve(d._source); }
      else { throw err; }
    }
  });

  // candidate fix
  const fixed = async (v: any) => {
    const runtime = v._module?._runtime;
    let captured: any = null;
    const probe = {
      import: (...a: any[]) => { captured ??= a[2]; },
      _outputs: [],
      _module: { _runtime: { module: (...a: any[]) => { const m = runtime.module(...a); captured ??= m; return m; } } },
    };
    await v._definition(probe);
    return captured;
  };

  const out: any[] = [];
  for (const v of cells.slice(0, 4)) {
    const cur: any = await withTimeout(current(v));
    const fix: any = await withTimeout(fixed(v));
    out.push({
      name: v._name,
      outputs: [...(v._outputs ?? [])].map((o: any) => o._name),
      current: cur.settled,
      fixed: fix.settled,
      fixedIsModule: fix.settled === "resolved" ? (fix.v?.constructor?.name ?? String(fix.v)) : null,
      fixedVarCount: fix.settled === "resolved" && fix.v?._scope ? fix.v._scope.size : null,
    });
  }
  return { importCells: cells.length, out };
}), null, 1));
await browser.close();
