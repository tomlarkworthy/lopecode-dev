import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await p.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await p.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await p.waitForTimeout(15000);
console.log(JSON.stringify(await p.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => { const v = [...rt._variables].find((z: any) => z._module===mod && z._name===n); return v ? await v._promise : "(no var)"; };
  const bank: any = await val("hexFrameBank");
  const opts: any = await val("hexRigOpts");
  const serial: any = await val("analyzeFrameMan");
  const e0 = bank[0];
  const describe = (o: any) => o && typeof o === "object"
    ? Object.fromEntries(Object.entries(o).map(([k, v]: any) => [k,
        ArrayBuffer.isView(v) ? `${v.constructor.name}(${v.length})` : Array.isArray(v) ? `Array(${v.length})` : typeof v === "object" && v ? "obj{" + Object.keys(v).slice(0,8).join(",") + "}" : typeof v]))
    : typeof o;
  const res = e0 && e0.frame ? serial(e0.frame, { ...opts, bothAxes: false }) : null;
  return { bankLen: bank.length, entryKeys: Object.keys(e0), entry: describe(e0),
           frame: e0.frame ? describe(e0.frame) : "NO .frame",
           resultKeys: res ? Object.keys(res) : null, result: res ? describe(res) : null };
}), null, 1));
await b.close();
