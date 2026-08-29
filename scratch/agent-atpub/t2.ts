import { importNotebookModule } from "../../tools/notebook-import.ts";
import { DOMParser } from "linkedom";
import { readFileSync } from "fs";
const at = await importNotebookModule("scratch/agent-atpub/atproto.js");
const aw = await importNotebookModule("scratch/agent-atpub/at-write.js", {
  overrides: { DOMParser, decodeBase64: await at.value("decodeBase64"), textBytes: await at.value("textBytes"),
    safeStorage: {getItem:()=>null,setItem:()=>{},removeItem:()=>{}} },
});
const utils = await aw.value("utils");
console.log("slug(<title>) =", utils.slugifyTitle("How I code: The Claude Code Virtual Monorepo Pattern"));
console.log("published rkey = tomlarkworthy-virtual-monorepo");
const html = readFileSync("lopebooks/notebooks/@tomlarkworthy_virtual-monorepo.html","utf8");
const doc = new DOMParser().parseFromString(html, "text/html");
console.log("og:description =", JSON.stringify(doc.querySelector('meta[property="og:description"]')?.getAttribute("content")||null).slice(0,200));
const img = doc.querySelector('meta[property="og:image"]')?.getAttribute("content")||"";
console.log("og:image prefix =", img.slice(0,60), "len", img.length);
console.log("genTid() =", utils.genTid(), utils.genTid());
