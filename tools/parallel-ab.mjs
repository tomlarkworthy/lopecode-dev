// Honest A/B: identical inputs, only the userspace policy differs.
import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
p.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 160)));
await p.goto("file:///tmp/@tomlarkworthy_parallel-runtime-qa.html");
await p.waitForFunction(() => !!window.__ojs_hooks, null, { timeout: 60000 });
await p.waitForFunction(() => !!window.__ojs_hooks.policy, null, { timeout: 90000 });
// controls render after the policy installs; wait for each before driving it
await p.waitForFunction(() => {
  const r = [...document.querySelectorAll("input[type=range]")].some((el) => (el.closest("form")?.textContent || "").includes("samples"));
  const c = [...document.querySelectorAll("input[type=checkbox]")].some((el) => (el.closest("form")?.textContent || "").includes("parallel policy"));
  const btn = [...document.querySelectorAll("button")].some((el) => el.textContent.trim() === "re-render");
  return r && c && btn;
}, null, { timeout: 90000 });
console.log("seam + userspace policy ready, controls present");

const setPolicy = (on) => p.evaluate((on) => {
  const cb = [...document.querySelectorAll("input[type=checkbox]")]
    .find((el) => el.closest("form")?.textContent.includes("parallel policy"));
  if (!cb) throw new Error("policy toggle not found");
  if (cb.checked !== on) cb.click();
}, on);
const setSpp = (v) => p.evaluate((v) => {
  const r = [...document.querySelectorAll("input[type=range]")].find((el) => el.closest("form")?.textContent.includes("samples"));
  r.value = String(v); r.dispatchEvent(new Event("input", { bubbles: true }));
}, v);
const rerender = () => p.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((el) => el.textContent.trim() === "re-render");
  if (!btn) throw new Error("re-render button not found");
  btn.click();
});
const settled = async () => {
  await p.waitForFunction(() => {
    const rt = window.__ojs_hooks.runtime;
    for (const v of rt._variables) if (v._name === "figure") return v._value !== undefined;
  }, null, { timeout: 120000 });
  return p.evaluate(async () => {
    const rt = window.__ojs_hooks.runtime;
    let checksum = null, wall = null;
    for (const v of rt._variables) {
      if (v._name === "checksum") checksum = await v._promise;
    }
    const t = [...document.querySelectorAll("pre")].map((e) => e.textContent).find((x) => /wall/.test(x));
    wall = t && t.match(/wall ([\d.]+) s/)?.[1];
    const st = [...rt._variables].find((v) => v._name === "policyState")?._value;
    return { checksum, wall, attempts: st?.attempts, completed: st?.completed, failures: st?.failures,
      bands: [...(st?.byCell || new Map())].filter(([n]) => /^band\d$/.test(n))
        .map(([n, r]) => n + ":" + r.ok + "/" + r.tries + " " + r.ms.toFixed(0) + "ms") };
  });
};

await setSpp(40);
await p.waitForTimeout(2500);

for (const round of [{ on: true, tag: "policy ON " }, { on: false, tag: "policy OFF" },
                     { on: true, tag: "policy ON " }, { on: false, tag: "policy OFF" }]) {
  await setPolicy(round.on);
  await p.waitForTimeout(400);
  await rerender();
  await p.waitForTimeout(600);
  const r = await settled();
  console.log(`${round.tag} @40spp  wall ${String(r.wall).padStart(5)} s   checksum ${r.checksum.mean.toFixed(14)}   bands[${r.bands.join(" ")}]`);
}
const fps = await p.evaluate(() => [...document.querySelectorAll("span")].map((e) => e.textContent).find((t) => /worst/.test(t)));
console.log("liveness:", fps);
await p.screenshot({ path: "tools/screenshots/parallel-policy-ab.png" });
await b.close();
process.exit(0);
