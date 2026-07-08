// Validate the srctools importShim fix two ways:
//  (1) happy path — drive the real write_file tool through the rewired applyModuleSrc (regression)
//  (2) Observable path — native import() of a blob ES module works in-browser (the polyfill fallback)
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { bootNotebook } from "./lib/notebook-boot.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const NB = join(here, "jumpgate-test.html");
const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

const { page, consoleErrors, close } = await bootNotebook({ notebookPath: NB, layout: LAYOUT, timeout: 45000 });

const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsReady", "hostSetup", "toolsView"].forEach((n) => H.force(n));
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const tv = H.byName("toolsView");
    if (tv && Array.isArray(tv.value) && tv.value.length >= 10) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  const tools = (H.byName("toolsView")?.value) || [];
  const write = tools.find((t) => t.id === "write_file");

  // (1) happy path: apply a tiny module via write_file -> applyModuleSrc (now uses imported importShim)
  const mod = 'export default function define(runtime, observer){\n' +
    '  const main = runtime.module();\n' +
    '  main.variable(observer("probeCell")).define("probeCell", [], () => 42);\n' +
    '  return main;\n}\n';
  let applyOut = "(write_file tool missing)";
  if (write) {
    const r = await write.execute({ file_path: "/src/@tomlarkworthy/rc5-importshim-probe.js", content: mod });
    applyOut = (r && (r.output || r.msg || JSON.stringify(r))) || "(no output)";
  }

  // (2) Observable fallback: native import() of a blob module (what the polyfill does off-lopecode)
  let nativeOk = false, nativeErr = null;
  try {
    const url = URL.createObjectURL(new Blob([mod], { type: "text/javascript" }));
    try { const m = await import(url); nativeOk = typeof m.default === "function"; }
    finally { URL.revokeObjectURL(url); }
  } catch (e) { nativeErr = String(e && e.message || e); }

  return { toolCount: tools.length, applyOut, nativeOk, nativeErr };
});

console.log("tool count :", out.toolCount);
console.log("write_file :", out.applyOut);
console.log("native import(blob) works (Observable fallback):", out.nativeOk, out.nativeErr || "");
console.log("console errors:", consoleErrors.length ? consoleErrors.slice(0, 6) : "none");
await close();
const pass = out.toolCount >= 10 && /applied/i.test(out.applyOut) && out.nativeOk;
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
