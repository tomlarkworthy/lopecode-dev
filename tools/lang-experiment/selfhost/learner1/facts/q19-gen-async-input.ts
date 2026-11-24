import { toSrcs, type Cand } from "./h.ts";
export const cands: Cand[] = [
  { name: "accept-generator-takes-async-value", src: `type Profile = { readonly name: string };
const profile = async (fetch: Fetch): Promise<Profile> => { const res = await fetch("p.json"); const c = cast<Profile>(await res.json()); if (!c.ok) throw new Error(c.error); return c.value; };
const names = function* (profile: Profile) { yield profile.name; };
const stored = (): StateCell<string> => state("");
const store = (stored: State<string>) => action((s: string) => stored.set(s));
const onName = (names: Events<string>, store: Action<[string]>) => on(names, store);`, fetchBody: '{"name":"ada"}', show: ["profile", "stored"] },
  { name: "reject-generator-param-typed-promise", src: `const profile = async () => 1;
const g = function* (profile: Promise<number>) { yield 1; };` },
  { name: "accept-finite-generator-with-listener", src: `const tenAndOne = function* () { for (let i = 0; i <= 10; i++) yield i; };
const total = (): StateCell<number> => state(0);
const addTo = (total: State<number>) => action((n: number) => total.update((t) => t + n));
const onN = (tenAndOne: Events<number>, addTo: Action<[number]>) => on(tenAndOne, addTo);`, show: ["total"] },
];
export const srcs = toSrcs(cands);
