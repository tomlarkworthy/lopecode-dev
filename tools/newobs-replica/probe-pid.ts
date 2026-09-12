// ANSWERED, NEGATIVE: a pid CANNOT be computed off-page. Kept as the record of that.
//
// `persistentId` is `v.pid = contentHash(v._name + v._definition.toString())` and contentHash is
// dependency-free FNV-1a, which looks exactly reproducible. Measured, it reproduces neither
// runtime-sdk's own fixture (_o83sai) nor 14 of cell-map-2's 15 shipped pids — including cells never
// edited, which rules out drift as the cause.
//
// Why: `_definition.toString()` in a COMPILED module is `function _persistentId(contentHash, …)` —
// dep list as named parameters, whitespace normalised. The pid was minted against the AUTHORED text,
// which a compiled module does not carry. The hash input is unrecoverable.
//
// Fifth instance of the compiled-form blind spot, and the broadest: any value derived from
// definition text is unreproducible from a compiled module, not just a classification of it.
//
// So a pid is a LINEAGE TOKEN, not a content address. New cells get a unique id (runtime-sdk's
// `id()`), not a derived one; `persistentId` only computes when `!v.pid`, so a written pid stands.
// The real drift check is diffing the `$def` pid lines page-vs-disk, not recomputing hashes.
//
// run: bun tools/newobs-replica/probe-pid.ts
import { importNotebookModule } from "../notebook-import.ts";

const sdk = await importNotebookModule("modules/@tomlarkworthy/runtime-sdk.js").catch(
  (e: any) => ({ error: String(e?.message ?? e) }) as any
);

if ((sdk as any).error) {
  console.log(`RESULT loadRuntimeSdk FAILED ${(sdk as any).error}`);
  console.log("RESULT fallback: contentHash must be read from the canonical HTML instead");
} else {
  const contentHash = await sdk.value("contentHash");
  console.log(`RESULT contentHash loaded, typeof=${typeof contentHash}`);

  // Determinism and shape first — cheap, and a non-deterministic hash would invalidate everything.
  console.log(`RESULT stable=${contentHash("abc") === contentHash("abc")}`);
  console.log(`RESULT shape=${JSON.stringify(contentHash("abc"))}`);

  // The fixture. The definition text must match the runtime's toString() byte for byte, which is the
  // part most likely to fail: the module wrapper on disk may not reproduce what the page holds.
  const vars = [...(sdk.runtime as any)._variables];
  const pv: any = vars.find((v: any) => v._name === "persistentId");
  if (!pv) {
    console.log("RESULT persistentIdVariable MISSING");
  } else {
    const computed = contentHash(pv._name + pv._definition.toString());
    console.log(`RESULT persistentIdPid computed=${computed} want=_o83sai match=${computed === "_o83sai"}`);
    console.log(`RESULT definitionHead=${JSON.stringify(String(pv._definition).slice(0, 60))}`);
  }

  // And against cell-map-2's own shipped pids, which the page minted: recomputing them from the
  // on-disk definitions is the direct test of whether disk text == page text.
  const cm = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
  const cmVars = [...(cm.runtime as any)._variables].filter((v: any) => v._module === cm.module);
  let hit = 0;
  let miss = 0;
  const misses: string[] = [];
  for (const v of cmVars) {
    if (!v.pid || v._name == null) continue;
    const computed = contentHash(v._name + v._definition.toString());
    if (computed === v.pid) hit++;
    else {
      miss++;
      if (misses.length < 4) misses.push(`${v._name}: shipped=${v.pid} computed=${computed}`);
    }
  }
  console.log(`RESULT cellMap2Pids hit=${hit} miss=${miss}`);
  for (const m of misses) console.log(`    ${m}`);
  cm.dispose();
  sdk.dispose();
}
