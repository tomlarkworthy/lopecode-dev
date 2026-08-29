import { importNotebookModule } from "../../tools/notebook-import.ts";
const at = await importNotebookModule("scratch/agent-atpub/atproto.js");
const al = await importNotebookModule("scratch/agent-atpub/at-login.js", {
  overrides: { safeStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}, indexedDB:{}, URLSearchParams,
    resolvePds: await at.value("resolvePds") },
});
for (const c of ["xrpc","storage","SESSION_KEY","OAUTH","base64url","dpopFetch","makeDPoP","dpopKeyStore","ensureScopes","currentSession","session","loginWidget","startOAuth","discoverAuthServer","pkce"]) {
  try { const v = await al.value(c); console.log(`OK   ${c}: ${typeof v}`); }
  catch(e:any){ console.log(`FAIL ${c}: ${String(e.message).slice(0,90)}`); }
}
