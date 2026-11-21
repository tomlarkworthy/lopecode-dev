// The same script against prelude.runtime.ts and shell.ts; prints any line that differs. Covers falsy values
// (null, 0, "", false) through .value, read, update's argument, a nested call's return, and a view.
// Run: bun selfhost/sched-store/differential.ts     exit 1 on a difference
const impls = { original: await import("../../prelude.runtime.ts"), prototype: await import("./shell.ts") };
const out: Record<string, string[]> = {};
for (const [k, P] of Object.entries(impls)) {
  const log: string[] = (out[k] = []);
  const show = (x: unknown) => (x === undefined ? "undefined" : JSON.stringify(x));
  for (const v of [null, 0, "", false]) {
    const n: any = P.materialize(P.state(v), "n");
    log.push(`value ${show(n.value)}`);
    const inner = P.action(() => v);
    P.action(() => { log.push(`read ${show(P.read(n))}`); n.update((x: unknown) => (log.push(`update got ${show(x)}`), x)); log.push(`nested ${show(inner())}`); })();
    const el = { value: v, dispatchEvent: () => true };
    const h: any = P.viewHandle(el, "el", (x) => x);
    P.action(() => log.push(`view read ${show(P.read(h))}`))();
    log.push(`view value ${show(h.value)}`);
  }
}
const a = out.original, b = out.prototype;
let bad = 0;
for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) { bad++; console.log(`#${i} original ${a[i]} | prototype ${b[i]}`); }
console.log(`${a.length} lines compared, ${bad} differ`);
process.exit(bad ? 1 : 0);
