const userId = (): StateCell<number> => state(1);
const profile = async (fetch: Fetch, userId: number) => {
  const r = await fetch(`https://example.test/users/${userId}`);
  const x: unknown = await r.json();
  if (typeof x !== "object" || x === null || !("name" in x)) throw new Error("no name");
  return { name: String(x.name) };
};
const names = function* (profile: { name: string }) {
  yield profile.name;
};
const seen = (): StateCell<string[]> => state<string[]>([]);
const remember = (seen: State<string[]>) => action((n: string) => seen.update((s) => [...s, n]));
const onName = (names: Events<string>, remember: Action<[string]>) => on(names, remember);
const nextUser = (userId: State<number>) => action(() => userId.update((u) => u + 1));
