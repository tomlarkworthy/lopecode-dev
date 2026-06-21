import { chromium } from "playwright";
import fs from "fs";
const c = JSON.parse(fs.readFileSync("tools/.observable-cookies.json","utf8"));
const probe = async (url) => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1400,height:1100} });
  await ctx.addCookies([
    {name:"I",value:c.I,domain:".observablehq.com",path:"/",httpOnly:true,secure:true},
    {name:"T",value:c.T,domain:".observablehq.com",path:"/",secure:true},
  ]);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil:"domcontentloaded" });
  for (let i=0;i<6;i++){ await page.mouse.wheel(0,500); await page.waitForTimeout(400); }
  await page.waitForTimeout(20000);
  const f = page.frames().find(fr => fr.url().includes("observableusercontent")) || page.mainFrame();
  const out = await f.evaluate(() => {
    const rt = window.__ojs_runtime;
    if (!rt) return {error:"no runtime"};
    const vars=[...rt._variables];
    // module-def vars: name "module N", _value = imported module
    const mdv = vars.filter(v=>v._name&&v._name.startsWith("module ")&&v._definition);
    // resolve each imported module: try to read define fn id / version from _modules key
    const modToDefine = new Map();
    for (const [def,mod] of rt._modules) modToDefine.set(mod, def);
    // For modules in _modules, find a name via scope of an importer
    const rows = [];
    for (const v of mdv) {
      const imported = v._value; // may be undefined if not computed
      if (!imported || typeof imported !== "object") continue;
      const def = modToDefine.get(imported);
      const defSrc = def ? String(def).slice(0,0) : null;
      // recover specifier: importer scope maps local import name -> something; use _modules key fn name
      rows.push({
        hostIsImported: rt._modules && [...rt._modules.values()].includes(v._module),
        importedHasDefine: !!def,
        importedId: imported._id ?? null,
      });
    }
    // Better: group _modules by access-runtime. The define fn often references the notebook url/id.
    const accessLike = [];
    for (const [def,mod] of rt._modules) {
      const s = String(def);
      const m = s.match(/observableusercontent\.com\/[^"'`) ]+|@mootari\/access-runtime|e1c39d41e8e944b0|[0-9a-f]{16}@\d+/g);
      if (m) accessLike.push({ defLen:s.length, hints:[...new Set(m)].slice(0,4) });
    }
    return {
      moduleCount: rt._modules.size,
      mdvCount: mdv.length,
      definesWithUrlHints: accessLike.filter(a=>a.hints.some(h=>/e1c39d41e8e944b0|access-runtime/.test(h))),
      allDefineHintsSample: accessLike.slice(0,40).map(a=>a.hints)
    };
  });
  await browser.close();
  return out;
};
console.log("===== NEW =====");
console.log(JSON.stringify(await probe("https://new.observablehq.com/@tomlarkworthy/module-map"),null,1));
console.log("===== CLASSIC =====");
console.log(JSON.stringify(await probe("https://observablehq.com/@tomlarkworthy/module-map"),null,1));
