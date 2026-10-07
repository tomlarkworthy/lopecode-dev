// A native Observable runtime whose run-time cells have a QuickJS-backed _definition.
import { getQuickJS } from "quickjs-emscripten";
import { Runtime } from "@observablehq/runtime";
const QuickJS = await getQuickJS();
const vm = QuickJS.newContext();
const toGuest = (x: any): any => {
  if (typeof x === "function") return vm.newFunction(x.name || "host", (...hs) => toGuest(x(...hs.map((h) => vm.dump(h)))));
  const r = vm.evalCode("(" + JSON.stringify(x ?? null) + ")"); return r.value;
};
const fromGuest = (h: any): any => {
  if (vm.typeof(h) === "function") { const keep = h.dup(); return (...args: any[]) => { const hs = args.map(toGuest); const r = vm.callFunction(keep, vm.undefined, ...hs); hs.forEach((a) => a.dispose()); if (r.error) throw new Error(JSON.stringify(vm.dump(r.error))); const v = fromGuest(r.value); r.value.dispose(); return v; }; }
  return vm.dump(h);
};
// source text -> a native function usable as variable._definition
const interpreted = (source: string) => (...inputs: any[]) => {
  const fn = vm.evalCode("(" + source + ")"); if (fn.error) throw new Error(JSON.stringify(vm.dump(fn.error)));
  const hs = inputs.map(toGuest);
  const r = vm.callFunction(fn.value, vm.undefined, ...hs);
  hs.forEach((a) => a.dispose()); fn.value.dispose();
  if (r.error) throw new Error(JSON.stringify(vm.dump(r.error)));
  const v = fromGuest(r.value); r.value.dispose(); return v;
};
const rt = new Runtime(); const m = rt.module();
m.variable({}).define("rate", [], () => 0.2);                                            // native
m.variable({}).define("nativeRound", [], () => (x: number) => Math.round(x * 100) / 100); // native function cell
m.variable({}).define("addTax", ["rate"], interpreted("(rate) => (price) => price * (1 + rate)"));       // interpreted cell whose VALUE is a function
m.variable({}).define("total", ["addTax", "nativeRound"], (addTax: any, nativeRound: any) => nativeRound(addTax(9.99))); // native cell calls interpreted function
m.variable({}).define("viaHostFn", ["nativeRound"], interpreted("(nativeRound) => nativeRound(1.23456)")); // interpreted cell calls native function
m.variable({}).define("broken", [], interpreted("() => { throw new Error('boom') }"));
const out: any = { total: await m.value("total"), viaHostFn: await m.value("viaHostFn") };
m.redefine("rate", [], () => 0.5);
out.totalAfterRateChange = await m.value("total");
out.error = await m.value("broken").catch((e: any) => String(e).slice(0, 80));
const t0 = performance.now(); const f = await m.value("addTax"); for (let i = 0; i < 10000; i++) f(i); out.usPerCrossing = +(((performance.now() - t0) / 10000) * 1000).toFixed(1);
console.log(JSON.stringify(out));
