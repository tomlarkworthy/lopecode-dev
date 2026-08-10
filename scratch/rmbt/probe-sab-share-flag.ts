// The flag restores the SAB constructor. But last time the refusal came at
// postMessage ("SharedArrayBuffer transfer requires self.crossOriginIsolated"),
// so construction proves nothing. Does a worker actually SEE a main-thread
// write, and does Atomics.wait/notify cross the boundary?
import { chromium } from "playwright";
const HARNESS = "file:///private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/40aff158-59d3-49c2-abe8-e6f169b2de78/scratchpad/sab.html";
const PROBE = `(async () => {
  const sab = new SharedArrayBuffer(1024);
  const a = new Int32Array(sab);
  const src = 'self.onmessage = (e) => { try {' +
    ' const a = new Int32Array(e.data);' +
    ' Atomics.store(a, 0, 42);' +          // worker writes
    ' const r = Atomics.wait(a, 1, 0, 50);' + // worker parks: THE prize
    ' self.postMessage({ ok: true, wait: r, saw: Atomics.load(a, 2) });' +
    '} catch (err) { self.postMessage({ ok: false, err: err.name + ": " + err.message }); } };';
  const w = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  Atomics.store(a, 2, 99); // main-thread write the worker should observe
  const res = await new Promise((r) => {
    const t = setTimeout(() => r({ ok: false, err: "timeout" }), 3000);
    w.onmessage = (e) => { clearTimeout(t); r(e.data); };
    try { w.postMessage(sab); } catch (e) { clearTimeout(t); r({ ok: false, err: "postMessage: " + e.name + ": " + e.message.slice(0,60) }); }
  });
  w.terminate();
  return { coi: self.crossOriginIsolated, workerResult: res,
           mainSeesWorkerWrite: Atomics.load(a, 0) === 42 };
})()`;
for (const [label, args] of [["with --enable-features=SharedArrayBuffer", ["--enable-features=SharedArrayBuffer"]]] as [string,string[]][]) {
  const b = await chromium.launch({ headless: true, args });
  const p = await b.newPage();
  await p.goto(HARNESS, { waitUntil: "domcontentloaded", timeout: 30000 });
  console.log("=== " + label + " ===");
  console.log(JSON.stringify(await p.evaluate(PROBE), null, 1));
  await b.close();
}
