// A state cell whose initial value comes from a dependency; re-created when the dependency changes.
type Vars = { readonly n: number };
let decodeVars = () => (x: Js): Vars => {
  if (typeof x === "object" && x !== null && "n" in x && typeof x.n === "number") return { n: x.n };
  throw new Error("vars");
};
let seed = (): StateCell<number> => state(1);
let vars = (vars_initial: Js, decodeVars): StateCell<Vars> => state(decodeVars(vars_initial));
let label = (vars) => `n=${vars.n}`;
let setN = (vars: State<Vars>) => action((n: number) => vars.set({ n }));
let bumpSeed = (seed: State<number>) => action(() => seed.update((s) => s + 1));
let test_label = (label) => {
  if (!label.startsWith("n=")) throw new Error(label);
  return label;
};
