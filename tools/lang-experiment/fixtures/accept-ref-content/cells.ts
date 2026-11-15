// Ref content of nested records, arrays and unions, with no Ref or RefCell inside.
type Item = { readonly id: number; readonly tags: readonly string[] };
export let items = (): RefCell<{ readonly list: readonly Item[]; readonly picked: Item | null }> => ref({ list: [{ id: 1, tags: ["a"] }], picked: null });
export let pick = (items: Ref<{ readonly list: readonly Item[]; readonly picked: Item | null }>) =>
  action((id: number) => items.update((s) => ({ ...s, picked: s.list.find((x) => x.id === id) ?? null })));
export let label = (items) => (items.picked === null ? "none" : `item ${items.picked.id}`);
export let test_label = (label) => {
  if (label !== "none") throw new Error(`label ${label}`);
  return label;
};
