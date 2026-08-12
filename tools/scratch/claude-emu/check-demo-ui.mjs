// Verifies the demo key renders as copyable prose but is NOT auto-filled into the
// key field, and that the model datalist is populated from OpenRouter.
// Separate from boot-test-notebook.mjs on purpose: this is the FIRST-VISIT case, with
// empty localStorage. The boot-test must seed a working key to reach OpenRouter, which
// prefills the field and makes the no-autofill assertion vacuous.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1100, height: 720 } });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => typeof window.__autostart === "function", { timeout: 45000 });
await p.waitForSelector("#cb-demo", { timeout: 15000 });
await p.waitForFunction(() => document.querySelectorAll("#cb-models option").length > 0, { timeout: 30000 }).catch(() => {});
const r = await p.evaluate(() => {
  const demo = document.querySelector("#cb-demo");
  const opts = [...document.querySelectorAll("#cb-models option")].map(o => o.value);
  return {
    demoVisible: getComputedStyle(demo).display !== "none",
    demoMentionsMimo: /mimo/i.test(demo.textContent),
    demoMentionsBudget: /budget|spent/i.test(demo.textContent),
    keyFieldValue: document.querySelector("#cb-key").value,   // MUST be empty (no autofill)
    keyShownInProse: /sk-or-v1-\w{8}/.test(demo.textContent),
    modelCount: opts.length,
    hasMimo: opts.includes("xiaomi/mimo-v2.5-pro"),
    hint: document.querySelector("#cb-model-hint").textContent,
  };
});
console.log(JSON.stringify(r, null, 2));
await p.screenshot({ path: "/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu/nb-5-demo.png" }).catch(()=>{});
await b.close(); process.exit(0);
