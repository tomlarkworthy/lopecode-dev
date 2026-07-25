// Decisive check: on new.observablehq svg-lens, does the drawingCode editor bind a real variable?
//   bun tools/newobs-svglens-check.ts [url] [waitMs]
import { chromium } from "playwright";
const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/svg-lens";
const waitMs = Number(process.argv[3] ?? 30000);

const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await browser.newContext({ viewport: { width: 1400, height: 1000 } }).then((c) => c.newPage());
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(waitMs);

const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
const out = await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  const vars = rt ? [...rt._variables] : [];
  const dc = vars.find((v: any) => v._name === "drawingCode");
  const mod: any = dc?._module;
  const scope = mod?._scope;
  const getName = (n: string) => { const v = scope?.get(n); return v ? (v._value !== undefined ? `Var(${v._value?.constructor?.name})` : "Var(pending)") : "MISS"; };
  const dcDiv = document.querySelector('[cell="drawingCode"], [data-sg-key="drawingCode"]');
  return {
    drawingCodeComputed: dc ? (dc._value !== undefined ? dc._value?.constructor?.name : dc._error ? "ERR:" + dc._error : "pending") : "absent",
    scope_viewof_drawing_legacy: getName("viewof drawing"),
    scope_viewof$drawing_platform: getName("viewof$drawing"),
    scopeKeysWithDrawing: scope ? [...scope.keys()].filter((k: string) => /drawing/i.test(k)) : [],
    drawingCodeHasCM: !!dcDiv?.querySelector(".cm-editor, .cm-content"),
    drawingCodeText: (dcDiv?.textContent ?? "").trim().slice(0, 80),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
