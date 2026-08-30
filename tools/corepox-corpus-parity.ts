// The notebook's `unpackCorpus` is a hand port of the inverse in
// tools/cloud/corpus-pack.py. A port that is 99% right is worse than no port --
// it would hand the arena a design that is subtly not the one the player saved.
// So neither is trusted: both unpack all 2191 designs and the results are
// compared field by field.
//
//   bun tools/corepox-corpus-parity.ts
import { importNotebookModule } from "./notebook-import.ts";
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Runtime } from "@observablehq/runtime";

const GZ = "data/corepox/corpus.json.gz";

// The module's define() builds its fileAttachments map eagerly through
// window.lopecode, which does not exist here. unpackCorpus itself has no deps,
// so a stub is enough to get the module loaded.
// `runtime.fileAttachments` is lopecode's, not the bare runtime's. Stubbed for
// the same reason as window: nothing here resolves an attachment.
(Runtime.prototype as any).fileAttachments ??= () => () => null;
(globalThis as any).window = {lopecode: {contentSync: () => ({status: 200, mime: "application/gzip", bytes: new Uint8Array()})}};

const packed = JSON.parse(gunzipSync(readFileSync(GZ)).toString());
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-shipyard.js");
const unpack: any = await m.value("unpackCorpus");
const js = unpack(packed);

const py = JSON.parse(execFileSync("python3", ["-c", `
import json, gzip, sys
sys.path.insert(0, "tools/cloud")
from importlib import import_module
u = import_module("corpus-pack".replace("-", "_")) if False else None
import importlib.util
spec = importlib.util.spec_from_file_location("cp", "tools/cloud/corpus-pack.py")
cp = importlib.util.module_from_spec(spec); spec.loader.exec_module(cp)
c = json.load(gzip.open("${GZ}"))
ships, ratings = cp.unpack(c)
print(json.dumps({"ships": ships, "ratings": ratings}))
`], {maxBuffer: 1 << 28}).toString());

const sortKeys = (_: string, v: any) =>
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]]))
    : v;
const norm = (o: any) => JSON.stringify(o, sortKeys);

let bad = 0, checked = 0;
const ids = Object.keys(py.ships);
for (const id of ids) {
  checked++;
  if (norm(py.ships[id]) !== norm(js.ships[id])) {
    if (bad < 3) {
      console.log(`MISMATCH ${id}`);
      console.log("  py", norm(py.ships[id]).slice(0, 240));
      console.log("  js", norm(js.ships[id]).slice(0, 240));
    }
    bad++;
  }
}
const extra = Object.keys(js.ships).filter(k => !(k in py.ships));
const ratingsSame = norm(py.ratings) === norm(js.ratings);

console.log(`designs compared   ${checked}`);
console.log(`mismatched         ${bad}`);
console.log(`js-only designs    ${extra.length}`);
console.log(`ratings identical  ${ratingsSame}`);
if (bad || extra.length || !ratingsSame) { console.log("\nFAIL"); process.exit(1); }
console.log("\nall designs round-trip identically through both unpackers");
