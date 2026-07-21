const _srwqhy = function _1(md){return(
md`# Laser Simulator
`
)};
const _1ni1062 = function _run(checkbox){return(
checkbox({
  options: [{ value: "run", label: "run" }],
  value: "run"
})
)};
const _tiidan = (G, _) => G.input(_);
const _1id8nrz = function* _3(THREE,invalidation,width,height,buffers,EffectComposer,RenderPass,camera,UnrealBloomPass,$0,run)
{
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  invalidation.then(() => renderer.dispose());
  renderer.setSize(width, height);
  renderer.setPixelRatio(devicePixelRatio);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.add(buffers.line);

  const composer = new EffectComposer(renderer);
  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.min(width, 640), height),
    0,
    0.2,
    0.85
  );
  bloomPass.threshold = 0;
  bloomPass.strength = 50.7;
  bloomPass.radius = 1;

  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  const t_start = performance.now();

  renderer.domElement.style = "width: 100%";
  while (true) {
    $0.value = performance.now() - t_start;
    if (run) composer.render();
    yield renderer.domElement;
  }
};
const _apf64s = function _t(){return(
0.0
)};
const _oys9do = (M, _) => new M(_);
const _1btq9gt = _ => _.generator;
const _jpb0uq = function _buffers(THREE,MAX_SEGMENTS)
{
  const buffers = {
    last_t: 0,
    positions: new THREE.Float32BufferAttribute( (MAX_SEGMENTS) * 3, 3 ),
    colors: new THREE.Float32BufferAttribute( (MAX_SEGMENTS) * 3, 3 ),
    lineGeometry: new THREE.BufferGeometry(),
    lineMaterial: new THREE.LineBasicMaterial( { color: 0xffffff, vertexColors: true} ),
  }
  buffers.lineGeometry.setAttribute('position', buffers.positions)
  buffers.lineGeometry.setAttribute('color', buffers.colors)
  buffers.line = new THREE.Line( buffers.lineGeometry, buffers.lineMaterial )  
  buffers.lineGeometry.setDrawRange(0, MAX_SEGMENTS);
  return buffers;
};
const _1crarbu = function _draw(THREE,t,buffers,MAX_SEGMENTS,width,height)
{
  const points = [];
  const colors = [];
  const point = new THREE.Vector3();
  const color = new THREE.Color();
  
  color.setRGB(Math.cos(t * 0.00011) * 0.5 + 1, Math.cos(t * 0.002) * 0.5 + 1, Math.cos(t * 0.003) * 0.5 + 1)
  
  // We iterate in time new points.
  for ( var i = buffers.last_t; i < t && points.length < MAX_SEGMENTS * 3; i += 10 ) {
    point.x = Math.cos((i * 0.0091)) * 0.9 * width / 2 ;
    point.y = Math.sin((i * 0.015)) * 0.9 * height / 2;
    points.push( point.x, point.y, point.z );
    colors.push(color.r, color.g, color.b);
  }
  
  // The main stratergy is to shift all the buffers down, and append new data points to the end
  buffers.positions.set(buffers.positions.array.slice(points.length));
  buffers.positions.set(points, MAX_SEGMENTS * 3 - points.length);
  // We also decay the colors by a factor so the old lines fade out
  buffers.colors.set(buffers.colors.array.slice(colors.length).map(x => x * 0.95), 0);
  buffers.colors.set(colors, MAX_SEGMENTS * 3 - colors.length);
  
  
  buffers.positions.needsUpdate = true;
  buffers.colors.needsUpdate = true;
  buffers.last_t = t;
};
const _1jdda7w = function _camera(THREE,width,height){return(
new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2,height / 2, height / - 2)
)};
const _njaqei = function _height(){return(
600
)};
const _1abnv4p = function _9(md){return(
md`Lastly, we load Three.`
)};
const _1wedw7r = function _MAX_SEGMENTS(){return(
1000
)};
const _1d7ftt3 = function _THREE_VERSION(){return(
"0.112.1"
)};
const _18sf2yu = function _THREE(require,THREE_VERSION){return(
require(`three@${THREE_VERSION}/build/three.min.js`)
)};
const _yi1bo5 = async function _EffectComposer(THREE_VERSION) {
    return (await import(`https://unpkg.com/three@${ THREE_VERSION }/examples/jsm/postprocessing/EffectComposer.js?module`)).EffectComposer;
};
const _yxyjed = async function _RenderPass(THREE_VERSION) {
    return (await import(`https://unpkg.com/three@${ THREE_VERSION }/examples/jsm/postprocessing/RenderPass.js?module`)).RenderPass;
};
const _15246d1 = async function _UnrealBloomPass(THREE_VERSION) {
    return (await import(`https://unpkg.com/three@${ THREE_VERSION }/examples/jsm/postprocessing/UnrealBloomPass.js?module`)).UnrealBloomPass;
};
const _ugz6h0 = function _18(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["Screen Shot 2020-09-03 at 10.35.26 AM.png"].map((name) => {
    const module_name = "@tomlarkworthy/lazer-simulator";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_srwqhy", null, ["md"], _srwqhy);  
  $def("_1ni1062", "viewof run", ["checkbox"], _1ni1062);  
  $def("_tiidan", "run", ["Generators","viewof run"], _tiidan);  
  $def("_1id8nrz", null, ["THREE","invalidation","width","height","buffers","EffectComposer","RenderPass","camera","UnrealBloomPass","mutable t","run"], _1id8nrz);  
  $def("_apf64s", "initial t", [], _apf64s);  
  $def("_oys9do", "mutable t", ["Mutable","initial t"], _oys9do);  
  $def("_1btq9gt", "t", ["mutable t"], _1btq9gt);  
  $def("_jpb0uq", "buffers", ["THREE","MAX_SEGMENTS"], _jpb0uq);  
  $def("_1crarbu", "draw", ["THREE","t","buffers","MAX_SEGMENTS","width","height"], _1crarbu);  
  $def("_1jdda7w", "camera", ["THREE","width","height"], _1jdda7w);  
  $def("_njaqei", "height", [], _njaqei);  
  $def("_1abnv4p", null, ["md"], _1abnv4p);  
  $def("_1wedw7r", "MAX_SEGMENTS", [], _1wedw7r);  
  $def("_1d7ftt3", "THREE_VERSION", [], _1d7ftt3);  
  $def("_18sf2yu", "THREE", ["require","THREE_VERSION"], _18sf2yu);  
  $def("_yi1bo5", "EffectComposer", ["THREE_VERSION"], _yi1bo5);  
  $def("_yxyjed", "RenderPass", ["THREE_VERSION"], _yxyjed);  
  $def("_15246d1", "UnrealBloomPass", ["THREE_VERSION"], _15246d1);  
  main.define("checkbox", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("checkbox", _));  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_ugz6h0", null, ["footer"], _ugz6h0);
  return main;
}