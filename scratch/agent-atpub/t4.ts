import { importNotebookModule } from "../../tools/notebook-import.ts";
import { DOMParser } from "linkedom";
const at = await importNotebookModule("scratch/agent-atpub/atproto.js");
const aw = await importNotebookModule("scratch/agent-atpub/at-write.js", {
  overrides: { DOMParser, decodeBase64: await at.value("decodeBase64"), textBytes: await at.value("textBytes"),
    safeStorage: {getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
    URLSearchParams, fetch, atob, Blob, Uint8Array },
});
for (const c of ["utils","extractFiles","publishBundleVersion","listBundleVersions","publishToStdSite","publishStdPub","publishStdDoc","getStdPub","getStdDoc","unpublishStdDoc","deleteBundle","resolveImageBytes","lopeTokens"]) {
  try { const v = await aw.value(c); console.log(`OK   ${c}: ${typeof v}`); }
  catch(e:any){ console.log(`FAIL ${c}: ${e.message}`); }
}
for (const c of ["publisher","publishWidget","publishEntry"]) {
  try { const v = await aw.value(c); console.log(`OK   ${c}: ${typeof v}`); }
  catch(e:any){ console.log(`FAIL ${c}: ${String(e.message).slice(0,120)}`); }
}
