// Actions that read state when they are called: copy reads count, nested calls see earlier writes.
let count = (): RefCell<number> => ref(0);
let other = (): RefCell<number> => ref(0);
let copy = (other: Ref<number>, count: Ref<number>) => action(() => other.set(read(count) + 1));
let bumpThenCopy = (count: Ref<number>, copy: Action<[]>) =>
  action(() => {
    count.update((c) => c + 1);
    copy();
  });
let scale = () => (n: number) => n * 3;
let setScaled = (other: Ref<number>, scale: (n: number) => number) => action((v: number) => other.set(scale(v)));
// log writes nothing the program reads back, so an action may use it
let say = (count: Ref<number>, log: Log) =>
  action(() => {
    log("bump");
    count.update((c) => c + 1);
  });
let pair = (count: number, other: number) => [count, other];
let test_pair = (pair: number[]) => {
  if (pair.length !== 2) throw new Error(`bad pair ${pair}`);
  return pair.join(",");
};
