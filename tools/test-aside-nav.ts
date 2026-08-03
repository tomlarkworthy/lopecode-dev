// Debug the CSV-chooser aside: boot-time hash layout vs live hashchange in lopepage-2
import { chromium } from "playwright";

const file = process.argv[2];
const url = `file://${file}`;
const combined =
  "#view=R100(S50(@tomlarkworthy/lopecode-live-2026),S50(@tomlarkworthy/csv-column-chooser))";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route(/^https?:\/\//, (r) => { console.log('BLOCKED-URL ' + r.request().url().slice(0, 120)); r.abort(); });
const errors: string[] = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 200));
});
page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 200)));

// Test 1: boot directly with the combined hash
await page.goto(url + combined);
await page.waitForTimeout(9000);
const bootResult = await page.evaluate(() => ({
  hash: location.hash.slice(0, 120),
  panes: document.querySelectorAll(".lp2-pane, .lm_content, [data-module]").length,
  csvHeading: !!Array.from(document.querySelectorAll("h1,h2")).find((h) =>
    (h.textContent || "").includes("CSV column chooser")
  ),
  bodyHasCsvText: (document.body.innerText || "").includes("CSV column chooser")
}));
console.log("BOOT-WITH-HASH:", JSON.stringify(bootResult));
console.log("boot errors:", JSON.stringify(errors.slice(0, 5)));

// Test 2: boot plain, then click the aside link
errors.length = 0;
await page.goto("about:blank");
await page.goto(url);
await page.waitForTimeout(9000);
const linkInfo = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll("a")).find((x) =>
    (x.getAttribute("href") || "").includes("csv-column-chooser")
  );
  return a ? { found: true, href: a.getAttribute("href")!.slice(0, 140) } : { found: false };
});
console.log("ASIDE-LINK:", JSON.stringify(linkInfo));
if (linkInfo.found) {
  await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll("a")).find((x) =>
      (x.getAttribute("href") || "").includes("csv-column-chooser")
    ) as HTMLAnchorElement;
    a.click();
  });
  await page.waitForTimeout(6000);
  const after = await page.evaluate(() => ({
    hash: location.hash.slice(0, 140),
    bodyHasCsvText: (document.body.innerText || "").includes("CSV column chooser")
  }));
  console.log("AFTER-CLICK:", JSON.stringify(after));
  console.log("click errors:", JSON.stringify(errors.slice(0, 5)));
}
await browser.close();
