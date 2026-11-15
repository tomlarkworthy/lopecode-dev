// A counter ref, a label on its value, and an action cell that depends only on the Ref.
let count = (): RefCell<number> => ref(0);
let label = (count) => `count: ${count}`;
let increment = (count: Ref<number>) => action(() => count.update((c) => c + 1));
let test_label = (label) => {
  if (!label.startsWith("count: ")) throw new Error(`bad label ${label}`);
  return label;
};
