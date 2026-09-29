// file-sync churn probe: apply @tomlarkworthy/file-sync's own exported text back onto the live module,
// (1) through jbApply twice (no-op, then +1 cell), (2) through filesToNotebook with a fake disk.
// Counts Variable.define/delete calls and type-2 deletions. Run: node tools/scratch/fs-fix/probe.mjs <nb.html>
import { resolve } from "node:path";
import { bootNotebook } from "../../robocoop-5/lib/notebook-boot.mjs";
const { page, close } = await bootNotebook({ notebookPath: resolve(process.argv[2]), layout: "S100(@tomlarkworthy/file-sync)" });
const out = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const MID = "@tomlarkworthy/file-sync";
  const H = window.__nbHelpers;
  const fsVar = H.allVars().find(v => v._name === "jbApply");
  const fsMod = fsVar._module;
  const get = n => fsMod.value(n);
  const [jbApply, currentModules, runtime, probeDefine, exportModuleJS, tag, hashSource, getFileAttachmentsMap, notebookId] =
    await Promise.all(["jbApply", "currentModules", "runtime", "probeDefine", "exportModuleJS", "tag", "hashSource", "getFileAttachmentsMap", "notebookId"].map(get));
  await sleep(3000);
  const V = fsVar.constructor.prototype;
  const od = V.define, odel = V.delete; let log = null;
  V.define = function (...a) { if (log && this._module === fsMod) log.push("define " + (typeof a[0] === "string" ? a[0] : this._name)); return od.apply(this, a); };
  V.delete = function () { if (log && this._module === fsMod) log.push("delete " + this._name + " t" + this._type); return odel.apply(this); };
  const src = (await exportModuleJS(MID)).source;
  const load = async text => (await import(URL.createObjectURL(new Blob([text], { type: "text/javascript" })))).default;
  const anchor = src.match(/\n(\s*)\$def\(/);
  const edited = src.replace(anchor[0], `\n${anchor[1]}$def("_probeX", "probeX", [], function _probeX(){return( 1 )});` + anchor[0]);
  const apply = jbApply({ currentModules, runtime, probeDefine });
  const res = {};
  log = []; const r0 = apply(MID, await load(src)); res.jb_same = { changes: r0.changes, log }; await sleep(500);
  log = []; const r1 = apply(MID, await load(edited)); res.jb_edit = { changes: r1.changes, log }; await sleep(500);
  // disk -> runtime: filesToNotebook with a fake directory whose only file is the edited module plus one more cell
  const edited2 = edited.replace(anchor[0], `\n${anchor[1]}$def("_probeY", "probeY", [], function _probeY(){return( 2 )});` + anchor[0]);
  let text = src, mtime = 1;
  const fakeDir = { getDirectoryHandle: async () => { const e = new Error("nf"); e.name = "NotFoundError"; throw e; } };
  const readFile = async (dir, path) => {
    if (!path.endsWith(MID + ".js")) { const e = new Error("nf"); e.name = "NotFoundError"; throw e; }
    const t = text, m = mtime; return { lastModified: m, text: async () => t };
  };
  let stop; const invalidation = new Promise(r => (stop = r));
  const f2n = fsMod._scope.get("filesToNotebook")._definition;
  log = [];
  f2n(fakeDir, { armed: true }, currentModules, new Map(), notebookId, runtime, probeDefine, tag, readFile, exportModuleJS,
    async () => {}, hashSource, async () => {}, getFileAttachmentsMap, invalidation);
  await sleep(2500); res.f2n_same = { log }; log = [];
  text = edited2; mtime = 2; await sleep(2500); res.f2n_edit = { log }; log = null;
  stop();
  return res;
});
await close();
for (const [k, v] of Object.entries(out)) {
  const t2 = v.log.filter(l => / t2$/.test(l)).length;
  console.log(`${k}: changes=${v.changes ?? "-"} defines=${v.log.filter(l => l.startsWith("define")).length} deletes=${v.log.filter(l => l.startsWith("delete")).length} type2-deletes=${t2}`);
  console.log("   " + v.log.join(" | ").slice(0, 600));
}
