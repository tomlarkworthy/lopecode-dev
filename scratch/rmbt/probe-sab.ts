// Is SharedArrayBuffer actually usable in the two contexts lopecode ships to?
// Blob-URL workers are not the question -- a dedicated worker inherits the
// DOCUMENT's cross-origin isolation, so the gate is COOP/COEP on the page, not
// how the worker was constructed. Test it end to end: construct a SAB, hand it
// to a blob worker, have the worker WRITE, and check the main thread sees it.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const HARNESS = "/private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/40aff158-59d3-49c2-abe8-e6f169b2de78/scratchpad/sab.html";
writeFileSync(HARNESS, "<!doctype html><title>sab</title><body>sab probe");

const PROBE = `(async () => {
  const out = {
    crossOriginIsolated: self.crossOriginIsolated,
    hasSAB: typeof SharedArrayBuffer,
    hasWasmSharedMem: (() => { try { new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true }); return "ok"; }
                              catch (e) { return e.name + ": " + String(e.message).slice(0, 60); } })(),
    construct: null, shareToWorker: null, atomicsWait: null
  };
  let sab = null;
  try { sab = new SharedArrayBuffer(1024); out.construct = "ok (" + sab.byteLength + " bytes)"; }
  catch (e) { out.construct = e.name + ": " + String(e.message).slice(0, 80); return out; }

  // Atomics.wait is the actual prize -- it is what replaces postMessage wake
  // latency. It throws on the main thread by design, so test it for shape only.
  try { Atomics.wait(new Int32Array(sab), 0, 1, 0); out.atomicsWait = "callable"; }
  catch (e) { out.atomicsWait = e.name + ": " + String(e.message).slice(0, 60); }

  const src = 'self.onmessage = (e) => { try { const a = new Int32Array(e.data); ' +
              'Atomics.store(a, 0, 42); self.postMessage({ ok: true, saw: a.length }); } ' +
              'catch (err) { self.postMessage({ ok: false, err: String(err.message) }); } };';
  const w = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  out.shareToWorker = await new Promise((res) => {
    const t = setTimeout(() => res("timeout"), 3000);
    w.onmessage = (e) => {
      clearTimeout(t);
      if (!e.data.ok) return res("worker threw: " + e.data.err);
      // The real proof: a write made INSIDE the worker visible out here.
      res(new Int32Array(sab)[0] === 42 ? "SHARED - worker write visible on main thread" : "sent but not shared (copy)");
    };
    try { w.postMessage(sab); } catch (e) { clearTimeout(t); res("postMessage threw: " + e.name + ": " + String(e.message).slice(0, 70)); }
  });
  w.terminate();
  return out;
})()`;

const browser = await chromium.launch({ headless: true });
for (const [label, url] of [
  ["file:// (single-file distribution)", "file://" + HARNESS],
  ["GitHub Pages (https)", "https://tomlarkworthy.github.io/lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html"]
] as [string, string][]) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    console.log("\n=== " + label + " ===");
    console.log(JSON.stringify(await page.evaluate(PROBE), null, 1));
  } catch (e: any) {
    console.log("\n=== " + label + " ===\n  FAILED: " + e.message.slice(0, 120));
  }
  await page.close();
}
await browser.close();
