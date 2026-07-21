const _11a48rx = async function _1(md,FileAttachment){return(
md`# Infinite Kirigami: The Endless Wall

With introduction of a (t) => svg function we can create motion. By passing the _repeat_ index through the kinematic graph, we can interplolate along an infinite line.

![screenshot](${await FileAttachment("image@1.png").url()})

The implementation is slow on my computer now, this is an easy way to create a lot of geometry fast.
`
)};
const _qw28wd = function _model(ln,range,interpolate,toRad,squaredrectangle,controls){return(
(frame) => {
  const flipX = (shape, next, i) => ({
      frame: (controls) => ln.scale(new ln.Vector(-1, 1, 1)),
      folds: [shape(next, i)]
    })
  
  const repeat = (n, shape, next) => range(n).reduce(
    (acc, i) => shape((i) => acc, i),
    next || (() => {})
  )
  
  const crenulation = (i) => (next) => ({
    frame: (u) => ln.rotate(new ln.Vector(0, 1, 0),-interpolate(i+frame, 0, 180) * toRad)
                    .translate(new ln.Vector(0,1,0)),
    shape: squaredrectangle(1,1),
    folds: [{
      frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), interpolate(i+frame, 0, 180) * toRad)
                      .translate(new ln.Vector(0,1,0)),
      shape: squaredrectangle(1,1),
      folds: [next()]
    }]
  
  })
  const flatSide = (next, i) => ({ // inner
      frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), interpolate(i + frame, 0, 90) * toRad)
                          .translate(new ln.Vector(2,0,0)),
      shape: squaredrectangle(2,4),
      folds: [
        {
          frame: () => ln.translate(new ln.Vector(2,-1,0)),
          folds: [repeat(2, crenulation(i))]
        }, { // Tall outer wall
          frame: (u) => ln.translate(new ln.Vector(1,0,0))
                          .rotate(new ln.Vector(0, 1, 0), interpolate(i+frame, 0, -180) * toRad)
                          .translate(new ln.Vector(3,0,0)),
          shape: squaredrectangle(5,4),
          folds: [{
            frame: () => ln.rotate(new ln.Vector(0,1,0), 180 * toRad).translate(new ln.Vector(0,-1,0)),
            folds: [repeat(2, crenulation(i))]
          },{ // Foot flap
            frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), interpolate(i + frame, 0, 90) * toRad)
                                .translate(new ln.Vector(5,0,0)),
            shape: squaredrectangle(1,4)
          }]
        }
      ]
    })
  
  const indentSide = (next, i) => ({ // inner
      frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), interpolate(i + frame, 0, 90) * toRad)
                      .translate(new ln.Vector(2,0,0)),
      shape: squaredrectangle(2,4),
      folds: [{
          frame: () => ln.translate(new ln.Vector(2,-1,0)),
          folds: [repeat(2, crenulation(i))]
        }, { // Upper outer wall
          frame: (u) => ln.translate(new ln.Vector(1,0,0))
                          .rotate(new ln.Vector(0, 1, 0), interpolate(i +frame, 0, -180) * toRad)
                          .translate(new ln.Vector(3,0,0)),
          shape: squaredrectangle(2,4),
          folds: [{
              frame: () => ln.rotate(new ln.Vector(0,1,0), 180 * toRad)
                             .translate(new ln.Vector(0,-1,0)),
              folds: [repeat(2, crenulation(i))]
            }, { // Underhang flap
              frame: (u) => ln.rotate(new ln.Vector(0, 1, 0),interpolate(i + frame, 0, -90) * toRad)
                              .translate(new ln.Vector(2,0,0)),
              shape: squaredrectangle(1,4),
              folds: [{ // Indented lower wall
                frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), interpolate(i+frame, 0, 90) * toRad)
                                .translate(new ln.Vector(1,0,0)),
                shape: squaredrectangle(3,4),
                folds: [{ // Foot
                  frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), interpolate(i + frame, 0, 90) * toRad)
                                  .translate(new ln.Vector(3,0,0)),
                  shape: squaredrectangle(2,4)
                }]
              }
            ]
          }]
        }
      ]
    })
  const cellFlat = (next, i) => {
    let nextValue = undefined;
    if (next) nextValue = next(i);
    return ({
      // Walkway
      folds: [{
        frame: () => ln.translate(new ln.Vector(-2,0,0)),
        shape: squaredrectangle(4,4)
      },flatSide(null, i), flipX(flatSide, null, i), {
        frame:() => ln.translate(new ln.Vector(0,4,0)),
        ...nextValue && {folds: [nextValue]}
      }]
    })
  }
  const cellIndent = (next, i) => {
    let nextValue = undefined;
    if (next) nextValue = next(i);
    return ({
      // Walkway
      folds: [{
        frame: () => ln.translate(new ln.Vector(-2,0,0)),
        shape: squaredrectangle(4,4)
      },indentSide(null, i), flipX(indentSide, null, i), {
        frame:() => ln.translate(new ln.Vector(0,4,0)),
        ...nextValue && {folds: [nextValue]}
      }]
    })
  }

  return ({
    frame: (controls) => ln.translate(new ln.Vector(0,8-frame * 8,0)),
    folds: [repeat(
      Math.ceil(Math.max(1, Math.abs(controls.n / 10))),
      (next, i) => {
        return cellFlat(() => cellIndent(next, i), i);
      })]
  })
}
)};
const _uaatmu = function _3(controls){return(
controls
)};
const _3dft1g = function _interpolate(controls){return(
(i, start, end) => (start + Math.max(0, Math.min(1, (i + controls.d) / controls.l)) * (end - start))
)};
const _12r5chy = function _controls(form,html)
{
  const labels = ["r", "of", "c0", "c1", "d", "l", "n"]
  const values = {
    "r": 42,
    "of": 42,
    "c0": -100,
    "c1": 180,
    "d": -6,
    "l": 7,
    "n": 144,
  }
  return form(html`<form><table>
    <tfoot>
      <tr>
        ${labels.map(label => html`<td><i>${label}</i></td>`)}
      </tr>
    </tfoot>
    <tbody>
      <tr>
        ${labels.map(label => html`<td><input
          type=range
          name="${label}" 
          min=-180 max=180
          value="${values[label] || 0}"
          orient=vertical></td>`)}
      </tr>
    </tbody></table>`)
};
const _xjeu6a = (G, _) => G.input(_);
const _181x26n = function* _view(svg)
{
  let frame = 0;
  while (true) {
    yield svg(frame / 30.0)
    frame = ((frame + 1) % 30)
  }
};
const _11xuvdv = function _svg(controls,ln,toRad,scene,width,html){return(
(frame) => {
  const r = controls.r
  const offset = controls.of
  let eye = new ln.Vector(
    r * Math.cos(controls.c0 * toRad) * Math.cos(controls.c1 * toRad),
    r * Math.sin(controls.c0 * toRad) + offset,
    r * Math.sin(controls.c1 * toRad));

  let center = new ln.Vector(0, offset, 0);
  let up = new ln.Vector(0, 0, 1);
  const height = 500
  let paths = scene(frame).render(eye, center, up, width, height, 35, 0.5, 1000, 0.3)
  const svgCode = ln.toSVG(paths, width, height)
  const svg = html`${svgCode}`
  svg.setAttribute( 'style', `stroke: yellow !important;
                              background-image: linear-gradient(50deg, #EEE, #EFE); 
                              stroke-width: 1px`)
  //throw Error()
  return svg
}
)};
const _1xknxth = function _scene(ln,controls,model){return(
(frame) => {
  // first thing is to create a scene
  const scene = new ln.Scene()
  
  function loadModel(scene, frame, model) {
    if (model === undefined) return;
    const f = model.frame ? frame.mul(model.frame(controls))
                          : frame;
    if(model.shape) scene.add(new ln.TransformedShape(model.shape, f));
    (model.folds || []).forEach(fold => {
      loadModel(scene, f, fold);
    })
  }
  
  loadModel(scene, ln.identity(), model(frame));
  return scene;
}
)};
const _9hre53 = function _9(html){return(
html`<style>
    input[type=range][orient=vertical]
    {
      writing-mode: bt-lr; /* IE */
      -webkit-appearance: slider-vertical; /* WebKit */
      width: 8px;
      height: 175px;
      padding: 0 5px;
    }
</style>`
)};
const _3shgm = function _squaredrectangle(ln){return(
(w, h) => {
  const thickness= 0.01;
  const min = new ln.Vector(0, 0, 0)
  const max = new ln.Vector(w, h, thickness)
  const cube = new ln.Cube(min, max)

  cube.insec
  
  // we can specify which paths to render and create new ones:
  cube.paths = function() {
    const paths = []
    const { x: x1, y: y1} = this.min
    const { x: x2, y: y2} = this.max
    for(let i = 0; i <= w; i++) {
      const x = x1 + (x2 - x1) * (i / w);
      paths.push([new ln.Vector(x, 0, thickness), new ln.Vector(x, h, thickness)])
      paths.push([new ln.Vector(x, 0, 0), new ln.Vector(x, h, 0)])
    }
    
    for(let j = 0; j <= h; j++) {
      const y = y1 + (y2 - y1) * (j / h);
      paths.push([new ln.Vector(0, y, thickness), new ln.Vector(w, y, thickness)])
      paths.push([new ln.Vector(0, y, 0), new ln.Vector(w, y, 0)])
    }
    return paths
  }
  return cube;
}
)};
const _rgxcv9 = function _range(){return(
(n) => [...Array(n).keys()]
)};
const _17z5ool = function _toRad(){return(
Math.PI / 180
)};
const _ic0ic3 = function _ln() {
    return import('https://unpkg.com/@lnjs/core@0.5.0/es/index.js?module');
};
const _hllce5 = function _17(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image.png","image@1.png"].map((name) => {
    const module_name = "@tomlarkworthy/infinite-kirigami-the-endless-wall";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  main.define("module @mbostock/form-input", async () => runtime.module((await import("/@mbostock/form-input.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_11a48rx", null, ["md","FileAttachment"], _11a48rx);  
  $def("_qw28wd", "model", ["ln","range","interpolate","toRad","squaredrectangle","controls"], _qw28wd);  
  $def("_uaatmu", null, ["controls"], _uaatmu);  
  $def("_3dft1g", "interpolate", ["controls"], _3dft1g);  
  $def("_12r5chy", "viewof controls", ["form","html"], _12r5chy);  
  $def("_xjeu6a", "controls", ["Generators","viewof controls"], _xjeu6a);  
  $def("_181x26n", "view", ["svg"], _181x26n);  
  $def("_11xuvdv", "svg", ["controls","ln","toRad","scene","width","html"], _11xuvdv);  
  $def("_1xknxth", "scene", ["ln","controls","model"], _1xknxth);  
  $def("_9hre53", null, ["html"], _9hre53);  
  $def("_3shgm", "squaredrectangle", ["ln"], _3shgm);  
  $def("_rgxcv9", "range", [], _rgxcv9);  
  $def("_17z5ool", "toRad", [], _17z5ool);  
  main.define("slider", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("slider", _));  
  main.define("form", ["module @mbostock/form-input", "@variable"], (_, v) => v.import("form", _));  
  $def("_ic0ic3", "ln", [], _ic0ic3);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_hllce5", null, ["footer"], _hllce5);
  return main;
}