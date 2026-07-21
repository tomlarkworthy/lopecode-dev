const _rzhjhi = function _1(md){return(
md`# Link previews

Does https://www.linkpreview.net/ work with Observable?
`
)};
const _7pcrco = function _API_KEY(){return(
'2f5e33cefc5ea9032fe1e9e0947b2cc1'
)};
const _8it5g2 = function _preview(API_KEY){return(
async url =>
  (await fetch(`https://api.linkpreview.net/?key=${API_KEY}&q=${url}`)).json()
)};
const _288ank = function _json(preview){return(
preview('https://observablehq.com/@visnup/slides')
)};
const _1due1hh = function _5(htl,json){return(
htl.html`<a href=${json.url}>
  <h3>${json.title}</h3>
  <img src=${json.image}></img>
  <p><i>${json.description}</i></p>
</a>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_rzhjhi", null, ["md"], _rzhjhi);  
  $def("_7pcrco", "API_KEY", [], _7pcrco);  
  $def("_8it5g2", "preview", ["API_KEY"], _8it5g2);  
  $def("_288ank", "json", ["preview"], _288ank);  
  $def("_1due1hh", null, ["htl","json"], _1due1hh);
  return main;
}