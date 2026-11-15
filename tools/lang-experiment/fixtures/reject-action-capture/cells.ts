// Actions that use a value from the cell's last run instead of reading state when called.
let count = (): RefCell<number> => ref(0);
let other = (): RefCell<number> => ref(0);
let copy = (other: Ref<number>, count: number) => action(() => other.set(count + 1));
let doubled = (count: number) => count * 2;
let viaLocal = (other: Ref<number>, doubled: number) => {
  const k = doubled + 1;
  return action(() => other.set(k));
};
let roll = (other: Ref<number>, random: Random) => action(() => other.set(random()));
let stamp = (other: Ref<number>, now: Clock) => action(() => other.set(now()));
let load = (other: Ref<number>, fetch: Fetch) =>
  action(() => {
    fetch("https://example.invalid/");
    other.set(1);
  });
