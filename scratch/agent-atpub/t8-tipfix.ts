// Verify publishBundleVersion now chains previousVersion by client-side prefix
// scan (and no longer sends rkeyStart). Fake xrpc; no writes.
import { DOMParser } from "linkedom";
import { importNotebookModule } from "../../tools/notebook-import.ts";
const inert = { getItem: () => null, setItem() {}, removeItem() {} };
const aw = await importNotebookModule("modules/@tomlarkworthy/at-write.js", {
  overrides: { DOMParser, decodeBase64: () => new Uint8Array(), textBytes: () => new Uint8Array(), safeStorage: inert, fetch, atob, Blob, Uint8Array },
});
const pbv = await aw.value("publishBundleVersion");
const did = "did:plc:test";
const calls: string[] = [];
const xrpc = async (_s: any, path: string, init: any) => {
  calls.push(path.split("?")[0]);
  if (path.startsWith("com.atproto.repo.listRecords")) {
    if (path.includes("rkeyStart")) throw new Error("FAIL: still sends rkeyStart");
    // two pages to prove cursor-following
    if (!path.includes("cursor=")) return { ok: true, json: async () => ({ records: [
      { uri: `at://${did}/com.lopecode.bundle.version/atproto--3mlpvidznr2d6` },
      { uri: `at://${did}/com.lopecode.bundle.version/myrkey--3aaa` },
    ], cursor: "p2" }) };
    return { ok: true, json: async () => ({ records: [
      { uri: `at://${did}/com.lopecode.bundle.version/myrkey--3zzz` },
      { uri: `at://${did}/com.lopecode.bundle.version/other--3xxx` },
    ] }) };
  }
  if (path === "com.atproto.repo.applyWrites") {
    const body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ results: [{ cid: "snapCid" }, { cid: "bundleCid" }], _writes: body.writes }) };
  }
  throw new Error("unexpected call " + path);
};
const res = await pbv({ session: { did }, xrpc, rkey: "myrkey",
  newRecord: { $type: "com.lopecode.bundle", title: "t", files: [], createdAt: "now" },
  prior: { cid: "priorCid", value: { title: "old" } }, ensureScopes: async () => null });
console.log("previousVersion:", res.previousVersion);
console.log("expected tip (3zzz from page 2):", res.previousVersion === `at://${did}/com.lopecode.bundle.version/myrkey--3zzz` ? "PASS" : "FAIL");
console.log("calls:", calls.join(", "));
