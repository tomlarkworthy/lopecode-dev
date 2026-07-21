const _w2gzwi = async function _1(md,FileAttachment){return(
md`# Programming Kirigami: The Castle Turret

Kirigami is paper folding and cutting.

![Kirigami Turret picture](${await FileAttachment("kirigami.jpg").url()})

Enjoy the art of Kirigami...

`
)};
const _oi2nju = function _model(ln,controls,toRad,squaredrectangle,range){return(
{
  // Turret platform
  frame: (angle) => ln.rotate(new ln.Vector(1, 0, 0), (controls.orbit + 60) * toRad)
                      .translate(new ln.Vector(0,4,0)),
  shape: squaredrectangle(8,8),
  folds: [{ // Turret flap 1
    frame: (controls) => ln.rotate(new ln.Vector(1, 0, 0), (controls.flaps) * toRad)
                        .rotate(new ln.Vector(0, 0, 1), (90) * toRad)
                        .translate(new ln.Vector(8,8,0)),
    shape: squaredrectangle(8,2)
  },{ // Turret flap 2
    frame: (controls) => ln.rotate(new ln.Vector(1, 0, 0), (controls.flaps) * toRad)
                        .rotate(new ln.Vector(0, 0, 1), (180) * toRad)
                        .translate(new ln.Vector(8,0, 0)),
    shape: squaredrectangle(8,2)
  },{ // Turret flap 3
    frame: (controls) => ln.rotate(new ln.Vector(1, 0, 0), (controls.flaps) * toRad)
                        .rotate(new ln.Vector(0, 0, 1), (270) * toRad)
                        .translate(new ln.Vector(0,0, 0)),
    shape: squaredrectangle(8,2)
  },{ // Turret flap 4
    frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (360) * toRad)
                        .rotate(new ln.Vector(1, 0, 0), (controls.turret) * toRad)
                        .translate(new ln.Vector(0, 8, 0)),
    shape: squaredrectangle(8,3),
    folds: range(4).map((idx) => ({
      frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), 0 * toRad)
                          .rotate(new ln.Vector(1, 0, 0), controls.crenulations * toRad)
                          .translate(new ln.Vector(idx * 2, 3, 0)),
      shape: squaredrectangle(1,1)
    })).concat(range(4).map((idx) => ({
      frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), 0 * toRad)
                          .rotate(new ln.Vector(0, 0, 1), 0 * toRad)
                          .translate(new ln.Vector(idx * 2 + 1, 3, 0)),
      shape: squaredrectangle(1,1)
    })).concat([{
      frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (360) * toRad)
                          .rotate(new ln.Vector(1, 0, 0), (-2*controls.turret) * toRad)
                          .translate(new ln.Vector(1, 4, 0)),
      shape: squaredrectangle(1,1),
      folds: [{ // Middle (most connected component)
        frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (360) * toRad)
                            .rotate(new ln.Vector(1, 0, 0), (0) * toRad)
                            .translate(new ln.Vector(-1, 1, 0)),
        shape: squaredrectangle(8,3),
        folds: [{
          // Wrap around upper wall
          frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (0) * toRad)
                              .rotate(new ln.Vector(0,-1, 0), (controls.curl) * toRad)
                              .translate(new ln.Vector(8, 0, 0)),
          shape: squaredrectangle(8,3),
          folds: range(4).map((idx) => ({ // Crenulations
            frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), 0 * toRad)
                                    .rotate(new ln.Vector(1, 0, 0), (180 + controls.crenulations) * toRad)
                                    .translate(new ln.Vector(idx * 2, 0, 0)),
            shape: squaredrectangle(1,1)
          })).concat(range(4).map((idx) => ({
            frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), 0 * toRad)
                                    .rotate(new ln.Vector(0, 0, -1), 0 * toRad)
                                    .translate(new ln.Vector(idx * 2 + 1, -1, 0)),
            shape: squaredrectangle(1,1)
          })).concat([{ // Wall 1 - Seat
            frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (0) * toRad)
                                .rotate(new ln.Vector(1, 0, 0), (controls.seat) * toRad)
                                .translate(new ln.Vector(0, 3, 0)),
            shape: squaredrectangle(8,1),
            folds: [{ // Wall 1 - Main
              frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (0) * toRad)
                                  .rotate(new ln.Vector(1, 0, 0), (-controls.seat) * toRad)
                                  .translate(new ln.Vector(1, 1, 0)),
              shape: squaredrectangle(6,9),
              folds: [{ // Wall 1 - flap around
                frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (270) * toRad)
                                    .rotate(new ln.Vector(0, 1, 0), (-controls.flaps) * toRad)
                                    .translate(new ln.Vector(0, 1, 0)),
                shape: squaredrectangle(4,2),
              }]
            }]
          },{
            frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (360) * toRad)
                                   .rotate(new ln.Vector(0, 1, 0), (-controls.curl) * toRad)
                                   .translate(new ln.Vector(8, 0, 0)),
            shape: squaredrectangle(8,3),
            folds: range(4).map((idx) => ({ // Crenulations
              frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), 0 * toRad)
                                      .rotate(new ln.Vector(1, 0, 0), (180 + controls.crenulations) * toRad)
                                      .translate(new ln.Vector(idx * 2, 0, 0)),
              shape: squaredrectangle(1,1)
            })).concat(range(4).map((idx) => ({
              frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), 0 * toRad)
                                      .rotate(new ln.Vector(0, 0, -1), 0 * toRad)
                                      .translate(new ln.Vector(idx * 2 + 1, -1, 0)),
              shape: squaredrectangle(1,1)
            })).concat([{ // Wall 2 - Seat
              frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (0) * toRad)
                                  .rotate(new ln.Vector(1, 0, 0), (controls.seat) * toRad)
                                  .translate(new ln.Vector(0, 3, 0)),
              shape: squaredrectangle(8,1),
              folds: [{ // Wall 2 - Main
                frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (0) * toRad)
                                    .rotate(new ln.Vector(1, 0, 0), (-controls.seat) * toRad)
                                    .translate(new ln.Vector(1, 1, 0)),
                shape: squaredrectangle(6,9),
                folds: [{ // Wall 2 - flap around
                  frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (270) * toRad)
                                      .rotate(new ln.Vector(0, 1, 0), (-controls.flaps) * toRad)
                                      .translate(new ln.Vector(0, 1, 0)),
                  shape: squaredrectangle(4,2),
                }]
              }]
            },{
              frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (360) * toRad)
                                     .rotate(new ln.Vector(0, 1, 0), (-controls.curl) * toRad)
                                     .translate(new ln.Vector(8, 0, 0)),
              shape: squaredrectangle(8,3),
              folds: range(4).map((idx) => ({ // Crenulations
                frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), 0 * toRad)
                                        .rotate(new ln.Vector(1, 0, 0), (180 + controls.crenulations) * toRad)
                                        .translate(new ln.Vector(idx * 2, 0, 0)),
                shape: squaredrectangle(1,1)
              })).concat(range(4).map((idx) => ({
                frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), 0 * toRad)
                                        .rotate(new ln.Vector(0, 0, -1), 0 * toRad)
                                        .translate(new ln.Vector(idx * 2 + 1, -1, 0)),
                shape: squaredrectangle(1,1)
              })).concat([{ // Wall 3 - Seat
                frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (0) * toRad)
                                    .rotate(new ln.Vector(1, 0, 0), (controls.seat) * toRad)
                                    .translate(new ln.Vector(0, 3, 0)),
                shape: squaredrectangle(8,1),
                folds: [{ // Wall 3 - Main
                  frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (0) * toRad)
                                      .rotate(new ln.Vector(1, 0, 0), (-controls.seat) * toRad)
                                      .translate(new ln.Vector(1, 1, 0)),
                  shape: squaredrectangle(6,9),
                  folds: [{ // Wall 3 - flap around
                    frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (270) * toRad)
                                        .rotate(new ln.Vector(0, 1, 0), (-controls.flaps) * toRad)
                                        .translate(new ln.Vector(0, 1, 0)),
                    shape: squaredrectangle(4,2),
                  }]
                }]
              },{ // Wall 3 - loop closing flap
                frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (0) * toRad)
                                    .rotate(   new ln.Vector(0, 1, 0), (controls.flaps) * toRad)
                                    .translate(new ln.Vector(8, 1, 0)),
                shape: squaredrectangle(2,2),
              }]))
            }]))
          }]))
        },{ // Wall 0 - Seat
          frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (0) * toRad)
                              .rotate(new ln.Vector(1, 0, 0), (controls.seat) * toRad)
                              .translate(new ln.Vector(0, 3, 0)),
          shape: squaredrectangle(8,1),
          folds: [{ // Wall 0 - Main
            frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (0) * toRad)
                                .rotate(new ln.Vector(1, 0, 0), (-controls.seat) * toRad)
                                .translate(new ln.Vector(1, 1, 0)),
            shape: squaredrectangle(6,9),
            folds: [{ // Wall 0 - flap around
              frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (270) * toRad)
                                  .rotate(new ln.Vector(0, 1, 0), (-controls.flaps) * toRad)
                                  .translate(new ln.Vector(0, 1, 0)),
              shape: squaredrectangle(4,2),
            }, { // Wall 0 - flap to bottom
              frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (270) * toRad)
                                  .rotate(new ln.Vector(1, 0, 0), (controls.bPivot) * toRad)
                                  .translate(new ln.Vector(6, 9, 0)),
              shape: squaredrectangle(2,6),
              folds: [{ // bottom floor
                frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (270) * toRad)
                                    .rotate(new ln.Vector(0, 1, 0), (180-controls.bFloor) * toRad)
                                    .translate(new ln.Vector(2, 0, 0)),
                shape: squaredrectangle(6,6),
                folds: [{ // bottom floor flap 1
                  frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), (270) * toRad)
                                      .rotate(new ln.Vector(0, 1, 0), (controls.bFlaps) * toRad)
                                      .translate(new ln.Vector(0, 0, 0)),
                  shape: squaredrectangle(6,2),
                },{ // bottom floor flap 2
                  frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), 0)
                                      .rotate(new ln.Vector(-1, 0, 0), -controls.bFlaps * toRad)
                                      .translate(new ln.Vector(0, 6, 0)),
                  shape: squaredrectangle(6,2),
                },{ // bottom floor flap 3
                  frame: (controls) => ln.rotate(new ln.Vector(0, 0, 1), 0)
                                      .rotate(new ln.Vector(0, -1, 0), (controls.bFlaps) * toRad)
                                      .translate(new ln.Vector(6, 0, 0)),
                  shape: squaredrectangle(2,6),
                }]
              }]
            }]
          }]
        }]
      }]
    }]))
  }]
}
)};
const _uaatmu = function _3(controls){return(
controls
)};
const _bi4coq = function _controls(form,html)
{
  const labels = ["orbit", "flaps", "turret", "curl", "seat", "bPivot", "bFloor", "bFlaps", "crenulations"]
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
const _1i0ofvh = function _view(ln,scene,width,html)
{
  return new Promise((resolve) => {
    let eye = new ln.Vector(6,10,40);
    
    let center = new ln.Vector(eye.x, eye.y, 0);
    let up = new ln.Vector(0, 1, 0);
    const height = 500
    let paths = scene.render(eye, center, up, width, height, 35, 0.5, 100, 0.3)
  
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
const _paogqa = function _scene(ln,controls,model)
{
  // first thing is to create a scene
  const scene = new ln.Scene()
  
  function loadModel(scene, frame, model) {
    const f = frame.mul(model.frame(controls));
    scene.add(new ln.TransformedShape(model.shape, f));
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
const _r3q7yl = function _ln() {
    return import('https://unpkg.com/@lnjs/core@0.5.0/es/index.js?module');
};
const _q4wjva = function _14(md){return(
md`### Diary
I had many endorphins rushes developing the development of this software. There is something neurologically satisfying about closing sensorimotor loops outside the body.

This software is not just about folding on a computer. It is also to help me record Kirigami designs.

In real life, I use white school glue and thick (100gsm) squared paper. Square paper greatly improves precision and is the only "specialized equipment" required for the hobby. Squared paper helps with many Kirigami jobs.  

  - Squared paper helps with copying the design to and from paper. 
  - When cutting outlines, you can flip the paper to cut from the other side on a 2nd pass, (the grid should be aligned on both sides).
  - Alignment of fold surfaces over long ranges "magnifies" the accuracy of a crease.
  - Joining precisely to other pieces of squared paper to fix mistakes.

Here are some real-life pictures. Note the next design is different in every picture! The medium is forgiving of mistakes, it's very easy to extend the paper and add missing flaps. You do not need to get it right the first time. I can use the computer to record the "best" design so far.

The castle gains strength by having floors to reinforce the plan layout. The nest is large enough to fit a figure. You can paint it with Crayola Supertips.

### Programming Kirigami

Programming Kirigami is just another level to Kirigami. With Programming Kirigami the symmetries in the pattern can be folded with subroutines in a program. I was not brave enough to refactor the _model_ cell. Instead, I built up the kinematic structure up slowly and deliberately. Just like when I make the model in real life!

### Enabled with Observable

I do not think that such a thing could be programmed without Observable. I needed the trial-and-error instant "in-the-moment" recomputation that the workflow on Observable enables. For example, to probe for polarity issues one joint at a time. You need to be able to "feel around in the dark" when assembling spatial programs, it's how you orientate to the local frame of reference. 

The fact that Observable allows me to recompile small parts and keep everything else fixed was a huge help. I am thankful to all those who contributed to this notebook directly and indirectly.

`
)};
const _ayfxhr = async function _15(md,FileAttachment){return(
md`

### Gallery 
![](${await FileAttachment("IMG_20201216_093441.jpg").url()})

![](${await FileAttachment("IMG_20201213_133504 (1).jpg").url()})

![](${await FileAttachment("IMG_20201213_122435.jpg").url()})
`
)};
const _hllce5 = function _17(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["IMG_20201213_122435.jpg","kirigami.jpg","IMG_20201213_133504 (1).jpg","IMG_20201216_093441.jpg"].map((name) => {
    const module_name = "@tomlarkworthy/kirigami-turret";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  main.define("module @mbostock/form-input", async () => runtime.module((await import("/@mbostock/form-input.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_w2gzwi", null, ["md","FileAttachment"], _w2gzwi);  
  $def("_oi2nju", "model", ["ln","controls","toRad","squaredrectangle","range"], _oi2nju);  
  $def("_uaatmu", null, ["controls"], _uaatmu);  
  $def("_bi4coq", "viewof controls", ["form","html"], _bi4coq);  
  $def("_xjeu6a", "controls", ["Generators","viewof controls"], _xjeu6a);  
  $def("_1i0ofvh", "view", ["ln","scene","width","html"], _1i0ofvh);  
  $def("_r8qdg", null, ["html"], _r8qdg);  
  $def("_paogqa", "scene", ["ln","controls","model"], _paogqa);  
  $def("_3shgm", "squaredrectangle", ["ln"], _3shgm);  
  $def("_rgxcv9", "range", [], _rgxcv9);  
  $def("_17z5ool", "toRad", [], _17z5ool);  
  main.define("slider", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("slider", _));  
  main.define("form", ["module @mbostock/form-input", "@variable"], (_, v) => v.import("form", _));  
  $def("_r3q7yl", "ln", [], _r3q7yl);  
  $def("_q4wjva", null, ["md"], _q4wjva);  
  $def("_ayfxhr", null, ["md","FileAttachment"], _ayfxhr);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_hllce5", null, ["footer"], _hllce5);
  return main;
}