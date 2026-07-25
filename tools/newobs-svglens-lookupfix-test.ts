// Prove the runtime-sdk lookupVariable name-canonicalisation fix on LIVE new.observablehq svg-lens
// by rewriting the served runtime-sdk.js in flight. Nothing on Observable changes.
//   bun tools/newobs-svglens-lookupfix-test.ts [url] [waitMs]
//   NO_PATCH=1 ... for the unpatched baseline
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/svg-lens";
const waitMs = Number(process.argv[3] ?? 30000);
const PATCH = !process.env.NO_PATCH;

const OLD = `        let v, retries, name = name_or_names;
        while (!module._scope.get(name) && retries++ < 1000) {
            await new Promise(r => requestAnimationFrame(r));
        }
        return module._scope.get(name);`;

// slice NEW straight out of the working copy so they can't drift
const wc = readFileSync("modules/@tomlarkworthy/runtime-sdk.js", "utf8");
const s = wc.indexOf("        const name = name_or_names;");
const e = wc.indexOf("        return get();", s);
if (s < 0 || e < 0) throw new Error("could not slice the fix out of the working copy");
const NEW = wc.slice(s, e + "        return get();".length);

const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

let patched = 0;
if (PATCH) {
  await page.route("**/runtime-sdk.js*", async (route) => {
    const res = await ctx.request.get(route.request().url());
    let src = await res.text();
    if (!src.includes(OLD)) throw new Error("patch target not found in " + route.request().url());
    src = src.replace(OLD, () => NEW); // fn form: NEW contains $1/$$ which string-replace would mangle
    patched++;
    await route.fulfill({
      status: 200, body: src,
      headers: { "content-type": "text/javascript; charset=utf-8", "access-control-allow-origin": "*" },
    });
  });
}

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(waitMs);

const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
const out = await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  const vars = rt ? [...rt._variables] : [];
  const dc = vars.find((v: any) => v._name === "drawingCode");
  const mod: any = dc?._module;
  const boundVal = dc?._value;
  // Does the bound cellEditor host contain a CM? Search the drawingCode value node directly.
  const hostHasCM = boundVal instanceof Element ? !!boundVal.querySelector?.(".cm-editor, .cm-content") : "notElement";
  const dcDiv = document.querySelector('[cell="drawingCode"], [data-sg-key="drawingCode"]');
  return {
    drawingCodeComputed: dc ? (dc._error ? "ERR:" + String(dc._error).slice(0,120) : dc._value?.constructor?.name) : "absent",
    lookup_legacy: mod?._scope?.get("viewof drawing") ? "HIT" : "MISS",
    lookup_platform: mod?._scope?.get("viewof$drawing") ? "HIT" : "MISS",
    boundValTag: boundVal?.constructor?.name,
    hostHasCM,
    pageCMEditors: document.querySelectorAll(".cm-editor").length,
    atomHasCM: !!dcDiv?.querySelector(".cm-editor, .cm-content"),
    atomText: (dcDiv?.textContent ?? "").trim().slice(0, 90),
  };
});
console.log(`patch active: ${PATCH}   modules rewritten: ${patched}`);
console.log(JSON.stringify(out, null, 1));
await page.screenshot({ path: `tools/screenshots/svglens-lookupfix-${PATCH ? "patched" : "baseline"}.png`, fullPage: true });
await browser.close();
