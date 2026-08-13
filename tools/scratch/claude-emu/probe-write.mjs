// Where does a /src write actually land? Drive the real modules cli.js is using.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.addInitScript(() => { window.__CB_FSTRACE = true; });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(2500);
const SRC = 'export default function define(runtime, observer){const main=runtime.module();main.variable(observer("probe")).define("probe",[],()=>"VIA_PROMISES");return main;}';
console.log("routing:", JSON.stringify(await p.evaluate(async (src) => {
  const w = document.querySelector("#cb-cli-frame").contentWindow;
  const fs = w.__REG && w.__REG.fs;
  if (!fs) return { error: "no fs in registry" };
  const out = {};
  try { fs.mkdirSync("/src/@user", { recursive: true }); out.mkdir = "ok"; } catch (e) { out.mkdir = "ERR " + e.message; }
  // A: the plain path
  try { fs.writeFileSync("/src/@user/via-sync.js", src.replace("VIA_PROMISES", "VIA_SYNC")); out.syncWrite = "ok"; } catch (e) { out.syncWrite = "ERR " + e.message; }
  // B: promises
  try { await fs.promises.writeFile("/src/@user/via-promises.js", src); out.promiseWrite = "ok"; } catch (e) { out.promiseWrite = "ERR " + e.message; }
  // C: write-temp-then-rename, which is what the trace suggests cli.js does
  try {
    fs.writeFileSync("/src/@user/.tmp-rename", src.replace("VIA_PROMISES", "VIA_RENAME"));
    fs.renameSync("/src/@user/.tmp-rename", "/src/@user/via-rename.js");
    out.renameWrite = "ok";
  } catch (e) { out.renameWrite = "ERR " + e.message; }
  return out;
}, SRC)));

await sleep(2500);
console.log("host saw:", JSON.stringify(await p.evaluate(() => ({
  viaSync: (window.__RC5FS.readSync("/src/@user/via-sync.js") || "").length,
  viaPromises: (window.__RC5FS.readSync("/src/@user/via-promises.js") || "").length,
  viaRename: (window.__RC5FS.readSync("/src/@user/via-rename.js") || "").length,
  liveModules: (() => { const ids = []; try { for (const i of window.__CB_DEPS.currentModules.values()) if (i && i.name && i.name.startsWith("@user/")) ids.push(i.name); } catch {} return ids; })(),
}))));
console.log("fs methods cli.js used at boot:", JSON.stringify(await p.evaluate(() => {
  const t = document.querySelector("#cb-cli-frame").contentWindow.__fsTrace || {};
  return Object.fromEntries(Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 14));
})));
await b.close(); process.exit(0);
