test_extractModuleInfo_new_slug_resolutions = {
  // new.observablehq.com slug import carries a resolutions= param.
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/@mootari/access-runtime.js?v=4&resolutions=98f34e974bb2e4bc@1392")).default)'
    )
  ).toEqual({ namespace: "mootari", notebook: "access-runtime", version: "1392" });
  return "ok";
}
