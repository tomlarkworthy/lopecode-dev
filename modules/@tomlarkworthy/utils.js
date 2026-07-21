const _1lgimxg = function _1(md){return(
md`# Utils`
)};
const _o2m2v5 = function _promiseRecursive(){return(
function promiseRecursive(obj) {
  const getPromises = obj =>
    Object.keys(obj).reduce(
      (acc, key) =>
        Object(obj[key]) !== obj[key]
          ? acc
          : acc.concat(
              typeof obj[key].then === "function"
                ? [[obj, key]]
                : getPromises(obj[key])
            ),
      []
    );
  const all = getPromises(obj);
  return Promise.all(all.map(([obj, key]) => obj[key])).then(
    responses => (
      all.forEach(([obj, key], i) => (obj[key] = responses[i])), obj
    )
  );
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1lgimxg", null, ["md"], _1lgimxg);  
  $def("_o2m2v5", "promiseRecursive", [], _o2m2v5);
  return main;
}