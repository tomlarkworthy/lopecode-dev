async (rt) => {
  const vars = [...rt._variables];
  const val = (n) => vars.find((v) => v._name === n && v._value !== undefined)?._value;
  const moduleMap = val("moduleMap");
  const isNkImport = (v) => v._inputs.length === 1 && v._inputs[0]?._name === "@variable" && String(v._definition).includes("__variable._module._runtime.module(");
  let names;
  try { names = await moduleMap(rt); } catch (e) { return { moduleMapError: String(e?.stack ?? e) }; }
  const rows = [];
  for (const [m, info] of names) {
    const mv = vars.filter((v) => v._module === m);
    const imp = mv.filter(isNkImport);
    rows.push({
      name: info.name, vars: mv.length,
      moduleVars: mv.filter((v) => String(v._name).startsWith("module ")).map((v) => v._name).slice(0, 3),
      importCells: imp.map((v) => v._name).slice(0, 3),
      importCellDef: imp[0] && m !== val("main") ? String(imp[0]._definition).slice(0, 600) : undefined,
      importCellOutputs: imp[0] ? [...(imp[0]._outputs ?? [])].map((o) => o._name).slice(0, 5) : undefined,
      infoKeys: Object.keys(info),
    });
  }
  return { count: names.size, rows };
}
