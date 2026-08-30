import { importNotebookModule } from "../../tools/notebook-import.ts";
const at = await importNotebookModule("scratch/agent-atpub/atproto.js");
const resolvePds = await at.value("resolvePds");
console.log("resolvePds:", await resolvePds("larkworthy.bsky.social"));

const mem = new Map<string,string>();
const al = await importNotebookModule("scratch/agent-atpub/at-login.js", {
  overrides: {
    safeStorage: { getItem:(k:string)=>mem.get(k)??null, setItem:(k:string,v:string)=>{mem.set(k,v)}, removeItem:(k:string)=>{mem.delete(k)} },
    indexedDB: {},           // never touched on the app-password path
    URLSearchParams,
    resolvePds,
  },
});
const xrpc = await al.value("xrpc");
console.log("xrpc:", typeof xrpc);
const storage = await al.value("storage");
console.log("storage keys:", Object.keys(storage));
// unauthenticated GET through the real xrpc, app-password branch
const fakeSession = { did:"did:plc:j7nm3lrd5h7fm3sfhcv3lhfv", handle:"larkworthy.bsky.social",
  pds:"https://earthstar.us-east.host.bsky.network", accessJwt:"invalid", refreshJwt:"invalid", authType:"app-password" };
const r = await xrpc(fakeSession, `com.atproto.repo.getRecord?repo=${encodeURIComponent(fakeSession.did)}&collection=com.lopecode.bundle&rkey=tomlarkworthy-virtual-monorepo`, {method:"GET"});
console.log("xrpc GET status:", r.status, "ok:", r.ok);
const j = await r.json().catch(()=>null);
console.log("body keys:", j && Object.keys(j));
