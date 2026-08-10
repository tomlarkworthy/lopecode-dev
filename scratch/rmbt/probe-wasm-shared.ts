// WebAssembly.Memory({shared:true}) constructs without cross-origin isolation.
// Does its buffer actually SHARE across a worker boundary, or does Chrome only
// let you build it and then refuse to post it? That is the whole question: a
// shared buffer would let workers park on Atomics.wait instead of paying
// postMessage wake latency, with no COOP/COEP and no service worker.
import { chromium } from "playwright";
const PROBE = `(async () => {
  const mem = new WebAssembly.Memory({ initial: 2, maximum: 2, shared: true });
  const buf = mem.buffer;
  const out = {
    bufferCtor: buf.constructor.name,
    isSABInstance: typeof SharedArrayBuffer !== "undefined" ? (buf instanceof SharedArrayBuffer) : "SAB global undefined",
    byteLength: buf.byteLength
  };
  const src = 'self.onmessage = (e) => { try {' +
    ' const m = e.data.mem, a = new Int32Array(m.buffer);' +
    ' Atomics.store(a, 0, 42);' +
    ' const w = Atomics.wait(a, 1, 0, 0);' +   // proves this is a shareable block
    ' self.postMessage({ ok: true, waitResult: w }); } ' +
    'catch (err) { self.postMessage({ ok: false, err: err.name + ": " + err.message }); } };';
  const w = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  out.postMemory = await new Promise((res) => {
    const t = setTimeout(() => res("timeout"), 3000);
    w.onmessage = (e) => { clearTimeout(t);
      if (!e.data.ok) return res("worker threw: " + e.data.err);
      res(new Int32Array(mem.buffer)[0] === 42
        ? "SHARED - worker write visible on main thread (Atomics.wait=" + e.data.waitResult + ")"
        : "posted but NOT shared"); };
    try { w.postMessage({ mem }); } catch (e) { clearTimeout(t); res("postMessage(Memory) threw: " + e.name + ": " + e.message.slice(0,70)); }
  });
  w.terminate();
  return out;
})()`;
const b = await chromium.launch({ headless: true });
for (const [label, url] of [["file://", "file:///private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/40aff158-59d3-49c2-abe8-e6f169b2de78/scratchpad/sab.html"],
                            ["https (Pages)", "https://tomlarkworthy.github.io/lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html"]] as [string,string][]) {
  const p = await b.newPage();
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  console.log("\n=== " + label + " ===");
  console.log(JSON.stringify(await p.evaluate(PROBE), null, 1));
  await p.close();
}
await b.close();
