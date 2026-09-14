export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("lookupVariable")).define("lookupVariable", [], () => "lookupVariable");
  main.variable(observer("thisModule")).define("thisModule", [], () => "thisModule");
  return main;
}
