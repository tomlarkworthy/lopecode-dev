type Hist = { past: number[]; present: number; future: number[] };
const hist = (): StateCell<Hist> => state<Hist>({ past: [], present: 0, future: [] });
const setValue = (hist: State<Hist>) =>
  action((v: number) => hist.update((h) => ({ past: [...h.past, h.present], present: v, future: [] })));
const undo = (hist: State<Hist>) =>
  action(() =>
    hist.update((h) => {
      const prev = h.past[h.past.length - 1];
      if (prev === undefined) return h;
      return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
    })
  );
const redo = (hist: State<Hist>) =>
  action(() =>
    hist.update((h) => {
      const [next, ...rest] = h.future;
      if (next === undefined) return h;
      return { past: [...h.past, h.present], present: next, future: rest };
    })
  );
const current = (hist: Hist) => hist.present;
