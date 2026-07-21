const _rgpqff = function _1(md){return(
md`# Redirect Debugging`
)};
const _1nt6www = function _target(deploy,randomId){return(
deploy("target", async (req, res) => {
  const message = `${req.query.n} ${await randomId()}`;
  console.log(message);
  res.send(message);
})
)};
const _bknxy4 = function _4(deploy,randomId,target){return(
deploy("redirect", async (req, res) => {
  const id = await randomId();
  console.log(`redirect ${id}`);
  res.redirect(302, target.href + "?n=" + id);
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @endpointservices/serverless-cells", async () => runtime.module((await import("/@endpointservices/serverless-cells.js?v=4")).default));  
  main.define("module @tomlarkworthy/randomid", async () => runtime.module((await import("/@tomlarkworthy/randomid.js?v=4")).default));  
  $def("_rgpqff", null, ["md"], _rgpqff);  
  main.define("deploy", ["module @endpointservices/serverless-cells", "@variable"], (_, v) => v.import("deploy", _));  
  $def("_1nt6www", "target", ["deploy","randomId"], _1nt6www);  
  $def("_bknxy4", null, ["deploy","randomId","target"], _bknxy4);  
  main.define("randomId", ["module @tomlarkworthy/randomid", "@variable"], (_, v) => v.import("randomId", _));
  return main;
}