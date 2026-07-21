const _kf2vuq = function _1(md){return(
md`# Simplifying Pose Estimation with Circular Barcodes`
)};
const _1sqfwts = function _2(md){return(
md`A [decade](https://edinburghhacklab.com/2012/05/optical-localization-to-0-1mm-no-problemo/) ago I hoped to build low-cost, high-speed optical positioning for robots, using camera-based end effector measurements. However, the challenge lies in achieving high-frequency measurements comparable to those of commercial robot arms, which measure 10,000 times per second, far beyond the capabilities of affordable 30 frames per second digital cameras. Recent advancements have somewhat closed this gap: for instance, a Raspberry PI camera utilizing raspiraw can [reach 1007 frames-per-second](https://www.youtube.com/watch?v=m3Bs-yhWZ3M), providing a low-latency hardware solution.

Still, the hurdle of fast pose estimation remains due to the inherent bandwidth intensity of computer vision. The difficulty lies in the variability of object appearances and the high dimensionality of the task, requiring a search for a 6DOF-oriented object in a 2D image plane. However, by redesigning the problem with circular barcodes, which can be read from any angle, we can transform a 2D recognition problem into a simpler 1D task that matches the camera's hardware interface better. This notebook presents a open-source simulator setup and a basic scan line-based template detector algorithm to confirm the geometric argument.`
)};
const _ipjk73 = function _3(md){return(
md`## Camera simulation

This is our model of a camera built with [three.js](https://threejs.org/). You can pan and zoom with the mouse to alter the pose of the barcode relative to the camera.`
)};
const _1ht1vxl = function _imageSource(Inputs){return(
Inputs.select(["real", "synthetic"], {
  label: "image"
})
)};
const _1xr4wqa = (G, _) => G.input(_);
const _15x8hyn = function _renderer(THREE){return(
new THREE.WebGLRenderer({ antialias: true })
)};
const _1x9y0ki = function _render(THREE,width,height,renderer,scene,camera,pixelBuffer,$0)
{
  var renderTarget = new THREE.WebGLRenderTarget(width, height);
  const gl = renderer.getContext();
  const render = () => {
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    $0.value++;
  };
  render.renderer = renderer;
  return render;
};
const _aanr00 = function _pixelBuffer(width,height){return(
new Uint8Array(width * height * 4)
)};
const _1ak3isr = async function _scene(THREE,imageSource,FileAttachment,synthetic)
{
  const textureLoader = new THREE.TextureLoader();
  let texture = undefined;
  if (imageSource == "real") {
    texture = textureLoader.load(await FileAttachment("image.png").url());
  } else {
    const blob = new Blob([synthetic.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    texture = textureLoader.load(url);
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  await new Promise((res) => (textureLoader.manager.onLoad = res));
  const cube = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ map: texture })
  );
  cube.position.x = -0.5;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000);
  scene.add(cube);
  return scene;
};
const _ajt06p = function _camera(width,height,THREE,fov)
{
  const aspect = width / height;
  const near = 0.0001;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(1, 0, 1);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  return camera;
};
const _ebmpyh = function _fov(Inputs){return(
Inputs.range([0, 180], {
  label: "field-of-view (degrees, vertical)",
  value: 45
})
)};
const _1bwfjb9 = (G, _) => G.input(_);
const _58b7qv = function _canvas(THREE,camera,renderer,invalidation,width,height,render,html)
{
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  invalidation.then(() => (controls.dispose(), renderer.dispose()));
  renderer.setSize(width, height);
  renderer.setPixelRatio(1);
  controls.addEventListener("change", render);
  render();
  return html`<div>${renderer.domElement}</div>`;
};
const _wi2zcs = function _overlay(html,width,height,scanY,canvas,invalidation)
{
  const overlay = html`<svg width="${width}px" height="${height}px" style="z-index: 10; position: absolute; pointer-events: none;">
  <line x1="0" y1="${height - scanY}" x2="${width}" y2="${
    height - scanY
  }" stroke="red" />
</svg>`;
  canvas.insertBefore(overlay, canvas.firstChild);
  invalidation.then(() => canvas.removeChild(overlay));
  return overlay;
};
const _19s1gpm = function _13(md){return(
md`## Scan line sampler

We expect to be able to recognize a barcode from a single scan that passes through the center of the barcode. Here you choose the scan line position and visualize the available signal.`
)};
const _80g3o4 = function _scanY(Inputs,height){return(
Inputs.range([0, height], {
  label: "scanY",
  step: 1,
  value: 198
})
)};
const _1je9rwm = (G, _) => G.input(_);
const _64zye2 = function _scanline(renders,pixelBuffer,scanY,width)
{
  renders;
  const slice = pixelBuffer.slice(scanY * width * 4, (scanY + 1) * width * 4);

  return Array.from({ length: width }).map((_, i) => ({
    x: i,
    y: scanY,
    v: Math.round((slice[i * 4] + slice[i * 4 + 1] + slice[i * 4 + 2]) / 3)
  }));
};
const _1d0il0o = function _16(Plot,scanline){return(
Plot.auto(scanline, {x: "x", y: "v"}).plot({width: 1000})
)};
const _1kyo8st = function _17(md){return(
md`## Barcode Template

We skip barcode decoding for now and concentrate on recognizing the *known* barcode pattern expressed as a binary string.`
)};
const _1kd231a = function _template()
{
  const half = [
    1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1,
    1, 1, 1
  ];
  return [...half, ...[...half].reverse()];
};
const _140nckz = function _templateData(template){return(
template.flatMap((v, i) => [
  { x: i, y: v },
  { x: i + 1, y: v }
])
)};
const _f4sr0r = function _20(Plot,templateData){return(
Plot.auto(templateData, {x: "x", y: "y", color: "#ff5375"}).plot()
)};
const _54ovb2 = function _21(md){return(
md`## Projecting the template

The barcode will appear somewhere in the scan line deformed by perspective geometry. Translation and scale are obvious, but more complex is the effect of orientation. Note an evenly spaced barcode will end up observed as a non-evenly spaced pattern due to vanishing distance effects`
)};
const _z4pq69 = function _image2(FileAttachment){return(
FileAttachment("image@2.png").image({ width: 400 })
)};
const _1ethkpr = function _23(md){return(
md`## Pinhole Camera model `
)};
const _ydf7o7 = function _24(md){return(
md`We can calculate the spacings by considering the angle that that the barcode is relative to the camera position.`
)};
const _is8s1q = function _image5(FileAttachment){return(
FileAttachment("image@5.png").image({ width: 400 })
)};
const _12hzru8 = function _26(md){return(
md`
\`\`\`
   cos(x) * c = cos(a) * b - d
   sin(x) * c = sin(a) * b
=> (eliminate c)
   (b * cos(a) - d) / cos(x) = (sin(a) * b) / sin(x)
=>
   (b * cos(a)) / cos(x) - (sin(a) * b) / sin(x) = d / cos(x)
=> 
   b * (cos(a) / cos(x) - sin(a) / sin(x)) = d / cos(x)
=>
   b = d / (cos(x) * (cos(a) / cos(x) - sin(a) / sin(x)))
=>
   b = d / (cos(a) - sin(a) * cos(x) / sin(x))


\`\`\`
`
)};
const _uvpafs = function _27(md){return(
md`We eventually arrive at the conclusion the size of the barcode and the distance from the camera are the same thing. There are only 4 important parameters, one of which is the field-of-view which is fixed. So pose estimation on a scan line becomes a 3 dimensional problem.`
)};
const _12v0595 = function _offset_pinhole(Inputs){return(
Inputs.range([-0.5, 0.5], {
  label: "offset",
  value: 0
})
)};
const _1b6htrh = (G, _) => G.input(_);
const _1h7fbky = function _scale_pinhole(Inputs){return(
Inputs.range([0, 1.5], { label: "scale", value: 1 })
)};
const _eye7ju = (G, _) => G.input(_);
const _ux280v = function _angle_pinhole(Inputs){return(
Inputs.range([-Math.PI, Math.PI], {
  label: "angle",
  value: 0
})
)};
const _hagmyr = (G, _) => G.input(_);
const _p9svwq = function _fov_pinhole(Inputs,camera){return(
Inputs.range([0.00001, Math.PI], {
  label: "field-of-view (radians)",
  // three JS FOV is vertical which is related to horizontal via aspect ratio
  value:
    2 * Math.atan(Math.tan((camera.fov * Math.PI) / 180 / 2) * camera.aspect)
})
)};
const _1t1lgdj = (G, _) => G.input(_);
const _a1qmvp = function _32(md){return(
md`The pinhole model assumes the angle related directly to the pixel coordinates, which leads to very warped images. Real cameras project the angle to a flat plane sensor, which is what the angle correction toggle does below.`
)};
const _yrngyl = function _useAngleCoorection(Inputs){return(
Inputs.toggle({
  label: "angle correction",
  value: true
})
)};
const _txq4nv = (G, _) => G.input(_);
const _jx2za3 = function _useAngleCoorection1(Inputs){return(
Inputs.toggle({
  label: "angle correction",
  value: true
})
)};
const _1jsxar8 = (G, _) => G.input(_);
const _kdpoaa = function _35(md){return(
md`With these parameters, we can simulate expected pixel values for a given projection on our image. Note how adjusting the angle creates the vanishing effect, and note how the field of view further modulates the effect. I have normalized all the params so it's easy to simulate in resolution-independant scales.`
)};
const _olwkvv = function _pinhole(fov_pinhole,useAngleCoorection,templateData,template){return(
(
  px,
  model = {
    angle: 0,
    offset: 0,
    scale: 1
  }
) => {
  const angleCorrection = (px) => {
    // flatten the image against an image plane, distance d from focal point
    // tan(angle) = opposite / adjacent
    // -fov / 2 is the extreme, -0.5 is extreme of image coords
    //    tan(-fov / 2) = -0.5 / d
    // => d = -0.5 / tan(-fov * 0.5)
    // Now we d we can go forward, preserving image coordinates
    const d = -0.5 / Math.tan(-0.5 * fov_pinhole);
    return Math.atan((px - model.offset) / d) / fov_pinhole;
  };
  const pinhole = (angle) => {
    if (!useAngleCoorection) angle -= model.offset;
    const x = angle * fov_pinhole; // range: [-0.5, -0.5]
    const a = model.angle + Math.PI / 2;
    const b = 0.5 / (Math.cos(a) - (Math.sin(a) * Math.cos(x)) / Math.sin(x));
    return (b / model.scale / fov_pinhole + 0.25) * templateData.length;
  };
  const imgCoord = useAngleCoorection ? angleCorrection(px) : px;
  return template[Math.round(pinhole(imgCoord))];
}
)};
const _l37eud = function _37(Plot,projectedPinholeData){return(
Plot.auto(projectedPinholeData, {x: "x", y: "y", color: "#1ca463"}).plot()
)};
const _1iz3hm = function _projectedPinholeData(width,pinhole,offset_pinhole,scale_pinhole,angle_pinhole){return(
Array.from({ length: width }).map((_, x) => ({
  x: x,
  y: pinhole(x / width - 0.5, {
    offset: offset_pinhole,
    scale: scale_pinhole,
    angle: angle_pinhole
  })
}))
)};
const _1uvfc0j = function _39(md){return(
md`## Estimate the goodness-of-fit of a proposed pose`
)};
const _o2b1pi = function _40(md){return(
md`Given the camera model and the parameters of a template projection, we can measure the goodness-of-fit with the mean squared error of pixel intensities. This visualization is reactive to the parameters elsewhere in the notebook.`
)};
const _194tnfz = function _fitData(width,scanline,pinhole,offset_pinhole,scale_pinhole,angle_pinhole){return(
Array.from({ length: width }).map((_, x) => {
  const scan = scanline[x].v / 256;
  const template = pinhole(x / width - 0.5, {
    offset: offset_pinhole,
    scale: scale_pinhole,
    angle: angle_pinhole
  });
  const error = Math.pow(scan - template, 2);
  return {
    x: x,
    scan,
    template,
    error
  };
})
)};
const _10ocafe = function _meanError(d3,fitData){return(
d3.mean(fitData, (d) => d.error)
)};
const _1g4y8p7 = function _score_template_fit(width,scanline,pinhole){return(
(params = { offset: 0, scale: 1, angle: 0 }) => {
  let sumSquaredError = 0;
  for (let x = 0; x < width; x++) {
    const scan = scanline[x].v / 256;
    const template = pinhole(x / width - 0.5, {
      offset: params.offset,
      scale: params.scale,
      angle: params.angle
    });
    sumSquaredError += (scan - template) * (scan - template) || 1;
  }
  return sumSquaredError;
}
)};
const _17xetgm = function _showTemplate(Inputs){return(
Inputs.toggle({
  label: "show template?",
  value: true
})
)};
const _ap9p9v = (G, _) => G.input(_);
const _1bexyln = function _showScan(Inputs){return(
Inputs.toggle({
  label: "show scan?",
  value: true
})
)};
const _m6ds4k = (G, _) => G.input(_);
const _gf9c76 = function _showError(Inputs){return(
Inputs.toggle({
  label: "show error?",
  value: true
})
)};
const _4wtrj = (G, _) => G.input(_);
const _8s7176 = function _47(Plot,showTemplate,fitData,showScan,showError,meanError,width){return(
Plot.plot({
  y: {
    domain: [0, 1]
  },
  marks: [
    showTemplate
      ? Plot.lineY(fitData, { x: "x", y: "template", stroke: "green" })
      : undefined,
    showScan
      ? Plot.lineY(fitData, { x: "x", y: "scan", stroke: "blue" })
      : undefined,
    showError
      ? Plot.lineY(fitData, { x: "x", y: "error", stroke: "red" })
      : undefined,
    Plot.ruleY([meanError], { stroke: "black" }),
    Plot.text([{ meanError, text: "mean\nerror" }], {
      x: width,
      y: (d) => d.meanError + 0.03,
      text: "text"
    })
  ]
})
)};
const _lsp2pw = function _48(md){return(
md`## Grid searching a best fit
#### ⚠️ slow!`
)};
const _1mswsn = function _49(tex,md){return(
md`A simple way of template matching is exhaustively trying all the pose combinations. However, this is a three-dimensional problem with an ${tex`O(n^4)`} time complexity. My computer can handle 50 steps per dimension, but this is not high enough to solve the problem without help. I have had luck using 5 steps per dim interactively, manually trimming the search space, then following up with a high step per dimension to get the best match in a small search space. Remember to turn off grid search so you can then fine-tune the final estimate.`
)};
const _1kff1vk = function _useBestFit(Inputs){return(
Inputs.toggle({
  label: "Use grid search"
})
)};
const _10x2fmo = (G, _) => G.input(_);
const _guuc63 = function _steps(Inputs){return(
Inputs.range([1, 50], {
  value: 5,
  step: 1,
  label: "steps per dim"
})
)};
const _ktvi7x = (G, _) => G.input(_);
const _20pdpu = function _offset_range(interval){return(
interval([-0.4, 0.4], {
  label: "offset range"
})
)};
const _9inknh = (G, _) => G.input(_);
const _94eh0q = function _scale_range(interval){return(
interval([0, 1.5], {
  value: [0.1, 1.5],
  label: "scale range"
})
)};
const _1hvzz42 = (G, _) => G.input(_);
const _17rohc = function _angle_range(interval){return(
interval([-Math.PI / 2 + 0.1, Math.PI / 2 - 0.1], {
  label: "angle range"
})
)};
const _1269hsn = (G, _) => G.input(_);
const _1e6zp78 = function _doBestFit(useBestFit,$0,bestFit,$1,$2,Event)
{
  if (useBestFit) {
    $0.value = bestFit.offset;
    $1.value = bestFit.scale;
    $2.value = bestFit.angle;

    $0.dispatchEvent(new Event("input"));
    $1.dispatchEvent(new Event("input"));
    $2.dispatchEvent(new Event("input"));
  }
};
const _gfpy86 = function _bestFit(useBestFit,offset_range,steps,scale_range,angle_range,score_template_fit)
{
  if (!useBestFit) return this;
  let lowestError = Number.POSITIVE_INFINITY;
  let lowestParams = undefined;
  for (
    let offset = offset_range[0];
    offset <= offset_range[1];
    offset += (offset_range[1] - offset_range[0]) / steps
  )
    for (
      let scale = scale_range[0];
      scale <= scale_range[1];
      scale += (scale_range[1] - scale_range[0]) / steps
    )
      for (
        let angle = angle_range[0];
        angle <= angle_range[1];
        angle += (angle_range[1] - angle_range[0]) / steps
      ) {
        const params = {
          angle,
          scale,
          offset
        };
        const sumSquaredError = score_template_fit(params);
        if (sumSquaredError < lowestError) {
          lowestError = sumSquaredError;
          lowestParams = {
            ...params,
            sumSquaredError: sumSquaredError
          };
        }
      }
  return lowestParams;
};
const _qyioyo = function _58(md){return(
md`## Fine-tune with Local Patch Search`
)};
const _1o9cqrm = function _59(md){return(
md`When in the vicinity of a good match, you can find tune with the following routine.`
)};
const _1rgcniv = function _precision_patch(Inputs){return(
Inputs.range([1, 5], { label: "precision", step: 1 })
)};
const _1cavb8j = (G, _) => G.input(_);
const _kbb027 = function _step_size(precision_patch){return(
Number.parseFloat(
  "0." +
    Array.from({ length: precision_patch - 1 })
      .map((_) => "0")
      .join("") +
    "1"
)
)};
const _1621xki = function _current(offset_pinhole,angle_pinhole,scale_pinhole){return(
{
  offset: offset_pinhole,
  angle: angle_pinhole,
  scale: scale_pinhole
}
)};
const _140085a = function _63(Inputs,score_template_fit,current,step_size,$0,$1,$2,Event){return(
Inputs.button("step", {
  reduce: () => {
    let currentScore = score_template_fit(current);
    let next = current;
    // look around
    for (let dim in current) {
      for (let extent = -10; extent <= 10; extent += 10) {
        const candidate = {
          ...current,
          [dim]: current[dim] + extent * step_size
        };
        const candidateScore = score_template_fit(candidate);
        if (candidateScore < currentScore) {
          currentScore = candidateScore;
          next = candidate;
        }
      }
    }
    // update params
    $0.value = next.offset;
    $1.value = next.scale;
    $2.value = next.angle;

    $0.dispatchEvent(new Event("input"));
    $1.dispatchEvent(new Event("input"));
    $2.dispatchEvent(new Event("input"));
  }
})
)};
const _pcmhk6 = async function _64(FileAttachment,md){return(
md`## Results

After lots of bug fixes, I am pleased that it is possible to achieve very good template matches, indicating the template is keyed in correctly and we can faithfully predict the template deformation for the camera model. This is true even with high field-of-view camera models and strangely orientated barcodes as shown below.

<figure>
  ${await FileAttachment("image@9.png").image({width: 600})}
  <figcaption>I angled the barcode awkwardly to the scan line </figcaption>
</figure>

<figure>
  ${await FileAttachment("image@7.png").image({width: 400})}
  <figcaption>Mean error of 0.014 achieved on the barcode above. This is what a good fit looks like</figcaption>
</figure>

The theory that circular barcodes can be read at any pose works out! This demonstrates circular barcodes can reduce orientated object detection down to a 3-degree-of-freedom problem on a 1-dimensional slice, a drastic reduction in underlying problem complexity that fits hardware.

`
)};
const _pvvec8 = function _65(md){return(
md`## Next steps

Looking forward, I think intensity-based approaches are not going to scale well. So in future work, I will try a feature-based approach (e.g. edge detection) to avoid the expensive inner loop and explore a streaming algorithm to suit hardware implementation. Future work will be added to the [realtime optical positioning collection](https://observablehq.com/collection/@tomlarkworthy/realtime-optical-positioning) of notebooks.`
)};
const _1u2f4i = function _66(md){return(
md`---`
)};
const _1muu93j = function _67(md){return(
md`##### extra stuff`
)};
const _1s09qsu = async function _THREE(require)
{
  const THREE = window.THREE = await require("three@0.99.0/build/three.min.js");
  await require("three@0.99.0/examples/js/controls/OrbitControls.js").catch(() => {});
  return THREE;
};
const _1urihk5 = function _69(synthetic,htl){return(
htl.html`<details>
  <summary>synthetic image</summary>
  ${synthetic}
</details>`
)};
const _1lxbp0y = function _synthetic(template,htl){return(
htl.html`<svg width=1600 xmlns="http://www.w3.org/2000/svg" viewBox="-${template.length/2} -${template.length/2} ${template.length} ${template.length}">
  ${template.map((t, i) => i > template.length / 2 ? undefined : htl.svg`<circle cx="0" cy="0" r="${Math.abs(template.length/2 - i)}" fill="${t == true ? "white": "black"}" />`)}
</svg>`
)};
const _13u2yz1 = function _height(){return(
401
)};
const _ydey7w = function _renders(){return(
0
)};
const _18kg2mx = (M, _) => new M(_);
const _5k2hac = _ => _.generator;

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image.png","image@2.png","image@5.png","image@7.png","image@9.png"].map((name) => {
    const module_name = "@tomlarkworthy/circular-barcode-simulator";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module d/b2bbebd2f186ed03@1803", async () => runtime.module((await import("/d/b2bbebd2f186ed03@1803.js?v=4")).default));  
  $def("_kf2vuq", null, ["md"], _kf2vuq);  
  $def("_1sqfwts", null, ["md"], _1sqfwts);  
  $def("_ipjk73", null, ["md"], _ipjk73);  
  $def("_1ht1vxl", "viewof imageSource", ["Inputs"], _1ht1vxl);  
  $def("_1xr4wqa", "imageSource", ["Generators","viewof imageSource"], _1xr4wqa);  
  $def("_15x8hyn", "renderer", ["THREE"], _15x8hyn);  
  $def("_1x9y0ki", "render", ["THREE","width","height","renderer","scene","camera","pixelBuffer","mutable renders"], _1x9y0ki);  
  $def("_aanr00", "pixelBuffer", ["width","height"], _aanr00);  
  $def("_1ak3isr", "scene", ["THREE","imageSource","FileAttachment","synthetic"], _1ak3isr);  
  $def("_ajt06p", "camera", ["width","height","THREE","fov"], _ajt06p);  
  $def("_ebmpyh", "viewof fov", ["Inputs"], _ebmpyh);  
  $def("_1bwfjb9", "fov", ["Generators","viewof fov"], _1bwfjb9);  
  $def("_58b7qv", "canvas", ["THREE","camera","renderer","invalidation","width","height","render","html"], _58b7qv);  
  $def("_wi2zcs", "overlay", ["html","width","height","scanY","canvas","invalidation"], _wi2zcs);  
  $def("_19s1gpm", null, ["md"], _19s1gpm);  
  $def("_80g3o4", "viewof scanY", ["Inputs","height"], _80g3o4);  
  $def("_1je9rwm", "scanY", ["Generators","viewof scanY"], _1je9rwm);  
  $def("_64zye2", "scanline", ["renders","pixelBuffer","scanY","width"], _64zye2);  
  $def("_1d0il0o", null, ["Plot","scanline"], _1d0il0o);  
  $def("_1kyo8st", null, ["md"], _1kyo8st);  
  $def("_1kd231a", "template", [], _1kd231a);  
  $def("_140nckz", "templateData", ["template"], _140nckz);  
  $def("_f4sr0r", null, ["Plot","templateData"], _f4sr0r);  
  $def("_54ovb2", null, ["md"], _54ovb2);  
  $def("_z4pq69", "image2", ["FileAttachment"], _z4pq69);  
  $def("_1ethkpr", null, ["md"], _1ethkpr);  
  $def("_ydf7o7", null, ["md"], _ydf7o7);  
  $def("_is8s1q", "image5", ["FileAttachment"], _is8s1q);  
  $def("_12hzru8", null, ["md"], _12hzru8);  
  $def("_uvpafs", null, ["md"], _uvpafs);  
  $def("_12v0595", "viewof offset_pinhole", ["Inputs"], _12v0595);  
  $def("_1b6htrh", "offset_pinhole", ["Generators","viewof offset_pinhole"], _1b6htrh);  
  $def("_1h7fbky", "viewof scale_pinhole", ["Inputs"], _1h7fbky);  
  $def("_eye7ju", "scale_pinhole", ["Generators","viewof scale_pinhole"], _eye7ju);  
  $def("_ux280v", "viewof angle_pinhole", ["Inputs"], _ux280v);  
  $def("_hagmyr", "angle_pinhole", ["Generators","viewof angle_pinhole"], _hagmyr);  
  $def("_p9svwq", "viewof fov_pinhole", ["Inputs","camera"], _p9svwq);  
  $def("_1t1lgdj", "fov_pinhole", ["Generators","viewof fov_pinhole"], _1t1lgdj);  
  $def("_a1qmvp", null, ["md"], _a1qmvp);  
  $def("_yrngyl", "viewof useAngleCoorection", ["Inputs"], _yrngyl);  
  $def("_txq4nv", "useAngleCoorection", ["Generators","viewof useAngleCoorection"], _txq4nv);  
  $def("_jx2za3", "viewof useAngleCoorection1", ["Inputs"], _jx2za3);  
  $def("_1jsxar8", "useAngleCoorection1", ["Generators","viewof useAngleCoorection1"], _1jsxar8);  
  $def("_kdpoaa", null, ["md"], _kdpoaa);  
  $def("_olwkvv", "pinhole", ["fov_pinhole","useAngleCoorection","templateData","template"], _olwkvv);  
  $def("_l37eud", null, ["Plot","projectedPinholeData"], _l37eud);  
  $def("_1iz3hm", "projectedPinholeData", ["width","pinhole","offset_pinhole","scale_pinhole","angle_pinhole"], _1iz3hm);  
  $def("_1uvfc0j", null, ["md"], _1uvfc0j);  
  $def("_o2b1pi", null, ["md"], _o2b1pi);  
  $def("_194tnfz", "fitData", ["width","scanline","pinhole","offset_pinhole","scale_pinhole","angle_pinhole"], _194tnfz);  
  $def("_10ocafe", "meanError", ["d3","fitData"], _10ocafe);  
  $def("_1g4y8p7", "score_template_fit", ["width","scanline","pinhole"], _1g4y8p7);  
  $def("_17xetgm", "viewof showTemplate", ["Inputs"], _17xetgm);  
  $def("_ap9p9v", "showTemplate", ["Generators","viewof showTemplate"], _ap9p9v);  
  $def("_1bexyln", "viewof showScan", ["Inputs"], _1bexyln);  
  $def("_m6ds4k", "showScan", ["Generators","viewof showScan"], _m6ds4k);  
  $def("_gf9c76", "viewof showError", ["Inputs"], _gf9c76);  
  $def("_4wtrj", "showError", ["Generators","viewof showError"], _4wtrj);  
  $def("_8s7176", null, ["Plot","showTemplate","fitData","showScan","showError","meanError","width"], _8s7176);  
  $def("_lsp2pw", null, ["md"], _lsp2pw);  
  $def("_1mswsn", null, ["tex","md"], _1mswsn);  
  $def("_1kff1vk", "viewof useBestFit", ["Inputs"], _1kff1vk);  
  $def("_10x2fmo", "useBestFit", ["Generators","viewof useBestFit"], _10x2fmo);  
  $def("_guuc63", "viewof steps", ["Inputs"], _guuc63);  
  $def("_ktvi7x", "steps", ["Generators","viewof steps"], _ktvi7x);  
  $def("_20pdpu", "viewof offset_range", ["interval"], _20pdpu);  
  $def("_9inknh", "offset_range", ["Generators","viewof offset_range"], _9inknh);  
  $def("_94eh0q", "viewof scale_range", ["interval"], _94eh0q);  
  $def("_1hvzz42", "scale_range", ["Generators","viewof scale_range"], _1hvzz42);  
  $def("_17rohc", "viewof angle_range", ["interval"], _17rohc);  
  $def("_1269hsn", "angle_range", ["Generators","viewof angle_range"], _1269hsn);  
  $def("_1e6zp78", "doBestFit", ["useBestFit","viewof offset_pinhole","bestFit","viewof scale_pinhole","viewof angle_pinhole","Event"], _1e6zp78);  
  $def("_gfpy86", "bestFit", ["useBestFit","offset_range","steps","scale_range","angle_range","score_template_fit"], _gfpy86);  
  main.define("interval", ["module d/b2bbebd2f186ed03@1803", "@variable"], (_, v) => v.import("interval", _));  
  $def("_qyioyo", null, ["md"], _qyioyo);  
  $def("_1o9cqrm", null, ["md"], _1o9cqrm);  
  $def("_1rgcniv", "viewof precision_patch", ["Inputs"], _1rgcniv);  
  $def("_1cavb8j", "precision_patch", ["Generators","viewof precision_patch"], _1cavb8j);  
  $def("_kbb027", "step_size", ["precision_patch"], _kbb027);  
  $def("_1621xki", "current", ["offset_pinhole","angle_pinhole","scale_pinhole"], _1621xki);  
  $def("_140085a", null, ["Inputs","score_template_fit","current","step_size","viewof offset_pinhole","viewof scale_pinhole","viewof angle_pinhole","Event"], _140085a);  
  $def("_pcmhk6", null, ["FileAttachment","md"], _pcmhk6);  
  $def("_pvvec8", null, ["md"], _pvvec8);  
  $def("_1u2f4i", null, ["md"], _1u2f4i);  
  $def("_1muu93j", null, ["md"], _1muu93j);  
  $def("_1s09qsu", "THREE", ["require"], _1s09qsu);  
  $def("_1urihk5", null, ["synthetic","htl"], _1urihk5);  
  $def("_1lxbp0y", "synthetic", ["template","htl"], _1lxbp0y);  
  $def("_13u2yz1", "height", [], _13u2yz1);  
  $def("_ydey7w", "initial renders", [], _ydey7w);  
  $def("_18kg2mx", "mutable renders", ["Mutable","initial renders"], _18kg2mx);  
  $def("_5k2hac", "renders", ["mutable renders"], _5k2hac);
  return main;
}