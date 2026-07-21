const _13za6gq = function _1(md){return(
md`# Literate Object

Prototype for an idea of configuring the visual representation of an object. Note observable CSS appears to be accessible within a user notebook.
`
)};
const _wr1owu = function _literateObject(html){return(
function literateObject(obj, mask = {}) {
  const ui = html`<span class="observablehq--expanded observablehq--inspect"><span class="observablehq--cellname">sample = </span><a><svg width="8" height="8" class="observablehq--caret">
    <path d="M4 7L0 1h8z" fill="currentColor"></path>
  </svg>Object {</a><div class="observablehq--field"><span class="observablehq--key">  str</span>: <span><span class="observablehq--string">"foo"</span></span></div><div class="observablehq--field"><span class="observablehq--key">  number</span>: <span><span class="observablehq--number">1</span></span></div><div class="observablehq--field"><span class="observablehq--key">  object</span>: <span class="observablehq--expanded"><a><svg width="8" height="8" class="observablehq--caret">
    <path d="M4 7L0 1h8z" fill="currentColor"></path>
  </svg>Object {</a><div class="observablehq--field"><span class="observablehq--key">  f1</span>: <span><span class="observablehq--string">"v1"</span></span></div>}</span></div>}</span>`;
  ui.value = obj;
  return ui;
}
)};
const _vsaltb = function _sample(literateObject){return(
literateObject({ str: "foo", number: 1, object: { f1: "v1" } })
)};
const _1j468aa = (G, _) => G.input(_);
const _u7tz5j = function _4(sample){return(
sample
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_13za6gq", null, ["md"], _13za6gq);  
  $def("_wr1owu", "literateObject", ["html"], _wr1owu);  
  $def("_vsaltb", "viewof sample", ["literateObject"], _vsaltb);  
  $def("_1j468aa", "sample", ["Generators","viewof sample"], _1j468aa);  
  $def("_u7tz5j", null, ["sample"], _u7tz5j);
  return main;
}