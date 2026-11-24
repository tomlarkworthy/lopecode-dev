type Profile = { readonly name: string };

const userId = (): StateCell<number> => state(1);

const profile = async (userId: number, fetch: Fetch) => {
  const res = await fetch(`https://example.test/users/${userId}`);
  const r = cast<Profile>(await res.json());
  if (!r.ok) throw new Error(`users/${userId}: ${r.error}`);
  return r.value;
};

// Runs again when profile changes, and yields that profile's name once.
const names = function* (profile: Profile) {
  yield profile.name;
};

const seen = (): StateCell<readonly string[]> => state<readonly string[]>([]);

const remember = (seen: State<readonly string[]>) => action((name: string) => seen.update((s) => [...s, name]));

const onName = (names: Events<string>, remember: Action<[string]>) => on(names, remember);

const nextUser = (userId: State<number>) => action(() => userId.update((id) => id + 1));
