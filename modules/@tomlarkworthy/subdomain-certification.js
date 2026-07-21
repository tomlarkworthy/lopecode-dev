const _h19px2 = function _1(md){return(
md`
# Certify Subdomain Ownership 

A simple method is now available at https://observablehq.com/@endpointservices/certify-subdomain-ownership
`
)};
const _91jbcg = function _2(md){return(
md`make note of the uid, it will not transfer to the fork`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_h19px2", null, ["md"], _h19px2);  
  $def("_91jbcg", null, ["md"], _91jbcg);
  return main;
}