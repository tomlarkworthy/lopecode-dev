// Round 11: external vs internal links, and the prior-works table.
// Checked rendered, not synced -- the arrow is an inline <svg> built per call,
// and a shared node would silently end up on the last link only.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve(process.argv[2] ?? "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2400 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
for (let i = 0; i < 40; i++) { await page.evaluate((k) => window.scrollTo(0, k * 1100), i); await page.waitForTimeout(250); }
await page.waitForTimeout(8000);

const out = await page.evaluate(() => {
  const root = document.querySelector("#lopepage-2") || document.body;
  const anchors = [...root.querySelectorAll("a[href]")] as HTMLAnchorElement[];
  const isProse = (a: HTMLAnchorElement) => !a.closest("[cell='toc']") && !a.closest("nav");
  const ext = anchors.filter((a) => a.target === "_blank");
  const internal = anchors.filter((a) => a.getAttribute("href")?.startsWith("#sec-") && isProse(a));
  const bare = anchors.filter((a) =>
    isProse(a) && a.target !== "_blank" && !a.getAttribute("href")?.startsWith("#sec-") &&
    /^https?:/.test(a.getAttribute("href") || ""));
  const table = [...root.querySelectorAll("table")]
    .find((t) => (t.previousElementSibling?.textContent || "").includes("Earlier installments"));
  return {
    externals: ext.map((a) => ({
      text: (a.textContent || "").trim().slice(0, 60),
      href: a.href.slice(0, 70),
      svg: a.querySelectorAll("svg").length
    })),
    internals: internal.map((a) => ({ text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40) })),
    bareExternal: bare.map((a) => a.getAttribute("href")),
    table: table ? {
      rows: table.querySelectorAll("tr").length,
      links: table.querySelectorAll("a[target='_blank']").length,
      parts: [...table.querySelectorAll("tr")].map((r) => (r.children[0]?.textContent || "").trim()),
      text: (table.textContent || "").replace(/\s+/g, " ").slice(0, 120)
    } : null,
    aboveScanner: (() => {
      // the table must sit inside About, i.e. before the "The Scanner" heading
      const t = table && table.closest(".observablehq");
      const h = [...root.querySelectorAll("h1,h2,h3")].find((x) => /The Scanner/.test(x.textContent || ""));
      if (!t || !h) return "MISSING";
      return (t.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) ? "yes" : "NO";
    })(),
    missingRefs: (root.textContent || "").includes("[missing section:")
  };
});
await browser.close();

const p = (ok: boolean, s: string) => console.log(`${ok ? "PASS" : "FAIL"}  ${s}`);
console.log(JSON.stringify(out, null, 1));
p(out.externals.length === 6, `6 external links (arrow), got ${out.externals.length}`);
p(out.externals.every((e) => e.svg === 1), `every external link carries exactly one arrow`);
p(out.bareExternal.length === 0, `no http link left without the external treatment: ${JSON.stringify(out.bareExternal)}`);
p(!!out.table && out.table.rows === 5 && out.table.links === 4,
  `prior-works table: 5 rows / 4 links, got ${out.table?.rows}/${out.table?.links}`);
p(out.aboveScanner === "yes", `table sits inside About (before The Scanner): ${out.aboveScanner}`);
p(out.internals.some((i) => /§/.test(i.text)), `labelled refs carry their section number: ${JSON.stringify(out.internals)}`);
p(!out.missingRefs, "no dangling section references");
p(errs.length === 0, `page errors: ${errs.slice(0, 3).join(" | ")}`);
