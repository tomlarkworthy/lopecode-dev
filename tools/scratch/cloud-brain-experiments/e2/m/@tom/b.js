export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("greeting")).define("greeting", [], () => "hello");
  return main;
}
