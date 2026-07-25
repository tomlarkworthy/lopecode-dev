// Probe a new.observablehq.com notebook AS IF @mootari/access-runtime were re-pinned
// from the stale @939 (legacy `mutable`, broken under notebook-kit's Mutable) to @950.
// Rewrites the module request in flight, so nothing on Observable has to change to test.
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/editor-5";
const waitMs = Number(process.argv[3] ?? 30000);
const REPIN = process.env.NO_REPIN ? false : true;

const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

let rewrites = 0;
if (REPIN) {
  await page.route("**/e1c39d41e8e944b0@939.js*", async (route) => {
    const target = route.request().url().replace("@939.js", "@950.js");
    const res = await ctx.request.get(target, { headers: { accept: "*/*" } });
    rewrites++;
    await route.fulfill({
      status: res.status(),
      body: await res.body(),
      headers: { "content-type": "text/javascript; charset=utf-8", "access-control-allow-origin": "*" },
    });
  });
}

const errors: string[] = [];
const logs: string[] = [];
page.on("console", (m) => {
  const t = `[${m.type()}] ${m.text()}`;
  if (m.type() === "error") errors.push(t);
  else if (m.type() !== "debug") logs.push(t);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(waitMs);

console.log(`repin active: ${REPIN}  rewrites served: ${rewrites}`);

const dom = await Promise.all(
  page.frames().map((f) =>
    f
      .evaluate(() => {
        const errs: string[] = [];
        let cells = 0;
        for (const el of document.querySelectorAll(".observablehq--error")) {
          errs.push((el.textContent ?? "").trim().slice(0, 160));
        }
        cells = document.querySelectorAll(".observablehq--inspect, .observablehq--error").length;
        return { errs, cells, url: location.href };
      })
      .catch(() => null)
  )
);
for (const d of dom) {
  if (!d) continue;
  console.log(`\n--- frame ${d.url.slice(0, 70)}  rendered cells: ${d.cells}  errored: ${d.errs.length}`);
  for (const e of [...new Set(d.errs)]) console.log("  ERR", e);
}

console.log("\n=== console errors (unique):");
for (const e of [...new Set(errors)]) console.log(" ", e.slice(0, 200));

await page.screenshot({
  path: `tools/screenshots/newobs-${REPIN ? "repinned" : "asis"}.png`,
  fullPage: false,
});
await browser.close();
