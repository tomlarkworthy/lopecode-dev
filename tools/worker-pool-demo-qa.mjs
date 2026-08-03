import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
p.on("pageerror", (e) => console.log("PAGEERR", e.message));
p.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 200)); });
await p.goto("file://" + process.cwd() + "/notebooks/@tomlarkworthy_worker-pool-demo.html");
await p.waitForFunction(() => !!window.__ojs_runtime, null, { timeout: 60000 });
await p.waitForFunction(() => [...document.querySelectorAll("pre")].some((el) => /throughput/.test(el.textContent)), null, { timeout: 60000 });

const grab = async () => p.evaluate(() => ({
  stats: [...document.querySelectorAll("pre")].map((e) => e.textContent).find((t) => /throughput/.test(t)),
  fps: [...document.querySelectorAll("span")].map((e) => e.textContent).find((t) => /worst/.test(t)),
  workerCount: performance.now() // placeholder
}));

// engine radio: find by scoping to the label "engine" group
const setEngine = (val) => p.evaluate((val) => {
  const radio = [...document.querySelectorAll("input[type=radio]")]
    .find((r) => r.closest("label")?.textContent.trim() === val);
  if (!radio) throw new Error("no radio labelled " + val);
  radio.click();
}, val);

await p.waitForTimeout(6000);
let r = await grab();
console.log("=== workers ===\n" + r.stats + "\nliveness: " + r.fps);
await p.screenshot({ path: "tools/screenshots/worker-pool-demo-workers.png" });

await setEngine("main thread");
await p.waitForTimeout(12000);
r = await grab();
console.log("=== main thread ===\n" + r.stats + "\nliveness: " + r.fps);
await p.screenshot({ path: "tools/screenshots/worker-pool-demo-main.png" });

await setEngine("workers");
await p.waitForTimeout(6000);
r = await grab();
console.log("=== back to workers ===\n" + r.stats + "\nliveness: " + r.fps);
await p.screenshot({ path: "tools/screenshots/worker-pool-demo-final.png" });

// teardown check: after invalidation cycles, no leaked in-flight state -> drive nWorkers slider and confirm restart
await p.evaluate(() => {
  const num = [...document.querySelectorAll("input[type=number]")]
    .find((r) => r.closest("form")?.textContent.includes("workers"));
  const range = [...document.querySelectorAll("input[type=range]")]
    .find((r) => r.closest("form")?.textContent.includes("workers"));
  const el = range || num;
  if (!el) throw new Error("no workers slider found");
  el.value = "2"; el.dispatchEvent(new Event("input", { bubbles: true }));
});
await p.waitForTimeout(5000);
r = await grab();
console.log("=== nWorkers=2 (invalidation restart) ===\n" + r.stats);
await b.close();
