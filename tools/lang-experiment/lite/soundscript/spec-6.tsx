const s6_count = (): StateCell<number> => state(0);

const s6_label = (s6_count: number) => `count: ${s6_count}`;

const s6_increment = (s6_count: State<number>) => action(() => s6_count.update((c) => c + 1));

const s6_other = (): StateCell<number> => state(0);

const s6_copy = (s6_other: State<number>, s6_count: State<number>) => action(() => s6_other.set(read(s6_count) + 1));

const s6_bumpThenCopy = (s6_count: State<number>, s6_copy: Action<[]>) =>
  action(() => {
    s6_count.update((c) => c + 1);
    s6_copy();
  });

const s6_controls = (s6_increment: Action<[]>, s6_bumpThenCopy: Action<[]>) => ({ increment: s6_increment, bumpThenCopy: s6_bumpThenCopy });

const s6_view = (s6_count: number, s6_other: number, s6_increment: Action<[]>, s6_bumpThenCopy: Action<[]>) => (
  <div>
    <button onClick={s6_increment}>increment</button> <button onClick={s6_bumpThenCopy}>bump then copy</button>{" "}
    <output>s6_count {s6_count}, s6_other {s6_other}</output>
  </div>
);
