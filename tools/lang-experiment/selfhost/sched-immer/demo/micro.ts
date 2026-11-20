// One produce that patches one field of one record in a 1-entry Map, with the other four maps touched or not.
// Run: bun selfhost/sched-immer/demo/micro.ts
import { Immer, enableMapSet } from "immer";
enableMapSet();
for (const autoFreeze of [true, false]) {
  const im = new Immer({ autoFreeze });
  let st: any = { hs: new Map([[1, { busy: false, q: [] as number[] }]]), at: new Map(), ls: new Map(), lat: new Map(), born: new Map(), placer: false };
  const N = 200000;
  for (const touchAll of [false, true]) {
    const t0 = performance.now();
    for (let i = 0; i < N; i++) st = im.produce(st, (d: any) => { if (touchAll) { d.at; d.ls; d.lat; d.born; } d.hs.get(1).busy = !d.hs.get(1).busy; });
    console.log(`autoFreeze=${autoFreeze} touch4maps=${touchAll}: ${((performance.now() - t0) * 1000 / N).toFixed(2)} us/produce`);
  }
}
