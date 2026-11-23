const keys = function* (now: Clock): Generator<{ key: string; t: number }> {
  const typed = "hello world";
  let i = 0;
  while (i < typed.length) {
    yield { key: typed[i], t: now() };
    i++;
  }
};
const buffer = (): StateCell<string[]> => state<string[]>([]);
const flushed = (): StateCell<string[]> => state<string[]>([]);
const onKey = (buffer: State<string[]>, flushed: State<string[]>) =>
  action((e: { key: string; t: number }) => {
    const buf = [...read(buffer), e.key];
    if (e.key === " " || buf.length >= 5) {
      flushed.update((f) => [...f, buf.join("")]);
      buffer.set([]);
    } else buffer.set(buf);
  });
const listen = (keys: Events<{ key: string; t: number }>, onKey: Action<[{ key: string; t: number }]>) => on(keys, onKey);
