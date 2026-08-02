#!/usr/bin/env bun
const K: any = await import("./kernel.js");
const time = (label: string, n: number, calls: number, f: () => void) => {
  for (let i = 0; i < 3000; i++) f();
  const t0 = performance.now();
  for (let i = 0; i < n; i++) f();
  const ns = ((performance.now() - t0) * 1e6) / n;
  return { label, ns: +ns.toFixed(0), calls, msPerFrame: +((ns * calls) / 1e6).toFixed(1) };
};
const tpl = K.templateAtOffset(K.carrierTemplate, 3.5);           // 10 rings
const scan = Float64Array.from({ length: 15 }, (_, i) => 100 + i * 5.1);
const p4 = [{x:100,k:-27.8},{x:118,k:-9.4},{x:152,k:9.4},{x:170,k:27.8}];
const p8 = Array.from({length:8},(_,i)=>({x:100+i*10,k:-28+i*8}));
const mob = K.fitMobiusLS(p4);
const map = new Int32Array(64);
K.dpScratch.ensure((tpl.length+1)*(scan.length+1), 64);
const rows = [
  time("fitMobiusLS(4pt)", 100000, 0, () => K.fitMobiusLS(p4)),
  time("fitMobiusLS(8pt)", 100000, 0, () => K.fitMobiusLS(p8)),
  time("fitMobiusLS(5.6 avg)", 100000, 113464, () => { K.fitMobiusLS(p4); }),
  time("dpAlignFast(10x15)", 200000, 74048, () => K.dpAlignFast(tpl, tpl.length, scan, scan.length, 2, map)),
  time("templateAtOffset", 300000, 29120, () => K.templateAtOffset(K.carrierTemplate, 3.5)),
  time("xFromK", 1000000, 1031320, () => K.xFromK(mob, 7))
];
console.table(rows);
console.log("attributed ms/frame:", rows.reduce((s,r)=>s+r.msPerFrame,0).toFixed(1), "of ~235 measured");
