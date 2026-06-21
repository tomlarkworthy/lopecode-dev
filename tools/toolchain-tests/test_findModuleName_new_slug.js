test_findModuleName_new_slug = {
  const m = {}; // module sentinel
  const scope = new Map([
    ["module 1", { _name: "module 1", _value: m,
      _definition: 'async () => runtime.module((await import("/@mootari/access-runtime.js?v=4&resolutions=98f34e974bb2e4bc@1392")).default)' }]
  ]);
  expect(findModuleName(scope, m)).toEqual("@mootari/access-runtime");
  return "ok";
}
