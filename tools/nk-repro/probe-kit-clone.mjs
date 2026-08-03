import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", m=>{ if(/CLONE/.test(m.text())) console.log("page:",m.text()); });
await page.goto("http://localhost:5173/repro",{waitUntil:"networkidle"});
await page.waitForTimeout(6000);
const out = await page.evaluate(()=>{
  const rt = window.__rt;
  if(!rt) return {error:"no __rt"};
  const objId=new Map(); let n=0; const idOf=o=>{if(o==null)return null; if(!objId.has(o))objId.set(o,"#"+(n++)); return objId.get(o);};
  // every module instance whose any variable's def mentions access-runtime, OR that defines access-runtime's exports
  const mods = new Set([...rt._modules].map(([d,m])=>m));
  const arInstances = new Set();
  for(const m of mods){
    const vars=[...rt._variables].filter(v=>v._module===m);
    if(vars.some(v=>v._name==="runtime"||v._name==="main"||v._name==="onCodeChange")) {
      // heuristic: access-runtime exports runtime/main/onCodeChange
      if(vars.some(v=>/captureRuntime|Set\.prototype|access-runtime/.test(String(v._definition)))||vars.length>3)
        arInstances.add(m);
    }
  }
  // more robust: find import-alias vars (identity) whose source resolves to access-runtime by name
  const arByImport = new Set();
  for(const v of rt._variables){
    if(/access-runtime/.test(String(v._definition))) {
      if(v._value) arByImport.add(v._value);
    }
  }
  return {
    totalModules: rt._modules.size,
    accessRuntimeInstances_byImportDef: [...arByImport].map(idOf),
    distinct: new Set([...arByImport].map(idOf)).size,
    // also: count "module" definition vars mentioning access-runtime
    moduleDefsMentioningAR: [...rt._variables].filter(v=>/access-runtime/.test(String(v._definition))).map(v=>({name:v._name, val:idOf(v._value)}))
  };
});
console.log(JSON.stringify(out,null,1));
await browser.close();
