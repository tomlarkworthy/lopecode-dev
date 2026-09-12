async (rt) => {
  const vars = [...rt._variables];
  const val = (n) => vars.find((v) => v._name === n && v._value !== undefined)?._value;
  const main = val("main");
  const moduleNames = new Map();
  const modules = new Set(vars.map((v) => v._module));
  const isNkImport = (v) => v._inputs.length === 1 && v._inputs[0]?._name === "@variable" && String(v._definition).includes("__variable._module._runtime.module(");
  const summary = [];
  for (const m of modules) {
    const mv = vars.filter((v) => v._module === m);
    const imports = mv.filter(isNkImport);
    const derivedFromImport = mv.filter((v) => v._inputs.length === 1 && isNkImport(v._inputs[0]));
    const rewired = mv.filter((v) => v._inputs.length === 1 && v._inputs[0]._module !== m && v._inputs[0]._module !== rt._builtin);
    summary.push({
      main: m === main, builtin: m === rt._builtin, vars: mv.length,
      fileAttachmentBuiltin: m._builtins?.has?.("FileAttachment") ?? null,
      nkImportCells: imports.length,
      nkImportComputed: imports.filter((v) => v._value !== undefined || v._error !== undefined).length,
      nkImportReachable: imports.filter((v) => v._reachable).length,
      outputsStillOnImportCell: derivedFromImport.length,
      rewiredImports: rewired.length,
      dollarNames: mv.filter((v) => /^(viewof|mutable)\$/.test(v._name ?? "")).map((v) => v._name).slice(0, 6),
      spaceViewofs: mv.filter((v) => /^viewof /.test(v._name ?? "")).length,
      viewofValueNk: mv.filter((v) => v._inputs.length === 1 && v._inputs[0]._module === m && v._inputs[0]._name === `viewof$${v._name}`).length,
      viewofValueLegacy: mv.filter((v) => v._inputs.length === 2 && v._inputs[0]?._name === "Generators" && v._inputs[1]?._name === `viewof ${v._name}`).length,
      cellN: mv.filter((v) => /^cell \d+$/.test(v._name ?? "") && !isNkImport(v)).map((v) => v._inputs.map((i) => i._name)).slice(0, 4),
      at: mv.filter((v) => (v._name ?? "").startsWith("@")).map((v) => ({ name: v._name, type: v._type, def: String(v._definition).slice(0, 40) })),
      types: Object.fromEntries([...new Set(mv.map((v) => v._type))].map((t) => [t, mv.filter((v) => v._type === t).length])),
    });
  }
  // one rewired import and one unrewired output, verbatim
  const rewiredEx = vars.find((v) => v._module === main && v._inputs.length === 1 && v._inputs[0]._module !== main && v._inputs[0]._module !== rt._builtin);
  const pending = vars.find((v) => v._inputs.length === 1 && isNkImport(v._inputs[0]));
  return {
    modules: modules.size,
    totals: Object.fromEntries(["nkImportCells", "nkImportComputed", "outputsStillOnImportCell", "rewiredImports"].map((k) => [k, summary.reduce((a, s) => a + s[k], 0)])),
    modulesWithoutFA: summary.filter((s) => s.fileAttachmentBuiltin === false).length,
    mainSummary: summary.find((s) => s.main),
    unresolvedExample: pending ? { name: pending._name, def: String(pending._definition), importCellComputed: pending._inputs[0]._value !== undefined, importCellReachable: pending._inputs[0]._reachable } : null,
    rewiredExample: rewiredEx ? { name: rewiredEx._name, def: String(rewiredEx._definition), input: rewiredEx._inputs[0]._name } : null,
    perModule: summary.filter((s) => !s.builtin).map((s) => [s.vars, s.nkImportCells, s.nkImportComputed, s.outputsStillOnImportCell, s.rewiredImports, s.fileAttachmentBuiltin, s.viewofValueNk, s.viewofValueLegacy]),
    legend: "perModule = [vars, nkImportCells, computed, outputsStillOnImportCell, rewiredImports, hasFA, viewofValueNk, viewofValueLegacy]",
  };
}
