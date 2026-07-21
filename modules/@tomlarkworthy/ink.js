const _wfxnwj = function _1(md){return(
md`# Ink in water`
)};
const _rtqazm = function _2(md){return(
md`Using [@jashkenas](https://observablehq.com/@jashkenas/webgl-fluid-simulation)'s port of [Pavel Dobryakov’s](https://github.com/PavelDoGreat) [WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation/blob/master/script.js) [(MIT License)](https://opensource.org/licenses/MIT) as a base, an **ink** model. 

Our long term destination is *Suminagashi*, but we need multi-fluid simulation to model the surfactant.

The main changes from [@jashkenas](https://observablehq.com/@jashkenas/webgl-fluid-simulation)
- we add pressure with the splat function to make the ink shoot outward
- continuous mouse controls
- inverted the color mixing model to be subtractive (which is more like ink).
- the ink color rotates each click

Checkout [Gentle Introduction to Realtime Fluid Simulation for Programmers and Technical Artists]( https://link.medium.com/UsUv498X9jb) for building intuition over the code

### Backlog
- Try using pigment mixing (https://scrtwpns.com/mixbox/), they do have a fluid example (https://scrtwpns.com/mixbox/fluids/), suggested on [HN](https://news.ycombinator.com/item?id=42543931)

## Instructions

*Click inside the rectangle below*`
)};
const _fosw8y = function _canvas(DOM,width,height,ink,$0)
{
  const canvas = DOM.canvas(
    width * devicePixelRatio,
    height * devicePixelRatio
  );
  canvas.style.border = "solid";
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style["touch-action"] = "none";

  canvas.addEventListener("pointerdown", (evt) => {
    ink.unshift(ink.pop()); // Rotate colors every click
    $0.value = evt;
  });
  canvas.addEventListener(
    "pointermove",
    (evt) => ($0.value = $0.value && evt) // Track mouse position when currently pressed
  );
  canvas.addEventListener("pointerup", (evt) => ($0.value = undefined)); // Release mouse
  return canvas;
};
const _cskxmi = function _height(Inputs){return(
Inputs.range([100, 1000], { value: 570, label: "height" })
)};
const _ug2tnr = (G, _) => G.input(_);
const _5w7acc = function _dt(Inputs){return(
Inputs.range([0, 0.035], {
  value: 0.016,
  step: 0.001,
  label: "time step per frame"
})
)};
const _gawsks = (G, _) => G.input(_);
const _1ma4gk7 = function _downsample(Inputs){return(
Inputs.range([0.1, 5], {
  value: 1.5,
  step: 0.01,
  label: "Lower resolution"
})
)};
const _ooj57m = (G, _) => G.input(_);
const _1josd6t = function _densityDissipation(Inputs){return(
Inputs.range([0.8, 1.1], {
  value: 0.99,
  step: 0.001,
  label: "Ink dissipation"
})
)};
const _1430kb5 = (G, _) => G.input(_);
const _1iuquwm = function _velocityDissipation(Inputs){return(
Inputs.range([0.95, 1.05], {
  value: 0.99,
  step: 0.001,
  label: "velocity dissipation"
})
)};
const _9ajoki = (G, _) => G.input(_);
const _1yydp19 = function _curlDegree(Inputs){return(
Inputs.range([0, 50], {
  value: 17,
  step: 0.1,
  label: "curl"
})
)};
const _mags9e = (G, _) => G.input(_);
const _37m0fk = function _ink(){return(
[255, 0, 0]
)};
const _1496ns = (M, _) => new M(_);
const _1621n1d = _ => _.generator;
const _n9ueh4 = function _mouse(){return(
undefined
)};
const _gxpa4f = (M, _) => new M(_);
const _jgexx6 = _ => _.generator;
const _1hqgg22 = function _mouseSplat(ink,splat){return(
function mouseSplat(evt) {
  const color = [ink[0], ink[1], ink[2]];
  const dx = 0;
  const dy = 0;
  const p = 5000;
  splat(
    evt.offsetX * window.devicePixelRatio,
    evt.offsetY * window.devicePixelRatio,
    dx,
    dy,
    color,
    p
  );
}
)};
const _xrryi1 = function _ctx(canvas,supportRenderTextureFormat)
{
  const params = {alpha: false, depth: false, stencil: false, antialias: false};

  let gl = canvas.getContext('webgl2', params);
  const isWebGL2 = !!gl;
  if (!isWebGL2) {
    gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
  }

  let halfFloat;
  let supportLinearFloat;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFloat = gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFloat = gl.getExtension('OES_texture_half_float_linear');
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
  const internalFormat   = isWebGL2 ? gl.RGBA16F : gl.RGBA;
  let internalFormatRG   = isWebGL2 ? gl.RG16F : gl.RGBA;
  let formatRG           = isWebGL2 ? gl.RG : gl.RGBA;

  if (isWebGL2) {
    if (!supportRenderTextureFormat(gl, internalFormatRG, formatRG, halfFloatTexType)) {
      internalFormatRG = gl.RGBA16F;
      formatRG = gl.RGBA;
    }
  }

  return {
    gl,
    ext: {internalFormat, internalFormatRG, formatRG, halfFloatTexType, supportLinearFloat}
  };
};
const _1viy9kx = function _gl(ctx){return(
ctx.gl
)};
const _1ro1knt = function _ext(ctx){return(
ctx.ext
)};
const _1lwzpsd = function _supportRenderTextureFormat(){return(
function supportRenderTextureFormat (gl, internalFormat, format, type) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

  let fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  return status == gl.FRAMEBUFFER_COMPLETE;
}
)};
const _1y9lp25 = function _GLProgram(gl){return(
class GLProgram {
  constructor (vertexShader, fragmentShader) {
    this.uniforms = {};
    this.program = gl.createProgram();

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformName = gl.getActiveUniform(this.program, i).name;
      this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName);
    }
  }

  bind () {
    gl.useProgram(this.program);
  }
}
)};
const _5lysy1 = function _compileShader(gl){return(
function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}
)};
const _46vbpo = function _baseVertexShader(compileShader,gl){return(
compileShader(gl.VERTEX_SHADER, `
  precision highp float;
  precision mediump sampler2D;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;
  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`)
)};
const _1xbkunm = function _createFBO(gl){return(
function createFBO(texId, w, h, internalFormat, format, type, param) {
  gl.activeTexture(gl.TEXTURE0 + texId);
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

  let fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT);

  return [texture, fbo, texId];
}
)};
const _gdjvj0 = function _createDoubleFBO(createFBO){return(
function createDoubleFBO(texId, w, h, internalFormat, format, type, param) {
  let fbo1 = createFBO(texId, w, h, internalFormat, format, type, param);
  let fbo2 = createFBO(texId + 1, w, h, internalFormat, format, type, param);

  return {
    get first () {
      return fbo1;
    },
    get second () {
      return fbo2;
    },
    swap () {
      let temp = fbo1;
      fbo1 = fbo2;
      fbo2 = temp;
    }
  }
}
)};
const _2r955w = function _textureWidth(gl,downsample){return(
gl.drawingBufferWidth >> downsample
)};
const _if4lon = function _textureHeight(gl,downsample){return(
gl.drawingBufferHeight >> downsample
)};
const _1xrbkbl = function _24(md){return(
md`### Density holds color information`
)};
const _euywll = function _density(createDoubleFBO,textureWidth,textureHeight,ext,gl){return(
createDoubleFBO(0, textureWidth, textureHeight, ext.internalFormat, gl.RGBA, ext.halfFloatTexType, ext.supportLinearFloat ? gl.LINEAR : gl.NEAREST)
)};
const _336l3s = function _velocity(createDoubleFBO,textureWidth,textureHeight,ext,gl){return(
createDoubleFBO(2, textureWidth, textureHeight, ext.internalFormatRG, ext.formatRG, ext.halfFloatTexType, ext.supportLinearFloat ? gl.LINEAR : gl.NEAREST)
)};
const _1pdijxe = function _divergence(createFBO,textureWidth,textureHeight,ext,gl){return(
createFBO(4, textureWidth, textureHeight, ext.internalFormatRG, ext.formatRG, ext.halfFloatTexType, gl.NEAREST)
)};
const _1h381p7 = function _curl(createFBO,textureWidth,textureHeight,ext,gl){return(
createFBO(5, textureWidth, textureHeight, ext.internalFormatRG, ext.formatRG, ext.halfFloatTexType, gl.NEAREST)
)};
const _1fuw0da = function _pressure(createDoubleFBO,textureWidth,textureHeight,ext,gl){return(
createDoubleFBO(6, textureWidth, textureHeight, ext.internalFormatRG, ext.formatRG, ext.halfFloatTexType, gl.NEAREST)
)};
const _scv94v = function _blit(gl)
{
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  return (destination) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
};
const _1dc8pz3 = function _clearProgram(GLProgram,baseVertexShader,compileShader,gl){return(
new GLProgram(
  baseVertexShader,
  compileShader(
    gl.FRAGMENT_SHADER,
    `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;
  void main () {
    gl_FragColor = value * texture2D(uTexture, vUv);
  }
`
  )
)
)};
const _1qz8tr8 = function _splatProgram(GLProgram,baseVertexShader,compileShader,gl){return(
new GLProgram(
  baseVertexShader,
  compileShader(
    gl.FRAGMENT_SHADER,
    `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1);
  }
`
  )
)
)};
const _1n0tb1r = function _advectionProgram(GLProgram,baseVertexShader,ext,compileShader,gl){return(
new GLProgram(
  baseVertexShader,
  ext.supportLinearFloat
    ? compileShader(
        gl.FRAGMENT_SHADER,
        `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;
  void main () {
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    gl_FragColor = dissipation * texture2D(uSource, coord);
  }
`
      )
    : compileShader(
        gl.FRAGMENT_SHADER,
        `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;
  vec4 bilerp (in sampler2D sam, in vec2 p) {
    vec4 st;
    st.xy = floor(p - 0.5) + 0.5;
    st.zw = st.xy + 1.0;
    vec4 uv = st * texelSize.xyxy;
    vec4 a = texture2D(sam, uv.xy);
    vec4 b = texture2D(sam, uv.zy);
    vec4 c = texture2D(sam, uv.xw);
    vec4 d = texture2D(sam, uv.zw);
    vec2 f = p - st.xy;
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  void main () {
    vec2 coord = gl_FragCoord.xy - dt * texture2D(uVelocity, vUv).xy;
    gl_FragColor = dissipation * bilerp(uSource, coord);
    gl_FragColor.a = 1.0;
  }
`
      )
)
)};
const _1agalma = function _divergenceProgram(GLProgram,baseVertexShader,compileShader,gl){return(
new GLProgram(
  baseVertexShader,
  compileShader(
    gl.FRAGMENT_SHADER,
    `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  vec2 sampleVelocity (in vec2 uv) {
    vec2 multiplier = vec2(1.0, 1.0);
    if (uv.x < 0.0) { uv.x = 0.0; multiplier.x = -1.0; }
    if (uv.x > 1.0) { uv.x = 1.0; multiplier.x = -1.0; }
    if (uv.y < 0.0) { uv.y = 0.0; multiplier.y = -1.0; }
    if (uv.y > 1.0) { uv.y = 1.0; multiplier.y = -1.0; }
    return multiplier * texture2D(uVelocity, uv).xy;
  }
  void main () {
    float L = sampleVelocity(vL).x;
    float R = sampleVelocity(vR).x;
    float T = sampleVelocity(vT).y;
    float B = sampleVelocity(vB).y;
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`
  )
)
)};
const _yg1bei = function _curlProgram(GLProgram,baseVertexShader,compileShader,gl){return(
new GLProgram(
  baseVertexShader,
  compileShader(
    gl.FRAGMENT_SHADER,
    `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
  }
`
  )
)
)};
const _1ev4e3k = function _vorticityProgram(GLProgram,baseVertexShader,compileShader,gl){return(
new GLProgram(
  baseVertexShader,
  compileShader(
    gl.FRAGMENT_SHADER,
    `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  void main () {
    float L = texture2D(uCurl, vL).y;
    float R = texture2D(uCurl, vR).y;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = vec2(abs(T) - abs(B), abs(R) - abs(L));
    force *= 1.0 / length(force + 0.00001) * curl * C;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
  }
`
  )
)
)};
const _11s5qb5 = function _pressureProgram(GLProgram,baseVertexShader,compileShader,gl){return(
new GLProgram(
  baseVertexShader,
  compileShader(
    gl.FRAGMENT_SHADER,
    `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  vec2 boundary (in vec2 uv) {
    uv = min(max(uv, 0.0), 1.0);
    return uv;
  }
  void main () {
    float L = texture2D(uPressure, boundary(vL)).x;
    float R = texture2D(uPressure, boundary(vR)).x;
    float T = texture2D(uPressure, boundary(vT)).x;
    float B = texture2D(uPressure, boundary(vB)).x;
    float C = texture2D(uPressure, vUv).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`
  )
)
)};
const _edr7ka = function _gradienSubtractProgram(GLProgram,baseVertexShader,compileShader,gl){return(
new GLProgram(
  baseVertexShader,
  compileShader(
    gl.FRAGMENT_SHADER,
    `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  vec2 boundary (in vec2 uv) {
    uv = min(max(uv, 0.0), 1.0);
    return uv;
  }
  void main () {
    float L = texture2D(uPressure, boundary(vL)).x;
    float R = texture2D(uPressure, boundary(vR)).x;
    float T = texture2D(uPressure, boundary(vT)).x;
    float B = texture2D(uPressure, boundary(vB)).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`
  )
)
)};
const _15wvtqr = function _displayProgram(GLProgram,baseVertexShader,compileShader,gl){return(
new GLProgram(
  baseVertexShader,
  compileShader(
    gl.FRAGMENT_SHADER,
    `
  precision highp float;
  precision mediump sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  void main () {
    vec4 textureColor = texture2D(uTexture, vUv);
    gl_FragColor = vec4(1.0 - textureColor.r, 1.0 - textureColor.g,1.0 - textureColor.b,1.0);
  }
`
  )
)
)};
const _1p23az7 = function _splat(splatProgram,gl,velocity,canvas,blit,density,pressure){return(
function splat(x, y, dx, dy, color, p) {
  splatProgram.bind();
  gl.uniform1i(splatProgram.uniforms.uTarget, velocity.first[2]);
  gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
  gl.uniform2f(
    splatProgram.uniforms.point,
    x / canvas.width,
    1.0 - y / canvas.height
  );
  gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0);
  gl.uniform1f(splatProgram.uniforms.radius, 0.0001);
  blit(velocity.second[1]);
  velocity.swap();

  gl.uniform1i(splatProgram.uniforms.uTarget, density.first[2]);
  gl.uniform3f(
    splatProgram.uniforms.color,
    0.3 * (256 - color[0]),
    0.3 * (256 - color[1]),
    0.3 * (256 - color[2])
  );
  blit(density.second[1]);
  density.swap();

  gl.uniform1i(splatProgram.uniforms.uTarget, pressure.first[2]);
  gl.uniform3f(splatProgram.uniforms.color, p, p, p);
  blit(pressure.second[1]);
  pressure.swap();
}
)};
const _1ebnkp9 = function* _mainLoop(gl,textureWidth,textureHeight,$0,mouseSplat,advectionProgram,velocity,dt,velocityDissipation,blit,density,densityDissipation,curlProgram,curl,vorticityProgram,curlDegree,divergenceProgram,divergence,clearProgram,pressure,pressureProgram,gradienSubtractProgram,displayProgram)
{
  let i = 0;
  while (true) {
    gl.viewport(0, 0, textureWidth, textureHeight);

    if ($0.value) mouseSplat($0.value);

    advectionProgram.bind();
    gl.uniform2f(
      advectionProgram.uniforms.texelSize,
      1.0 / textureWidth,
      1.0 / textureHeight
    );
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.first[2]);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocity.first[2]);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, velocityDissipation);
    blit(velocity.second[1]);
    velocity.swap();

    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.first[2]);
    gl.uniform1i(advectionProgram.uniforms.uSource, density.first[2]);
    gl.uniform1f(advectionProgram.uniforms.dissipation, densityDissipation);
    blit(density.second[1]);
    density.swap();

    curlProgram.bind();
    gl.uniform2f(
      curlProgram.uniforms.texelSize,
      1.0 / textureWidth,
      1.0 / textureHeight
    );
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.first[2]);
    blit(curl[1]);

    vorticityProgram.bind();
    gl.uniform2f(
      vorticityProgram.uniforms.texelSize,
      1.0 / textureWidth,
      1.0 / textureHeight
    );
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.first[2]);
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl[2]);
    gl.uniform1f(vorticityProgram.uniforms.curl, curlDegree);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.second[1]);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(
      divergenceProgram.uniforms.texelSize,
      1.0 / textureWidth,
      1.0 / textureHeight
    );
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.first[2]);
    blit(divergence[1]);

    clearProgram.bind();

    let pressureTexId = pressure.first[2];
    gl.activeTexture(gl.TEXTURE0 + pressureTexId);
    gl.bindTexture(gl.TEXTURE_2D, pressure.first[0]);
    gl.uniform1i(clearProgram.uniforms.uTexture, pressureTexId);
    gl.uniform1f(clearProgram.uniforms.value, 0.8);
    blit(pressure.second[1]);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(
      pressureProgram.uniforms.texelSize,
      1.0 / textureWidth,
      1.0 / textureHeight
    );
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2]);
    pressureTexId = pressure.first[2];
    gl.uniform1i(pressureProgram.uniforms.uPressure, pressureTexId);
    gl.activeTexture(gl.TEXTURE0 + pressureTexId);
    for (let i = 0; i < 25; i++) {
      gl.bindTexture(gl.TEXTURE_2D, pressure.first[0]);
      blit(pressure.second[1]);
      pressure.swap();
    }

    gradienSubtractProgram.bind();
    gl.uniform2f(
      gradienSubtractProgram.uniforms.texelSize,
      1.0 / textureWidth,
      1.0 / textureHeight
    );
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.first[2]);
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.first[2]);
    blit(velocity.second[1]);
    velocity.swap();

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    displayProgram.bind();
    gl.uniform1i(displayProgram.uniforms.uTexture, density.first[2]);
    blit(null);

    yield ++i;
  }
};
const _1u110bc = function _43(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_wfxnwj", null, ["md"], _wfxnwj);  
  $def("_rtqazm", null, ["md"], _rtqazm);  
  $def("_fosw8y", "canvas", ["DOM","width","height","ink","mutable mouse"], _fosw8y);  
  $def("_cskxmi", "viewof height", ["Inputs"], _cskxmi);  
  $def("_ug2tnr", "height", ["Generators","viewof height"], _ug2tnr);  
  $def("_5w7acc", "viewof dt", ["Inputs"], _5w7acc);  
  $def("_gawsks", "dt", ["Generators","viewof dt"], _gawsks);  
  $def("_1ma4gk7", "viewof downsample", ["Inputs"], _1ma4gk7);  
  $def("_ooj57m", "downsample", ["Generators","viewof downsample"], _ooj57m);  
  $def("_1josd6t", "viewof densityDissipation", ["Inputs"], _1josd6t);  
  $def("_1430kb5", "densityDissipation", ["Generators","viewof densityDissipation"], _1430kb5);  
  $def("_1iuquwm", "viewof velocityDissipation", ["Inputs"], _1iuquwm);  
  $def("_9ajoki", "velocityDissipation", ["Generators","viewof velocityDissipation"], _9ajoki);  
  $def("_1yydp19", "viewof curlDegree", ["Inputs"], _1yydp19);  
  $def("_mags9e", "curlDegree", ["Generators","viewof curlDegree"], _mags9e);  
  $def("_37m0fk", "initial ink", [], _37m0fk);  
  $def("_1496ns", "mutable ink", ["Mutable","initial ink"], _1496ns);  
  $def("_1621n1d", "ink", ["mutable ink"], _1621n1d);  
  $def("_n9ueh4", "initial mouse", [], _n9ueh4);  
  $def("_gxpa4f", "mutable mouse", ["Mutable","initial mouse"], _gxpa4f);  
  $def("_jgexx6", "mouse", ["mutable mouse"], _jgexx6);  
  $def("_1hqgg22", "mouseSplat", ["ink","splat"], _1hqgg22);  
  $def("_xrryi1", "ctx", ["canvas","supportRenderTextureFormat"], _xrryi1);  
  $def("_1viy9kx", "gl", ["ctx"], _1viy9kx);  
  $def("_1ro1knt", "ext", ["ctx"], _1ro1knt);  
  $def("_1lwzpsd", "supportRenderTextureFormat", [], _1lwzpsd);  
  $def("_1y9lp25", "GLProgram", ["gl"], _1y9lp25);  
  $def("_5lysy1", "compileShader", ["gl"], _5lysy1);  
  $def("_46vbpo", "baseVertexShader", ["compileShader","gl"], _46vbpo);  
  $def("_1xbkunm", "createFBO", ["gl"], _1xbkunm);  
  $def("_gdjvj0", "createDoubleFBO", ["createFBO"], _gdjvj0);  
  $def("_2r955w", "textureWidth", ["gl","downsample"], _2r955w);  
  $def("_if4lon", "textureHeight", ["gl","downsample"], _if4lon);  
  $def("_1xrbkbl", null, ["md"], _1xrbkbl);  
  $def("_euywll", "density", ["createDoubleFBO","textureWidth","textureHeight","ext","gl"], _euywll);  
  $def("_336l3s", "velocity", ["createDoubleFBO","textureWidth","textureHeight","ext","gl"], _336l3s);  
  $def("_1pdijxe", "divergence", ["createFBO","textureWidth","textureHeight","ext","gl"], _1pdijxe);  
  $def("_1h381p7", "curl", ["createFBO","textureWidth","textureHeight","ext","gl"], _1h381p7);  
  $def("_1fuw0da", "pressure", ["createDoubleFBO","textureWidth","textureHeight","ext","gl"], _1fuw0da);  
  $def("_scv94v", "blit", ["gl"], _scv94v);  
  $def("_1dc8pz3", "clearProgram", ["GLProgram","baseVertexShader","compileShader","gl"], _1dc8pz3);  
  $def("_1qz8tr8", "splatProgram", ["GLProgram","baseVertexShader","compileShader","gl"], _1qz8tr8);  
  $def("_1n0tb1r", "advectionProgram", ["GLProgram","baseVertexShader","ext","compileShader","gl"], _1n0tb1r);  
  $def("_1agalma", "divergenceProgram", ["GLProgram","baseVertexShader","compileShader","gl"], _1agalma);  
  $def("_yg1bei", "curlProgram", ["GLProgram","baseVertexShader","compileShader","gl"], _yg1bei);  
  $def("_1ev4e3k", "vorticityProgram", ["GLProgram","baseVertexShader","compileShader","gl"], _1ev4e3k);  
  $def("_11s5qb5", "pressureProgram", ["GLProgram","baseVertexShader","compileShader","gl"], _11s5qb5);  
  $def("_edr7ka", "gradienSubtractProgram", ["GLProgram","baseVertexShader","compileShader","gl"], _edr7ka);  
  $def("_15wvtqr", "displayProgram", ["GLProgram","baseVertexShader","compileShader","gl"], _15wvtqr);  
  $def("_1p23az7", "splat", ["splatProgram","gl","velocity","canvas","blit","density","pressure"], _1p23az7);  
  $def("_1ebnkp9", "mainLoop", ["gl","textureWidth","textureHeight","mutable mouse","mouseSplat","advectionProgram","velocity","dt","velocityDissipation","blit","density","densityDissipation","curlProgram","curl","vorticityProgram","curlDegree","divergenceProgram","divergence","clearProgram","pressure","pressureProgram","gradienSubtractProgram","displayProgram"], _1ebnkp9);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_1u110bc", null, ["footer"], _1u110bc);
  return main;
}