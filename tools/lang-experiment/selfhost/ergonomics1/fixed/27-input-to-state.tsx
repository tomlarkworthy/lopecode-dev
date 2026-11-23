const query = (): StateCell<string> => state("");
const setQuery = (query: State<string>) => action((s: string) => query.set(s.trim().toLowerCase()));
const fruits = () => ["apple", "banana", "cherry", "grape", "pineapple"];
const matches = (fruits: string[], query: string) => fruits.filter((f) => f.includes(query));
const searchView = (query: string, matches: string[], setQuery: Action<[string]>) => (
  <div>
    <input type="text" value={query} onInput={setQuery} />
    <span>{matches.length} matches: {matches.join(", ")}</span>
  </div>
);
