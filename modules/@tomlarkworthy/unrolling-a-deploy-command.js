const _1l0azww = function _1(md){return(
md`# Unrolling a Deploy command

If a deploy containing cell is slow to execute the runtime won't see it fast enough (10 seconds). If you response takes a long time to compute, take the response object outside of the handler so the deploy command can execute and leave dataflow to service the reponse later.
`
)};
const _y497dg = function _unrolled_res(){return(
undefined
)};
const _tqwfo6 = (M, _) => new M(_);
const _1db4ipn = _ => _.generator;
const _14snotl = function _3(deploy,$0){return(
deploy("slow", async (req, res) => {
  $0.value = res;
})
)};
const _uf8lt8 = function _slow(Promises){return(
Promises.delay("hi", 10000)
)};
const _sid811 = function _5(unrolled_res,slow){return(
unrolled_res.send(slow)
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @endpointservices/serverless-cells", async () => runtime.module((await import("/@endpointservices/serverless-cells.js?v=4")).default));  
  $def("_1l0azww", null, ["md"], _1l0azww);  
  $def("_y497dg", "initial unrolled_res", [], _y497dg);  
  $def("_tqwfo6", "mutable unrolled_res", ["Mutable","initial unrolled_res"], _tqwfo6);  
  $def("_1db4ipn", "unrolled_res", ["mutable unrolled_res"], _1db4ipn);  
  $def("_14snotl", null, ["deploy","mutable unrolled_res"], _14snotl);  
  $def("_uf8lt8", "slow", ["Promises"], _uf8lt8);  
  $def("_sid811", null, ["unrolled_res","slow"], _sid811);  
  main.define("deploy", ["module @endpointservices/serverless-cells", "@variable"], (_, v) => v.import("deploy", _));
  return main;
}