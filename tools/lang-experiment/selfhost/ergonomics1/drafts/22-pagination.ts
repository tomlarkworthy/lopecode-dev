const items = () => Array.from({ length: 23 }, (_, i) => `item ${i + 1}`);
const pageSize = () => 5;
const page = (): StateCell<number> => state(0);
const pageCount = (items: string[], pageSize: number) => Math.ceil(items.length / pageSize);
const nextPage = (page: State<number>, pageCount: number) => action(() => page.update((p) => Math.min(pageCount - 1, p + 1)));
const prevPage = (page: State<number>) => action(() => page.update((p) => Math.max(0, p - 1)));
const visible = (items: string[], page: number, pageSize: number) => items.slice(page * pageSize, (page + 1) * pageSize);
