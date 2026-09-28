import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const b = await chromium.launch(); const page = await b.newPage({ acceptDownloads: true });
await page.route(/bsky\.network|observablehq\.com|jsdelivr|esm\.sh|unpkg/, r => r.abort());
await page.goto(process.argv[2]);
await page.waitForFunction(() => window.__ojs_runtime?.mains?.get("@user/downloads-demo"), null, { timeout: 120000 });
for (const label of ["Download CSV", "Download JSON"]) {
  const link = page.getByText(label).first(); await link.waitFor({ timeout: 60000 });
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), link.click()]);
  console.log(label, dl.suggestedFilename(), JSON.stringify(readFileSync(await dl.path(), "utf8").slice(0, 80)));
}
await b.close();
