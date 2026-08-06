import fs from "node:fs"; import path from "node:path";
const dir = path.resolve(process.argv[2]);
fs.writeFileSync(`node_modules/binaryen/index.js`,
  `import Binaryen from ${JSON.stringify(path.join(dir,"binaryen_js.js"))};\nconst b=await Binaryen();\nexport default b;\n`);
const asc = (await import("assemblyscript/asc")).default;
const FLAGSETS = [["-O3","--runtime","stub"],["-O3","--runtime","incremental"],["-Oz","--runtime","stub"],
  ["-O0"],["-O3","--runtime","stub","--enable","simd"],["-O3","--runtime","stub","--trapMode","clamp"],
  ["-O3","--runtime","stub","--textFile","main.wat"]];
const res = {};
for (const p of fs.readdirSync("astests").filter(f=>f.endsWith(".ts")))
  for (const fl of FLAGSETS) {
    const src = fs.readFileSync(path.join("astests",p),"utf8"), out = {};
    let err=null;
    try { const r = await asc.main(["main.ts","--outFile","main.wasm",...fl],
        {readFile:n=>n==="main.ts"?src:null, writeFile:(n,d)=>{out[n]=d;}, listFiles:()=>[]});
      err = r.error ? String(r.error.message||r.error) : null;
    } catch(e){ err = "THREW "+String(e).slice(0,100); }
    const b = out["main.wasm"];
    const wat = out["main.wat"];
    res[`${p} ${fl.join(" ")}`] = err ? "ERR:"+err.slice(0,70)
      : (b ? crypto.subtle ? `${b.length}:${Buffer.from(b).toString("hex").slice(0,24)}${wat?"+wat"+wat.length:""}` : "" : "nowasm");
  }
console.log(JSON.stringify(res));
