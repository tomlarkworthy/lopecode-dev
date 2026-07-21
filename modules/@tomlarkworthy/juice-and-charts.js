const _hb9kul = function _1(md){return(
md`# Animating D3 charts with juice`
)};
const _l5288y = function _animation(now,$0)
{
  const s = Math.sin(now / 1000);
  const c = Math.cos(now / 1000);
  const data = [];
  for (var i = -5; i <= 5; i++) {
    for (var j = -5; j <= 5; j++) {
      data.push([(i * s + j * c) * 0.1, (i * c - j * s) * 0.1]);
    }
  }
  $0.coords.value = data; // push the data into the view
};
const _zgc26p = function _world(juice,Scatterplot){return(
juice(Scatterplot, {
  coords: "[0]"
})([], {
  xDomain: [-1, 1],
  yDomain: [-1, 1]
})
)};
const _gobpau = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/juice", async () => runtime.module((await import("/@tomlarkworthy/juice.js?v=4")).default));  
  main.define("module @d3/scatterplot", async () => runtime.module((await import("/@d3/scatterplot.js?v=4")).default));  
  $def("_hb9kul", null, ["md"], _hb9kul);  
  main.define("juice", ["module @tomlarkworthy/juice", "@variable"], (_, v) => v.import("juice", _));  
  main.define("Scatterplot", ["module @d3/scatterplot", "@variable"], (_, v) => v.import("Scatterplot", _));  
  $def("_l5288y", "animation", ["now","viewof world"], _l5288y);  
  $def("_zgc26p", "viewof world", ["juice","Scatterplot"], _zgc26p);  
  $def("_gobpau", "world", ["Generators","viewof world"], _gobpau);
  return main;
}