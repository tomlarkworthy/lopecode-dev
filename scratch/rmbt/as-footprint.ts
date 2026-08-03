// What does compiling AssemblyScript in the browser actually cost to ship?
// Log every network request asc makes, and size each one raw and gzipped --
// a notebook attachment is stored gzipped, so gzipped is the number that
// counts against the budget.
import { chromium } from "playwright";
const AS = "0.28.20";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const seen = new Map<string, number>();
page.on("response", async (r) => {
  try { const b = await r.body(); seen.set(r.url(), b.length); } catch {}
});
await page.setContent(`<!doctype html><html><head><script type="importmap">${JSON.stringify({
  imports: {
    assemblyscript: `https://cdn.jsdelivr.net/npm/assemblyscript@${AS}/dist/assemblyscript.js`,
    "assemblyscript/asc": `https://cdn.jsdelivr.net/npm/assemblyscript@${AS}/dist/asc.js`,
    binaryen: "https://cdn.jsdelivr.net/npm/binaryen@131.0.0-nightly.20260721/index.js",
    long: "https://cdn.jsdelivr.net/npm/long@5.3.2/index.js"
  }
})}</script></head><body></body></html>`, { waitUntil: "domcontentloaded" });
const src = await Bun.file("scratch/rmbt/involution.as-unchecked.ts").text();
const ok = await page.evaluate(async (s) => {
  const asc = (await import("assemblyscript/asc")).default;
  const out: any = {};
  const r = await asc.main(["main.ts", "--outFile", "main.wasm", "-O3", "--runtime", "stub"], {
    readFile: (n: string) => (n === "main.ts" ? s : null),
    writeFile: (n: string, d: any) => { out[n] = d; }, listFiles: () => []
  });
  return { err: r.error ? String(r.error) : null, bytes: out["main.wasm"]?.length ?? 0 };
}, src);
await browser.close();
console.log("compile:", JSON.stringify(ok));
let tot = 0;
for (const [u, n] of [...seen.entries()].sort((a, b) => b[1] - a[1])) {
  if (n < 2000) continue;
  tot += n;
  console.log(`${(n / 1048576).toFixed(2).padStart(6)} MB  ${u.replace("https://cdn.jsdelivr.net/npm/", "")}`);
}
console.log(`${(tot / 1048576).toFixed(2).padStart(6)} MB  TOTAL (raw)`);
