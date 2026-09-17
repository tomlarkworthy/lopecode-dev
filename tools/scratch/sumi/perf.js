(async () => { let mv; for (const v of window.__ojs_runtime._variables) if (v._name === "mainLoop") mv = v; let tray; for (const v of window.__ojs_runtime._variables) if (v._name === "tray") tray = v._value;
 const gl = document.querySelector("canvas").getContext("webgl2");
 // GPU cost of 100 solver steps, forced to completion
 gl.finish(); const t0 = performance.now(); for (let i=0;i<100;i++) tray.step(); gl.finish(); tray.read(); const ms = (performance.now()-t0)/100; const t1=performance.now(); for (let i=0;i<100;i++) tray.step({transportSteps:16}); gl.finish(); tray.read(); const ms16=(performance.now()-t1)/100;
 return { grid: [tray.width, tray.height], msPerStep: ms, msPerStepTouching: ms16, stepsPerSecondBudget: 1000/ms }; })()
