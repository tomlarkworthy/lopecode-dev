test_findModuleName_classic_bundle = {
  // classic observablehq.com bundles imports; the holder def is a bare slug import.
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("@tomlarkworthy/flow-queue")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("@tomlarkworthy/flow-queue");
  return "ok";
}
