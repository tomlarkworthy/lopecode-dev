const tests = await get("testFrameResults");
const agree = await get("poolAgreement");
return {
  allPass: tests.every(t => t.pass),
  tests: tests.map(t => ({ f: t.file.replace("frame-",""), pass: t.pass, ids: t.ids.length, primaryPx: +t.primaryDisagreePx.toFixed(3) })),
  workers: await get("poolSize"),
  poolAgrees: agree.map(a => a.identical),
  bootProfile: await get("profileFrameCost"),
  errorNodes: document.querySelectorAll(".observablehq--error").length
};
