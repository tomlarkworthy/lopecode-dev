// Probe the refactored at-write/at-login: new cells import, behave sanely.
import { DOMParser } from "linkedom";
import { importNotebookModule } from "../../tools/notebook-import.ts";
import { readFileSync } from "node:fs";

const at = await importNotebookModule("modules/@tomlarkworthy/atproto.js" as any).catch(() => null);
// atproto module working copy may not exist; extract deps inline from checked-out at-write's needs
const inert = { getItem: () => null, setItem() {}, removeItem() {} };
const aw = await importNotebookModule("modules/@tomlarkworthy/at-write.js", {
  overrides: { DOMParser, decodeBase64: (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
    textBytes: (t: string) => new TextEncoder().encode(t), safeStorage: inert, fetch, atob, Blob, Uint8Array },
});
const names = ["extractFiles","utils","publishBundleVersion","publishBundle","extractCard","knownCidsFromPds","notifyOfUpdate"];
for (const n of names) console.log(n, typeof await aw.value(n));

// extractCard on synthetic head
const extractCard = await aw.value("extractCard");
console.log("card:", JSON.stringify(extractCard(`<html><head><meta property="og:description" content="  hi there "><meta property="og:image" content="x.png"></head></html>`)));

// knownCidsFromPds live (public)
const kc = await aw.value("knownCidsFromPds");
const known = await kc({ pds: "https://earthstar.us-east.host.bsky.network", did: "did:plc:j7nm3lrd5h7fm3sfhcv3lhfv" });
console.log("knownCids size:", known.size);

// extractFiles still byte-faithful on the live-published notebook
const extractFiles = await aw.value("extractFiles");
const files = await extractFiles(readFileSync("lopebooks/notebooks/@tomlarkworthy_virtual-monorepo.html", "utf8"));
console.log("files:", files.length, "all known on PDS:", files.every((f: any) => known.has(f.cid)));

// publishBundle validation guards (no writes)
const pb = await aw.value("publishBundle");
try { await pb({}); } catch (e: any) { console.log("guard1:", e.message); }
try { await pb({ session: {did:"x"}, xrpc: () => {}, files: [] }); } catch (e: any) { console.log("guard2:", e.message); }

// at-login: createAppPasswordSession importable; bad creds → clean error
const al = await importNotebookModule("modules/@tomlarkworthy/at-login.js", {
  overrides: { safeStorage: inert, indexedDB: {}, resolvePds: async () => ({ did: "did:plc:x", pds: "https://earthstar.us-east.host.bsky.network" }), URLSearchParams },
});
const caps = await al.value("createAppPasswordSession");
console.log("createAppPasswordSession", typeof caps);
try { await caps({}); } catch (e: any) { console.log("guard3:", e.message); }
