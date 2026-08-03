// Boot the CANONICAL robocoop-5 bundle (now propagated) and confirm the boot-peeker churn is gone.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { bootNotebook } from "./lib/notebook-boot.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const LAYOUT = "R100(S50(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";
const nb = join(here, "../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: nb, layout: LAYOUT, timeout: 45000 });
const res = await page.evaluate(async (WIN) => {
  const rt = globalThis.__ojs_runtime;
  let R = null; for (const m of rt.mains.values()) { if (m?._runtime) { R = m._runtime; break; } }
  const proto = Object.getPrototypeOf([...R._variables][0]);
  let peekerDefines = 0; const orig = proto.define;
  proto.define = function (...a) {
    try {
      let ddef = a.length >= 3 ? a[2] : (Array.isArray(a[0]) ? a[1] : a[a.length - 1]);
      let dinp = a.length >= 3 ? a[1] : (Array.isArray(a[0]) ? a[0] : null);
      if (String(ddef || "").replace(/\s/g, "") === "(m)=>m" && Array.isArray(dinp) && dinp[0] === "boot") peekerDefines++;
    } catch (e) {}
    return orig.apply(this, a);
  };
  await new Promise(r => setTimeout(r, WIN));
  proto.define = orig;
  // read titles
  let cm = null; for (const v of R._variables) if (v._name === "currentModules") cm = cm || v;
  const titles = []; if (cm?._value instanceof Map) for (const [, info] of cm._value) titles.push(info.title);
  return { peekerDefines, moduleCount: titles.length, timeouts: titles.filter(t => /TIMEOUT/.test(t||"")).length };
}, 6000);
console.log(JSON.stringify(res, null, 2));
await close();
console.log(res.peekerDefines === 0 ? "\nPASS — canonical robocoop-5 has zero boot-peeker churn" : "\nFAIL");
process.exit(res.peekerDefines === 0 ? 0 : 1);
