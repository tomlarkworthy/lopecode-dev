type KeyEvent = { readonly key: string; readonly t: number };

const typed = () => "hello world";

// One event per character, stamped with the clock; ends after the last character.
const keys = function* (now: Clock, typed: string) {
  for (let i = 0; i < typed.length; i++) yield { key: typed[i] ?? "", t: now() };
};

const buffer = (): StateCell<readonly string[]> => state<readonly string[]>([]);
const flushed = (): StateCell<readonly string[]> => state<readonly string[]>([]);

const onKey = (buffer: State<readonly string[]>, flushed: State<readonly string[]>) =>
  action((e: KeyEvent) => {
    const next: readonly string[] = [...read(buffer), e.key];
    if (e.key === " " || next.length >= 5) {
      const word = next.join("");
      flushed.update((f) => [...f, word]);
      buffer.set([]);
    } else {
      buffer.set(next);
    }
  });

const listen = (keys: Events<KeyEvent>, onKey: Action<[KeyEvent]>) => on(keys, onKey);
