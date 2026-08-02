#!/usr/bin/env bun
const K: any = await import("./kernel-opt.js");
const time = (label: string, n: number, calls: number, f: () => void) => {
  for (let i = 0; i < 5000; i++) f();
  const t0 = performance.now();
  for (let i = 0; i < n; i++) f();
  const ns = ((performance.now() - t0) * 1e6) / n;
  return { label, ns: +ns.toFixed(0), calls, msPerFrame: +((ns * calls) / 1e6).toFixed(1) };
};
const tpl = K.templateAtOffset(K.carrierTemplate, 3.5);
const scan = Float64Array.from({ length: 15 }, (_, i) => 100 + i * 5.1);
const p4 = [{x:100,k:-27.8},{x:118,k:-9.4},{x:152,k:9.4},{x:170,k:27.8}];
const mob = K.fitMobiusLS(p4);
const map = new Int32Array(64);
K.dpScratch.ensure((tpl.length+1)*(scan.length+1), 64);
console.table([
  time("fitMobiusLS", 300000, 140619, () => K.fitMobiusLS(p4)),
  time("dpAlignFast(10x15)", 200000, 85351, () => K.dpAlignFast(tpl, tpl.length, scan, scan.length, 2, map)),
  time("templateAtOffset", 300000, 33565, () => K.templateAtOffset(K.carrierTemplate, 3.5)),
  time("xFromK", 1000000, 1281245, () => K.xFromK(mob, 7))
]);
