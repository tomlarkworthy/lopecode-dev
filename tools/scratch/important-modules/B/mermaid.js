const _diagram = function diagram(mermaid){return(
mermaid`graph TD
  A[Start] --> B{Choice}
  B -->|yes| C[Done]
  B -->|no| A`
)};
const _check = function check(diagram){return(
{tag: diagram.tagName, nodes: diagram.querySelectorAll("g.node").length, text: diagram.textContent.replace(/\s+/g, " ").trim().slice(0, 60)}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_diagram", "diagram", ["mermaid"], _diagram);
  $def("_check", "check", ["diagram"], _check);
  return main;
}
