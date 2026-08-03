import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
p.on("pageerror", (e) => console.log("PAGEERR", e.message));
p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 250)); });
await p.goto("file:///tmp/@tomlarkworthy_parallel-runtime-qa.html");
await p.waitForFunction(() => !!window.__ojs_hooks, null, { timeout: 60000 });
console.log("hook seam active");
await p.waitForFunction(() => [...document.querySelectorAll("pre")].some((el) => /wall/.test(el.textContent)), null, { timeout: 90000 });
// wait for the userspace policy to finish installing (it imports acorn)
await p.waitForFunction(() => !!window.__ojs_hooks.policy, null, { timeout: 90000 });
console.log("userspace policy installed");

const grab = () => p.evaluate(() => ({
  figure: [...document.querySelectorAll("pre")].map((e) => e.textContent).find((t) => /wall/.test(t)),
  stats: (() => {
    for (const v of window.__ojs_hooks.runtime._variables)
      if (v._name === "policyState" && v._value) {
        const s = v._value;
        return { attempts: s.attempts, completed: s.completed, declined: s.declined,
                 failures: s.failures, workerMs: Math.round(s.workerMs), log: s.log.slice(0, 8) };
      }
    return null;
  })(),
  liveness: [...document.querySelectorAll("span")].map((e) => e.textContent).find((t) => /worst/.test(t))
}));

let r = await grab();
console.log("=== initial (parallel) ===");
console.log(r.figure);
console.log("stats:", JSON.stringify(r.stats, null, 1));
console.log("liveness:", r.liveness);
await p.screenshot({ path: "tools/screenshots/parallel-runtime-initial.png" });

// bump spp to 32 to make the recompute heavy, still parallel
const setSpp = (v) => p.evaluate((v) => {
  const range = [...document.querySelectorAll("input[type=range]")]
    .find((el) => el.closest("form")?.textContent.includes("samples"));
  range.value = String(v);
  range.dispatchEvent(new Event("input", { bubbles: true }));
}, v);
await setSpp(32);
await p.waitForFunction(() => [...document.querySelectorAll("pre")].some((el) => /@ 32 spp/.test(el.textContent)), null, { timeout: 60000 });
await p.waitForTimeout(300);
r = await grab();
console.log("\n=== spp=32 parallel ===");
console.log(r.figure);
console.log("liveness:", r.liveness);

// switch engine off (toggle), then re-render at spp 33 to force recompute on main
await p.evaluate(() => {
  const cb = [...document.querySelectorAll("input[type=checkbox]")]
    .find((el) => el.closest("form")?.textContent.includes("parallel policy"));
  cb.click();
});
await p.waitForTimeout(500);
await setSpp(33);
await p.waitForFunction(() => [...document.querySelectorAll("pre")].some((el) => /@ 33 spp/.test(el.textContent)), null, { timeout: 120000 });
await p.waitForTimeout(300);
r = await grab();
console.log("\n=== spp=33 main thread ===");
console.log(r.figure);
console.log("liveness:", r.liveness);

// CORRECTNESS: same spp on both engines must agree bit-for-bit.
// Toggling `parallel` mutates parallelFlag -> cfg -> all eight bands recompute,
// so this is a genuine re-render on the other engine at identical inputs.
const checksumOf = () => p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  for (const v of rt._variables) if (v._name === "checksum") return await v._promise;
});
const cAfterMain = await checksumOf();
console.log("\nchecksum @ spp=33 main   :", JSON.stringify(cAfterMain));
await p.evaluate(() => {
  const cb = [...document.querySelectorAll("input[type=checkbox]")]
    .find((el) => el.closest("form")?.textContent.includes("parallel policy"));
  cb.click();
});
await p.waitForFunction(() => {
  const t = [...document.querySelectorAll("pre")].map((e) => e.textContent).find((x) => /wall/.test(x));
  return t && /^parallel/.test(t);
}, null, { timeout: 60000 });
await p.waitForTimeout(500);
const cAfterPar = await checksumOf();
console.log("checksum @ spp=33 parallel:", JSON.stringify(cAfterPar));
console.log("ENGINES AGREE:", JSON.stringify(cAfterMain) === JSON.stringify(cAfterPar) ? "YES (bit-identical)" : "NO -- MISMATCH");

// back to parallel at spp 34
await setSpp(34);
await p.waitForFunction(() => [...document.querySelectorAll("pre")].some((el) => /@ 34 spp/.test(el.textContent)), null, { timeout: 60000 });
r = await grab();
console.log("\n=== spp=34 parallel again ===");
console.log(r.figure);
console.log("final stats:", JSON.stringify(r.stats, null, 1));
await p.screenshot({ path: "tools/screenshots/parallel-runtime-final.png" });
await b.close();
