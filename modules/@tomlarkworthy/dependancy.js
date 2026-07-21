const _1xb1xo6 = function _1(md){return(
md`# Dependancy`
)};
const _c29vi3 = function _dep(){return(
"a"
)};
const _136ux6f = function _error_dep()
{
  throw "err";
};
const _uo6fr = function _viewdep(Inputs){return(
Inputs.input()
)};
const _cg29g8 = (G, _) => G.input(_);
const _jng2qg = function _mutabledep(){return(
{}
)};
const _1fap161 = (M, _) => new M(_);
const _irkioc = _ => _.generator;

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1xb1xo6", null, ["md"], _1xb1xo6);  
  $def("_c29vi3", "dep", [], _c29vi3);  
  $def("_136ux6f", "error_dep", [], _136ux6f);  
  $def("_uo6fr", "viewof viewdep", ["Inputs"], _uo6fr);  
  $def("_cg29g8", "viewdep", ["Generators","viewof viewdep"], _cg29g8);  
  $def("_jng2qg", "initial mutabledep", [], _jng2qg);  
  $def("_1fap161", "mutable mutabledep", ["Mutable","initial mutabledep"], _1fap161);  
  $def("_irkioc", "mutabledep", ["mutable mutabledep"], _irkioc);
  return main;
}