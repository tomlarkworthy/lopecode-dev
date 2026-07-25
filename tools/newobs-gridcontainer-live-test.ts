// A/B the @tomlarkworthy/grid-container fix on the LIVE site by redefining the
// gridContainer variable in the page with the working-copy factory. Nothing is published.
//   bun tools/newobs-gridcontainer-live-test.ts [url] [waitMs]
//   NO_PATCH=1 ... for the baseline
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/grid-container";
const waitMs = Number(process.argv[3] ?? 32000);
const PATCH = !process.env.NO_PATCH;

// slice the factory out of the working copy
const wc = readFileSync("modules/@tomlarkworthy/grid-container.js", "utf8");
const marker = "const _79iuqn = function _gridContainer(";
const s = wc.indexOf(marker);
if (s < 0) throw new Error("gridContainer factory not found in working copy");
// cells are emitted as `const _id = ...` at column 0, so the next one ends this cell
const next = wc.indexOf("\nconst _", s + 1);
if (next < 0) throw new Error("could not find the end of the factory");
const FACTORY = wc.slice(s + "const _79iuqn = ".length, next).trim().replace(/;$/, "");
if (!/^function _gridContainer\(/.test(FACTORY) || !FACTORY.endsWith("}")) {
  throw new Error("factory slice looks wrong: " + FACTORY.slice(0, 60) + " … " + FACTORY.slice(-40));
}

const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1200 } })).newPage();
const errs = new Set<string>();
page.on("console", (m) => { if (m.type() === "error") errs.add(m.text().split("\n")[0].slice(0, 130)); });
page.on("pageerror", (e) => errs.add("[pageerror] " + e.message.slice(0, 130)));

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(waitMs);
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();

if (PATCH) {
  const redefined = await frame.evaluate((src) => {
    const rt: any = (window as any).__ojs_runtime;
    const v: any = [...rt._variables].find((x: any) => x._name === "gridContainer" && x._inputs?.length);
    if (!v) return "gridContainer variable not found";
    let fn: any;
    try { fn = (0, eval)("(" + src + ")"); } catch (e) { return "eval failed: " + e; }
    v.define("gridContainer", v._inputs.map((i: any) => i._name), fn);
    return "ok: " + v._inputs.map((i: any) => i._name).join(",");
  }, FACTORY);
  console.log("redefine:", redefined);
  await page.waitForTimeout(12000);
}

const state = await frame.evaluate(() => {
  const el: any = document.querySelector(".sg-frame");
  return {
    atoms: [...document.querySelectorAll(".sg-atom")].map((a: any) => a.getAttribute("cell")).sort(),
    candidates: el?.grid?.candidates?.() ?? null,
    templates: el?.grid?.templates?.() ?? null,
    atomDetail: [...document.querySelectorAll(".sg-atom")].map((a: any) => ({
      cellAttr: a.getAttribute("cell"),
      sgKey: a.dataset?.sgKey,
      label: a.querySelector(".sg-atom-title")?.textContent,
      pos: a.style.left + "," + a.style.top,
    })),
  };
});
console.log(`patch active: ${PATCH}`);
console.log(JSON.stringify(state, null, 1));
console.log("console errors:");
for (const e of errs) if (!/dependancy map|langApiRestored|Cannot sourceModule/.test(e)) console.log("  ", e);
await page.screenshot({ path: `tools/screenshots/newobs-grid-${PATCH ? "patched" : "baseline"}.png`, fullPage: false });
await browser.close();
