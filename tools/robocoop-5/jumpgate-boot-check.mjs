// Boot the jumpgated multi-upstream bundle and confirm the tool registry populates
// (i.e. the Observable hostSetup import fix survived the round-trip). No model calls.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { bootNotebook } from "./lib/notebook-boot.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const NB = join(here, "jumpgate-test.html");
const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

const { page, consoleErrors, close } = await bootNotebook({ notebookPath: NB, layout: LAYOUT, timeout: 45000 });

const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsReady", "hostSetup", "toolsView", "session", "rc5_host"].forEach((n) => H.force(n));
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const tv = H.byName("toolsView");
    if (tv && Array.isArray(tv.value) && tv.value.length >= 10) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  const tv = H.byName("toolsView");
  const tools = tv && Array.isArray(tv.value) ? tv.value : [];
  const sess = H.byName("session");
  return {
    toolCount: tools.length,
    toolIds: tools.map((t) => t.id),
    sessionOk: !!(sess && typeof sess.send === "function"),
    hostSetup: Array.isArray(H.byName("hostSetup")) ? H.byName("hostSetup").length : typeof H.byName("hostSetup"),
  };
});

console.log(JSON.stringify(out, null, 2));
console.log("console errors:", consoleErrors.length ? consoleErrors.slice(0, 8) : "none");
await close();
process.exit(out.toolCount >= 10 && out.sessionOk ? 0 : 1);
