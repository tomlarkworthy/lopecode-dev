// Scripted differential of the store shell (prelude.runtime.ts), for what the shipped tests do not reach: a view
// whose input listener calls an action while the commit is telling it (a feed from inside the tellView performer).
// The same random scripts run on the shipped prelude.runtime.ts and on this folder's store-shell.ts
// (bun --preload ./redirect.ts with SHELLS=store); each prints one line per script, compared line by line.
// Commit timers are queued and run by the script; no timers run by themselves.
// Run: [SHELLS=store [RUNNER_MUTANT=x]] bun --preload ./redirect.ts store-diff.ts [scripts] > out.txt
const timers: (() => void)[] = [];
(globalThis as any).setTimeout = (f: () => void) => { timers.push(f); return 0; };
const P = await import("../../prelude.runtime.ts");

const N = Number(process.argv[2] ?? 500), STEPS = 50;
let log: string[] = [];
const L = (s: string) => void log.push(s);
const rng = (seed: number) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const show = (v: unknown) => JSON.stringify(v) ?? String(v);

function play(seed: number): string {
  const r = rng(seed), pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
  log = []; timers.length = 0; P.reset();
  type H = { set(v: unknown): void; update(f: (v: unknown) => unknown): void; readonly value: unknown };
  const a = P.materialize(P.state(0), "a") as unknown as H, b = P.materialize(P.state(0), "b") as unknown as H;
  const el = Object.assign(new EventTarget(), { value: 0 as unknown });
  const v = P.viewHandle(el as never, "v", (x) => x) as unknown as H;
  const stores = [a, b, v];
  const inner = P.action((n: unknown) => { a.update((x) => (x as number) + (n as number)); return P.read(a); }) as (n: number) => unknown;
  const bump = P.action((n: unknown) => { b.set(n); return inner(n as number); }) as (n: number) => unknown;
  const toView = P.action((n: unknown) => v.set(n)) as (n: number) => unknown;
  const throws = P.action(() => { a.set(-1); throw new Error("action threw"); }) as () => unknown;
  // a view's input listener that calls an action while the commit tells the view
  let reenter = r() < 0.7;
  el.addEventListener("input", () => { L(`view input ${show(el.value)}`); if (reenter) { reenter = r() < 0.5; try { L(`from view ${show(bump(100))}`); } catch (e) { L(`from view threw ${(e as Error).message}`); } } });
  const guarded = (what: string, f: () => unknown) => { try { L(`${what} -> ${show(f())}`); } catch (e) { L(`${what} threw ${(e as Error).message}`); } };
  for (let s = 0; s < STEPS; s++) {
    const x = r(), n = Math.floor(r() * 10);
    if (x < 0.25) guarded(`bump ${n}`, () => bump(n));
    else if (x < 0.35) guarded(`inner ${n}`, () => inner(n));
    else if (x < 0.5) guarded(`toView ${n}`, () => toView(n));
    else if (x < 0.57) guarded("throws", () => throws());
    else if (x < 0.62) guarded("set outside", () => pick(stores).set(n));
    else if (x < 0.66) guarded("read outside", () => P.read(a as never));
    else if (x < 0.9) { const t = timers.shift(); if (t) guarded("commit", t); }
    else if (x < 0.95) { P.rt.evalDepth++; guarded("call while evaluating", () => bump(n)); P.rt.evalDepth--; }
    L(`a=${show(a.value)} b=${show(b.value)} v=${show(v.value)} idle=${P.idle()} depth=${P.rt.actionDepth}`);
  }
  while (timers.length) guarded("commit", timers.shift()!);
  L(`end a=${show(a.value)} b=${show(b.value)} v=${show(v.value)} commits=${P.rt.commits}`);
  return log.join(" | ");
}
for (let seed = 1; seed <= N; seed++) console.log(`${seed}\t${play(seed)}`);
