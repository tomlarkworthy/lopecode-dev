const _ur0vlq = function _1(md){return(
md`# Rate Estimator for NPM

We can use [rate_estimator](https://observablehq.com/@tomlarkworthy/rate-estimation) in node.js almost directly. First install dependencies at the shell.

Example
~~~bash
  npm init --yes 
  npm install @observablehq/runtime@4
  npm install "https://api.observablehq.com/@tomlarkworthy/rate-estimation-min.tgz?v=3"
~~~

Then, in an _index.mjs_ file, (note extension is for ESM) instanciate the runtime and fetch the function.
~~~js
  import notebook from '@tomlarkworthy/rate-estimation-min'
  import Observable from '@observablehq/runtime'
  const module = new Observable.Runtime().module(notebook);
  const rate_estimator = await module.value("rate_estimator");
  const estimatorA = rate_estimator();
~~~

(tested on nodejs v15.5.0, [Fil](https://observablehq.com/@fil) reported problems with the _await_ in a [thread](https://talk.observablehq.com/t/kudos-notebook-to-nodejs-works/4420))
`
)};
const _1odfv7u = function _rate_estimator(rate_estimator_import){return(
rate_estimator_import
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/rate-estimation", async () => runtime.module((await import("/@tomlarkworthy/rate-estimation.js?v=4")).default));  
  $def("_ur0vlq", null, ["md"], _ur0vlq);  
  $def("_1odfv7u", "rate_estimator", ["rate_estimator_import"], _1odfv7u);  
  main.define("rate_estimator_import", ["module @tomlarkworthy/rate-estimation", "@variable"], (_, v) => v.import("rate_estimator", "rate_estimator_import", _));
  return main;
}