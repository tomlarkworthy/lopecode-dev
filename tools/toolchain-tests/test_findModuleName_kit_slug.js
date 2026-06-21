test_findModuleName_kit_slug = {
  // Notebook Kit compiles observable imports to import("https://api.observablehq.com/@u/nb.js?v=4").
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async (__ojs_runtime) => __ojs_runtime.module((await import("https://api.observablehq.com/@d3/color-legend.js?v=4")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("@d3/color-legend");
  return "ok";
}
