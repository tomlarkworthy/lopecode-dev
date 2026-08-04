// Do the two new imports actually work in the exported file, cold?
// editable-md must have REPLACED md (a plain builtin md is the failure that
// looks like success), and annotate must have registered its menu plugin --
// being a main is necessary, not sufficient.
import { chromium } from "playwright";
const URL_ = process.argv[process.argv.indexOf("--url") + 1];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1400 } });
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(URL_, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(25000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const clt = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const ann = rt.mains.get("@tomlarkworthy/annotate");
  const r: any = { mains: [...rt.mains.keys()] };
  try {
    const md = await clt.value("md");
    // editable-md's md returns a node carrying its own edit affordance; the
    // builtin's does not. Ask the value, not the identity.
    const node = md`hello`;
    r.mdSource = String(md).slice(0, 120);
    r.mdEditable = !!(node && (node.querySelector?.("[contenteditable],.editable-md,[data-editable]") || node.__editable || /editable/i.test(node.className || "")));
    r.mdNodeTag = node && node.tagName;
  } catch (e: any) { r.mdErr = String(e && e.message || e); }
  try { r.a2Layer = ann ? (await ann.value("a2Layer"))?.tagName : "annotate not a main"; } catch (e: any) { r.a2Err = String(e && e.message || e); }
  // NOT via lp2.value("plugins") -- that call never settles, and one unsettled
  // promise wedges the whole runtime, so it takes the verification with it.
  // Read the rendered menu instead; that is the affordance anyway.
  r.menuDom = [...document.querySelectorAll("button,[role=menuitem],[title]")]
    .map((n: any) => (n.getAttribute("title") || n.textContent || "").trim())
    .filter((t: string) => /annot/i.test(t)).slice(0, 5);
  r.menuButtons = [...document.querySelectorAll("[data-lp2-menu] button, .lp2-menu button, header button")].map((n: any) => (n.getAttribute("title") || n.textContent || "").trim()).slice(0, 20);
  return r;
});
await browser.close();
console.log(JSON.stringify(out, null, 2));
