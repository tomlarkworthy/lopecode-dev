test_findModuleName_new_id = {
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4&resolutions=a6a56ee61aba9799@437")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("d/e1c39d41e8e944b0@939");
  return "ok";
}
