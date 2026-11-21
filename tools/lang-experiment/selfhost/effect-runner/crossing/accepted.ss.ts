// The loop as a checked cell: a pure drain of one feed, each performer its own parameter, a function from another
// language (S11.3). Checked by: bun ../../rt/check.ts accepted.ss.ts --outside performNote,performThen --compile
export type Ev = { readonly t: "tick"; readonly n: number };
export type Fx = { readonly fx: "note"; readonly n: number; readonly value: unknown } | { readonly fx: "then"; readonly ev: Ev };
export type Drained = { readonly state: number; readonly answered: unknown };
export const stepTick = () => (s: number, ev: Ev): { readonly state: number; readonly effects: readonly Fx[] } =>
  ({ state: s + 1, effects: ev.n > 0 ? [{ fx: "note", n: ev.n, value: { n: ev.n } }, { fx: "then", ev: { t: "tick", n: ev.n - 1 } }] : [] });
export type Work = { readonly k: "ev"; readonly ev: Ev } | { readonly k: "fx"; readonly fx: Fx };
// "fx" in x does not narrow a union (S9.2), so the work stack tags its items
export const drain = (stepTick, performNote: (e: { readonly n: number; readonly value: unknown }) => void, performThen: (ev: Ev) => Ev | undefined) => (s0: number, first: Ev): Drained => {
  let state = s0;
  const work: Mut<Work[]> = mut([{ k: "ev", ev: first }]);
  for (let x = work.pop(); x !== undefined; x = work.pop()) {
    if (x.k === "fx") {
      const e = x.fx;
      if (e.fx === "note") performNote({ n: e.n, value: e.value });
      else { const next = performThen(e.ev); if (next !== undefined) work.push({ k: "ev", ev: next }); }
      continue;
    }
    const r = stepTick(state, x.ev);
    state = r.state;
    for (const e of r.effects.toReversed()) work.push({ k: "fx", fx: e });
  }
  return { state, answered: undefined };
};
