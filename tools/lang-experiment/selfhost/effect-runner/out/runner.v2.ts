// The one effect runner: holds a step function's state, performs each effect the step returns with the performer
// named by its fx tag, and feeds what a performer returns back as the next event. Unchecked TypeScript.
// Contract, as the shipped loops of lite/browser/cells.ts, lite/browser/workers.ts and prelude.runtime.ts behave:
// - the state is replaced before any effect of the step runs; a throw from the step leaves the state as it was
// - depth first: an effect's follow-up event, and that event's effects, run before the effects after it
// - feed is re-entrant: a feed from inside a performer (user code, a throwing performer) runs to the end at once,
//   on its own work stack, and reads the state the outer feed left
// - a throw from a performer goes to feed's caller; the rest of that feed's work is not done
// - feed returns what a performer of that feed gave to answer (the store's return effect), else undefined
export type Tagged = { readonly fx: string };
export type Stepped<S, Fx> = { readonly state: S; readonly effects: readonly Fx[] };
// the members of Fx whose tag may be K (a member tagged "frame" | "next" is a member of both)
export type FxOf<Fx, K extends string> = Fx extends { readonly fx: infer F } ? (K extends F ? Fx : never) : never;
export type Run<Ev> = { readonly feed: (ev: Ev) => unknown; readonly answer: (v: unknown) => void };
export type Performers<Fx extends Tagged, Ev> = { readonly [K in Fx["fx"]]: (e: FxOf<Fx, K>, run: Run<Ev>) => Ev | void };
export type Runner<S, Ev> = { readonly feed: (ev: Ev) => unknown; readonly state: () => S };

// an event is told from an effect by its fx tag, so an event type may not have one
export function runner<S, Ev extends object & { readonly fx?: never }, Fx extends Tagged>(
  step: (s: S, ev: Ev) => Stepped<S, Fx>, initial: S, perform: Performers<Fx, Ev>,
): Runner<S, Ev> {
  let state = initial, depth = 0;
  const table = perform as unknown as Record<string, (e: Fx, run: Run<Ev>) => Ev | void>;
  // answers[d]: what a performer of the feed at depth d answered; one run object serves every feed
  const answers: unknown[] = [];
  const run: Run<Ev> = { feed: (ev) => feed(ev), answer: (v) => void (answers[depth] = v) };
  const feed = (first: Ev): unknown => {
    const d = ++depth;
    answers[d] = undefined;
    try {
      const work: (Ev | Fx)[] = [first];
      while (work.length) {
        const x = work.pop()!;
        if ("fx" in x) { const e = x as Fx, next = table[e.fx]!(e, run); if (next !== undefined) work.push(next); continue; }
        const r = step(state, x as Ev);
        state = r.state;
        for (let i = r.effects.length - 1; i >= 0; i--) work.push(r.effects[i]!);
      }
      return answers[d];
    } finally { depth--; }
  };
  return { feed, state: () => state };
}
