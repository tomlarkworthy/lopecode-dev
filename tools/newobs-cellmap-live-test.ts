// Validate the @tomlarkworthy/cell-map importedModule() fix on the LIVE new.observablehq.com
// by rewriting the served module in flight. Nothing on Observable changes.
//   bun tools/newobs-cellmap-live-test.ts [url] [waitMs]
//   NO_PATCH=1 ... for the unpatched baseline
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/grid-container";
const waitMs = Number(process.argv[3] ?? 32000);
const PATCH = !process.env.NO_PATCH;

const OLD = `    return await new Promise(async (resolve, reject) => {
      try {
        await v._definition({
          import: (...args) => resolve(args[2])
        });
      } catch (err) {
        if (v._definition.toString().includes("derive")) {
          console.error("Subbing derrived module for original", v);
          const derrived = await v._definition(v);
          resolve(derrived._source);
        } else {
          console.error("Cannot sourceModule for ", v);
          debugger;
          throw err;
        }
      }
    });`;

// take the replacement straight from the working copy so the two can't drift
const wc = readFileSync("modules/@tomlarkworthy/cell-map.js", "utf8");
const start = wc.indexOf("    const rt = v._module?._runtime;");
const end = wc.indexOf("      return captured;\n    }\n  }", start);
if (start < 0 || end < 0) throw new Error("could not slice the fix out of the working copy");
const NEW = wc.slice(start, end + "      return captured;\n    }".length);

const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

let patched = 0;
if (PATCH) {
  await page.route("**/cell-map.js*", async (route) => {
    const res = await ctx.request.get(route.request().url());
    let src = await res.text();
    if (!src.includes(OLD)) throw new Error("patch target not found in " + route.request().url());
    src = src.replace(OLD, NEW);
    patched++;
    await route.fulfill({
      status: 200, body: src,
      headers: { "content-type": "text/javascript; charset=utf-8", "access-control-allow-origin": "*" },
    });
  });
}

const errs = new Set<string>();
page.on("console", (m) => { if (m.type() === "error") errs.add(m.text().split("\n")[0].slice(0, 130)); });
page.on("pageerror", (e) => errs.add("[pageerror] " + e.message.slice(0, 130)));

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(waitMs);

const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
const state = await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  const vars = rt ? [...rt._variables] : [];
  const pending = vars.filter((v: any) => v._reachable && v._value === undefined && !v._error);
  const named = (n: string) => {
    const c = vars.filter((v: any) => v._name === n || v._name === n.replace("viewof ", "viewof$"));
    return c.length === 0 ? "absent" : c.map((v: any) => v._error ? "ERR" : v._value !== undefined ? "ok" : v._reachable ? "PENDING" : "unreached").join("/");
  };
  return {
    pendingCount: pending.length,
    pendingNames: [...new Set(pending.map((v: any) => v._name))].slice(0, 25),
    key: Object.fromEntries(["widget", "gridContainer", "cellEditor", "viewof liveCellMap", "editorTemplate", "editor_panel"].map((n) => [n, named(n)])),
    sgFrames: document.querySelectorAll(".sg-frame").length,
    sgAtoms: document.querySelectorAll(".sg-atom").length,
    errored: [...new Set([...document.querySelectorAll(".observablehq--error")].map((e) => (e.textContent ?? "").trim().slice(0, 110)))],
  };
});
console.log(`patch active: ${PATCH}   modules rewritten: ${patched}`);
console.log(JSON.stringify(state, null, 1));
console.log("console errors:");
for (const e of errs) if (!/dependancy map|langApiRestored|Cannot sourceModule/.test(e)) console.log("  ", e);

await page.screenshot({ path: `tools/screenshots/newobs-cellmap-${PATCH ? "patched" : "baseline"}.png`, fullPage: true });
await browser.close();
