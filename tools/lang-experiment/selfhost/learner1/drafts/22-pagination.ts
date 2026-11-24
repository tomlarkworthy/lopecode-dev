const items = () => Array.from({ length: 23 }, (_, i) => `item ${i + 1}`);
const pageSize = () => 5;

const page = (): StateCell<number> => state(0);

const pageCount = (items: readonly string[], pageSize: number) => Math.ceil(items.length / pageSize);

const visible = (items: readonly string[], pageSize: number, page: number) =>
  items.slice(page * pageSize, (page + 1) * pageSize);

// pageCount depends only on data cells, not on state, so an action may use it.
const nextPage = (page: State<number>, pageCount: number) =>
  action(() => page.update((p) => Math.min(pageCount - 1, p + 1)));

const prevPage = (page: State<number>) => action(() => page.update((p) => Math.max(0, p - 1)));
