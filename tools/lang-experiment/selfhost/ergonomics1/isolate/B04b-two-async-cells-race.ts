const a = async (fetch: Fetch) => { await fetch("https://example.test/a.json"); return "a"; };
const b = async (fetch: Fetch) => { await fetch("https://example.test/b.json"); return "b"; };
const aDone = function* (a: string) { yield a; };
const bDone = function* (b: string) { yield b; };
const last = (): StateCell<string> => state("");
const setLast = (last: State<string>) => action((s: string) => last.set(s));
const onA = (aDone: Events<string>, setLast: Action<[string]>) => on(aDone, setLast);
const onB = (bDone: Events<string>, setLast: Action<[string]>) => on(bDone, setLast);
