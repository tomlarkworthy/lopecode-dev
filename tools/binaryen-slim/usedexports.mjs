import fs from "node:fs"; import path from "node:path";
const dir = path.resolve(process.argv[2]);
fs.writeFileSync("node_modules/binaryen/index.js",
  `import Binaryen from ${JSON.stringify(path.join(dir,"binaryen_js.js"))};\nconst b=await Binaryen();\nexport default b;\n`);
const binaryen = (await import("binaryen")).default;
const used = new Set();
let wrapped = 0;
for (const k of Object.keys(binaryen)) {
  if (k[0] !== "_" || typeof binaryen[k] !== "function") continue;
  const orig = binaryen[k];
  binaryen[k] = function (...a) { used.add(k); return orig.apply(this, a); };
  wrapped++;
}
const asc = (await import("assemblyscript/asc")).default;
const FLAGSETS = [["-O3","--runtime","stub"],["-O3","--runtime","incremental"],["-Oz","--runtime","stub"],
  ["-O0"],["-O3","--runtime","stub","--enable","simd"],["-O3","--runtime","stub","--trapMode","clamp"],
  ["-O3","--runtime","stub","--textFile","main.wat"],["-O3","--runtime","minimal"],
  ["-O3","--runtime","stub","--exportRuntime"],["-O3","--runtime","stub","--sourceMap"]];
const progs = [...fs.readdirSync("astests").filter(f=>f.endsWith(".ts")).map(f=>["astests/"+f]), ["detectrow.as.ts"]];
for (const [p] of progs) for (const fl of FLAGSETS) {
  const src = fs.readFileSync(p,"utf8"), out={};
  try { await asc.main(["main.ts","--outFile","main.wasm",...fl],
    {readFile:n=>n==="main.ts"?src:null, writeFile:(n,d)=>{out[n]=d;}, listFiles:()=>[]}); } catch {}
}
console.log(JSON.stringify({wrapped, used: [...used].sort()}));
