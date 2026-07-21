const _1k789gk = function _1(md){return(
md`# ILDA Laser Show Player

This is an off-the-shelf ILDA laser show sourced from http://www.laser-am.com/ilda.php physically simulated in THREE.js.

NOTE: My ILDA parser is very slow and Observable thinks the notebook has frozen, but it hasn't!
`
)};
const _k8oljy = function* _2(THREE,invalidation,width,height,buffers,EffectComposer,RenderPass,camera,UnrealBloomPass,strength,$0)
{
  const renderer = new THREE.WebGLRenderer({antialias: true});
  invalidation.then(() => renderer.dispose());
  renderer.setSize(width, height);
  renderer.setPixelRatio(devicePixelRatio);
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.add(buffers.line);
  
  const composer = new EffectComposer( renderer );
  const renderScene = new RenderPass( scene, camera );
  const bloomPass = new UnrealBloomPass( new THREE.Vector2( width, height), 1.5, 0.4, 0.85 );
  bloomPass.threshold = 0;
	bloomPass.strength = strength;
	bloomPass.radius = 1;

	composer.addPass( renderScene );
	composer.addPass( bloomPass );
  
  const t_start = performance.now();
  
  while (true) {
    $0.value = performance.now() - t_start 
    composer.render();
    yield renderer.domElement;
  }
};
const _7jknvv = function _strength(slider){return(
slider({
  max: 100,
  description: "laser power",
  value: 15
})
)};
const _3bct4h = (G, _) => G.input(_);
const _q459xl = function _blankingOffset(slider){return(
slider({
  min: -10,
  max: 10,
  value: -3,
  description: "blankingOffset",
  step: 1
})
)};
const _1n49ujx = (G, _) => G.input(_);
const _1bkmz6z = function _zoom(slider){return(
slider({
  value: 0.44,
  description:"zoom"
})
)};
const _ngzrcn = (G, _) => G.input(_);
const _14alosw = function _gain(slider){return(
slider({
  min: 0.001,
  value: 0.51,
  description: "gain",
  max: 2
})
)};
const _1nyvdrf = (G, _) => G.input(_);
const _lnj9a5 = function _dampening(slider){return(
slider({
  value: 0.39,
  description: "dampening",
  max: 1,
  step: 0.001
})
)};
const _1dnsyj1 = (G, _) => G.input(_);
const _nuux7l = function _lightDecay(slider){return(
slider({
  description: "laser light decay",
  value: 0.95
})
)};
const _1vu05w2 = (G, _) => G.input(_);
const _nimbay = function _run(checkbox){return(
checkbox({
  options: [{ value: "run", label: "Run" }],
  value: "run"
})
)};
const _tiidan = (G, _) => G.input(_);
const _11j3fra = async function _pattern(FileAttachment){return(
await FileAttachment("sylvest.ild").arrayBuffer()
)};
const _w3ej8w = function _palette(THREE){return(
[
  new THREE.Color("rgb(55, 0, 0)"), 
  new THREE.Color("rgb(55, 16, 0)"),
  new THREE.Color("rgb(55, 32, 0)"),
  new THREE.Color("rgb(55, 48, 0)"),
  new THREE.Color("rgb(55, 64, 0)"),
  new THREE.Color("rgb(55, 80, 0)"),
  new THREE.Color("rgb(55, 96, 0)"),
  new THREE.Color("rgb(55, 112, 0)"),
  new THREE.Color("rgb(55, 128, 0)"),
  new THREE.Color("rgb(55, 144, 0)"),
  new THREE.Color("rgb(255, 160, 0)"),
  new THREE.Color("rgb(255, 176, 0)"),
  new THREE.Color("rgb(255, 192, 0)"),
  new THREE.Color("rgb(255, 208, 0)"),
  new THREE.Color("rgb(255, 224, 0)"),
  new THREE.Color("rgb(255, 240, 0)"),
  new THREE.Color("rgb(255, 255, 0)"), 
  new THREE.Color("rgb(224, 255, 0)"),
  new THREE.Color("rgb(192, 255, 0)"),
  new THREE.Color("rgb(160, 255, 0)"),
  new THREE.Color("rgb(128, 255, 0)"),
  new THREE.Color("rgb(96, 255, 0)"),
  new THREE.Color("rgb(64, 255, 0)"),
  new THREE.Color("rgb(32, 255, 0)"),
  new THREE.Color("rgb(0, 255, 0)"), 
  new THREE.Color("rgb(0, 255, 36)"),
  new THREE.Color("rgb(0, 255, 73)"),
  new THREE.Color("rgb(0, 255, 109)"),
  new THREE.Color("rgb(0, 255, 146)"),
  new THREE.Color("rgb(0, 255, 182)"),
  new THREE.Color("rgb(0, 255, 219)"),
  new THREE.Color("rgb(0, 255, 255)"), 
  new THREE.Color("rgb(0, 227, 255)"),
  new THREE.Color("rgb(0, 198, 255)"),
  new THREE.Color("rgb(0, 170, 255)"),
  new THREE.Color("rgb(0, 142, 255)"),
  new THREE.Color("rgb(0, 113, 255)"),
  new THREE.Color("rgb(0, 85, 255)"),
  new THREE.Color("rgb(0, 56, 255)"),
  new THREE.Color("rgb(0, 28, 255)"),
  new THREE.Color("rgb(0, 0, 255)"), 
  new THREE.Color("rgb(32, 0, 255)"),
  new THREE.Color("rgb(64, 0, 255)"),
  new THREE.Color("rgb(96, 0, 255)"),
  new THREE.Color("rgb(128, 0, 255)"),
  new THREE.Color("rgb(160, 0, 255)"),
  new THREE.Color("rgb(192, 0, 255)"),
  new THREE.Color("rgb(224, 0, 255)"),
  new THREE.Color("rgb(255, 0, 255)"), 
  new THREE.Color("rgb(255, 32, 255)"),
  new THREE.Color("rgb(255, 64, 255)"),
  new THREE.Color("rgb(255, 96, 255)"),
  new THREE.Color("rgb(255, 128, 255)"),
  new THREE.Color("rgb(255, 160, 255)"),
  new THREE.Color("rgb(255, 192, 255)"),
  new THREE.Color("rgb(255, 224, 255)"),
  new THREE.Color("rgb(255, 255, 255)"), 
  new THREE.Color("rgb(255, 224, 224)"),
  new THREE.Color("rgb(255, 192, 192)"),
  new THREE.Color("rgb(255, 160, 160)"),
  new THREE.Color("rgb(255, 128, 128)"),
  new THREE.Color("rgb(255, 96, 96)"),
  new THREE.Color("rgb(255, 64, 64)"),
  new THREE.Color("rgb(255, 32, 32)")]
)};
const _1lpqq9s = function _frames(pattern)
{
  const enc = new TextDecoder("ascii");
  let data = pattern; 
  function readString(bytes) {
    const str = enc.decode(new Uint8Array(data.slice(0, bytes)));
    data = data.slice(bytes)
    return str;
  }
  function readUint8() {
    const num = new Uint8Array(data.slice(0, 1))[0];
    data = data.slice(1)
    return num;
  }
  function readUint16() {
    const num = new DataView(data.slice(0, 2)).getUint16();
    data = data.slice(2)
    return num;
  }
  function readInt16() {
    const num = new DataView(data.slice(0, 2)).getInt16();
    data = data.slice(2)
    return num;
  }
  function skip(bytes) {
    data = data.slice(bytes)
  }
  
  function readHeader() {
    return {
      ilda: readString(4),
      reserved: skip(3),
      format: readUint8(),
      name: readString(8),
      company: readString(8),
      records: readUint16(), 
      frameNumber: readUint16(),
      frames: readUint16(),
      projector: readUint8(),
      reserved2: skip(1)
    }
  }
  
  function readFormat0(format) {
    return [
      /* X */ readInt16(), /* Y */ readInt16(), /* Z */ readInt16(),
      /* status */readUint8(),
      /* color index */readUint8()
    ]
  }
  
  function readFrame() {
    const frame = readHeader();
    frame.data = new Array(frame.records || 0).fill().map(f => readFormat0())
    return frame;
  }
  
  const frames = [readFrame()]
  for (let f = 1; f < frames[0].frames; f++) {
    frames.push(readFrame())
  }
  return frames;
};
const _apf64s = function _t(){return(
0.0
)};
const _oys9do = (M, _) => new M(_);
const _1btq9gt = _ => _.generator;
const _1uvooc9 = function _buffers(THREE,MAX_SEGMENTS)
{
  const buffers = {
    last_t: 0,
    step: 1.0 / 8, //12K points per second, i.e. 12 per ms
    programCounter: [0, 0], // frame, record
    galvo: new THREE.Vector3(),
    galvoV: new THREE.Vector3(),
    blanking: 1.0,
    blankingV: 0, 
    positions: new THREE.Float32BufferAttribute( (MAX_SEGMENTS) * 3, 3 ),
    colors: new THREE.Float32BufferAttribute( (MAX_SEGMENTS) * 3, 3 ),
    lineGeometry: new THREE.BufferGeometry(),
    lineMaterial: new THREE.LineBasicMaterial( { color: 0xffffff, vertexColors: true} ),
  }
  buffers.lineMaterial.blending = THREE.AdditiveBlending;
  buffers.lineGeometry.setAttribute('position', buffers.positions)
  buffers.lineGeometry.setAttribute('color', buffers.colors)
  buffers.line = new THREE.Line( buffers.lineGeometry, buffers.lineMaterial )  
  
  
  
  buffers.lineGeometry.setDrawRange(0, MAX_SEGMENTS);
  return buffers;
};
const _1g2kcpo = function _draw(run,zoom,width,height,buffers,t,MAX_SEGMENTS,frames,THREE,gain,dampening,blankingOffset,palette,lightDecay)
{
  if (!run) return;
  const points = [];
  const colors = [];
  
  const int16ToWidth = zoom * width / 32000
  const int16ToHeight = zoom * height / 32000
  // We iterate in time, new points.
  //for ( var i = 0; i < frames[0].data.length; i++) {
  for (var tp = buffers.last_t; tp < t && points.length < MAX_SEGMENTS; tp += buffers.step) { // we could do this more stable
    const i = buffers.programCounter[1];
    const fi = buffers.programCounter[0];
    const status = frames[0].data[i][3]
    
    if ((status & (1 << 7)) != 0 || i == frames[fi].records) {
      // end of seq
      buffers.programCounter[1] = 0;
      buffers.programCounter[0] = (fi + 1) % frames[fi].frames;
      continue;
    }
    const target = new THREE.Vector3(frames[fi].data[i][0] * int16ToWidth,
                                     frames[fi].data[i][1] * int16ToHeight,
                                     0);
    
    buffers.galvoV.add(target.addScaledVector(buffers.galvo, -1).multiplyScalar(gain));
    buffers.galvo.add(buffers.galvoV.multiplyScalar(dampening))
      
    const blankingStatus = (frames[fi].data[i + blankingOffset] || 0)[3]
    if ((blankingStatus & (1 << 6)) != 0) {
      // blanking to zero
      buffers.blanking = 0;
    } else {
      // blanking to one
      buffers.blanking = 1;
    }
      
    const colorIndex = frames[fi].data[i][4]
    const color = palette[colorIndex];
    colors.push(color.r * buffers.blanking, color.g * buffers.blanking, color.b * buffers.blanking);
    points.push(buffers.galvo.x, buffers.galvo.y, buffers.galvo.z );
    buffers.programCounter[1]++;
  }
  
  // The main stratergy is to shift all the buffers down, and append new data points to the end
  buffers.positions.set(buffers.positions.array.slice(points.length), 0);
  buffers.positions.set(points, MAX_SEGMENTS * 3 - points.length);
  // We also decay the colors by a factor so the old lines fade out
  buffers.colors.set(buffers.colors.array.slice(colors.length).map(x => x * lightDecay), 0);
  buffers.colors.set(colors, MAX_SEGMENTS * 3 - colors.length);
  
  
  buffers.positions.needsUpdate = true;
  buffers.colors.needsUpdate = true;
  buffers.last_t = t;
};
const _1jdda7w = function _camera(THREE,width,height){return(
new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2,height / 2, height / - 2)
)};
const _110g9fp = function _height(){return(
500
)};
const _14up5ku = function _MAX_SEGMENTS(){return(
2048
)};
const _1d7ftt3 = function _THREE_VERSION(){return(
"0.112.1"
)};
const _18sf2yu = function _THREE(require,THREE_VERSION){return(
require(`three@${THREE_VERSION}/build/three.min.js`)
)};
const _1uospuc = async function _EffectComposer(THREE_VERSION) {
    return (await import(`https://unpkg.com/three@${ THREE_VERSION }/examples/jsm/postprocessing/EffectComposer.js?module`)).EffectComposer;
};
const _ldx7dk = async function _RenderPass(THREE_VERSION) {
    return (await import(`https://unpkg.com/three@${ THREE_VERSION }/examples/jsm/postprocessing/RenderPass.js?module`)).RenderPass;
};
const _18bunvi = async function _UnrealBloomPass(THREE_VERSION) {
    return (await import(`https://unpkg.com/three@${ THREE_VERSION }/examples/jsm/postprocessing/UnrealBloomPass.js?module`)).UnrealBloomPass;
};
const _1c65672 = function _27(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["sylvest.ild"].map((name) => {
    const module_name = "@tomlarkworthy/ilda-laser-show-player";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_1k789gk", null, ["md"], _1k789gk);  
  $def("_k8oljy", null, ["THREE","invalidation","width","height","buffers","EffectComposer","RenderPass","camera","UnrealBloomPass","strength","mutable t"], _k8oljy);  
  $def("_7jknvv", "viewof strength", ["slider"], _7jknvv);  
  $def("_3bct4h", "strength", ["Generators","viewof strength"], _3bct4h);  
  $def("_q459xl", "viewof blankingOffset", ["slider"], _q459xl);  
  $def("_1n49ujx", "blankingOffset", ["Generators","viewof blankingOffset"], _1n49ujx);  
  $def("_1bkmz6z", "viewof zoom", ["slider"], _1bkmz6z);  
  $def("_ngzrcn", "zoom", ["Generators","viewof zoom"], _ngzrcn);  
  $def("_14alosw", "viewof gain", ["slider"], _14alosw);  
  $def("_1nyvdrf", "gain", ["Generators","viewof gain"], _1nyvdrf);  
  $def("_lnj9a5", "viewof dampening", ["slider"], _lnj9a5);  
  $def("_1dnsyj1", "dampening", ["Generators","viewof dampening"], _1dnsyj1);  
  $def("_nuux7l", "viewof lightDecay", ["slider"], _nuux7l);  
  $def("_1vu05w2", "lightDecay", ["Generators","viewof lightDecay"], _1vu05w2);  
  $def("_nimbay", "viewof run", ["checkbox"], _nimbay);  
  $def("_tiidan", "run", ["Generators","viewof run"], _tiidan);  
  $def("_11j3fra", "pattern", ["FileAttachment"], _11j3fra);  
  $def("_w3ej8w", "palette", ["THREE"], _w3ej8w);  
  $def("_1lpqq9s", "frames", ["pattern"], _1lpqq9s);  
  $def("_apf64s", "initial t", [], _apf64s);  
  $def("_oys9do", "mutable t", ["Mutable","initial t"], _oys9do);  
  $def("_1btq9gt", "t", ["mutable t"], _1btq9gt);  
  $def("_1uvooc9", "buffers", ["THREE","MAX_SEGMENTS"], _1uvooc9);  
  $def("_1g2kcpo", "draw", ["run","zoom","width","height","buffers","t","MAX_SEGMENTS","frames","THREE","gain","dampening","blankingOffset","palette","lightDecay"], _1g2kcpo);  
  $def("_1jdda7w", "camera", ["THREE","width","height"], _1jdda7w);  
  $def("_110g9fp", "height", [], _110g9fp);  
  $def("_14up5ku", "MAX_SEGMENTS", [], _14up5ku);  
  $def("_1d7ftt3", "THREE_VERSION", [], _1d7ftt3);  
  $def("_18sf2yu", "THREE", ["require","THREE_VERSION"], _18sf2yu);  
  $def("_1uospuc", "EffectComposer", ["THREE_VERSION"], _1uospuc);  
  $def("_ldx7dk", "RenderPass", ["THREE_VERSION"], _ldx7dk);  
  $def("_18bunvi", "UnrealBloomPass", ["THREE_VERSION"], _18bunvi);  
  main.define("slider", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("slider", _));  
  main.define("checkbox", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("checkbox", _));  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_1c65672", null, ["footer"], _1c65672);
  return main;
}