// Actions that read state when they are called: copy reads count, nested calls see earlier writes.
export let count = (): RefCell<number> => ref(0);
export let other = (): RefCell<number> => ref(0);
export let copy = (other: Ref<number>, count: Ref<number>) => action(() => other.set(read(count) + 1));
export let bumpThenCopy = (count: Ref<number>, copy: Action<[]>) =>
  action(() => {
    count.update((c) => c + 1);
    copy();
  });
export let scale = () => (n: number) => n * 3;
export let setScaled = (other: Ref<number>, scale: (n: number) => number) => action((v: number) => other.set(scale(v)));
// log writes nothing the program reads back, so an action may use it
export let say = (count: Ref<number>, log: Log) =>
  action(() => {
    log("bump");
    count.update((c) => c + 1);
  });
export let pair = (count: number, other: number) => [count, other];
export let test_pair = (pair: number[]) => {
  if (pair.length !== 2) throw new Error(`bad pair ${pair}`);
  return pair.join(",");
};
