// listBundleVersions against the LIVE PDS: must return only this bundle's
// snapshot (1 exists), newest first, no cross-bundle contamination.
import { DOMParser } from "linkedom";
import { importNotebookModule } from "../../tools/notebook-import.ts";
const inert = { getItem: () => null, setItem() {}, removeItem() {} };
const aw = await importNotebookModule("modules/@tomlarkworthy/at-write.js", {
  overrides: { DOMParser, decodeBase64: () => new Uint8Array(), textBytes: () => new Uint8Array(), safeStorage: inert, fetch, atob, Blob, Uint8Array, URLSearchParams },
});
const lbv = await aw.value("listBundleVersions");
const xrpc = async (_s: any, path: string) => fetch(`https://earthstar.us-east.host.bsky.network/xrpc/${path}`);
const did = "did:plc:j7nm3lrd5h7fm3sfhcv3lhfv";
for (const rkey of ["tomlarkworthy-virtual-monorepo", "atproto", "nonexistent-bundle"]) {
  const recs = await lbv({ did, xrpc, rkey });
  console.log(rkey, "→", recs.length, "snapshot(s)", recs.slice(0, 2).map((r: any) => r.uri.split("/").pop()));
}
