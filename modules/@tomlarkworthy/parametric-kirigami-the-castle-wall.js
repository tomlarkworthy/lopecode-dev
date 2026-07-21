const _ok82k = async function _1(md,FileAttachment){return(
md`# Parametric Kirigami: The Castle Wall

As hinted at [last time](https://observablehq.com/@tomlarkworthy/kirigami-turret), we can fold in paper space but also in program space. We use the

~~~js
   flipX(shape)
   repeat(n, shape, next)
~~~

combinators to capture symmetry present in our design.

![castle](${await FileAttachment("IMG_20201216_213753.jpg").url()})

`
)};
const _heuiz5 = function _model(ln,range,toRad,squaredrectangle,controls)
{
  const flipX = (shape) => ({
      frame: (controls) => ln.scale(new ln.Vector(-1, 1, 1)),
      folds: [shape()]
    })
  
  const repeat = (n, shape, next) => range(n).reduce(
    (acc, i) => shape(() => acc),
    next || (() => {})
  )
  
  const crenulation = (next) => ({
    frame: (u) => ln.rotate(new ln.Vector(0, 1, 0),-u.x3 * toRad)
                    .translate(new ln.Vector(0,1,0)),
    shape: squaredrectangle(1,1),
    folds: [{
      frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), u.x3 * toRad)
                      .translate(new ln.Vector(0,1,0)),
      shape: squaredrectangle(1,1),
      folds: [next()]
    }]
  
  })
  const flatSide = () => ({ // inner
      frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), u.x0 * toRad)
                          .translate(new ln.Vector(2,0,0)),
      shape: squaredrectangle(2,4),
      folds: [
        {
          frame: () => ln.translate(new ln.Vector(2,-1,0)),
          folds: [repeat(2, crenulation)]
        }, { // Tall outer wall
          frame: (u) => ln.translate(new ln.Vector(1,0,0))
                          .rotate(new ln.Vector(0, 1, 0), u.x1 * toRad)
                          .translate(new ln.Vector(3,0,0)),
          shape: squaredrectangle(5,4),
          folds: [{
            frame: () => ln.rotate(new ln.Vector(0,1,0), 180 * toRad).translate(new ln.Vector(0,-1,0)),
            folds: [repeat(2, crenulation)]
          },{ // Foot flap
            frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), u.x2 * toRad)
                                .translate(new ln.Vector(5,0,0)),
            shape: squaredrectangle(1,4)
          }]
        }
      ]
    })
  
  const indentSide = () => ({ // inner
      frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), u.x4 * toRad)
                          .translate(new ln.Vector(2,0,0)),
      shape: squaredrectangle(2,4),
      folds: [{
          frame: () => ln.translate(new ln.Vector(2,-1,0)),
          folds: [repeat(2, crenulation)]
        }, { // Upper outer wall
          frame: (u) => ln.translate(new ln.Vector(1,0,0))
                          .rotate(new ln.Vector(0, 1, 0), u.x5 * toRad)
                          .translate(new ln.Vector(3,0,0)),
          shape: squaredrectangle(2,4),
          folds: [{
              frame: () => ln.rotate(new ln.Vector(0,1,0), 180 * toRad).translate(new ln.Vector(0,-1,0)),
              folds: [repeat(2, crenulation)]
            }, { // Underhang flap
              frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), u.x6 * toRad)
                                  .translate(new ln.Vector(2,0,0)),
              shape: squaredrectangle(1,4),
              folds: [{ // Indented lower wall
                frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), u.x7 * toRad)
                                    .translate(new ln.Vector(1,0,0)),
                shape: squaredrectangle(3,4),
                folds: [{ // Foot
                  frame: (u) => ln.rotate(new ln.Vector(0, 1, 0), u.x8 * toRad)
                                      .translate(new ln.Vector(3,0,0)),
                  shape: squaredrectangle(2,4)
                }]
              }
            ]
          }]
        }
      ]
    })
  const cellFlat = (next) => {
    let nextValue = undefined;
    console.log(next)
    if (next) nextValue = next();
    return ({
      // Walkway
      folds: [{
        frame: () => ln.translate(new ln.Vector(-2,0,0)),
        shape: squaredrectangle(4,4)
      },flatSide(), flipX(flatSide), {
        frame:() => ln.translate(new ln.Vector(0,4,0)),
        ...nextValue && {folds: [nextValue]}
      }]
    })
  }
  const cellIndent = (next) => {
    let nextValue = undefined;
    console.log(next)
    if (next) nextValue = next();
    return ({
      // Walkway
      folds: [{
        frame: () => ln.translate(new ln.Vector(-2,0,0)),
        shape: squaredrectangle(4,4)
      },indentSide(), flipX(indentSide), {
        frame:() => ln.translate(new ln.Vector(0,4,0)),
        ...nextValue && {folds: [nextValue]}
      }]
    })
  }

  return ({
    frame: (controls) => ln.rotate(new ln.Vector(1, 0, 0), (90) * toRad)
                  .rotate(new ln.Vector(0, 1, 0), (controls.c0) * toRad)
                  .rotate(new ln.Vector(1, 0, 0), (controls.c1 - 29) * toRad)
                  .translate(new ln.Vector(0,0,0)),
    folds: [repeat(
              Math.ceil(Math.max(1, Math.abs(controls.n / 10))
            ), (next) => cellFlat(() => cellIndent(next)))]
  })
};
const _uaatmu = function _3(controls){return(
controls
)};
const _ole1gl = function _controls(form,html)
{
  const labels = ["c0", "c1", "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "n"]
  return form(html`<form><table>
    <tfoot>
      <tr>
        ${labels.map(label => html`<td><i>${label}</i></td>`)}
      </tr>
    </tfoot>
    <tbody>
      <tr>
        ${labels.map(label => html`<td><input type=range min=-180 max=180 name="${label}" orient=vertical></td>`)}
      </tr>
    </tbody></table>`)
};
const _xjeu6a = (G, _) => G.input(_);
const _q8f8bs = function _view(ln,scene,width,html)
{
  return new Promise((resolve) => {
    let eye = new ln.Vector(6,2,40);
    
    let center = new ln.Vector(eye.x, eye.y, 0);
    let up = new ln.Vector(0, 1, 0);
    const height = 500
    let paths = scene.render(eye, center, up, width, height, 35, 0.5, 1000, 0.3)
  
    resolve(html`
      ${ln.toSVG(paths, width, height)}
    `)
  });
};
const _r8qdg = function _6(html){return(
html`<style>
      svg {
         background-image: linear-gradient(green, black); 
      }
      polyline {
        stroke: yellow;
        stroke-width: 1px;
      }
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
const _kmnlzm = function _scene(ln,controls,model)
{
  // first thing is to create a scene
  const scene = new ln.Scene()
  
  function loadModel(scene, frame, model) {
    const f = model.frame ? frame.mul(model.frame(controls))
                          : frame;
    if(model.shape) scene.add(new ln.TransformedShape(model.shape, f));
    (model.folds || []).forEach(fold => {
      loadModel(scene, f, fold);
    })
  }
  
  loadModel(scene, ln.identity(), model);

  return scene;
};
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
const _19xs5kn = function _ln() {
    return import('https://unpkg.com/@lnjs/core@0.5.0/es/index.js?module');
};
const _1tnb3af = function _15(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["IMG_20201216_213753.jpg"].map((name) => {
    const module_name = "@tomlarkworthy/parametric-kirigami-the-castle-wall";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  main.define("module @mbostock/form-input", async () => runtime.module((await import("/@mbostock/form-input.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_ok82k", null, ["md","FileAttachment"], _ok82k);  
  $def("_heuiz5", "model", ["ln","range","toRad","squaredrectangle","controls"], _heuiz5);  
  $def("_uaatmu", null, ["controls"], _uaatmu);  
  $def("_ole1gl", "viewof controls", ["form","html"], _ole1gl);  
  $def("_xjeu6a", "controls", ["Generators","viewof controls"], _xjeu6a);  
  $def("_q8f8bs", "view", ["ln","scene","width","html"], _q8f8bs);  
  $def("_r8qdg", null, ["html"], _r8qdg);  
  $def("_kmnlzm", "scene", ["ln","controls","model"], _kmnlzm);  
  $def("_3shgm", "squaredrectangle", ["ln"], _3shgm);  
  $def("_rgxcv9", "range", [], _rgxcv9);  
  $def("_17z5ool", "toRad", [], _17z5ool);  
  main.define("slider", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("slider", _));  
  main.define("form", ["module @mbostock/form-input", "@variable"], (_, v) => v.import("form", _));  
  $def("_19xs5kn", "ln", [], _19xs5kn);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_1tnb3af", null, ["footer"], _1tnb3af);
  return main;
}