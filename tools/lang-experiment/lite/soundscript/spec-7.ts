const s7_beats = function* () {
  for (let i = 1; i <= 3; i++) yield i;
};

const s7_seen = (): StateCell<readonly number[]> => state<readonly number[]>([]);

const s7_add = (s7_seen: State<readonly number[]>) => action((v: number) => s7_seen.update((l) => [...l, v]));

const s7_onBeat = (s7_beats: Events<number>, s7_add: Action<[number]>) => on(s7_beats, s7_add);
