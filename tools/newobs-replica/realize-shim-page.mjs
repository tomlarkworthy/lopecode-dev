// Does realize's <script type="module-shim"> branch actually resolve an import from EMBEDDED
// content, where eval() would go to the network?
//
// Every headless suite so far exercised only realize's FALLBACK branch (runtime-sdk cannot load
// without an importmap), which is precisely the branch that HAS the bypass. So none of them are
// evidence for the claim. This needs a real page, and it is differential on purpose:
//
//   arm A  realize(...)  -> shim branch -> resolve hook -> <script id="@tomlarkworthy/cell-map">
//                        -> must SUCCEED with ZERO requests to api.observablehq.com
//   arm B  eval(...)     -> import() never reaches the hook -> real network
//                        -> must FAIL, with >=1 BLOCKED request to api.observablehq.com
//
// Arm B is the control. Without it a passing arm A only proves "the network worked". The api URL is
// route-blocked, so a success in arm A can ONLY have come from embedded content.
//
// Chromium needs --no-sandbox under safehouse (knowledge/lopecode-internal-networking.md:110);
// without it outbound network is blocked for unrelated reasons and BOTH arms fail, which would look
// like a confirmation.
//
// run: node tools/newobs-replica/realize-shim-page.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const NOTEBOOK = path.resolve(here, "../lch-lp2.html");
const TARGET = "@tomlarkworthy/cell-map"; // embedded in this notebook; verified via <script id> scan
const SRC = `async () => (await import("https://api.observablehq.com/${TARGET}.js?v=4")).default`;

const R = (...a) => console.log("RESULT", ...a);

const browser = await chromium.launch({
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});
const page = await browser.newPage();

// The measurement. Anything reaching the real Observable API is a bypass of the resolve hook.
const apiHits = [];
await page.route("**://api.observablehq.com/**", (route) => {
  apiHits.push(route.request().url());
  route.abort();
});

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 160)));

await page.goto("file://" + NOTEBOOK, { waitUntil: "domcontentloaded" });

// Boot is async; wait for the runtime the injected module-shim script itself reads.
await page.waitForFunction(() => !!window.__ojs_runtime, null, { timeout: 60000 });

const probe = await page.evaluate(() => ({
  hasRuntime: !!window.__ojs_runtime,
  hasImportShim: typeof window.importShim === "function",
  globalImportShim: !!window.__ojs_runtime?._global?.("importShim"),
  hasTargetScript: !!document.getElementById("@tomlarkworthy/cell-map"),
  hasSdkScript: !!document.getElementById("@tomlarkworthy/runtime-sdk")
}));
R("probe", JSON.stringify(probe));

// realize takes the shim branch ONLY if this is truthy; if it is false the whole run is vacuous.
if (!probe.globalImportShim) {
  R("VACUOUS runtime._global('importShim') is falsy -> realize would take the eval fallback");
}

const hitsBefore = apiHits.length;

// ---- arm A: through realize -------------------------------------------------------------------
const armA = await page.evaluate(async (src) => {
  try {
    const rt = window.__ojs_runtime;
    const sdk = await window.importShim("@tomlarkworthy/runtime-sdk");
    const m = rt.module(sdk.default);
    const realize = await m.value("realize");
    const [fn] = await realize([src], rt);
    const def = await fn();
    return { ok: true, type: typeof def, isFn: typeof def === "function" };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e).slice(0, 200) };
  }
}, SRC);
const hitsAfterA = apiHits.length;
R("armA.realize", JSON.stringify(armA), "apiHitsDuringA=" + (hitsAfterA - hitsBefore));

// ---- arm B: through eval (the control) ---------------------------------------------------------
const armB = await page.evaluate(async (src) => {
  try {
    let f;
    // eslint-disable-next-line no-eval
    eval("f = " + src);
    const def = await f();
    return { ok: true, type: typeof def };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e).slice(0, 200) };
  }
}, SRC);
const hitsAfterB = apiHits.length;
R("armB.eval", JSON.stringify(armB), "apiHitsDuringB=" + (hitsAfterB - hitsAfterA));

R("apiHits.total", apiHits.length, JSON.stringify(apiHits.slice(0, 5)));
R("pageErrors", pageErrors.length, JSON.stringify(pageErrors.slice(0, 3)));

// ---- verdict -----------------------------------------------------------------------------------
const aClean = armA.ok && armA.isFn && hitsAfterA - hitsBefore === 0;
const bFailed = !armB.ok;
const bTriedNetwork = hitsAfterB - hitsAfterA >= 1;
R("verdict.armA_resolved_from_embedded", aClean);
R("verdict.armB_failed_offline", bFailed);
R("verdict.armB_hit_network", bTriedNetwork);
R("verdict.DIFFERENTIAL_HOLDS", aClean && bFailed && bTriedNetwork);

await browser.close();
