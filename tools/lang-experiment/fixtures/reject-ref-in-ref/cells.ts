// A ref's content may not contain a Ref or RefCell: not directly, in a record, in an array or in a union.
export let count = (): RefCell<number> => ref(0);
export let which = (count: Ref<number>): RefCell<Ref<number>> => ref(count);
export let inRecord = (count: Ref<number>): RefCell<{ readonly r: Ref<number> }> => ref({ r: count });
export let inArray = (count: Ref<number>): RefCell<readonly Ref<number>[]> => ref([count]);
export let inUnion = (): RefCell<Ref<number> | null> => ref<Ref<number> | null>(null);
