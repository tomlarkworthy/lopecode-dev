// Every editor host in the page: does it actually contain a CodeMirror (shadow roots included)?
import { chromium } from "playwright";
const url = process.argv[2];
const b = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-web-security"] });
const p = await (await b.newContext()).newPage();
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
const frame = await (async () => {
  for (let i = 0; i < 120; i++) {
    const f = p.frames().find((f) => /observableusercontent/.test(f.url()));
    if (f) { try { if (await f.evaluate(() => !!(window as any).__ojs_runtime)) return f; } catch {} }
    if (i % 15 === 0) console.error(`  [${i}s] ${p.frames().map((f) => f.url().slice(0, 60)).join(" | ")}`);
    await p.waitForTimeout(1000);
  }
  throw new Error("no runtime frame");
})();
let prev = -1;
for (let i = 0; i < 40; i++) {
  const n = await frame.evaluate(() => document.querySelectorAll(".observablehq").length);
  if (n === prev) break; prev = n; await p.waitForTimeout(1000);
}
console.log(JSON.stringify(await frame.evaluate(() => {
  const deepFind = (root: any, sel: string): number => {
    let n = root.querySelectorAll?.(sel).length ?? 0;
    for (const el of root.querySelectorAll?.("*") ?? []) if ((el as any).shadowRoot) n += deepFind((el as any).shadowRoot, sel);
    return n;
  };
  const rt = (window as any).__ojs_runtime;
  const hosts: any[] = [];
  for (const v of rt._variables) {
    const val = v._value;
    if (!val || typeof val !== "object" || !val.nodeType) continue;
    const isHost = (val.className ?? "").toString().includes("editor") ||
      deepFind(val, ".cm-editor") > 0 || (val.querySelector?.("[class*=cm-]") != null) ||
      /cellEditor\s*\(/.test(String(v._definition));
    if (!isHost) continue;
    hosts.push({
      name: v._name ?? "(anonymous)",
      tag: val.tagName, cls: String(val.className ?? "").slice(0, 60),
      cmEditor: deepFind(val, ".cm-editor"), cmContent: deepFind(val, ".cm-content"),
      shadow: !!val.shadowRoot, childHtml: String(val.innerHTML ?? "").replace(/\s+/g, " ").slice(0, 180),
      def: String(v._definition).replace(/\s+/g, " ").slice(0, 120),
    });
  }
  return { docCm: deepFind(document, ".cm-editor"), hosts };
}), null, 1));
await b.close();
