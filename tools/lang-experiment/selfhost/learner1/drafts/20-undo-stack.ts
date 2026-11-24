type History = { readonly past: readonly number[]; readonly present: number; readonly future: readonly number[] };

const history = (): StateCell<History> => state<History>({ past: [], present: 0, future: [] });

const setValue = (history: State<History>) =>
  action((v: number) => history.update((h) => ({ past: [...h.past, h.present], present: v, future: [] })));

const undo = (history: State<History>) =>
  action(() =>
    history.update((h) => {
      const prev = h.past.at(-1);
      if (prev === undefined) return h;
      return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
    })
  );

const redo = (history: State<History>) =>
  action(() =>
    history.update((h) => {
      const next = h.future[0];
      if (next === undefined) return h;
      return { past: [...h.past, h.present], present: next, future: h.future.slice(1) };
    })
  );

const current = (history: History) => history.present;
