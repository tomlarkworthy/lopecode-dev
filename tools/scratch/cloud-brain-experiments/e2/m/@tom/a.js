import define1 from "./b.js";
export default function define(runtime, observer) {
  const main = runtime.module();
  main.define("module @tom/b", async () => runtime.module(define1));
  main.define("greeting", ["module @tom/b", "@variable"], (_, v) => v.import("greeting", _));
  main.variable(observer("fetch")).define("fetch", ["greeting"], (greeting) => (request) => new Response(greeting + " from separate module files"));
  return main;
}
