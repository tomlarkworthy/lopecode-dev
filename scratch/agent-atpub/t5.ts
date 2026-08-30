import { importNotebookModule } from "../../tools/notebook-import.ts";
import { DOMParser } from "linkedom";
import { readFileSync } from "fs";
const at = await importNotebookModule("scratch/agent-atpub/atproto.js");
const aw = await importNotebookModule("scratch/agent-atpub/at-write.js", {
  overrides: { DOMParser, decodeBase64: await at.value("decodeBase64"), textBytes: await at.value("textBytes"),
    safeStorage: {getItem:()=>null,setItem:()=>{},removeItem:()=>{}} },
});
const extractFiles = await aw.value("extractFiles");
const files = await extractFiles(readFileSync("lopebooks/notebooks/@tomlarkworthy_virtual-monorepo.html","utf8"));
// authoritative known set
const known = new Set<string>(); let cursor:string|undefined;
do { const u = new URL("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.listBlobs");
  u.searchParams.set("did","did:plc:j7nm3lrd5h7fm3sfhcv3lhfv"); u.searchParams.set("limit","1000");
  if(cursor) u.searchParams.set("cursor",cursor);
  const d:any = await (await fetch(u)).json(); (d.cids||[]).forEach((c:string)=>known.add(c)); cursor=d.cursor;
} while(cursor);
const miss = files.filter((f:any)=>!known.has(f.cid));
console.log({blocks:files.length, knownBlobs:known.size, wouldUpload:miss.length, bytes:miss.reduce((a:number,f:any)=>a+f.size,0)});
console.log(miss.slice(0,8).map((f:any)=>`${f.id} (${f.size}B)`));
const big = files.filter((f:any)=>f.size>1000000); console.log("blocks >1MB:", big.length, big.map((f:any)=>[f.id,f.size]));
console.log("max block:", Math.max(...files.map((f:any)=>f.size)));
console.log("total bytes:", files.reduce((a:number,f:any)=>a+f.size,0));
