// Compare per-variable state (computed / errored / never-reached) between classic and new.
import { chromium } from "playwright";
const url = process.argv[2]!;
const names = (process.argv[3] ?? "editedCell,viewof editedCell,module,viewof variable,variable,name,inputs,viewof definition,auto_attach,editors,save_options,editor_jobs,optionsFile,options,viewof options").split(",");
const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[4] ?? 28000));
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
console.log(url);
console.log(JSON.stringify(await frame.evaluate((names) => {
  const rt: any = (window as any).__ojs_runtime;
  if (!rt) return { error: "no __ojs_runtime" };
  const vars = [...rt._variables];
  const out: any = {};
  for (const n of names) {
    // new platform mangles `viewof x` to `viewof$x`
    const cands = vars.filter((v: any) => v._name === n || v._name === n.replace("viewof ", "viewof$"));
    out[n] = cands.length === 0 ? "absent" : cands.map((v: any) => ({
      reachable: v._reachable,
      computed: v._value !== undefined,
      err: v._error ? String(v._error.message ?? v._error).slice(0, 70) : null,
      val: v._value === null ? "null" : typeof v._value === "object" ? (v._value?.constructor?.name ?? "obj") : String(v._value).slice(0, 40),
    }));
  }
  return out;
}, names), null, 1));
await browser.close();
