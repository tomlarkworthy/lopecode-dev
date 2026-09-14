export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("x")).define("x", [], () => 1);
  return main;
}
