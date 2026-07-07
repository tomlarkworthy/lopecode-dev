// Shared Playwright boot for robocoop-5's no-model checks (boot-smoke, import-heal-test).
// Launches headless Chromium on the notebook, waits for the runtime, and installs window.__nbHelpers
// (allVars / byName / force) so page.evaluate callbacks don't each re-declare the runtime walkers.
import { chromium } from "playwright";

const HELPERS = `
window.__nbHelpers = {
  allVars() {
    const reg = globalThis.__ojs_runtime;
    const out = []; const seen = new Set();
    for (const m of reg.mains.values()) {
      const rt = m && m._runtime;
      if (!rt || seen.has(rt)) continue;
      seen.add(rt);
      for (const v of rt._variables) out.push(v);
    }
    return out;
  },
  byName(n) { const v = this.allVars().find((x) => x._name === n); return v && v._value; },
  force(n) {
    const v = this.allVars().find((x) => x._name === n);
    try { if (v && v._module && typeof v._module.value === "function") v._module.value(n).catch(() => {}); } catch {}
  },
};
`;

export async function bootNotebook({ notebookPath, layout, headless = true, timeout = 30000 } = {}) {
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
  await page.addInitScript({ content: HELPERS });
  await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil: "load", timeout });
  await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout });
  return { browser, page, consoleErrors, close: () => browser.close().catch(() => {}) };
}
