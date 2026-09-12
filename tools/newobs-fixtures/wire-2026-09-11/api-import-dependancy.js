const _7 = function dep(){return(
"a"
)};

const _22 = function error_dep()
{
  throw "err";
}
;

const _9 = function viewof$viewdep(Inputs){return(
Inputs.input()
)};

const _11 = function mutable$mutabledep(){return(
{}
)};

export default function define(runtime) {
  const main = runtime.module();
  main.define("dep", [], _7);
  main.define("error_dep", [], _22);
  main.define("viewof viewdep", ["Inputs"], _9);
  main.define("viewdep", ["Generators", "viewof viewdep"], (G, _) => G.input(_));
  main.define("initial mutabledep", [], _11);
  main.define("mutator mutabledep", ["Mutable", "initial mutabledep"], (M, _) => ((m) => [m, {get value() { return m.value; }, set value(v) { m.value = v; }}])(M(_)));
  main.define("mutable mutabledep", ["mutator mutabledep"], ([, m]) => m);
  main.define("mutabledep", ["mutator mutabledep"], ([m]) => m);
  return main;
}
