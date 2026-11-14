// A ref whose initial value comes from a dependency; re-created when the dependency changes.
type Vars = { readonly n: number };
export let decodeVars = () => (x: Js): Vars => {
  if (typeof x === "object" && x !== null && "n" in x && typeof x.n === "number") return { n: x.n };
  throw new Error("vars");
};
export let seed = (): RefCell<number> => ref(1);
export let vars = (vars_initial: Js, decodeVars): RefCell<Vars> => ref(decodeVars(vars_initial));
export let label = (vars) => `n=${vars.n}`;
export let setN = (vars: Ref<Vars>) => action((n: number) => vars.set({ n }));
export let bumpSeed = (seed: Ref<number>) => action(() => seed.update((s) => s + 1));
export let test_label = (label) => {
  if (!label.startsWith("n=")) throw new Error(label);
  return label;
};
