import { importNotebookModule } from "../../tools/notebook-import.ts";
import { DOMParser } from "linkedom";
import { readFileSync } from "fs";

const at = await importNotebookModule("scratch/agent-atpub/atproto.js");
const decodeBase64 = await at.value("decodeBase64");
const textBytes = await at.value("textBytes");
console.log("atproto helpers ok:", typeof decodeBase64, typeof textBytes);

const memStore = new Map<string,string>();
const safeStorage = {
  getItem: (k:string)=>memStore.has(k)?memStore.get(k)!:null,
  setItem: (k:string,v:string)=>{memStore.set(k,v)},
  removeItem: (k:string)=>{memStore.delete(k)},
};

const aw = await importNotebookModule("scratch/agent-atpub/at-write.js", {
  overrides: { DOMParser, decodeBase64, textBytes, safeStorage },
});
const utils = await aw.value("utils");
console.log("utils keys:", Object.keys(utils).filter(k=>!k.startsWith("_")));
console.log("slugifyTitle('@tomlarkworthy/virtual-monorepo') =", utils.slugifyTitle("@tomlarkworthy/virtual-monorepo"));
const extractFiles = await aw.value("extractFiles");
const html = readFileSync("lopebooks/notebooks/@tomlarkworthy_virtual-monorepo.html","utf8");
const t0=Date.now();
const files = await extractFiles(html);
console.log("files:", files.length, "in", Date.now()-t0, "ms");
console.log(files.slice(0,3).map((f:any)=>({id:f.id,mime:f.mime,enc:f.encoding,size:f.size,cid:f.cid})));

// compare to published
const rec = JSON.parse(readFileSync("scratch/agent-atpub/bundle.json","utf8")).value;
const pub = new Map(rec.files.map((f:any)=>[f.id,{cid:f.blob.ref.$link,mime:f.blob.mimeType,size:f.blob.size,enc:f.encoding}]));
let match=0, mismatch=0, missing=0;
for (const f of files) {
  const p:any = pub.get(f.id);
  if (!p) { missing++; if(missing<4) console.log("LOCAL-ONLY", f.id); continue; }
  if (p.cid===f.cid) match++; else { mismatch++; if(mismatch<6) console.log("CID DIFF", f.id, "pub",p.size,"local",f.size, "mime", p.mime, f.mime); }
}
const localIds = new Set(files.map((f:any)=>f.id));
const pubOnly = rec.files.filter((f:any)=>!localIds.has(f.id)).map((f:any)=>f.id);
console.log({total:files.length, pubTotal:rec.files.length, match, mismatch, localOnly:missing, pubOnly:pubOnly.length});
console.log("pubOnly:", pubOnly.slice(0,5));

const b64 = files.filter((f:any)=>f.encoding==="base64");
let b64match=0,b64mis=0;
for(const f of b64){const p:any=pub.get(f.id); if(p) (p.cid===f.cid? b64match++ : b64mis++);}
console.log("base64 blocks:", b64.length, "match", b64match, "mismatch", b64mis, b64.slice(0,3).map((f:any)=>f.id));
// duplicate ids?
const ids = files.map((f:any)=>f.id); console.log("dup ids:", ids.length - new Set(ids).size);
// title from <title>
console.log("title tag:", (html.match(/<title>([^<]*)<\/title>/i)||[])[1]);
console.log("og:description present:", /og:description/.test(html), "og:image present:", /og:image/.test(html));
