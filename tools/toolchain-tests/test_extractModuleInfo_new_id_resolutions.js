test_extractModuleInfo_new_id_resolutions = {
  // new.observablehq.com d/<id>@<ver> import with resolutions=.
  expect(
    extractModuleInfo(
      'async () => runtime.module((await import("/d/e1c39d41e8e944b0@939.js?v=4&resolutions=a6a56ee61aba9799@437")).default)'
    )
  ).toEqual({ id: "e1c39d41e8e944b0", version: "939" });
  return "ok";
}
