// Verify the fixed bundle: (1) module titles still resolve via invokeVariable, (2) currentModules
// stops re-yielding identical maps, (3) the robocoop-5 prompt textarea keeps focus.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { bootNotebook } from "./lib/notebook-boot.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const LAYOUT = "R100(S50(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

const { page, consoleErrors, close } = await bootNotebook({ notebookPath: join(here, "fix-test.html"), layout: LAYOUT, timeout: 45000 });
// give the pipeline a few seconds to resolve titles
await page.evaluate(() => new Promise(r => setTimeout(r, 5000)));

const out = await page.evaluate(async () => {
  const rt = globalThis.__ojs_runtime;
  let R = null; for (const m of rt.mains.values()) { if (m?._runtime) { R = m._runtime; break; } }
  // read currentModules value + stability
  let cm = null; for (const v of R._variables) if (v._name === "currentModules" && String(v._definition).includes("identity")) cm = cm || v;
  const readTitles = () => { const o = []; if (cm?._value instanceof Map) for (const [, info] of cm._value) o.push({ name: info.name, title: info.title }); return o; };
  const a = cm?._value;
  await new Promise(r => setTimeout(r, 1500));
  const b = cm?._value;
  const titles = readTitles();
  const timeouts = titles.filter(t => /TIMEOUT/.test(t.title || "")).map(t => t.name);
  // focus test on the chat textarea
  const ta1 = document.querySelector('textarea[placeholder^="Message robocoop-5"]');
  if (ta1) ta1.focus();
  let lostAt = null; const s = performance.now();
  await new Promise(res => { const iv = setInterval(() => { if (document.activeElement !== ta1 && lostAt === null) lostAt = Math.round(performance.now() - s); if (performance.now() - s > 2500) { clearInterval(iv); res(); } }, 50); });
  const ta2 = document.querySelector('textarea[placeholder^="Message robocoop-5"]');
  return {
    moduleCount: titles.length,
    resolvedTitles: titles.filter(t => t.title && !/TIMEOUT/.test(t.title)).length,
    timeoutTitles: timeouts,
    rc5Title: (titles.find(t => t.name === "@tomlarkworthy/robocoop-5") || {}).title,
    currentModulesReYielded: a !== b,
    facadePresent: !!ta1,
    lostFocusAfterMs: lostAt,
    textareaReplaced: ta1 !== ta2,
    stillFocused: document.activeElement === ta1,
  };
});
console.log(JSON.stringify(out, null, 2));
if (consoleErrors.length) console.log("consoleErrors:", consoleErrors.slice(0, 6));
await close();
const pass = out.facadePresent && out.lostFocusAfterMs === null && !out.textareaReplaced && out.stillFocused
  && out.currentModulesReYielded === false && out.resolvedTitles >= 5;
console.log(pass ? "\nPASS — titles resolve, currentModules stable, focus retained" : "\nFAIL");
process.exit(pass ? 0 : 1);
