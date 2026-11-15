// A ref's content may not contain a Ref or RefCell: not directly, in a record, in an array or in a union.
let count = (): RefCell<number> => ref(0);
let which = (count: Ref<number>): RefCell<Ref<number>> => ref(count);
let inRecord = (count: Ref<number>): RefCell<{ readonly r: Ref<number> }> => ref({ r: count });
let inArray = (count: Ref<number>): RefCell<readonly Ref<number>[]> => ref([count]);
let inUnion = (): RefCell<Ref<number> | null> => ref<Ref<number> | null>(null);
