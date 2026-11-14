// A counter ref, a label on its value, and an action cell that depends only on the Ref.
export let count = (): RefCell<number> => ref(0);
export let label = (count) => `count: ${count}`;
export let increment = (count: Ref<number>) => action(() => count.update((c) => c + 1));
export let test_label = (label) => {
  if (!label.startsWith("count: ")) throw new Error(`bad label ${label}`);
  return label;
};
