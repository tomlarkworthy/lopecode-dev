const name = (): StateCell<string> => state("");
const load = (name: State<string>, fetch: Fetch) =>
  action(async () => {
    const r = await fetch("https://example.test/users/1");
    const x: unknown = await r.json();
    name.set(String(x));
  });
