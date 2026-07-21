const _1m0geir = function _1(md){return(
md`# Radial Explosion`
)};
const _1fzrrnb = function _2(width,DOM,paper,color,color2)
{
  let height = width / 1.5;
  let canvas = DOM.canvas(width, height);
  let ps = new paper.PaperScope();

  ps.setup(canvas);

  const clear_white = new ps.Color(1, 1, 1, 0);
  const center = new ps.Point(width / 2, height / 2);

  const background = new ps.Path.Rectangle(
    new ps.Rectangle(new ps.Point(0, 0), new ps.Point(width, height))
  );

  background.fillColor = {
    gradient: {
      stops: [
        [color, 0],
        [color2, 1]
      ],
      radial: true
    },
    origin: background.bounds.topLeft,
    destination: background.bounds.bottomRight
  };

  const dot_size = 2;
  const radius = 100;

  for (var i = 0; i < 5000; i++) {
    let angle = Math.random() * Math.PI * 2;
    // To get points clustered near the center with only a few long ones
    // we raise a uniform random by a high power, thus reducing the density near 1
    let length = Math.pow(Math.random(), 5) * width * 0.2;

    let cos_angle = Math.cos(angle);
    let sin_angle = Math.sin(angle);
    let outer_line = new ps.Point(
      center.x + cos_angle * (length + radius - dot_size),
      center.y + sin_angle * (length + radius - dot_size)
    );
    let outer = new ps.Point(
      center.x + cos_angle * (length + radius),
      center.y + sin_angle * (length + radius)
    );
    let inner = new ps.Point(
      center.x + cos_angle * radius,
      center.y + sin_angle * radius
    );

    let line = new ps.Path();
    line.strokeColor = {
      gradient: {
        stops: [
          [clear_white, 0],
          ["white", 1]
        ]
      },
      origin: center,
      destination: outer
    };
    line.strokeWidth = 3;
    line.opacity = 0.2;
    line.add(inner);
    line.add(outer_line);

    let dot = ps.Path.Circle(outer, dot_size);
    dot.fillColor = "white";
    dot.opacity = 0.7;
  }

  return canvas;
  // comment to test backups
};
const _13hfqg3 = function _color(colorPicker){return(
colorPicker("#05ECF6")
)};
const _93vwpl = (G, _) => G.input(_);
const _bawod6 = function _color2(colorPicker){return(
colorPicker("#2185C3")
)};
const _18ugw23 = (G, _) => G.input(_);
const _8ebkeb = function _paper(require){return(
require('paper').catch(() => window.paper)
)};
const _pvf7uj = function _8(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @shaunlebron/color-picker", async () => runtime.module((await import("/@shaunlebron/color-picker.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_1m0geir", null, ["md"], _1m0geir);  
  $def("_1fzrrnb", null, ["width","DOM","paper","color","color2"], _1fzrrnb);  
  $def("_13hfqg3", "viewof color", ["colorPicker"], _13hfqg3);  
  $def("_93vwpl", "color", ["Generators","viewof color"], _93vwpl);  
  $def("_bawod6", "viewof color2", ["colorPicker"], _bawod6);  
  $def("_18ugw23", "color2", ["Generators","viewof color2"], _18ugw23);  
  $def("_8ebkeb", "paper", ["require"], _8ebkeb);  
  main.define("colorPicker", ["module @shaunlebron/color-picker", "@variable"], (_, v) => v.import("colorPicker", _));  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_pvf7uj", null, ["footer"], _pvf7uj);
  return main;
}