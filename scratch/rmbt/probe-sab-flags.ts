// Is there ANY opt-in that gets SAB onto file://? Try the documented escape
// hatches. If one works it only helps a controlled machine (a dev loop, a
// kiosk), never a notebook someone else opens -- but that is still worth
// knowing before designing around the restriction.
import { chromium } from "playwright";
const HARNESS = "file:///private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/40aff158-59d3-49c2-abe8-e6f169b2de78/scratchpad/sab.html";
const PROBE = `(() => {
  const o = { coi: self.crossOriginIsolated, sab: typeof SharedArrayBuffer };
  try { const s = new SharedArrayBuffer(64); const a = new Int32Array(s);
        Atomics.store(a, 0, 7); o.atomics = "usable, load=" + Atomics.load(a, 0); }
  catch (e) { o.atomics = e.name; }
  return o;
})()`;
const ARMS: [string, string[]][] = [
  ["(no flags)", []],
  ["--enable-features=SharedArrayBuffer", ["--enable-features=SharedArrayBuffer"]],
  ["SharedArrayBufferUnrestrictedAccessAllowed", ["--enable-features=SharedArrayBufferUnrestrictedAccessAllowed"]],
  ["--disable-web-security", ["--disable-web-security"]],
  ["--allow-file-access-from-files", ["--allow-file-access-from-files"]],
  ["combo: web-security off + SAB feature", ["--disable-web-security", "--enable-features=SharedArrayBuffer", "--allow-file-access-from-files"]],
];
for (const [label, args] of ARMS) {
  let b;
  try {
    b = await chromium.launch({ headless: true, args });
    const p = await b.newPage();
    await p.goto(HARNESS, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log(label.padEnd(46), JSON.stringify(await p.evaluate(PROBE)));
  } catch (e: any) { console.log(label.padEnd(46), "FAILED: " + e.message.slice(0, 60)); }
  finally { if (b) await b.close(); }
}
