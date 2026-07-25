// Test the proposed @tomlarkworthy/fileattachments fix against BOTH shapes:
//   A) classic / legacy-import: per-module FileAttachment builtin, registry keyed by plain name
//   B) notebook-kit (new.observablehq.com viewed notebook): one runtime-level builtin,
//      registry keyed by resolved href
// The current implementation only handles (A).
import { Runtime } from "../vendor/notebook-kit/node_modules/@observablehq/runtime/src/index.js";

globalThis.document = { baseURI: "https://new.observablehq.test/@tomlarkworthy/editor-5" } as any;
const nk = await import("../vendor/notebook-kit/src/runtime/stdlib/fileAttachment.ts");

// ---- the module's existing helper, unchanged -------------------------------------
const getFileAttachmentsMapCurrent = (FileAttachment: any) => {
  let fileMap: any;
  const backup_get = Map.prototype.get;
  const backup_has = Map.prototype.has;
  (Map.prototype as any).has = (Map.prototype as any).get = function (this: any) { fileMap = this; };
  try { FileAttachment(""); } catch (e) {}
  Map.prototype.has = backup_has;
  Map.prototype.get = backup_get;
  return fileMap || new Map();
};

// ---- proposed helper: same capture, but the probe must not WRITE to the registry.
// notebook-kit's FileAttachment() memoises unknown names, so probing with "" would
// otherwise insert document.baseURI as a bogus attachment.
const getFileAttachmentsMapProposed = (FileAttachment: any) => {
  let fileMap: any;
  const backup_get = Map.prototype.get;
  const backup_has = Map.prototype.has;
  const backup_set = Map.prototype.set;
  (Map.prototype as any).has = (Map.prototype as any).get = function (this: any) { fileMap = this; };
  (Map.prototype as any).set = function (this: any) { return this; };
  try { FileAttachment(""); } catch (e) {}
  Map.prototype.has = backup_has;
  Map.prototype.get = backup_get;
  Map.prototype.set = backup_set;
  return fileMap || new Map();
};

const getFileAttachmentsMap = getFileAttachmentsMapCurrent;

// ---- current ---------------------------------------------------------------------
const current = (module: any, _FileAttachment: any) => {
  const FileAttachment = module._builtins.get("FileAttachment");
  return new Map(
    [...getFileAttachmentsMap(FileAttachment).entries()].map(([name]) => [name, FileAttachment.call(null, name)])
  );
};

// ---- proposed --------------------------------------------------------------------
const proposed = (module: any, FileAttachment: any) => {
  const FA = module._builtins.get("FileAttachment") ?? FileAttachment;
  const files = new Map();
  for (const [key] of getFileAttachmentsMapProposed(FA).entries()) {
    const name = /^[a-z][a-z0-9+.-]*:\/\//i.test(key)
      ? decodeURIComponent(key.slice(key.lastIndexOf("/") + 1))
      : key;
    if (name) files.set(name, FA.call(null, key));
  }
  return files;
};

function check(label: string, impl: any, module: any, FileAttachment: any) {
  try {
    const map = impl(module, FileAttachment);
    const f = map.get("cell_options.json");
    console.log(`  ${label.padEnd(9)} keys=${JSON.stringify([...map.keys()])} -> .json is ${typeof f?.json}`);
    return typeof f?.json === "function";
  } catch (e: any) {
    console.log(`  ${label.padEnd(9)} THREW ${e.message}`);
    return false;
  }
}

// arm A: legacy import -- per-module builtin over a plain-name Map (what editor-5.js emits)
const rtA: any = new Runtime({ FileAttachment: () => nk.FileAttachment });
const modA = rtA.module();
const legacyFiles = new Map([["cell_options.json", { url: "https://files.test/abc", mimeType: "application/json" }]]);
modA.builtin("FileAttachment", (rtA as any).fileAttachments
  ? (rtA as any).fileAttachments((n: string) => legacyFiles.get(n))
  : nk.fileAttachments((n: string) => legacyFiles.get(n)));
console.log("arm A  legacy import (per-module builtin, plain-name keys)");
const aCur = check("current", current, modA, nk.FileAttachment);
const aNew = check("proposed", proposed, modA, nk.FileAttachment);

// arm B: viewed on new.observablehq.com -- no module builtin, href-keyed global registry
const rtB: any = new Runtime({ FileAttachment: () => nk.FileAttachment });
const modB = rtB.module();
nk.registerFile("cell_options.json", { name: "cell_options.json", mimeType: "application/json" });
console.log("arm B  viewed notebook (runtime-level builtin, href keys)");
const bCur = check("current", current, modB, nk.FileAttachment);
const bNew = check("proposed", proposed, modB, nk.FileAttachment);

console.log(`\ncurrent:  A=${aCur ? "ok" : "FAIL"}  B=${bCur ? "ok" : "FAIL"}`);
console.log(`proposed: A=${aNew ? "ok" : "FAIL"}  B=${bNew ? "ok" : "FAIL"}`);
process.exit(aCur && aNew && bNew && !bCur ? 0 : 1);
