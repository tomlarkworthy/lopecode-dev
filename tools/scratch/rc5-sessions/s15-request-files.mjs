// S15: request_files asks the human through a card in the chat UI; the answer (picked file, URL, skip, or
// Stop) reaches the tool, and picked files become FileAttachments a cell can read. No model calls: the
// tool is executed directly with the shown session's askBus, and the card is driven with Playwright.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.route("https://files.example/**", r => r.fulfill({ status: 200, contentType: "text/csv", body: "month,sales\njan,5\nfeb,7\n" }));
await page.goto(pathToFileURL(nb).href);
const R = "[data-rc5-group]";
await page.waitForFunction(r => document.querySelector(r)?.active?.session?.askBus, R, { timeout: 120000 });

const out = {};
// tools, a module to own the files, and a way to start a request without awaiting it
await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let tv; for (let i = 0; i < 100 && !(tv = [...rt._variables].find(v => v._name === "toolsView" && v._value?.value?.length)); i++) await new Promise(r => setTimeout(r, 200));
  window.__tools = new Map(tv._value.value.map(t => [t.id, t]));
  const src = `export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("seed")).define("seed", [], () => 1);
  return main;
}`;
  await window.__tools.get("write_file").execute({ file_path: "/src/@probe/data.js", content: src }, {});
  window.__ask = (args) => {
    const ctrl = new AbortController();
    const bus = document.querySelector("[data-rc5-group]").active.session.askBus;
    const p = window.__tools.get("request_files").execute({ module: "@probe/data", ...args }, { askBus: bus, abort: ctrl.signal });
    window.__req = { ctrl, done: p.then(r => String(r?.output ?? r)) };
  };
});
const card = page.locator(`${R} div:has(> div > b:text-matches("asking for"))`).last();
const result = () => page.evaluate(() => window.__req.done);

// 1. a picked file
await page.evaluate(() => window.__ask({ prompt: "a CSV of your monthly sales", accept: ".csv" }));
await card.waitFor({ timeout: 5000 });
out.cardText = (await card.textContent()).slice(0, 160);
await card.locator('input[type=file]').setInputFiles({ name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("month,sales\njan,3\nfeb,4\nmar,9\n") });
out.picked = (await result()).slice(0, 260);
out.cardHiddenAfter = !(await card.isVisible().catch(() => false));
// the attachment is readable by a cell of the module
out.cellRows = await page.evaluate(async () => {
  const src = `export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("total")).define("total", ["FileAttachment"], async (FileAttachment) => (await FileAttachment("sales.csv").csv({typed: true})).reduce((a, r) => a + r.sales, 0));
  return main;
}`;
  await window.__tools.get("write_file").execute({ file_path: "/src/@probe/data.js", content: src }, {});
  const rt = window.__ojs_runtime;
  const v = [...rt._variables].find(v => v._module === rt.mains.get("@probe/data") && v._name === "total");
  try { return await v._promise; } catch (e) { return "ERR " + e.message; }
});

// 1b. a module that does not exist yet is created to hold the file
await page.evaluate(() => window.__ask({ prompt: "data for a new module", module: "@probe/fresh" }));
await card.waitFor({ timeout: 5000 });
await card.locator('input[type=file]').setInputFiles({ name: "a.csv", mimeType: "text/csv", buffer: Buffer.from("x\n1\n") });
out.fresh = (await result()).slice(0, 140);

// 2. a URL in the card
await page.evaluate(() => window.__ask({ prompt: "or a link to it" }));
await card.waitFor({ timeout: 5000 });
await card.locator('input[type=url]').fill("https://files.example/sales2.csv");
await card.locator('button:text("Use URL")').click();
out.url = (await result()).slice(0, 200);

// 3. skip
await page.evaluate(() => window.__ask({ prompt: "anything" }));
await card.waitFor({ timeout: 5000 });
await card.locator('button:text("Skip")').click();
out.skip = (await result()).slice(0, 120);

// 4. Stop while waiting (the turn's abort signal)
await page.evaluate(() => window.__ask({ prompt: "never answered" }));
await card.waitFor({ timeout: 5000 });
await page.evaluate(() => window.__req.ctrl.abort());
out.abort = (await result()).slice(0, 120);
out.cardHiddenAfterAbort = !(await card.isVisible().catch(() => false));
// 5. the tool list never goes partial while writes and attachments recompute the file tools
out.toolGaps = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const tv = [...rt._variables].find(v => v._name === "toolsView")._value;
  const need = ["read_file", "write_file", "edit_file", "request_files", "eval_js"];
  const gaps = [];
  let on = true;
  (async () => { while (on) { const ids = new Set((tv.value || []).map(t => t.id)); const miss = need.filter(n => !ids.has(n)); if (miss.length) gaps.push(miss.join(",")); await new Promise(r => setTimeout(r, 5)); } })();
  const w = window.__tools;
  for (let i = 0; i < 3; i++) {
    await w.get("write_file").execute({ file_path: "/src/@probe/data.js", content: `export default function define(runtime, observer) {\n  const main = runtime.module();\n  main.variable(observer("n")).define("n", [], () => ${"$"}{i});\n  return main;\n}` }, {});
    await w.get("attach_file").execute({ module: "@probe/data", name: "extra" + i + ".txt", content: "x" }, {});
    await new Promise(r => setTimeout(r, 400));
  }
  await new Promise(r => setTimeout(r, 1500));
  on = false;
  return { samplesMissing: gaps.length, examples: [...new Set(gaps)].slice(0, 3) };
});
out.pageErrors = errors.slice(0, 3);
console.log(JSON.stringify(out, null, 1));
await browser.close();
