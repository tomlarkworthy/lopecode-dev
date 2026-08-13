// First-visit check (empty localStorage, no key): the notebook must explain the demo
// gateway, ship NO key of its own, offer only models the gateway can serve, and boot a
// session anyway. Complements boot-test-notebook.mjs, which drives a full session.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1100, height: 720 } });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => typeof window.__autostart === "function", { timeout: 45000 });
await p.waitForSelector("#cb-demo", { timeout: 15000 });
await p.waitForFunction(() => document.querySelectorAll("#cb-models option").length > 0, { timeout: 30000 }).catch(() => {});
await p.waitForSelector("#cb-cli-frame", { timeout: 60000 }).catch(() => {});
const r = await p.evaluate(() => {
  const demo = document.querySelector("#cb-demo");
  const opts = [...document.querySelectorAll("#cb-models option")].map(o => o.value);
  return {
    demoVisible: getComputedStyle(demo).display !== "none",
    demoMentionsGateway: /gateway/i.test(demo.textContent),
    demoMentionsLimits: /rate limit|budget|spent/i.test(demo.textContent),
    keyFieldValue: document.querySelector("#cb-key").value,        // no key stored
    noKeyAnywhereInPage: !/sk-or-v1-\w{20}/.test(document.documentElement.outerHTML),
    modelCount: opts.length,
    hasMimo: opts.includes("xiaomi/mimo-v2.5-pro"),
    hint: document.querySelector("#cb-model-hint").textContent,
    status: document.querySelector("#cb-status").textContent,
    bootsWithoutAKey: !!document.querySelector("#cb-cli-frame"),
    startButtonGone: !document.querySelector("#cb-start"),
  };
});
console.log(JSON.stringify(r, null, 2));
await p.screenshot({ path: "/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu/nb-5-demo.png" }).catch(()=>{});
await b.close(); process.exit(0);
