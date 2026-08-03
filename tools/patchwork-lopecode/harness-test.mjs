// Drives harness.html in Playwright to prove the seam:
// mount → reactive data edit → reactive logic edit → add/remove cell → cleanup.
import { chromium } from "playwright";
import { pathToFileURL } from "url";
import path from "path";

const url = "http://localhost:8791/tools/patchwork-lopecode/harness.html";
const browser = await chromium.launch();
const page = await browser.newPage();

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto(url);

const viewText = () =>
  page.$eval('.lpw-cell[data-cell="view"] .lpw-cell-value', (el) => el.textContent.trim());
const clickBtn = (label) => page.click(`button:has-text("${label}")`);
const expectView = async (want, step) => {
  await page.waitForFunction(
    (w) => {
      const el = document.querySelector('.lpw-cell[data-cell="view"] .lpw-cell-value');
      return el && el.textContent.trim() === w;
    },
    want,
    { timeout: 3000 },
  ).catch(() => {});
  const got = await viewText();
  const ok = got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}: view = ${JSON.stringify(got)}${ok ? "" : ` (wanted ${JSON.stringify(want)})`}`);
  return ok;
};

let allOk = true;
allOk &= await expectView("3 doubled is 6", "initial mount");
await clickBtn("count = 10 (data edit)");
allOk &= await expectView("10 doubled is 20", "data edit propagates");
await clickBtn("doubled = count * 10 (logic edit)");
allOk &= await expectView("10 doubled is 100", "logic/source edit recompiles");

await clickBtn("add cell squared");
await page.waitForTimeout(200);
const squared = await page
  .$eval('.lpw-cell[data-cell="squared"] .lpw-cell-value', (el) => el.textContent.trim())
  .catch(() => "(missing)");
const squaredOk = squared === "100";
allOk &= squaredOk;
console.log(`${squaredOk ? "PASS" : "FAIL"}  add cell: squared = ${JSON.stringify(squared)}`);

await clickBtn("simulate REMOTE merge (count = 42)");
allOk &= await expectView("42 doubled is 420", "remote merge propagates");

await clickBtn("remove cell squared");
await page.waitForTimeout(200);
const gone = (await page.$('.lpw-cell[data-cell="squared"]')) === null;
allOk &= gone;
console.log(`${gone ? "PASS" : "FAIL"}  remove cell: squared row gone = ${gone}`);

await page.screenshot({ path: "tools/patchwork-lopecode/harness.png", fullPage: true });

const emptied = await page.evaluate(() => {
  window.__cleanup();
  return document.querySelector("#mount .lpw-notebook") === null;
});
allOk &= emptied;
console.log(`${emptied ? "PASS" : "FAIL"}  cleanup: notebook torn down = ${emptied}`);

if (errors.length) { allOk = false; console.log("CONSOLE ERRORS:\n" + errors.join("\n")); }

console.log(allOk ? "\nALL PASS" : "\nSOME FAILURES");
await browser.close();
process.exit(allOk ? 0 : 1);
