// Compare boot-peeker churn between the current bundle and the module-map/invokeVariable fix.
// The bug: title/import resolution creates+deletes an anonymous `(m)=>m` peeker on the bootloader
// `boot` variable (which never resolves), churning runtime._variables ~3-12Hz -> currentModules
// re-yields -> every consumer UI rebuilds -> the robocoop-5 prompt loses focus.
// This counts how many times that peeker is DEFINED over a fixed window. Fixed => ~0.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { bootNotebook } from "./lib/notebook-boot.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const LAYOUT = "R100(S50(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";
const WINDOW_MS = 6000;

async function measure(label, file) {
  const notebookPath = join(here, file);
  const { page, consoleErrors, close } = await bootNotebook({ notebookPath, layout: LAYOUT, timeout: 45000 });
  // let it settle/boot a moment, then hook define and count boot peekers over the window
  const res = await page.evaluate(async (WIN) => {
    const rt = globalThis.__ojs_runtime;
    // find the single runtime that owns bootloader
    let R = null;
    for (const m of rt.mains.values()) { if (m?._runtime) { R = m._runtime; break; } }
    R = R || (rt._variables ? rt : null);
    const proto = Object.getPrototypeOf([...R._variables][0]);
    let peekerDefines = 0, lastStack = null;
    const orig = proto.define;
    proto.define = function (...a) {
      try {
        let ddef = a.length >= 3 ? a[2] : (Array.isArray(a[0]) ? a[1] : a[a.length - 1]);
        let dinp = a.length >= 3 ? a[1] : (Array.isArray(a[0]) ? a[0] : null);
        if (String(ddef || "").replace(/\s/g, "") === "(m)=>m" && Array.isArray(dinp) && dinp[0] === "boot") {
          peekerDefines++;
          if (!lastStack) lastStack = (new Error().stack.split("\n").map(s => s.trim())
            .filter(s => /module-map|forcePeek|Title|Matches/.test(s)).slice(0, 4).join(" | "));
        }
      } catch (e) {}
      return orig.apply(this, a);
    };
    await new Promise(r => setTimeout(r, WIN));
    proto.define = orig;
    // also read robocoop-5 title + whether a live boot peeker exists right now
    const hasBP = () => { for (const v of R._variables) { if (!v._name && v._inputs?.length === 1 && v._inputs[0]?._name === "boot" && String(v._definition).replace(/\s/g, "") === "(m)=>m") return true; } return false; };
    return { peekerDefines, lastStack, bootPeekerLiveNow: hasBP() };
  }, WINDOW_MS);
  console.log(`\n[${label}]  boot-peeker DEFINES over ${WINDOW_MS}ms: ${res.peekerDefines}   liveNow:${res.bootPeekerLiveNow}`);
  if (res.lastStack) console.log(`  caller: ${res.lastStack}`);
  if (consoleErrors.length) console.log(`  consoleErrors: ${consoleErrors.slice(0, 4).join(" || ")}`);
  await close();
  return res.peekerDefines;
}

const before = await measure("CURRENT (deployed)", "../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const after = await measure("FIXED (module-map+invokeVariable)", "fix-test.html");

console.log(`\n=== RESULT ===  current=${before}  fixed=${after}`);
const pass = after === 0 || (before > 0 && after < before * 0.1);
console.log(pass ? "PASS — fix eliminates the boot-peeker churn" : "FAIL — churn still present in fixed bundle");
process.exit(pass ? 0 : 1);
