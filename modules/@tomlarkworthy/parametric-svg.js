const _4uvzms = function _1(md,tex){return(
md`# Living SVG Templates

What happens when we blur the line between hand coded SVG and an interactive SVG authoring application? This notebook is an exploration of a space between, that marries the compactness and precision of code with the fluidity of the mouse to produce a workflow for producing high quality interactive SVG widgets.

We formulate an interactive SVG as a mapping from a control vector to an annoted rendered artifact

${ tex`R:\ \mathbb{R}^n \to \mathcal{S} \times \mathbb{R}^{2m}, \quad q \mapsto \bigl(s(q),\ a(q)\bigr)` }

where ${ tex`q \in \mathbb{R}^n` } is the parameter vector, ${ tex`s(q) \in \mathcal{S}` } is the rendered SVG, and ${ tex`a(q) = [a_1(q),\ldots,a_m(q)] \in \mathbb{R}^{2m}` } is the stacked 2-D anchor positions.

You write the just the **forward** direction in code, parameters → shape + anchors. A numerical solver figures out the **backward** direction automatically, how the movement of anchors affects the parameter updates, which in turn redraws the SVG.

Try the robot arm below — drag any joint or the end effector. **Shift+click** to lock an anchor in place. On a touchscreen, use **multi-touch** to drag several anchors simultaneously.`
)};
const _42rckw = function _anchor(){return(
(id, opts = {}) => {
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.classList.add('__anchor');
  c.dataset.anchorId = id;
  if (opts.kind != null)
    c.dataset.kind = opts.kind;
  if (opts.x != null)
    c.setAttribute('cx', opts.x);
  if (opts.y != null)
    c.setAttribute('cy', opts.y);
  c.setAttribute('r', '0.001');
  c.setAttribute('fill', 'none');
  c.style.pointerEvents = 'none';
  return c;
}
)};
const _1yqv8c5 = function _theta1(Inputs){return(
Inputs.range([
  -180,
  180
], {
  label: 'θ1 (base)',
  step: 1,
  value: 90
})
)};
const _3xd66j = (G, _) => G.input(_);
const _11rtwmp = function _theta2(Inputs){return(
Inputs.range([
  -180,
  180
], {
  label: 'θ2 (elbow)',
  step: 1,
  value: -45
})
)};
const _1ig5yha = (G, _) => G.input(_);
const _oe6tzf = function _theta3(Inputs){return(
Inputs.range([
  -180,
  180
], {
  label: 'θ3 (wrist)',
  step: 1,
  value: -60
})
)};
const _hsqtfd = (G, _) => G.input(_);
const _12r0it = function _robotArm(theta1,theta2,theta3,htl,anchor)
{
  const L1 = 100, L2 = 80, L3 = 60;
  const ox = 200, oy = 300;
  const r1 = theta1 * Math.PI / 180;
  const r2 = r1 + theta2 * Math.PI / 180;
  const r3 = r2 + theta3 * Math.PI / 180;
  const j1x = ox + L1 * Math.cos(r1);
  const j1y = oy - L1 * Math.sin(r1);
  const j2x = j1x + L2 * Math.cos(r2);
  const j2y = j1y - L2 * Math.sin(r2);
  const ex = j2x + L3 * Math.cos(r3);
  const ey = j2y - L3 * Math.sin(r3);
  return htl.svg`<svg width="400" height="400" viewBox="0 0 400 400" style="border-radius:8px; overflow:hidden;">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a1a2e"/>
        <stop offset="100%" stop-color="#16213e"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="75%" r="40%">
        <stop offset="0%" stop-color="#0f3460" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/>
      </filter>
    </defs>
    
    <rect width="400" height="400" fill="url(#bg)"/>
    <rect width="400" height="400" fill="url(#glow)"/>
    
    <!-- Grid dots -->
    ${ Array.from({ length: 20 }, (_, i) => Array.from({ length: 20 }, (_, j) => htl.svg`<circle cx="${ i * 20 + 10 }" cy="${ j * 20 + 10 }" r="0.5" fill="#ffffff" fill-opacity="0.1"/>`)).flat() }

    <!-- Angle arcs -->
    ${ [
    {
      cx: ox,
      cy: oy,
      r: 40,
      aStart: 0,
      aEnd: r1,
      theta: theta1,
      label: 'θ\u2081',
      color: '#e74c3c'
    },
    {
      cx: j1x,
      cy: j1y,
      r: 30,
      aStart: r1,
      aEnd: r2,
      theta: theta2,
      label: 'θ\u2082',
      color: '#f39c12'
    },
    {
      cx: j2x,
      cy: j2y,
      r: 24,
      aStart: r2,
      aEnd: r3,
      theta: theta3,
      label: 'θ\u2083',
      color: '#2ecc71'
    }
  ].map(({cx, cy, r, aStart, aEnd, theta, label, color}) => {
    const sx = cx + r * Math.cos(aStart);
    const sy = cy - r * Math.sin(aStart);
    const ax = cx + r * Math.cos(aEnd);
    const ay = cy - r * Math.sin(aEnd);
    const delta = aEnd - aStart;
    const sweep = delta > 0 ? 0 : 1;
    const large = Math.abs(delta) > Math.PI ? 1 : 0;
    const midA = (aStart + aEnd) / 2;
    const lr = r + 16;
    const lx = cx + lr * Math.cos(midA);
    const ly = cy - lr * Math.sin(midA);
    const refLen = r + 10;
    const rx = cx + refLen * Math.cos(aStart);
    const ry = cy - refLen * Math.sin(aStart);
    const endTickLen = 6;
    const tx1 = cx + (r - endTickLen / 2) * Math.cos(aEnd);
    const ty1 = cy - (r - endTickLen / 2) * Math.sin(aEnd);
    const tx2 = cx + (r + endTickLen / 2) * Math.cos(aEnd);
    const ty2 = cy - (r + endTickLen / 2) * Math.sin(aEnd);
    return htl.svg`<g style="pointer-events:none;">
            <line x1="${ cx }" y1="${ cy }" x2="${ rx }" y2="${ ry }" stroke="${ color }" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="2 3"/>
            <path d="M ${ sx } ${ sy } A ${ r } ${ r } 0 ${ large } ${ sweep } ${ ax } ${ ay }" fill="none" stroke="${ color }" stroke-opacity="0.75" stroke-width="1.4" stroke-dasharray="3 2.5" stroke-linecap="round"/>
            <line x1="${ tx1 }" y1="${ ty1 }" x2="${ tx2 }" y2="${ ty2 }" stroke="${ color }" stroke-opacity="0.85" stroke-width="1.25" stroke-linecap="round"/>
            <text x="${ lx }" y="${ ly }" fill="${ color }" font-size="11" font-family="ui-monospace, monospace" font-weight="600" text-anchor="middle" dominant-baseline="middle" paint-order="stroke" stroke="#0a1424" stroke-width="3" stroke-linejoin="round">${ label }=${ Math.round(theta) }°</text>
        </g>`;
  }) }

    <!-- Base mount (tapered) -->
    <path d="M ${ ox - 40 } ${ oy + 30 } L ${ ox - 22 } ${ oy - 1 } A 4 4 0 0 1 ${ ox - 18 } ${ oy - 5 } L ${ ox + 18 } ${ oy - 5 } A 4 4 0 0 1 ${ ox + 22 } ${ oy - 1 } L ${ ox + 40 } ${ oy + 30 } Z" fill="#2c3e50" stroke="#34495e" stroke-width="1.5" stroke-linejoin="round" filter="url(#shadow)"/>
    <line x1="${ ox - 28 }" y1="${ oy + 15 }" x2="${ ox + 28 }" y2="${ oy + 15 }" stroke="#1a2332" stroke-width="1" stroke-opacity="0.6"/>
    <circle cx="${ ox }" cy="${ oy }" r="12" fill="#34495e" stroke="#e74c3c" stroke-width="2.5" filter="url(#shadow)"/>
    
    <!-- Arm 1 (upper) -->
    <line x1="${ ox }" y1="${ oy }" x2="${ j1x }" y2="${ j1y }" stroke="#e74c3c" stroke-width="10" stroke-linecap="round" filter="url(#shadow)"/>
    <line x1="${ ox }" y1="${ oy }" x2="${ j1x }" y2="${ j1y }" stroke="#c0392b" stroke-width="6" stroke-linecap="round"/>
    
    <!-- Joint 1 (elbow) -->
    <circle cx="${ j1x }" cy="${ j1y }" r="9" fill="#2c3e50" stroke="#f39c12" stroke-width="2.5" filter="url(#shadow)"/>
    
    <!-- Arm 2 (forearm) -->
    <line x1="${ j1x }" y1="${ j1y }" x2="${ j2x }" y2="${ j2y }" stroke="#f39c12" stroke-width="8" stroke-linecap="round" filter="url(#shadow)"/>
    <line x1="${ j1x }" y1="${ j1y }" x2="${ j2x }" y2="${ j2y }" stroke="#e67e22" stroke-width="5" stroke-linecap="round"/>
    
    <!-- Joint 2 (wrist) -->
    <circle cx="${ j2x }" cy="${ j2y }" r="7" fill="#2c3e50" stroke="#2ecc71" stroke-width="2.5" filter="url(#shadow)"/>
    
    <!-- Arm 3 (hand) -->
    <line x1="${ j2x }" y1="${ j2y }" x2="${ ex }" y2="${ ey }" stroke="#2ecc71" stroke-width="6" stroke-linecap="round" filter="url(#shadow)"/>
    <line x1="${ j2x }" y1="${ j2y }" x2="${ ex }" y2="${ ey }" stroke="#27ae60" stroke-width="3.5" stroke-linecap="round"/>
    
    <!-- End effector -->
    <circle cx="${ ex }" cy="${ ey }" r="8" fill="#3498db" stroke="#fff" stroke-width="2.5" filter="url(#shadow)"/>
    <circle cx="${ ex }" cy="${ ey }" r="3" fill="#fff"/>
    
    <!-- Anchors -->
    ${ anchor('end-effector', {
    x: ex,
    y: ey
  }) }
    ${ anchor('elbow', {
    x: j1x,
    y: j1y
  }) }
    ${ anchor('wrist', {
    x: j2x,
    y: j2y
  }) }
  </svg>`;
};
const _1z0tw2c = function _7(svgEditor,parametricSVGEditorModule){return(
svgEditor({
  target: 'robotArm',
  module: parametricSVGEditorModule
})
)};
const _fmya46 = function _8(md){return(
md`### How the Inverse Kinematics works
The handwritten code contains reactive dependancies to upstream parameters. The reactive runtime will recompute the SVG when the parameters change, hence you can move the parameters directly and the SVG updates. When you drang an anchor, somehow the parameters change to try to mirror the movement in anchor space, that is inverse kinematics.

The code defines a function from parameter space to anchor space -- thats the forward dynamics. When we want go the other way, that is the inverse. To compute the inverse we exploit some of the features of the Observable Reactive Runtime dependancy graph. We extract the full function as a pure function of parameters to SVG, called the renderProbe, and then perform finite different in parameter space. 

The finite differents works by purturbing the n parameters and measuring the effect on the m parameters. This essentially differentiates all the n by the m, forming a rectangular matrix called the Jacobian, which is a linearization of the system at its current state. The Jacobian describes how movement of the parameters affects the anchors, and importantly, its a linear matrix which can be effeciently inverted with Linear Algebra. 

By inverting we can calculate the right mix of parameter changes to change the anchors to mirror a drag we might make. There are some more details, there might be more than one solution, so we add an error term to prefer solutions that minimize total parameter movements and that match the anchor change best. 
`
)};
const _fvrxem = function _9(md){return(
md`### Example 2: How parameterization affects inverse kinematics`
)};
const _1egnsh9 = function _aCx(Inputs){return(
Inputs.range([
  80,
  200
], {
  label: 'aCx (center x)',
  step: 1,
  value: 120
})
)};
const _1m2viru = (G, _) => G.input(_);
const _1h07ofk = function _aCy(Inputs){return(
Inputs.range([
  140,
  300
], {
  label: 'aCy (center y)',
  step: 1,
  value: 220
})
)};
const _1m2fexh = (G, _) => G.input(_);
const _11hd0zp = function _aSize(Inputs){return(
Inputs.range([
  40,
  80
], {
  label: 'aSize',
  step: 1,
  value: 70
})
)};
const _chhbnw = (G, _) => G.input(_);
const _1d3l6la = function _bX1(Inputs){return(
Inputs.range([
  240,
  340
], {
  label: 'bX1 (top-left x)',
  step: 1,
  value: 260
})
)};
const _1h9y2jr = (G, _) => G.input(_);
const _zepm9z = function _bY1(Inputs){return(
Inputs.range([
  110,
  240
], {
  label: 'bY1 (top-left y)',
  step: 1,
  value: 150
})
)};
const _1v09gwa = (G, _) => G.input(_);
const _8jku9i = function _bX2(Inputs){return(
Inputs.range([
  320,
  440
], {
  label: 'bX2 (bot-right x)',
  step: 1,
  value: 400
})
)};
const _1oqgtq2 = (G, _) => G.input(_);
const _pyzqil = function _bY2(Inputs){return(
Inputs.range([
  200,
  330
], {
  label: 'bY2 (bot-right y)',
  step: 1,
  value: 280
})
)};
const _1ejcd6f = (G, _) => G.input(_);
const _138qp1 = function _circleCx(Inputs){return(
Inputs.range([
  60,
  420
], {
  label: 'circleCx',
  step: 1,
  value: 240
})
)};
const _woge47 = (G, _) => G.input(_);
const _1qtl9fi = function _circleCy(Inputs){return(
Inputs.range([
  35,
  65
], {
  label: 'circleCy',
  step: 1,
  value: 50
})
)};
const _hzdbg = (G, _) => G.input(_);
const _cr8e2i = function _circleR(Inputs){return(
Inputs.range([
  10,
  30
], {
  label: 'circleR',
  step: 1,
  value: 20
})
)};
const _7bf5w0 = (G, _) => G.input(_);
const _3l4ock = function _mySvg(aCx,aSize,aCy,bX1,bX2,bY1,bY2,htl,anchor,circleCx,circleCy,circleR)
{
  const ax = aCx - aSize / 2, ay = aCy - aSize / 2;
  const bx = Math.min(bX1, bX2), by = Math.min(bY1, bY2);
  const bw = Math.abs(bX2 - bX1), bh = Math.abs(bY2 - bY1);
  const aEnv = {
    x: 40,
    y: 100,
    w: 200,
    h: 240
  };
  const bCorner1 = {
    x: 240,
    y: 110,
    w: 100,
    h: 130
  };
  const bCorner2 = {
    x: 320,
    y: 200,
    w: 120,
    h: 130
  };
  const cEnv = {
    x: 30,
    y: 5,
    w: 420,
    h: 90
  };
  return htl.svg`<svg width="480" height="360" viewBox="0 0 480 360" style="background:#fafafa; border:1px solid #ddd; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
  <defs>
    <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#eee" stroke-width="1"></path>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid2)"></rect>

  <line x1="240" y1="100" x2="240" y2="340" stroke="#999" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="2 4"></line>

  <rect x="${ aEnv.x }" y="${ aEnv.y }" width="${ aEnv.w }" height="${ aEnv.h }" fill="none" stroke="#2a6fdb" stroke-width="1" stroke-dasharray="3 3" stroke-opacity="0.5"></rect>
  <text x="${ aEnv.x + 6 }" y="${ aEnv.y + 14 }" font-size="10" fill="#2a6fdb" opacity="0.75">center+size bounds</text>

  <rect x="${ ax }" y="${ ay }" width="${ aSize }" height="${ aSize }" fill="#2a6fdb" fill-opacity="0.28" stroke="#1d4fa3" stroke-width="2"></rect>

  <line x1="${ aCx - 6 }" y1="${ aCy }" x2="${ aCx + 6 }" y2="${ aCy }" stroke="#1d4fa3" stroke-width="1"></line>
  <line x1="${ aCx }" y1="${ aCy - 6 }" x2="${ aCx }" y2="${ aCy + 6 }" stroke="#1d4fa3" stroke-width="1"></line>

  <text x="${ aCx + 12 }" y="${ aCy - 8 }" font-size="10" fill="#1d4fa3">(aCx=${ aCx }, aCy=${ aCy })</text>

  <line x1="${ ax }" y1="${ ay + aSize + 10 }" x2="${ ax + aSize }" y2="${ ay + aSize + 10 }" stroke="#1d4fa3" stroke-width="1" stroke-opacity="0.7"></line>
  <line x1="${ ax }" y1="${ ay + aSize + 7 }" x2="${ ax }" y2="${ ay + aSize + 13 }" stroke="#1d4fa3" stroke-width="1" stroke-opacity="0.7"></line>
  <line x1="${ ax + aSize }" y1="${ ay + aSize + 7 }" x2="${ ax + aSize }" y2="${ ay + aSize + 13 }" stroke="#1d4fa3" stroke-width="1" stroke-opacity="0.7"></line>
  <text x="${ aCx }" y="${ ay + aSize + 23 }" font-size="10" fill="#1d4fa3" text-anchor="middle">aSize=${ aSize }</text>

  ${ anchor('sqA-center', {
    x: aCx,
    y: aCy
  }) }
  ${ anchor('sqA-corner', {
    x: aCx + aSize / 2,
    y: aCy + aSize / 2
  }) }

  <rect x="${ bCorner1.x }" y="${ bCorner1.y }" width="${ bCorner1.w }" height="${ bCorner1.h }" fill="none" stroke="#e8893a" stroke-width="1" stroke-dasharray="3 3" stroke-opacity="0.55"></rect>
  <rect x="${ bCorner2.x }" y="${ bCorner2.y }" width="${ bCorner2.w }" height="${ bCorner2.h }" fill="none" stroke="#e8893a" stroke-width="1" stroke-dasharray="3 3" stroke-opacity="0.55"></rect>
  <text x="${ bCorner1.x + 6 }" y="${ bCorner1.y + 14 }" font-size="10" fill="#b35f11" opacity="0.8">(bX1,bY1) range</text>
  <text x="${ bCorner2.x + bCorner2.w - 6 }" y="${ bCorner2.y + bCorner2.h - 8 }" font-size="10" fill="#b35f11" opacity="0.8" text-anchor="end">(bX2,bY2) range</text>

  <rect x="${ bx }" y="${ by }" width="${ bw }" height="${ bh }" fill="#f28e2b" fill-opacity="0.28" stroke="#b35f11" stroke-width="2"></rect>

  <text x="${ bX1 - 6 }" y="${ bY1 - 7 }" font-size="10" fill="#b35f11" text-anchor="end">(${ bX1 }, ${ bY1 })</text>
  <text x="${ bX2 + 8 }" y="${ bY2 + 14 }" font-size="10" fill="#b35f11">(${ bX2 }, ${ bY2 })</text>

  ${ anchor('sqB-1', {
    x: bX1,
    y: bY1
  }) }
  ${ anchor('sqB-2', {
    x: bX2,
    y: bY2
  }) }

  <rect x="${ cEnv.x }" y="${ cEnv.y }" width="${ cEnv.w }" height="${ cEnv.h }" fill="none" stroke="#59a14f" stroke-width="1" stroke-dasharray="3 3" stroke-opacity="0.5"></rect>
  <text x="${ cEnv.x + 6 }" y="${ cEnv.y + 12 }" font-size="10" fill="#2f6b29" opacity="0.75">center+radius bounds</text>

  <circle cx="${ circleCx }" cy="${ circleCy }" r="${ circleR }" fill="#59a14f" fill-opacity="0.30" stroke="#2f6b29" stroke-width="2"></circle>

  ${ anchor('circle-c', {
    x: circleCx,
    y: circleCy
  }) }
  ${ anchor('circle-rE', {
    x: circleCx + circleR,
    y: circleCy
  }) }
  ${ anchor('circle-rS', {
    x: circleCx,
    y: circleCy + circleR
  }) }
</svg>`;
};
const _1eq061g = function _21(svgEditor,parametricSVGEditorModule){return(
svgEditor({
  target: 'mySvg',
  module: parametricSVGEditorModule
})
)};
const _17rihsi = function _22(md){return(
md`Parameters can affect geometry and anchors can hang off geometry. There are often multiple choices to parameterization. For example, a rectangle could be defined by a center + extents, or by two corners. How the geometry is parameterized, even if it has the same overall expressivity, has an effect on how the inverse kinematics maps anchor movements back to parameter space. I initially thought this was a bug, but once you are used to it it is a useful degree of artistic freedom allowing some control over the kinematic solver.

In the above example notice how different the two rectangles behave when their anchors are dragged.

Parameters can also have their own min/max bounds, which the solver respects.`
)};
const _yuv4z3 = function _23(md){return(
md`## How the svgEditor discovers and manipulates parameters

One part of the magic is how the kinematic solver can map anchor movements back to parameter space. But how does the editor know what the paramemter space is, it is not configured by the programmer.

When the \`svgEditor\` is instanciated, it is passed a reference to the target cell to bring to life.

\`\`\`js
    svgEditor({     target: 'mySvg',     module: parametricSVGEditorModule }) 
\`\`\`

With the *Observable Runtime*, all cells participate on a reactive computation graph. From the cell reference, the svgEditor finds upstream cells that are value generators, i.e. \\\`viewof\\\` cells, typically used for UI for parameters.

viewof cells can be changed programatically, and that is how the \`svgEditor\` is able to both find parameters feeding the cell, and change them when inteterpreting anchor movements.`
)};
const _1jtqw73 = function _bezierProse(md){return(
md`### Example 3: Bézier Curve — Drag-on-Curve Editing

Anchors can be placed programatically, and there are no rules to placement, but if they are derived from geometry, then they will always end up manipulating geometry.

In this example we allow a variable amount of anchors to be evenly spaced along a Bézier curve, you can now manipulate the curve by dragging it, no complex math involved! Try pinning anchors (SHIFT + CLICK) or using multi-touch! The solver does the heavy lifting and you simply have to choose where the anchors are placed.

Through a combination of fixing parts in place, you can incrementally work a Bézier curve into a complex shape with a degree of finesse I have not been able to do with control points alone.`
)};
const _1wvdm5d = function _vector(Event){return(
function vector(extent = [
  0,
  1
], {label = '', step, value, dimensions = 3, height = 120, variate = false} = {}) {
  const [min, max] = extent;
  if (step === undefined)
    step = max - min <= 2 ? 0.01 : 1;
  const mid = (min + max) / 2;
  let dims = Array.isArray(value) ? value.slice() : Array.from({ length: dimensions }, () => mid);
  let columns;
  const makeCol = (v, i) => {
    const range = Object.assign(document.createElement('input'), {
      type: 'range',
      min,
      max,
      step,
      value: v,
      style: 'writing-mode:vertical-lr; direction:rtl; height:' + height + 'px; width:16px; margin:0; cursor:pointer;'
    });
    const num = Object.assign(document.createElement('input'), {
      type: 'number',
      min,
      max,
      step,
      value: v,
      style: 'width:42px; font:11px/1.2 var(--sans-serif,system-ui); text-align:center; border:1px solid #ccc; border-radius:3px; padding:1px 2px; font-variant-numeric:tabular-nums;'
    });
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font:11px/1 var(--sans-serif,system-ui); color:#666;';
    lbl.textContent = String(i);
    range.oninput = () => {
      num.value = range.value;
      col.dispatchEvent(new Event('input', { bubbles: true }));
    };
    num.oninput = () => {
      range.value = num.value;
      col.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const col = document.createElement('div');
    col.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:2px;';
    col.appendChild(lbl);
    col.appendChild(range);
    col.appendChild(num);
    Object.defineProperty(col, 'value', {
      get: () => +range.value,
      set: v => {
        range.value = v;
        num.value = v;
      }
    });
    return col;
  };
  function build() {
    columns = dims.map((v, i) => makeCol(v, i));
    const sliderRow = document.createElement('div');
    sliderRow.style.cssText = 'display:flex; gap:4px; align-items:flex-start;';
    columns.forEach(c => sliderRow.appendChild(c));
    let btns = null;
    if (variate) {
      const addBtn = document.createElement('button');
      addBtn.style.cssText = 'font:11px/1 var(--sans-serif); padding:2px 6px; cursor:pointer; border:1px solid #ccc; border-radius:3px; background:#fff;';
      addBtn.textContent = '+';
      const removeBtn = document.createElement('button');
      removeBtn.style.cssText = 'font:11px/1 var(--sans-serif); padding:2px 6px; cursor:pointer; border:1px solid #ccc; border-radius:3px; background:#fff;';
      removeBtn.textContent = '\u2212';
      addBtn.onclick = () => {
        dims.push(mid);
        rebuild();
      };
      removeBtn.onclick = () => {
        if (dims.length > 1) {
          dims.pop();
          rebuild();
        }
      };
      btns = document.createElement('div');
      btns.style.cssText = 'display:flex; gap:3px; margin-top:4px;';
      btns.appendChild(addBtn);
      btns.appendChild(removeBtn);
    }
    return {
      sliderRow,
      btns
    };
  }
  const form = document.createElement('form');
  form.style.cssText = 'font:13px/1.2 var(--sans-serif,system-ui); margin:0;';
  if (label) {
    const lbl = document.createElement('label');
    lbl.style.cssText = 'display:block; font-weight:700; font-size:0.75rem; margin-bottom:2px;';
    lbl.textContent = label;
    form.appendChild(lbl);
  }
  form.addEventListener('submit', e => e.preventDefault());
  Object.defineProperty(form, 'value', {
    get: () => dims,
    set: vals => {
      if (Array.isArray(vals)) {
        if (vals.length !== dims.length) {
          dims = vals.slice();
          rebuild();
        } else {
          vals.forEach((v, i) => {
            if (columns[i])
              columns[i].value = v;
          });
          dims = columns.map(c => c.value);
        }
      }
    }
  });
  form.addEventListener('input', () => {
    dims = columns.map(c => c.value);
  });
  function rebuild() {
    const val = dims.slice();
    const {sliderRow, btns} = build();
    const labelEl = form.querySelector('label');
    while (form.lastChild && form.lastChild !== labelEl)
      form.removeChild(form.lastChild);
    form.appendChild(sliderRow);
    if (btns)
      form.appendChild(btns);
    columns.forEach((c, i) => {
      if (val[i] != null)
        c.value = val[i];
    });
    dims = columns.map(c => c.value);
    form.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const {sliderRow, btns} = build();
  form.appendChild(sliderRow);
  if (btns)
    form.appendChild(btns);
  return form;
}
)};
const _mvq0hr = function _bezierSamples(Inputs){return(
Inputs.range([
  2,
  50
], {
  label: 'samples',
  step: 1,
  value: 10
})
)};
const _15z6cd8 = (G, _) => G.input(_);
const _j6jh4p = function _bezierPts(vector){return(
vector([
  0,
  400
], {
  label: 'control points (x\u2080 y\u2080 x\u2081 y\u2081 x\u2082 y\u2082 x\u2083 y\u2083)',
  step: 1,
  value: [
    50,
    300,
    80,
    80,
    320,
    80,
    350,
    300
  ],
  dimensions: 8
})
)};
const _164jo1i = (G, _) => G.input(_);
const _1scrabk = function _bezierSvg(bezierPts,bezierSamples,htl,anchor)
{
  const b = (t, p0, p1, p2, p3) => {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };
  const [p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y] = bezierPts;
  const samples = Array.from({ length: bezierSamples }, (_, i) => (i + 1) / (bezierSamples + 1));
  const onCurve = samples.map(t => ({
    x: b(t, p0x, p1x, p2x, p3x),
    y: b(t, p0y, p1y, p2y, p3y),
    t
  }));
  return htl.svg`<svg width="400" height="400" viewBox="0 0 400 400" style="border-radius:8px; overflow:hidden;">
    <defs>
      <linearGradient id="bz-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0d1117"/>
        <stop offset="100%" stop-color="#161b22"/>
      </linearGradient>
      <filter id="bz-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <rect width="400" height="400" fill="url(#bz-bg)"/>

    <polyline points="${ p0x },${ p0y } ${ p1x },${ p1y } ${ p2x },${ p2y } ${ p3x },${ p3y }"
      fill="none" stroke="#58a6ff" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>

    <path d="M ${ p0x },${ p0y } C ${ p1x },${ p1y } ${ p2x },${ p2y } ${ p3x },${ p3y }"
      fill="none" stroke="#f778ba" stroke-width="3" filter="url(#bz-glow)"/>

    <circle cx="${ p0x }" cy="${ p0y }" r="5" fill="#58a6ff" opacity="0.7"/>
    <circle cx="${ p1x }" cy="${ p1y }" r="4" fill="#58a6ff" opacity="0.5" stroke="#58a6ff" stroke-width="1" stroke-dasharray="2 2"/>
    <circle cx="${ p2x }" cy="${ p2y }" r="4" fill="#58a6ff" opacity="0.5" stroke="#58a6ff" stroke-width="1" stroke-dasharray="2 2"/>
    <circle cx="${ p3x }" cy="${ p3y }" r="5" fill="#58a6ff" opacity="0.7"/>

    ${ onCurve.map(p => anchor(`curve-${ p.t }`, {
    x: p.x,
    y: p.y
  })) }
    ${ anchor('cp-p0', {
    x: p0x,
    y: p0y
  }) }
    ${ anchor('cp-p1', {
    x: p1x,
    y: p1y
  }) }
    ${ anchor('cp-p2', {
    x: p2x,
    y: p2y
  }) }
    ${ anchor('cp-p3', {
    x: p3x,
    y: p3y
  }) }
  </svg>`;
};
const _l2g7e7 = function _bezierEditor(svgEditor,parametricSVGEditorModule){return(
svgEditor({
  target: 'bezierSvg',
  module: parametricSVGEditorModule
})
)};
const _3wt318 = function _treeProse(md){return(
md`### Example 4: Tree — Variate Parameters

The \`vector\` input supports **variate** mode: the **+** and **−** buttons dynamically add or remove dimensions. Here, each dimension controls the **branching depth**.

Press **+** underneath the sliders to add tree depth. As the number of anchors grow exponentially. Its a good test of computational scalability. My mac starts to get jerky at 5, which is driven by the cost of the rendering the svg template to derive the Jacobian.

Its ok to have extra anchors, anchors can drive visuals and non-geometric effects too.`
)};
const _k9161g = function _31()
{
};
const _8iy367 = function _branchAngles(vector){return(
vector([
  5,
  80
], {
  variate: true,
  value: [
    35,
    30,
    25
  ],
  label: 'branch angle per depth',
  step: 0.01
})
)};
const _11pakqo = (G, _) => G.input(_);
const _zwojll = function _trunkLength(Inputs){return(
Inputs.range([
  20,
  160
], {
  label: 'trunkLength',
  step: 1,
  value: 80
})
)};
const _s9t678 = (G, _) => G.input(_);
const _qq4uj6 = function _lengthDecay(Inputs){return(
Inputs.range([
  0.3,
  2
], {
  label: 'lengthDecay',
  step: 0.01,
  value: 0.65
})
)};
const _cwmic4 = (G, _) => G.input(_);
const _1aurib9 = function _branchThickness(Inputs){return(
Inputs.range([
  1.1,
  49.9
], {
  label: 'branchThickness',
  step: 0.5,
  value: 3
})
)};
const _1ia8f5o = (G, _) => G.input(_);
const _1ipxkga = function _treeSvg(branchAngles,lengthDecay,trunkLength,branchThickness,htl,anchor)
{
  const w = 400, h = 400;
  const angles = branchAngles;
  const maxDepth = angles.length;
  const decay = lengthDecay;
  const trunk = trunkLength;
  const thick = branchThickness;
  const t = Math.min(1, Math.max(0, (thick - 1) / 49));
  const lerp = (a, b) => a + (b - a) * t;
  const rgb = (c1, c2) => `rgb(${ Math.round(lerp(c1[0], c2[0])) },${ Math.round(lerp(c1[1], c2[1])) },${ Math.round(lerp(c1[2], c2[2])) })`;
  const skyTop = rgb([
    135,
    206,
    235
  ], [
    6,
    8,
    28
  ]);
  const skyMid = rgb([
    195,
    225,
    245
  ], [
    20,
    26,
    60
  ]);
  const skyBot = rgb([
    235,
    245,
    255
  ], [
    42,
    48,
    92
  ]);
  const ground = rgb([
    74,
    48,
    32
  ], [
    14,
    10,
    22
  ]);
  const trunkCol = rgb([
    58,
    37,
    21
  ], [
    22,
    14,
    26
  ]);
  const leafCol = rgb([
    102,
    176,
    68
  ], [
    38,
    72,
    60
  ]);
  const tipCol = rgb([
    123,
    196,
    88
  ], [
    58,
    112,
    84
  ]);
  const horizon = h - 35;
  const arcCx = w / 2;
  const arcCy = horizon;
  const arcR = w * 0.42;
  const sunAngle = Math.PI / 2 + t * Math.PI;
  const moonAngle = sunAngle + Math.PI;
  const sunX = arcCx - arcR * Math.cos(sunAngle);
  const sunY = arcCy - arcR * Math.sin(sunAngle);
  const moonX = arcCx - arcR * Math.cos(moonAngle);
  const moonY = arcCy - arcR * Math.sin(moonAngle);
  const moonOp = t.toFixed(3);
  const stars = Array.from({ length: 45 }, (_, i) => {
    const x = (i * 53 + 17) % w;
    const y = (i * 29 + 7) % (h - 80);
    const r = 0.4 + i * 7 % 3 * 0.35;
    const tw = 0.55 + i * 11 % 5 * 0.09;
    return {
      x,
      y,
      r,
      tw
    };
  });
  const segments = [];
  const tips = [];
  const joints = [];
  function branch(x, y, angle, depth, len) {
    const rad = angle * Math.PI / 180;
    const x2 = x + Math.cos(rad) * len;
    const y2 = y - Math.sin(rad) * len;
    const sw = Math.max(0.5, thick * Math.pow(decay, depth));
    segments.push({
      x1: x,
      y1: y,
      x2,
      y2,
      sw
    });
    if (depth >= maxDepth) {
      tips.push({
        x: x2,
        y: y2,
        i: tips.length
      });
      return;
    }
    joints.push({
      x: x2,
      y: y2,
      i: joints.length
    });
    const a = angles[depth];
    branch(x2, y2, angle + a, depth + 1, len * decay);
    branch(x2, y2, angle - a, depth + 1, len * decay);
  }
  const baseX = w / 2, baseY = h - 30;
  branch(baseX, baseY, 90, 0, trunk);
  const thickAnchorX = baseX + thick * 3;
  const thickAnchorY = baseY;
  return htl.svg`<svg width="${ w }" height="${ h }" viewBox="0 0 ${ w } ${ h }" style="border-radius:8px; overflow:hidden;">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${ skyTop }"/>
        <stop offset="60%" stop-color="${ skyMid }"/>
        <stop offset="100%" stop-color="${ skyBot }"/>
      </linearGradient>
      <radialGradient id="sunglow">
        <stop offset="0%" stop-color="#fff6c0" stop-opacity="0.9"/>
        <stop offset="40%" stop-color="#ffcc55" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
      <clipPath id="skyclip">
        <rect width="${ w }" height="${ horizon }"/>
      </clipPath>
    </defs>
    <rect width="${ w }" height="${ h }" fill="url(#sky)"/>
    ${ stars.map(s => htl.svg`<circle cx="${ s.x }" cy="${ s.y }" r="${ s.r }" fill="#fff" opacity="${ (moonOp * s.tw).toFixed(3) }"/>`) }
    <g clip-path="url(#skyclip)">
      <circle cx="${ sunX }" cy="${ sunY }" r="80" fill="url(#sunglow)"/>
      <circle cx="${ sunX }" cy="${ sunY }" r="16" fill="#fff8d0"/>
      <circle cx="${ moonX }" cy="${ moonY }" r="18" fill="#f4f4ff"/>
      <circle cx="${ moonX + 6 }" cy="${ moonY - 3 }" r="15" fill="${ skyTop }"/>
    </g>
    <rect x="0" y="${ horizon }" width="${ w }" height="${ h - horizon }" fill="${ ground }"/>
    ${ segments.map(s => htl.svg`<line x1="${ s.x1 }" y1="${ s.y1 }" x2="${ s.x2 }" y2="${ s.y2 }" stroke="${ trunkCol }" stroke-width="${ s.sw }" stroke-linecap="round"/>`) }
    ${ joints.map(j => htl.svg`<circle cx="${ j.x }" cy="${ j.y }" r="3" fill="${ leafCol }" opacity="0.6"/>`) }
    ${ tips.map(tp => htl.svg`<circle cx="${ tp.x }" cy="${ tp.y }" r="4" fill="${ tipCol }" opacity="0.85"/>`) }
    <line x1="${ baseX }" y1="${ baseY }" x2="${ thickAnchorX }" y2="${ thickAnchorY }" stroke="#a86" stroke-width="1" stroke-dasharray="3,3" opacity="0.4"/>
    <circle cx="${ thickAnchorX }" cy="${ thickAnchorY }" r="4" fill="#c96" opacity="0.7"/>
    ${ joints.map(j => anchor(`joint-${ j.i }`, {
    x: j.x,
    y: j.y
  })) }
    ${ tips.map(tp => anchor(`tip-${ tp.i }`, {
    x: tp.x,
    y: tp.y
  })) }
    ${ anchor('thickness', {
    x: thickAnchorX,
    y: thickAnchorY
  }) }
    ${ anchor('sun', {
    x: sunX,
    y: sunY
  }) }
    ${ anchor('moon', {
    x: moonX,
    y: moonY
  }) }
  </svg>`;
};
const _1wuq7ru = function _treeEditor(svgEditor,parametricSVGEditorModule){return(
svgEditor({
  target: 'treeSvg',
  module: parametricSVGEditorModule
})
)};
const _fzs368 = function _treeKKTProse(md,tex){return(
md`#### Behind the scenes: **Karush–Kuhn–Tucker** hard-lock solver

This example is only usable because of a change to how the solver treats **locked anchors** (shift+click on a joint).

In an earlier version the locks were a **soft penalty**: every lock contributed two rows to the least-squares system with a large weight (20×). When you dragged a leaf, the solver would compromise, letting the lock drift slightly *and* under-shooting the drag target, because pure vertical leaf motion wasn't fully achievable while approximately keeping the lock. The drag felt sticky, and parameters below the lock (like the deepest branch angle) barely moved.

The new solver treats locks as a **hard equality constraint**. Drags and other soft targets go into ${ tex`A\delta p \approx b` }; every lock row goes into ${ tex`C\delta p = 0` }. The combined problem

${ tex.block`\min_{\delta p}\|A\delta p - b\|^2 + \lambda\|\delta p\|^2 \quad \text{s.t.}\quad C\delta p = 0` }

is solved in one step by the **KKT system**

${ tex.block`\begin{bmatrix}H + \lambda I & C^\top \\ C & 0\end{bmatrix}\begin{bmatrix}\delta p \\ \mu\end{bmatrix} = \begin{bmatrix}A^\top b \\ 0\end{bmatrix}` }

where ${ tex`H = A^\top A` } and ${ tex`\mu` } are the Lagrange multipliers — the "forces" needed to keep the locks pinned. The solver finds the smallest ${ tex`\delta p` } that satisfies the locks *exactly* and fits the drag as well as the remaining subspace allows.

Concretely: fix a joint mid-tree and drag a deep leaf. The upper branch angles are frozen by the constraint (they'd move the locked joint), so the solver burns down through the remaining DOF — the angles *below* the lock — to bring the leaf toward your cursor.`
)};
const _1aubbgi = function _fourBarProse(md){return(
md`### Example 5: Four-Bar Linkage — Rotary Motion

A classic mechanical linkage: two fixed ground pivots (**A**, **D**), a driving crank (red), a coupler bar (blue), and an output rocker (green). The purple point **P** rides on the coupler.

The forward kinematics compute joint positions from just two parameters: \`crankAngle\` and \`groundWidth\`. Drag any joint — the solver adjusts these parameters to match. Lock **D** and drag **B** to sweep the crank. Lock **B** and drag **C** — the solver finds the crank angle that puts the rocker where you want it.`
)};
const _74tudw = function _crankAngle(Inputs){return(
Inputs.range([
  -3600,
  3600
], {
  label: 'crankAngle',
  step: 1,
  value: 45
})
)};
const _73s2iy = (G, _) => G.input(_);
const _29bydr = function _groundWidth(Inputs){return(
Inputs.range([
  120,
  300
], {
  label: 'groundWidth',
  step: 1,
  value: 200
})
)};
const _dx8ifz = (G, _) => G.input(_);
const _px8l2u = function _fourBarLinkage(groundWidth,crankAngle,htl,anchor)
{
  const L1 = 80;
  // crank
  const L2 = 160;
  // coupler
  const L3 = 120;
  // rocker
  const ax = 100, ay = 250;
  // fixed pivot A
  const dx = ax + groundWidth, dy = 250;
  // fixed pivot D
  const rad = crankAngle * Math.PI / 180;
  const bx = ax + L1 * Math.cos(rad);
  const by = ay - L1 * Math.sin(rad);
  // Circle-circle intersection to find C
  const bdx = dx - bx, bdy = dy - by;
  const dist = Math.sqrt(bdx * bdx + bdy * bdy);
  const d = Math.min(dist, L2 + L3 - 0.1);
  const ux = bdx / (dist || 1), uy = bdy / (dist || 1);
  const a2 = (L2 * L2 - L3 * L3 + d * d) / (2 * d);
  const h2 = L2 * L2 - a2 * a2;
  const h = Math.sqrt(Math.max(0, h2));
  const mx = bx + ux * a2, my = by + uy * a2;
  const cx = mx + -uy * h, cy = my + ux * h;
  // Coupler point P
  const px = (bx + cx) / 2 + -(cy - by) * 0.3;
  const py = (by + cy) / 2 + (cx - bx) * 0.3;
  return htl.svg`<svg width="400" height="400" viewBox="0 0 400 400" style="border-radius:8px; overflow:hidden;">
    <defs>
      <linearGradient id="linkBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a1a2e"/>
        <stop offset="100%" stop-color="#16213e"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#linkBg)"/>
    
    <!-- Ground line -->
    <line x1="${ ax - 20 }" y1="${ ay + 15 }" x2="${ dx + 20 }" y2="${ dy + 15 }" stroke="#555" stroke-width="2" stroke-dasharray="6,3"/>
    ${ Array.from({ length: Math.ceil((groundWidth + 40) / 12) }, (_, i) => {
    const gx = ax - 20 + i * 12;
    return htl.svg`<line x1="${ gx }" y1="${ ay + 15 }" x2="${ gx - 8 }" y2="${ ay + 25 }" stroke="#555" stroke-width="1"/>`;
  }) }
    
    <!-- Ground pivots -->
    <circle cx="${ ax }" cy="${ ay }" r="8" fill="#2c3e50" stroke="#95a5a6" stroke-width="2"/>
    <circle cx="${ dx }" cy="${ dy }" r="8" fill="#2c3e50" stroke="#95a5a6" stroke-width="2"/>
    <text x="${ ax }" y="${ ay + 35 }" text-anchor="middle" fill="#95a5a6" font-size="12">A</text>
    <text x="${ dx }" y="${ dy + 35 }" text-anchor="middle" fill="#95a5a6" font-size="12">D</text>
    
    <!-- Crank AB -->
    <line x1="${ ax }" y1="${ ay }" x2="${ bx }" y2="${ by }" stroke="#e74c3c" stroke-width="6" stroke-linecap="round"/>
    <!-- Coupler BC -->
    <line x1="${ bx }" y1="${ by }" x2="${ cx }" y2="${ cy }" stroke="#3498db" stroke-width="6" stroke-linecap="round"/>
    <!-- Rocker CD -->
    <line x1="${ cx }" y1="${ cy }" x2="${ dx }" y2="${ dy }" stroke="#2ecc71" stroke-width="6" stroke-linecap="round"/>
    
    <!-- Coupler triangle to P -->
    <line x1="${ bx }" y1="${ by }" x2="${ px }" y2="${ py }" stroke="#3498db" stroke-width="2" stroke-dasharray="4,3"/>
    <line x1="${ cx }" y1="${ cy }" x2="${ px }" y2="${ py }" stroke="#3498db" stroke-width="2" stroke-dasharray="4,3"/>
    
    <!-- Joint circles -->
    <circle cx="${ bx }" cy="${ by }" r="6" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
    <circle cx="${ cx }" cy="${ cy }" r="6" fill="#2ecc71" stroke="#27ae60" stroke-width="2"/>
    <circle cx="${ px }" cy="${ py }" r="5" fill="#9b59b6" stroke="#8e44ad" stroke-width="2"/>
    
    <!-- Labels -->
    <text x="${ bx + 10 }" y="${ by - 10 }" fill="#e74c3c" font-size="12" font-weight="bold">B</text>
    <text x="${ cx + 10 }" y="${ cy - 10 }" fill="#2ecc71" font-size="12" font-weight="bold">C</text>
    <text x="${ px + 10 }" y="${ py - 10 }" fill="#9b59b6" font-size="12" font-weight="bold">P</text>
    
    <!-- Anchors (use x/y not cx/cy) -->
    ${ anchor('B', {
    x: bx,
    y: by
  }) }
    ${ anchor('C', {
    x: cx,
    y: cy
  }) }
    ${ anchor('P', {
    x: px,
    y: py
  }) }
    ${ anchor('D', {
    x: dx,
    y: dy
  }) }
  </svg>`;
};
const _1czrhce = function _fourBarEditor(svgEditor,parametricSVGEditorModule){return(
svgEditor({
  target: 'fourBarLinkage',
  module: parametricSVGEditorModule
})
)};
const _rdlwyg = function _44(md){return(
md`## Background

This approach draws on three traditions:

- **Sketchpad** (Sutherland, 1963) — established direct manipulation of constrained, parameterized graphics.
- **Jacobian-based inverse kinematics** (Buss, 2004) — finite-difference Jacobians + normal equations for mapping geometry changes back to parameters.
- **Sketch-n-Sketch** (Chugh et al., 2016) — output-directed programming, bidirectional editing between code and SVG.

\`svgEditor\` combines the numerical IK approach with Observable's reactive runtime: any cell producing SVG becomes directly manipulable.`
)};
const _1o5dq5 = function _45(md){return(
md`## Templating`
)};
const _oujfvl = function _svgEditor(cloneDataflow,svgEditor_template,Event){return(
(opts = {}) => {
  const {
    target,
    module = null,
    autoDispose = false,
    invalidation: callerInvalidation = null,
    ...extraArgs
  } = opts;
  let dispose = null;
  let settled = false;
  const p = new Promise((resolve, reject) => {
    try {
      dispose = cloneDataflow(svgEditor_template, name => {
        if (name === 'viewof svgTargetName') {
          return {
            fulfilled: el => {
              try {
                el.value = target;
                el.dispatchEvent(new Event('input', { bubbles: true }));
              } catch {
              }
            }
          };
        }
        if (name === 'viewof svgTargetModule') {
          return {
            fulfilled: el => {
              try {
                if (module != null) {
                  el.value = module;
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                }
              } catch {
              }
            }
          };
        }
        if (name === 'viewof svgEditorArgs') {
          return {
            fulfilled: el => {
              try {
                el.value = {
                  invalidation: callerInvalidation,
                  ...extraArgs
                };
                el.dispatchEvent(new Event('input', { bubbles: true }));
              } catch {
              }
            }
          };
        }
        if (name === 'svgEditorController') {
          return {
            fulfilled: v => {
              if (settled)
                return;
              settled = true;
              resolve(v);
            },
            error: e => {
              if (settled)
                return;
              settled = true;
              reject(e);
            }
          };
        }
        return null;
      });
      if (callerInvalidation) {
        Promise.resolve(callerInvalidation).then(() => {
          try {
            dispose?.();
          } finally {
            dispose = null;
          }
        });
      }
    } catch (e) {
      settled = true;
      reject(e);
    }
  });
  p.dispose = () => {
    try {
      dispose?.();
    } finally {
      dispose = null;
    }
  };
  return p;
}
)};
const _1jm6gd7 = function _svgEditor_template(lookupVariable,parametricSVGEditorModule){return(
lookupVariable(
  [
    "viewof svgTargetName",
    "svgTargetName",
    "viewof svgTargetModule",
    "svgTargetModule",
    "viewof svgEditorArgs",
    "svgEditorArgs",
    "svgTemplateVariable",
    "svgRenderDefinition",
    "svgInputNames",
    "svgParameterViews",
    "svgParameterNames",
    "svgParameterViewByName",
    "svgParameterVarByName",
    "svgParameterViewElByName",
    "resolveSvgRenderArgs",
    "renderProbe",
    "viewof inverseConfig",
    "inverseConfig",
    "pseudoInverseStepMxN",
    "viewof svgEditorStatus",
    "svgEditorStatus",
    "svgEditor_setStatus",
    "getCurrentParams",
    "svgEditor_commitParams",
    "svgEditorController",
    "anchor"
  ],
  parametricSVGEditorModule
)
)};
const _1xvm7s5 = function _svgTemplateVariable(lookupVariable,svgTargetName,svgTargetModule){return(
lookupVariable(svgTargetName, svgTargetModule)
)};
const _1pklbvm = function _svgRenderDefinition(svgTemplateVariable){return(
svgTemplateVariable._definition
)};
const _1n4g802 = function _svgInputNames(svgTemplateVariable){return(
(svgTemplateVariable?._inputs ?? []).map(d => d?._name).filter(Boolean)
)};
const _s0of79 = function _svgParameterNames(svgParameterViews)
{
  const raw = svgParameterViews.map(v => v._name.slice('viewof '.length));
  const flat = [];
  for (const name of raw) {
    const view = svgParameterViews.find(v => v._name === 'viewof ' + name);
    const val = view?._value?.value;
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++)
        flat.push(`${ name }:${ i }`);
    } else {
      flat.push(name);
    }
  }
  return flat;
};
const _15if1ue = function _svgParameterViewByName(svgParameterNames,svgParameterViews){return(
new Map(svgParameterNames.map((n, i) => [
  n,
  svgParameterViews[i]
]))
)};
const _pnltr3 = function _svgParameterVarByName(svgTemplateVariable,svgParameterNames)
{
  const m = svgTemplateVariable?._module;
  const entries = svgParameterNames.map(name => {
    const ci = name.lastIndexOf(':');
    if (ci > 0 && !isNaN(+name.slice(ci + 1))) {
      const baseName = name.slice(0, ci);
      return [
        name,
        m._scope.get(`viewof ${ baseName }`)
      ];
    }
    return [
      name,
      m._scope.get(`viewof ${ name }`)
    ];
  });
  return new Map(entries);
};
const _p4f9sn = async function _svgParameterViewElByName(svgParameterNames,svgParameterVarByName)
{
  const resolveVarValue = async v => {
    if (!v)
      return undefined;
    if (v._value !== undefined)
      return v._value;
    if (v._promise && typeof v._promise.then === 'function') {
      try {
        const r = await v._promise;
        return r !== undefined ? r : v._value;
      } catch {
        return v._value;
      }
    }
    return v._value;
  };
  const entries = [];
  for (const name of svgParameterNames) {
    const v = svgParameterVarByName.get(name);
    entries.push([
      name,
      await resolveVarValue(v)
    ]);
  }
  return new Map(entries);
};
const _ows4y8 = function _svgParameterViews(svgTemplateVariable){return(
svgTemplateVariable._inputs.flatMap(v => {
  const holder = 'viewof ' + v._name;
  if (v._module._scope.has(holder)) {
    return [v._module._scope.get(holder)];
  } else
    return [];
})
)};
const _m2bixk = function _resolveSvgRenderArgs(svgTemplateVariable,svgInputNames)
{
  return async (overrides = {}) => {
    const m = svgTemplateVariable._module;
    const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    // Unflatten compound overrides (bezierX:0 -> bezierX[0])
    const unflat = {};
    for (const [k, v] of Object.entries(overrides)) {
      const ci = k.lastIndexOf(':');
      if (ci > 0 && !isNaN(+k.slice(ci + 1))) {
        const baseName = k.slice(0, ci);
        const idx = +k.slice(ci + 1);
        if (!unflat[baseName])
          unflat[baseName] = null;
        // mark for unflattening
        if (!Array.isArray(unflat[baseName])) {
          // Get current array value as base
          const baseVar = m._scope.get(baseName) ?? m._runtime?._builtin?._scope?.get?.(baseName);
          const baseVal = baseVar?._value;
          unflat[baseName] = Array.isArray(baseVal) ? baseVal.slice() : [];
        }
        unflat[baseName][idx] = v;
      } else {
        unflat[k] = v;
      }
    }
    const merged = { ...unflat };
    const resolveName = name => {
      if (hasOwn(merged, name))
        return merged[name];
      const v = m._scope.get(name) ?? m._runtime?._builtin?._scope?.get?.(name);
      if (v && v._value !== undefined)
        return v._value;
      if (v && v._promise && typeof v._promise.then === 'function')
        return v._promise;
      const g = m._runtime?._global?.(name);
      if (g !== undefined)
        return g;
      throw new Error(`cannot resolve dependency "${ name }"`);
    };
    const values = [];
    for (const name of svgInputNames)
      values.push(await resolveName(name));
    return values;
  };
};
const _1b9quok = function _renderProbe(resolveSvgRenderArgs,svgTemplateVariable)
{
  const probe = async (paramsByName = {}) => {
    const args = await resolveSvgRenderArgs(paramsByName);
    return svgTemplateVariable._definition(...args);
  };
  return probe;
};
const _1uoqxo5 = function _svgPointFromClient(){return(
(svgEl, clientX, clientY, invScreenCTM = null) => {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  let inv = invScreenCTM;
  if (!inv) {
    const ctm = svgEl.getScreenCTM?.();
    if (!ctm)
      return {
        x: 0,
        y: 0
      };
    inv = ctm.inverse();
  }
  const p = pt.matrixTransform(inv);
  return {
    x: p.x,
    y: p.y
  };
}
)};
const _13rrcm9 = function _rectAnchors(){return(
svgEl => {
  const rect = svgEl.querySelector('rect');
  if (!rect)
    return [];
  const b = rect.getBBox();
  const x0 = b.x, y0 = b.y, x1 = b.x + b.width, y1 = b.y + b.height;
  return [
    {
      id: 'rect0-nw',
      x: x0,
      y: y0,
      kind: 'corner'
    },
    {
      id: 'rect0-ne',
      x: x1,
      y: y0,
      kind: 'corner'
    },
    {
      id: 'rect0-se',
      x: x1,
      y: y1,
      kind: 'corner'
    },
    {
      id: 'rect0-sw',
      x: x0,
      y: y1,
      kind: 'corner'
    }
  ];
}
)};
const _1wzvplf = function _rectAnchorsStable(){return(
svgEl => {
  const markers = svgEl?.querySelectorAll?.('.__anchor');
  if (markers && markers.length > 0) {
    return Array.from(markers).map(el => ({
      id: el.dataset.anchorId,
      x: +el.getAttribute('cx'),
      y: +el.getAttribute('cy'),
      kind: el.dataset.kind || 'point'
    }));
  }
  return [];
}
)};
const _qi8jfq = function _pickAnchor(){return(
(anchors, p, radius = 10) => {
  let best = null;
  let bestD2 = radius * radius;
  for (const a of anchors) {
    const dx = p.x - a.x, dy = p.y - a.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) {
      bestD2 = d2;
      best = a;
    }
  }
  return best;
}
)};
const _in6c8b = function _pseudoInverseStepMxN(inverseConfig){return(
(A, b, opts = {}) => {
  const m = Array.isArray(A) ? A.length : 0;
  const n = m ? A[0]?.length ?? 0 : 0;
  if (!m || !n)
    return new Array(n).fill(0);
  if (!Array.isArray(b) || b.length !== m)
    return new Array(n).fill(0);
  const method = opts.method ?? inverseConfig.method;
  const damping = Number.isFinite(+opts.damping) ? +opts.damping : +inverseConfig.damping;
  const alpha = Number.isFinite(+opts.alpha) ? +opts.alpha : +inverseConfig.alpha;
  const l1Weight = Number.isFinite(+opts.l1Weight) ? +opts.l1Weight : +inverseConfig.l1Weight;
  const dotCol = (i, vec) => {
    let s = 0;
    for (let r = 0; r < m; r++) {
      const ari = +A[r][i];
      const vr = +vec[r];
      if (Number.isFinite(ari) && Number.isFinite(vr))
        s += ari * vr;
    }
    return s;
  };
  const colNorm2 = i => {
    let s = 0;
    for (let r = 0; r < m; r++) {
      const ari = +A[r][i];
      if (Number.isFinite(ari))
        s += ari * ari;
    }
    return s;
  };
  const solveGaussian = (M, y) => {
    const nn = M.length;
    const a = M.map(row => row.slice());
    const b2 = y.slice();
    for (let k = 0; k < nn; k++) {
      let piv = k;
      let best = Math.abs(a[k][k]);
      for (let i = k + 1; i < nn; i++) {
        const v = Math.abs(a[i][k]);
        if (v > best) {
          best = v;
          piv = i;
        }
      }
      if (!Number.isFinite(best) || best < 1e-24)
        return null;
      if (piv !== k) {
        [a[k], a[piv]] = [
          a[piv],
          a[k]
        ];
        [b2[k], b2[piv]] = [
          b2[piv],
          b2[k]
        ];
      }
      const akk = a[k][k];
      for (let i = k + 1; i < nn; i++) {
        const f = a[i][k] / akk;
        if (!Number.isFinite(f))
          return null;
        b2[i] -= f * b2[k];
        for (let j = k; j < nn; j++)
          a[i][j] -= f * a[k][j];
      }
    }
    const x = new Array(nn).fill(0);
    for (let i = nn - 1; i >= 0; i--) {
      let s = b2[i];
      for (let j = i + 1; j < nn; j++)
        s -= a[i][j] * x[j];
      const aii = a[i][i];
      if (!Number.isFinite(aii) || Math.abs(aii) < 1e-24)
        return null;
      x[i] = s / aii;
      if (!Number.isFinite(x[i]))
        return null;
    }
    return x;
  };
  const Atb = new Array(n).fill(0);
  const AtA = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let r = 0; r < m; r++) {
    const br = +b[r];
    if (!Number.isFinite(br))
      continue;
    const row = A[r];
    for (let i = 0; i < n; i++) {
      const ari = +row[i];
      if (!Number.isFinite(ari))
        continue;
      Atb[i] += ari * br;
      for (let j = i; j < n; j++) {
        const arj = +row[j];
        if (!Number.isFinite(arj))
          continue;
        AtA[i][j] += ari * arj;
      }
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < i; j++)
      AtA[i][j] = AtA[j][i];
  if (method === 'Jacobian transpose') {
    const dp = new Array(n);
    for (let i = 0; i < n; i++)
      dp[i] = alpha * (+Atb[i] || 0);
    return dp;
  }
  const residualNorm = x => {
    let s2 = 0;
    for (let r = 0; r < m; r++) {
      let pr = 0;
      const row = A[r];
      for (let i = 0; i < n; i++)
        pr += (+row[i] || 0) * (+x[i] || 0);
      const dr = pr - (+b[r] || 0);
      s2 += dr * dr;
    }
    return Math.sqrt(s2);
  };
  const sparse1 = () => {
    let best = null;
    const lam = Math.max(0, l1Weight);
    const damp = Math.max(damping, 1e-15);
    for (let i = 0; i < n; i++) {
      const denom = colNorm2(i) + damp;
      if (!(denom > 0) || !Number.isFinite(denom))
        continue;
      const num = dotCol(i, b);
      const x = num / denom;
      if (!Number.isFinite(x))
        continue;
      let s2 = 0;
      for (let r = 0; r < m; r++) {
        const ari = +A[r][i];
        const dr = (Number.isFinite(ari) ? ari * x : 0) - (+b[r] || 0);
        s2 += dr * dr;
      }
      const residual = Math.sqrt(s2);
      const cost = residual + lam * Math.abs(x);
      if (!best || cost < best.cost)
        best = {
          i,
          x,
          cost
        };
    }
    const dp = new Array(n).fill(0);
    if (best)
      dp[best.i] = best.x;
    return dp;
  };
  const sparse2 = () => {
    const lam = Math.max(0, l1Weight);
    const damp = Math.max(damping, 1e-15);
    let best = null;
    for (let i = 0; i < n; i++) {
      const c00 = colNorm2(i) + damp;
      if (!(c00 > 0) || !Number.isFinite(c00))
        continue;
      const d0 = dotCol(i, b);
      for (let j = i + 1; j < n; j++) {
        const c11 = colNorm2(j) + damp;
        if (!(c11 > 0) || !Number.isFinite(c11))
          continue;
        let c01 = 0;
        for (let r = 0; r < m; r++) {
          const ai = +A[r][i], aj = +A[r][j];
          if (Number.isFinite(ai) && Number.isFinite(aj))
            c01 += ai * aj;
        }
        const d1 = dotCol(j, b);
        const det = c00 * c11 - c01 * c01;
        if (!Number.isFinite(det) || Math.abs(det) < 1e-24)
          continue;
        const x0 = (d0 * c11 - c01 * d1) / det;
        const x1 = (c00 * d1 - d0 * c01) / det;
        if (!Number.isFinite(x0) || !Number.isFinite(x1))
          continue;
        let s2 = 0;
        for (let r = 0; r < m; r++) {
          const ai = +A[r][i], aj = +A[r][j];
          const pr = (Number.isFinite(ai) ? ai * x0 : 0) + (Number.isFinite(aj) ? aj * x1 : 0);
          const dr = pr - (+b[r] || 0);
          s2 += dr * dr;
        }
        const residual = Math.sqrt(s2);
        const cost = residual + lam * (Math.abs(x0) + Math.abs(x1));
        if (!best || cost < best.cost)
          best = {
            i,
            j,
            x0,
            x1,
            cost
          };
      }
    }
    if (!best)
      return sparse1();
    const dp = new Array(n).fill(0);
    dp[best.i] = best.x0;
    dp[best.j] = best.x1;
    return dp;
  };
  if (method === 'Sparse (1 param)')
    return sparse1();
  if (method === 'Sparse (2 params)')
    return sparse2();
  const tr = AtA.reduce((s, row, i) => s + (+row[i] || 0), 0);
  const lambda = Math.max(damping, 1e-15) * ((Number.isFinite(tr) ? tr : 0) + 1);
  for (let i = 0; i < n; i++)
    AtA[i][i] += lambda;
  const dp = solveGaussian(AtA, Atb);
  if (dp)
    return dp;
  return new Array(n).fill(0);
}
)};
const _1exsn58 = function _63(svgEditorStatus){return(
svgEditorStatus
)};
const _1izbfy1 = function _getCurrentParams(svgParameterViewElByName,svgParameterNames)
{
  const viewElMap = svgParameterViewElByName;
  return () => {
    const p = {};
    for (const name of svgParameterNames) {
      const view = viewElMap.get(name);
      if (!view)
        continue;
      const ci = name.lastIndexOf(':');
      if (ci > 0 && !isNaN(+name.slice(ci + 1))) {
        const idx = +name.slice(ci + 1);
        const arr = view.value;
        p[name] = Array.isArray(arr) ? +arr[idx] : +view.value;
      } else {
        const v = +view.value;
        p[name] = Number.isFinite(v) ? v : view.value;
      }
    }
    return p;
  };
};
const _h6x759 = function _svgEditor_setStatus(Event){return(
(statusTarget, patch) => {
  const current = statusTarget?.value || {};
  statusTarget.value = {
    ...current,
    ...patch,
    t: Date.now()
  };
  statusTarget.dispatchEvent(new Event('input', { bubbles: true }));
}
)};
const _gl4xy8 = function _svgEditor_getSvgNumericWidthHeight(){return(
svg => {
  const num = (animatedLength, attr) => {
    const v = animatedLength?.baseVal?.value;
    if (Number.isFinite(v))
      return v;
    const a = attr == null ? NaN : +attr;
    return Number.isFinite(a) ? a : NaN;
  };
  let w = num(svg?.width, svg?.getAttribute?.('width'));
  let h = num(svg?.height, svg?.getAttribute?.('height'));
  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    const vb = (svg?.getAttribute?.('viewBox') || '').trim();
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        w = parts[2];
        h = parts[3];
      }
    }
  }
  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    try {
      const r = svg?.getBoundingClientRect?.();
      if (r && r.width > 0 && r.height > 0)
        return {
          w: r.width,
          h: r.height
        };
    } catch {
    }
  }
  return {
    w: Number.isFinite(w) ? w : 0,
    h: Number.isFinite(h) ? h : 0
  };
}
)};
const _72xg9t = function _svgEditor_createOverlay(){return(
htl => htl.svg`<svg style="
    position:fixed;
    left:0; top:0;
    z-index:2147483647;
    overflow:visible;
    touch-action:none;
    pointer-events:none;
    display:none;
  "></svg>`
)};
const _8w4dic = function _svgEditor_setOverlayVisible(){return(
(overlay, visible) => {
  if (!overlay)
    return;
  overlay.style.display = visible ? 'block' : 'none';
  overlay.style.pointerEvents = visible ? 'auto' : 'none';
}
)};
const _psap3x = function _svgEditor_syncOverlayToTarget(svgEditor_getSvgNumericWidthHeight){return(
(overlay, target) => {
  if (!overlay || !target)
    return null;
  let rect;
  try {
    rect = target.getBoundingClientRect();
  } catch {
    rect = null;
  }
  if (!rect || !(rect.width > 0) || !(rect.height > 0))
    return null;
  overlay.style.left = `${ rect.left }px`;
  overlay.style.top = `${ rect.top }px`;
  overlay.style.width = `${ rect.width }px`;
  overlay.style.height = `${ rect.height }px`;
  overlay.setAttribute('width', rect.width);
  overlay.setAttribute('height', rect.height);
  const vb = target.getAttribute?.('viewBox');
  if (vb)
    overlay.setAttribute('viewBox', vb);
  else {
    const {w, h} = svgEditor_getSvgNumericWidthHeight(target);
    overlay.setAttribute('viewBox', `0 0 ${ w } ${ h }`);
  }
  return rect;
}
)};
const _1gplv37 = function _svgEditor_clearOverlay(){return(
overlay => {
  if (!overlay)
    return;
  while (overlay.firstChild)
    overlay.removeChild(overlay.firstChild);
}
)};
const _1so0muw = function _svgEditor_drawOverlay(svgEditor_clearOverlay){return(
(overlay, {anchors = [], hoverId = null, lockedIds = null, show = false, handleRadius = 12} = {}) => {
  if (!overlay)
    return;
  if (!show) {
    svgEditor_clearOverlay(overlay);
    return;
  }
  svgEditor_clearOverlay(overlay);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  overlay.appendChild(g);
  for (const a of anchors) {
    const active = hoverId && a.id === hoverId;
    const locked = lockedIds?.has?.(a.id);
    if (a.kind === 'handle') {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', a.x);
      c.setAttribute('cy', a.y);
      c.setAttribute('r', handleRadius);
      c.setAttribute('fill', 'transparent');
      c.setAttribute('stroke', active ? '#fa4' : 'transparent');
      c.setAttribute('stroke-width', active ? '2' : '0');
      c.setAttribute('stroke-dasharray', '3,3');
      c.style.pointerEvents = 'all';
      c.style.cursor = 'cell';
      c.dataset.anchorId = a.id;
      g.appendChild(c);
      continue;
    }
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', a.x);
    c.setAttribute('cy', a.y);
    c.setAttribute('r', handleRadius);
    c.setAttribute('fill', locked ? '#ffd700' : active ? 'white' : '#eef');
    c.setAttribute('stroke', locked ? '#b8860b' : active ? 'red' : '#333');
    c.setAttribute('stroke-width', locked || active ? '2' : '1');
    c.style.pointerEvents = 'all';
    c.style.cursor = locked ? 'pointer' : a.kind === 'center' ? 'move' : a.kind === 'radius' ? 'ew-resize' : 'nwse-resize';
    c.dataset.anchorId = a.id;
    g.appendChild(c);
    if (locked) {
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      inner.setAttribute('cx', a.x);
      inner.setAttribute('cy', a.y);
      inner.setAttribute('r', handleRadius * 0.4);
      inner.setAttribute('fill', '#b8860b');
      inner.style.pointerEvents = 'none';
      g.appendChild(inner);
    }
  }
}
)};
const _vnp9gy = function _svgEditor_computeOverTarget(){return(
(rect, clientX, clientY) => {
  if (!rect)
    return false;
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}
)};
const _1wtvo8y = function _svgEditor_clampToView(){return(
(view, value) => {
  const input = view?.querySelector?.('input[type="range"], input[type="number"]');
  if (!input)
    return value;
  const min = input.min !== '' ? +input.min : -Infinity;
  const max = input.max !== '' ? +input.max : Infinity;
  if (Number.isFinite(min))
    value = Math.max(min, value);
  if (Number.isFinite(max))
    value = Math.min(max, value);
  return value;
}
)};
const _a0xnw7 = function _svgEditor_commitParams(svgEditor_clampToView,Event){return(
(params, viewElByName) => {
  const arrayUpdates = new Map();
  const scalarUpdates = {};
  for (const [name, val] of Object.entries(params || {})) {
    const ci = name.lastIndexOf(':');
    if (ci > 0 && !isNaN(+name.slice(ci + 1))) {
      const baseName = name.slice(0, ci);
      if (viewElByName.has(name)) {
        if (!arrayUpdates.has(baseName))
          arrayUpdates.set(baseName, []);
        arrayUpdates.get(baseName).push([
          +name.slice(ci + 1),
          val
        ]);
        continue;
      }
    }
    scalarUpdates[name] = val;
  }
  for (const [name, val] of Object.entries(scalarUpdates)) {
    const view = viewElByName.get(name);
    if (!view)
      continue;
    const clamped = svgEditor_clampToView(view, val);
    view.value = clamped;
    view.dispatchEvent(new Event('input', { bubbles: true }));
  }
  for (const [baseName, entries] of arrayUpdates) {
    const view = viewElByName.get(`${ baseName }:0`);
    if (!view)
      continue;
    const current = Array.isArray(view.value) ? view.value.slice() : [];
    for (const [idx, val] of entries) {
      if (idx < current.length) {
        current[idx] = svgEditor_clampToView(view, val);
      }
    }
    view.value = current;
    view.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
)};
const _1al84jc = function _svgEditor_anchorFromSvgById(){return(
(svgEl, anchorsFn, anchorId) => {
  const anchors = anchorsFn(svgEl);
  const a = anchors.find(d => d.id === anchorId);
  return a ? [
    a.x,
    a.y
  ] : null;
}
)};
const _1qicecz = function _svgEditor_estimateJacobianForAnchor(svgEditor_anchorFromSvgById){return(
async ({anchorId, p0, renderProbe, paramNames, anchorsFn}) => {
  const baseSvg = await renderProbe(p0);
  const a0 = svgEditor_anchorFromSvgById(baseSvg, anchorsFn, anchorId);
  if (!a0)
    return null;
  const names = paramNames.slice();
  const n = names.length;
  const J = [
    new Array(n).fill(0),
    new Array(n).fill(0)
  ];
  for (let i = 0; i < n; i++) {
    const name = names[i];
    const v = +p0[name];
    if (!Number.isFinite(v))
      continue;
    const eps = Math.max(Math.abs(v) * 0.000001, 0.000001);
    const p1 = {
      ...p0,
      [name]: v + eps
    };
    const svg1 = await renderProbe(p1);
    const a1 = svgEditor_anchorFromSvgById(svg1, anchorsFn, anchorId);
    if (!a1)
      continue;
    J[0][i] = (a1[0] - a0[0]) / eps;
    J[1][i] = (a1[1] - a0[1]) / eps;
  }
  return {
    names,
    J,
    a0
  };
}
)};
const _1rvpchm = function _svgEditorController(svgEditor_setStatus,$0,svgEditorArgs,svgEditor_createOverlay,htl,pseudoInverseStepMxN,svgParameterViews,rectAnchorsStable,svgPointFromClient,svgEditor_estimateJacobianForAnchor,renderProbe,constraintsFromSvg,svgEditor_estimateJacobianForConstraint,Event,svgEditor_drawOverlay,inverseConfig,svgEditor_commitParams,pickAnchor,svgEditor_setOverlayVisible,svgTemplateVariable,svgEditor_computeOverTarget,svgEditor_syncOverlayToTarget,svgEditor_clearOverlay,invalidation)
{
  const state = this ?? {};
  const setStatus = (patch) =>
    svgEditor_setStatus($0, patch);
  const editorMode = svgEditorArgs?.mode ?? "solve";
  const callerInvalidation = svgEditorArgs?.invalidation;
  const ensureOverlay = () => {
    if (state.overlay) return;
    state.overlay = svgEditor_createOverlay(htl);
    document.body.appendChild(state.overlay);
    state.lastTarget = null;
    state.anchors = [];
    state.hover = null;
    state.drags = new Map();
    state.lockedAnchors = new Map();
    state.gestureBaseParams = null;
    state.overTarget = false;
    state.targetRect = null;
    state.rebasing = false;
    state.growPreview = null;
    const LOCK_WEIGHT = 20;
    const __solveKKT = (A, b, C, damping, d) => {
      const m = A.length;
      const n = m ? A[0].length : C[0]?.length ?? 0;
      const k = C.length;
      if (!n) return [];
      if (!k) return pseudoInverseStepMxN(A, b);
      const dRhs = Array.isArray(d) ? d : new Array(k).fill(0);
      const H = Array.from({ length: n }, () => new Array(n).fill(0));
      const cVec = new Array(n).fill(0);
      for (let r = 0; r < m; r++) {
        const br = +b[r];
        for (let i = 0; i < n; i++) {
          const ari = +A[r][i];
          if (!Number.isFinite(ari)) continue;
          if (Number.isFinite(br)) cVec[i] += ari * br;
          for (let j = i; j < n; j++) {
            const arj = +A[r][j];
            if (Number.isFinite(arj)) H[i][j] += ari * arj;
          }
        }
      }
      const lam = Math.max(+damping || 0, 1e-12);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) H[i][j] = H[j][i];
        H[i][i] += lam;
      }
      const N = n + k;
      const M = Array.from({ length: N }, () => new Array(N).fill(0));
      const y = new Array(N).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) M[i][j] = H[i][j];
        y[i] = cVec[i];
      }
      for (let j = 0; j < k; j++) {
        for (let i = 0; i < n; i++) {
          const cij = +C[j][i];
          if (Number.isFinite(cij)) {
            M[i][n + j] = cij;
            M[n + j][i] = cij;
          }
        }
        y[n + j] = +dRhs[j] || 0;
      }
      const M2 = M.map((row) => row.slice());
      const y2 = y.slice();
      for (let p = 0; p < N; p++) {
        let piv = p,
          best = Math.abs(M2[p][p]);
        for (let i = p + 1; i < N; i++) {
          const v = Math.abs(M2[i][p]);
          if (v > best) {
            best = v;
            piv = i;
          }
        }
        if (!Number.isFinite(best) || best < 1e-15) {
          const A_full = [...A, ...C.map((r) => r.map((v) => v * LOCK_WEIGHT))];
          const b_full = [...b, ...new Array(k).fill(0)];
          return pseudoInverseStepMxN(A_full, b_full);
        }
        if (piv !== p) {
          [M2[p], M2[piv]] = [M2[piv], M2[p]];
          [y2[p], y2[piv]] = [y2[piv], y2[p]];
        }
        const app = M2[p][p];
        for (let i = p + 1; i < N; i++) {
          const f = M2[i][p] / app;
          if (!Number.isFinite(f)) continue;
          y2[i] -= f * y2[p];
          for (let j = p; j < N; j++) M2[i][j] -= f * M2[p][j];
        }
      }
      const x = new Array(N).fill(0);
      for (let i = N - 1; i >= 0; i--) {
        let s = y2[i];
        for (let j = i + 1; j < N; j++) s -= M2[i][j] * x[j];
        const aii = M2[i][i];
        if (!Number.isFinite(aii) || Math.abs(aii) < 1e-24)
          return new Array(n).fill(0);
        x[i] = s / aii;
      }
      return x.slice(0, n);
    };
    const __liveParamNames = () => {
      const flat = [];
      for (const v of svgParameterViews) {
        const base = v._name.slice("viewof ".length);
        const val = v?._value?.value;
        if (Array.isArray(val)) {
          for (let i = 0; i < val.length; i++) flat.push(`${base}:${i}`);
        } else {
          flat.push(base);
        }
      }
      return flat;
    };
    const __liveViewElByName = () => {
      const map = new Map();
      for (const v of svgParameterViews) {
        const base = v._name.slice("viewof ".length);
        const val = v?._value?.value;
        const el = v?._value;
        if (Array.isArray(val)) {
          for (let i = 0; i < val.length; i++) map.set(`${base}:${i}`, el);
        } else {
          map.set(base, el);
        }
      }
      return map;
    };
    let svgParameterNames = __liveParamNames();
    let svgParameterViewElByName = __liveViewElByName();
    const __refreshLive = () => {
      svgParameterNames = __liveParamNames();
      svgParameterViewElByName = __liveViewElByName();
    };
    let getCurrentParams = () => {
      const p = {};
      for (const name of svgParameterNames) {
        const view = svgParameterViewElByName.get(name);
        if (!view) continue;
        const ci = name.lastIndexOf(":");
        if (ci > 0 && !isNaN(+name.slice(ci + 1))) {
          const idx = +name.slice(ci + 1);
          const arr = view.value;
          p[name] = Array.isArray(arr) ? +arr[idx] : +view.value;
        } else {
          const v = +view.value;
          p[name] = Number.isFinite(v) ? v : view.value;
        }
      }
      return p;
    };
    const getLockedIdSet = () => new Set(state.lockedAnchors.keys());
    const refreshAnchorsFromTarget = (target) => {
      state.anchors = rectAnchorsStable(target);
      const hoverId = state.hover?.id;
      state.hover = hoverId
        ? state.anchors.find((a) => a.id === hoverId) ?? null
        : state.hover;
    };
    const getInvScreenCTM = (overlay) => {
      try {
        const ctm = overlay.getScreenCTM?.();
        return ctm ? ctm.inverse() : null;
      } catch {
        return null;
      }
    };
    const overlayAnchorsWithActivePointerPositions = () => {
      if (!state.drags.size) return state.anchors;
      const overlay = state.overlay;
      const byId = new Map(state.anchors.map((a) => [a.id, { ...a }]));
      for (const d of state.drags.values()) {
        const lc = d.lastClient ?? d.startClient;
        const pNow = svgPointFromClient(overlay, lc.x, lc.y, d.invScreenCTM);
        const a = byId.get(d.anchorId);
        if (a) {
          a.x = pNow.x;
          a.y = pNow.y;
        }
      }
      return Array.from(byId.values());
    };
    const rebaseAllDrags = async (newBaseParams) => {
      const overlay = state.overlay;
      const inv = getInvScreenCTM(overlay);
      if (state.drags.size) {
        const entries = Array.from(state.drags.entries());
        const nextDrags = new Map(state.drags);
        for (const [pid, d] of entries) {
          const lastClient = d.lastClient ?? d.startClient;
          const startPointer = svgPointFromClient(
            overlay,
            lastClient.x,
            lastClient.y,
            inv
          );
          const jacobian = await svgEditor_estimateJacobianForAnchor({
            anchorId: d.anchorId,
            p0: newBaseParams,
            renderProbe,
            paramNames: svgParameterNames,
            anchorsFn: rectAnchorsStable
          });
          if (!jacobian) continue;
          nextDrags.set(pid, {
            ...d,
            startClient: { ...lastClient },
            startPointer,
            startParams: newBaseParams,
            jacobian,
            invScreenCTM: inv
          });
        }
        state.drags = nextDrags;
      }
      for (const [lockId, lockData] of state.lockedAnchors) {
        const jacobian = await svgEditor_estimateJacobianForAnchor({
          anchorId: lockId,
          p0: newBaseParams,
          renderProbe,
          paramNames: svgParameterNames,
          anchorsFn: rectAnchorsStable
        });
        if (jacobian) state.lockedAnchors.set(lockId, { jacobian });
      }
      const probeSvg = await renderProbe(newBaseParams);
      const constraints = constraintsFromSvg
        ? constraintsFromSvg(probeSvg)
        : [];
      const nextConstraints = new Map();
      for (const c of constraints) {
        const jacobian = await svgEditor_estimateJacobianForConstraint({
          name: c.name,
          p0: newBaseParams,
          renderProbe,
          paramNames: svgParameterNames,
          constraintsFn: constraintsFromSvg
        });
        if (jacobian) nextConstraints.set(c.name, jacobian);
      }
      state.constraintJacobians = nextConstraints;
    };
    const toggleLock = async (anchorId) => {
      __refreshLive();
      if (state.lockedAnchors.has(anchorId)) {
        state.lockedAnchors.delete(anchorId);
      } else {
        const params = getCurrentParams();
        const jacobian = await svgEditor_estimateJacobianForAnchor({
          anchorId,
          p0: params,
          renderProbe,
          paramNames: svgParameterNames,
          anchorsFn: rectAnchorsStable
        });
        if (jacobian) {
          const lockEl = state.lastTarget?.querySelector(
            '[data-anchor-id="' + anchorId + '"]'
          );
          const targetX = +(
            lockEl?.getAttribute("cx") ??
            jacobian.a0?.[0] ??
            0
          );
          const targetY = +(
            lockEl?.getAttribute("cy") ??
            jacobian.a0?.[1] ??
            0
          );
          state.lockedAnchors.set(anchorId, {
            jacobian,
            targetX,
            targetY
          });
        }
      }
      const markerEl = state.lastTarget?.querySelector(
        '[data-anchor-id="' + anchorId + '"]'
      );
      const view = markerEl?.__paramsView;
      if (view) {
        if (!view.__lopecodeLocks) view.__lopecodeLocks = new Set();
        if (state.lockedAnchors.has(anchorId))
          view.__lopecodeLocks.add(anchorId);
        else view.__lopecodeLocks.delete(anchorId);
        view.dispatchEvent(new Event("input", { bubbles: true }));
      }
      svgEditor_drawOverlay(state.overlay, {
        anchors: state.anchors,
        hoverId: state.hover?.id ?? null,
        lockedIds: getLockedIdSet(),
        show: true
      });
    };
    const locksActive = () => state.lockedAnchors.size > 0;
    const estimateAnchorJacobian = async (anchorId) => {
      __refreshLive();
      return svgEditor_estimateJacobianForAnchor({
        anchorId,
        p0: getCurrentParams(),
        renderProbe,
        paramNames: svgParameterNames,
        anchorsFn: rectAnchorsStable
      });
    };
    const solveLockedUpdate = (
      targetView,
      ownIndex,
      ownDims,
      slice,
      anchorJacobian,
      lastSlice
    ) => {
      __refreshLive();
      const cur = targetView.value.slice(ownIndex, ownIndex + ownDims);
      const baseline =
        Array.isArray(lastSlice) && lastSlice.length === ownDims
          ? lastSlice
          : cur;
      let baseName = null;
      for (const [name, el] of svgParameterViewElByName) {
        if (el === targetView) {
          const ci = name.lastIndexOf(":");
          baseName =
            ci > 0 && !isNaN(+name.slice(ci + 1)) ? name.slice(0, ci) : name;
          break;
        }
      }
      if (!baseName) return;
      const N = svgParameterNames.length;
      const dpAuthor = new Array(N).fill(0);
      for (let i = 0; i < ownDims; i++) {
        const targetName = `${baseName}:${ownIndex + i}`;
        let idx = svgParameterNames.indexOf(targetName);
        if (idx < 0 && ownDims === 1) idx = svgParameterNames.indexOf(baseName);
        if (idx < 0) continue;
        dpAuthor[idx] = (+slice[i] || 0) - (+baseline[i] || 0);
      }
      const A = [];
      const b = [];
      if (
        anchorJacobian &&
        anchorJacobian.J &&
        anchorJacobian.J[0]?.length === N
      ) {
        let bx = 0,
          by = 0;
        for (let i = 0; i < N; i++) {
          bx += anchorJacobian.J[0][i] * dpAuthor[i];
          by += anchorJacobian.J[1][i] * dpAuthor[i];
        }
        A.push(anchorJacobian.J[0].slice(), anchorJacobian.J[1].slice());
        b.push(bx, by);
      } else {
        for (let i = 0; i < N; i++) {
          if (dpAuthor[i] === 0) continue;
          const row = new Array(N).fill(0);
          row[i] = 1;
          A.push(row);
          b.push(dpAuthor[i]);
        }
      }
      if (!A.length) return;
      const C = [];
      const dRhs = [];
      const LOCK_PULL_GAIN = 0.25;
      const LOCK_DEADBAND = 0.5;
      for (const [lockId, lockData] of state.lockedAnchors) {
        const lockEl = state.lastTarget?.querySelector(
          '[data-anchor-id="' + lockId + '"]'
        );
        const curX = +(lockEl?.getAttribute("cx") ?? lockData.targetX ?? 0);
        const curY = +(lockEl?.getAttribute("cy") ?? lockData.targetY ?? 0);
        let resX = curX - (lockData.targetX ?? curX);
        let resY = curY - (lockData.targetY ?? curY);
        if (Math.abs(resX) < LOCK_DEADBAND) resX = 0;
        if (Math.abs(resY) < LOCK_DEADBAND) resY = 0;
        C.push(lockData.jacobian.J[0].slice(), lockData.jacobian.J[1].slice());
        dRhs.push(-resX * LOCK_PULL_GAIN, -resY * LOCK_PULL_GAIN);
      }
      const dp = C.length
        ? __solveKKT(A, b, C, +inverseConfig?.damping || 0.000001, dRhs)
        : pseudoInverseStepMxN(A, b);
      const next = {};
      for (let i = 0; i < N; i++) {
        const name = svgParameterNames[i];
        const view = svgParameterViewElByName.get(name);
        if (!view) continue;
        const ci = name.lastIndexOf(":");
        let curVal;
        if (ci > 0 && !isNaN(+name.slice(ci + 1))) {
          const arr = view.value;
          const arrIdx = +name.slice(ci + 1);
          curVal = +arr[arrIdx];
        } else {
          curVal = +view.value;
        }
        next[name] = curVal + (+dp[i] || 0);
      }
      svgEditor_commitParams(next, svgParameterViewElByName);
    };
    const computeCombinedUpdate = (baseParams) => {
      const overlay = state.overlay;
      const base = baseParams ?? getCurrentParams();
      const n = svgParameterNames.length;
      const dragDetails = [];
      const drags = Array.from(state.drags.values());
      const hasLocks = state.lockedAnchors.size > 0;
      const hasConstraints =
        state.constraintJacobians && state.constraintJacobians.size > 0;
      if (!drags.length && !hasLocks && !hasConstraints) {
        return {
          next: { ...base },
          dpTotal: new Array(n).fill(0),
          dragDetails
        };
      }
      if (drags.length === 1 && !hasLocks && !hasConstraints) {
        const d = drags[0];
        const lc = d.lastClient ?? d.startClient;
        const pNow = svgPointFromClient(overlay, lc.x, lc.y, d.invScreenCTM);
        const da = [pNow.x - d.startPointer.x, pNow.y - d.startPointer.y];
        const dp = pseudoInverseStepMxN(d.jacobian.J, da);
        const next = { ...base };
        for (let i = 0; i < n; i++) {
          const name = svgParameterNames[i];
          const v = +base[name];
          if (!Number.isFinite(v)) continue;
          next[name] = v + (+dp[i] || 0);
        }
        dragDetails.push({
          pointerId: d.pointerId,
          anchorId: d.anchorId,
          pointer: pNow,
          da,
          dp,
          J: d.jacobian.J
        });
        return {
          next,
          dpTotal: dp,
          dragDetails
        };
      }
      const A = [],
        b = [],
        C = [];
      for (const d of drags) {
        const lc = d.lastClient ?? d.startClient;
        const pNow = svgPointFromClient(overlay, lc.x, lc.y, d.invScreenCTM);
        const da0 = pNow.x - d.startPointer.x;
        const da1 = pNow.y - d.startPointer.y;
        const J = d.jacobian.J;
        A.push(J[0].slice(), J[1].slice());
        b.push(da0, da1);
        dragDetails.push({
          pointerId: d.pointerId,
          anchorId: d.anchorId,
          pointer: pNow,
          da: [da0, da1],
          J
        });
      }
      for (const [lockId, lockData] of state.lockedAnchors) {
        const J = lockData.jacobian.J;
        C.push(J[0].slice(), J[1].slice());
      }
      if (state.constraintJacobians) {
        for (const [cname, cj] of state.constraintJacobians) {
          const w = +cj.weight || 1;
          for (let j = 0; j < cj.J.length; j++) {
            A.push(cj.J[j].map((v) => v * w));
            b.push(-(+cj.r0[j] || 0) * w);
          }
        }
      }
      if (!A.length && !C.length)
        return {
          next: { ...base },
          dpTotal: new Array(n).fill(0),
          dragDetails
        };
      const dp = C.length
        ? __solveKKT(A, b, C, +inverseConfig?.damping || 0.000001)
        : pseudoInverseStepMxN(A, b);
      for (const dd of dragDetails) dd.dp = dp;
      const next = { ...base };
      for (let i = 0; i < n; i++) {
        const name = svgParameterNames[i];
        const v = +base[name];
        if (!Number.isFinite(v)) continue;
        next[name] = v + (+dp[i] || 0);
      }
      return {
        next,
        dpTotal: dp,
        dragDetails
      };
    };
    const commitFromCurrentDragState = (reason) => {
      const base = state.gestureBaseParams ?? getCurrentParams();
      const { next, dpTotal, dragDetails } = computeCombinedUpdate(base);
      svgEditor_commitParams(next, svgParameterViewElByName);
      setStatus({
        mode: state.rebasing
          ? "rebasing"
          : state.drags.size > 1
          ? "dragging-multi"
          : state.drags.size
          ? "dragging"
          : state.overTarget
          ? "hover"
          : "idle",
        anchors: state.anchors.map((a) => ({
          id: a.id,
          x: a.x,
          y: a.y
        })),
        activeAnchors: Array.from(state.drags.values()).map((x) => x.anchorId),
        lockedAnchors: Array.from(state.lockedAnchors.keys()),
        params: next,
        dp: dpTotal,
        drags: dragDetails,
        reason
      });
    };
    const createGrowPreview = (overlay, x1, y1) => {
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x1);
      line.setAttribute("y2", y1);
      line.setAttribute("stroke", "#f84");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-dasharray", "6,3");
      line.style.pointerEvents = "none";
      overlay.appendChild(line);
      return line;
    };
    const pointerMoveOverlay = (evt) => {
      const overlay = state.overlay;
      if (!overlay?.isConnected) return;
      if (editorMode === "grow" && state.growPreview) {
        const p = svgPointFromClient(overlay, evt.clientX, evt.clientY);
        state.growPreview.line.setAttribute("x2", p.x);
        state.growPreview.line.setAttribute("y2", p.y);
        evt.preventDefault();
        return;
      }
      if (state.drags.size) {
        const d = state.drags.get(evt.pointerId);
        if (d) {
          d.lastClient = {
            x: evt.clientX,
            y: evt.clientY
          };
          state.drags.set(evt.pointerId, d);
        }
        if (!state.rebasing) {
          commitFromCurrentDragState("pointermove");
          svgEditor_drawOverlay(overlay, {
            anchors: overlayAnchorsWithActivePointerPositions(),
            hoverId: null,
            lockedIds: getLockedIdSet(),
            show: true
          });
          if (!state._rebasePending) {
            state._rebasePending = true;
            requestAnimationFrame(async () => {
              if (state.drags.size && !state.rebasing) {
                state.rebasing = true;
                try {
                  const newBase = getCurrentParams();
                  state.gestureBaseParams = newBase;
                  await rebaseAllDrags(newBase);
                } finally {
                  state.rebasing = false;
                }
                if (state.drags.size) {
                  commitFromCurrentDragState("continuous-rebase");
                  svgEditor_drawOverlay(state.overlay, {
                    anchors: overlayAnchorsWithActivePointerPositions(),
                    hoverId: null,
                    lockedIds: getLockedIdSet(),
                    show: true
                  });
                }
              }
              state._rebasePending = false;
            });
          }
        }
        evt.preventDefault();
        return;
      }
      if (!state.overTarget) return;
      if (state.rebasing) return;
      const p = svgPointFromClient(overlay, evt.clientX, evt.clientY);
      state.hover = pickAnchor(state.anchors, p, 12);
      setStatus({
        mode: "hover",
        anchor: state.hover?.id ?? null,
        pointer: p,
        params: getCurrentParams(),
        anchors: state.anchors.map((a) => ({
          id: a.id,
          x: a.x,
          y: a.y
        })),
        reason: "hover"
      });
      svgEditor_drawOverlay(overlay, {
        anchors: state.anchors,
        hoverId: state.hover?.id ?? null,
        lockedIds: getLockedIdSet(),
        show: true
      });
    };
    const pointerDownOverlay = async (evt) => {
      const anchorId = evt.target?.dataset?.anchorId;
      if (!anchorId) return;
      const srcAnchorEl = state.lastTarget?.querySelector(
        '[data-anchor-id="' + anchorId + '"]'
      );
      const customDrag = srcAnchorEl?.__drag;
      if (customDrag) {
        evt.preventDefault();
        evt.stopPropagation();
        const anchor = state.anchors.find((a) => a.id === anchorId);
        customDrag(evt, {
          anchor,
          overlay: state.overlay,
          anchorEl: srcAnchorEl,
          toggleLock,
          anchorId,
          locksActive,
          solveLockedUpdate,
          estimateAnchorJacobian
        });
        return;
      }
      if (editorMode === "grow") {
        const overlay = state.overlay;
        const anchor = state.anchors.find((a) => a.id === anchorId);
        if (!anchor) return;
        const line = createGrowPreview(overlay, anchor.x, anchor.y);
        state.growPreview = {
          anchorId,
          startX: anchor.x,
          startY: anchor.y,
          line
        };
        try {
          overlay.setPointerCapture(evt.pointerId);
        } catch {}
        evt.preventDefault();
        evt.stopPropagation();
        return;
      }
      if (editorMode === "delete") {
        const target = state.lastTarget;
        const anchorEl = target?.querySelector(
          '[data-anchor-id="' + anchorId + '"]'
        );
        const treeOpts = anchorEl?.__tree;
        const treeNode = anchorEl?.__treeNode;
        if (treeOpts && treeNode && anchorId !== treeNode.__rootId) {
          const { data: treeData, parameters: params } = treeOpts;
          let parentId = null;
          let childRef = null;
          for (const [pid, node] of treeData) {
            const idx = (node.children || []).findIndex(
              (c) => c.id === anchorId
            );
            if (idx !== -1) {
              parentId = pid;
              childRef = node.children[idx];
              node.children.splice(idx, 1);
              break;
            }
          }
          if (parentId !== null) {
            const deleted = treeData.get(anchorId);
            if (deleted?.children?.length) {
              const parent = treeData.get(parentId);
              parent.children = (parent.children || []).concat(
                deleted.children
              );
            }
            treeData.delete(anchorId);
            const rootNode = treeData.get(treeNode.__rootId);
            const parametersView = rootNode?.__parametersView;
            if (parametersView) {
              parametersView.value = [...params];
              parametersView.dispatchEvent(
                new Event("input", { bubbles: true })
              );
            }
          }
        }
        evt.preventDefault();
        evt.stopPropagation();
        return;
      }
      if (evt.shiftKey) {
        await toggleLock(anchorId);
        evt.preventDefault();
        evt.stopPropagation();
        return;
      }
      if (state.lockedAnchors.has(anchorId)) return;
      const overlay = state.overlay;
      const pointerId = evt.pointerId;
      state.rebasing = true;
      try {
        __refreshLive();
        const newBase = getCurrentParams();
        state.gestureBaseParams = newBase;
        await rebaseAllDrags(newBase);
        const startParams = state.gestureBaseParams ?? getCurrentParams();
        const jacobian = await svgEditor_estimateJacobianForAnchor({
          anchorId,
          p0: startParams,
          renderProbe,
          paramNames: svgParameterNames,
          anchorsFn: rectAnchorsStable
        });
        if (!jacobian) return;
        const inv = getInvScreenCTM(overlay);
        const startPointer = svgPointFromClient(
          overlay,
          evt.clientX,
          evt.clientY,
          inv
        );
        state.drags.set(pointerId, {
          pointerId,
          anchorId,
          startClient: {
            x: evt.clientX,
            y: evt.clientY
          },
          lastClient: {
            x: evt.clientX,
            y: evt.clientY
          },
          startPointer,
          startParams,
          jacobian,
          invScreenCTM: inv
        });
        try {
          overlay.setPointerCapture(pointerId);
        } catch {}
        svgEditor_setOverlayVisible(overlay, true);
        commitFromCurrentDragState("pointerdown");
        svgEditor_drawOverlay(overlay, {
          anchors: overlayAnchorsWithActivePointerPositions(),
          hoverId: null,
          lockedIds: getLockedIdSet(),
          show: true
        });
        evt.preventDefault();
        evt.stopPropagation();
      } finally {
        state.rebasing = false;
        if (state.drags.size) {
          commitFromCurrentDragState("pointerdown-rebased");
          svgEditor_drawOverlay(state.overlay, {
            anchors: overlayAnchorsWithActivePointerPositions(),
            hoverId: null,
            lockedIds: getLockedIdSet(),
            show: true
          });
        }
      }
    };
    const pointerUpOverlay = async (evt) => {
      if (editorMode === "grow" && state.growPreview) {
        const overlay = state.overlay;
        const p = svgPointFromClient(overlay, evt.clientX, evt.clientY);
        const gp = state.growPreview;
        const dx = p.x - gp.startX;
        const dy = p.y - gp.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        gp.line.remove();
        state.growPreview = null;
        if (length > 5) {
          const target = state.lastTarget;
          const anchorEl = target?.querySelector(
            '[data-anchor-id="' + gp.anchorId + '"]'
          );
          const treeOpts = anchorEl?.__tree;
          const treeNode = anchorEl?.__treeNode;
          if (treeOpts && treeNode) {
            const { data: treeData, parameters: params } = treeOpts;
            const rootNode = treeData.get(treeNode.__rootId);
            const parametersView = rootNode?.__parametersView;
            const newIdx = params.length;
            const newId = "b" + Math.random().toString(36).slice(2, 6);
            if (!treeData.has(gp.anchorId)) {
              treeData.set(gp.anchorId, { children: [] });
            }
            treeData.get(gp.anchorId).children.push({
              id: newId,
              angleIdx: newIdx,
              lengthIdx: newIdx + 1
            });
            if (parametersView) {
              parametersView.value = [...params, angle, length];
              parametersView.dispatchEvent(
                new Event("input", { bubbles: true })
              );
            }
          }
        }
        evt.preventDefault();
        return;
      }
      if (!state.drags.size) return;
      const had = state.drags.delete(evt.pointerId);
      if (!had) return;
      const overlay = state.overlay;
      if (!state.drags.size) {
        state.gestureBaseParams = null;
        setStatus({
          mode: "drag-end",
          params: getCurrentParams(),
          anchors: state.anchors.map((a) => ({
            id: a.id,
            x: a.x,
            y: a.y
          })),
          reason: "pointerup"
        });
        svgEditor_setOverlayVisible(overlay, !!state.overTarget);
        svgEditor_drawOverlay(overlay, {
          anchors: state.anchors,
          hoverId: state.hover?.id ?? null,
          lockedIds: getLockedIdSet(),
          show: !!state.overTarget
        });
        evt.preventDefault();
        return;
      }
      state.rebasing = true;
      try {
        const newBase = getCurrentParams();
        state.gestureBaseParams = newBase;
        await rebaseAllDrags(newBase);
        commitFromCurrentDragState("pointerup-rebase-remaining");
        svgEditor_setOverlayVisible(overlay, true);
        svgEditor_drawOverlay(overlay, {
          anchors: overlayAnchorsWithActivePointerPositions(),
          hoverId: null,
          lockedIds: getLockedIdSet(),
          show: true
        });
        evt.preventDefault();
      } finally {
        state.rebasing = false;
      }
    };
    const pointerMoveDoc = (evt) => {
      const target = svgTemplateVariable?._value;
      if (!target) return;
      if (!state.targetRect) {
        try {
          state.targetRect = target.getBoundingClientRect();
        } catch {
          state.targetRect = null;
        }
      }
      if (state.drags.size) return;
      if (editorMode === "grow" && state.growPreview) return;
      const inside = svgEditor_computeOverTarget(
        state.targetRect,
        evt.clientX,
        evt.clientY
      );
      if (inside === state.overTarget) return;
      state.overTarget = inside;
      if (!inside) {
        state.hover = null;
        state.anchors = [];
        setStatus({
          mode: "idle",
          anchor: null,
          params: getCurrentParams(),
          anchors: [],
          reason: "leave"
        });
      }
      svgEditor_setOverlayVisible(state.overlay, inside);
      svgEditor_drawOverlay(state.overlay, {
        anchors: state.anchors,
        hoverId: state.hover?.id ?? null,
        lockedIds: getLockedIdSet(),
        show: inside
      });
    };
    state.overlay.addEventListener("pointermove", pointerMoveOverlay, {
      passive: false
    });
    state.overlay.addEventListener("pointerdown", pointerDownOverlay, {
      passive: false
    });
    state.overlay.addEventListener("pointerup", pointerUpOverlay, {
      passive: false
    });
    state.overlay.addEventListener("pointercancel", pointerUpOverlay, {
      passive: false
    });
    document.addEventListener("pointermove", pointerMoveDoc, { passive: true });
    let raf = 0;
    const tick = () => {
      const target = svgTemplateVariable?._value;
      if (target && target !== state.lastTarget) state.lastTarget = target;
      if (target?.getBoundingClientRect) {
        if (state.overTarget || state.drags.size) {
          state.targetRect =
            svgEditor_syncOverlayToTarget(state.overlay, target) ??
            state.targetRect;
          refreshAnchorsFromTarget(target);
          const activeAnchors = Array.from(state.drags.values()).map(
            (x) => x.anchorId
          );
          setStatus({
            mode: state.rebasing
              ? "rebasing"
              : state.drags.size
              ? state.drags.size > 1
                ? "dragging-multi"
                : "dragging"
              : "idle",
            params: getCurrentParams(),
            anchor: activeAnchors[0] ?? state.hover?.id ?? null,
            activeAnchors,
            lockedAnchors: Array.from(state.lockedAnchors.keys()),
            anchors: state.anchors.map((a) => ({
              id: a.id,
              x: a.x,
              y: a.y
            })),
            reason: "tick"
          });
          svgEditor_drawOverlay(state.overlay, {
            anchors: state.drags.size
              ? overlayAnchorsWithActivePointerPositions()
              : state.anchors,
            hoverId: state.drags.size ? null : state.hover?.id ?? null,
            lockedIds: getLockedIdSet(),
            show: true
          });
        } else {
          try {
            state.targetRect = target.getBoundingClientRect();
          } catch {
            state.targetRect = null;
          }
          svgEditor_clearOverlay(state.overlay);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const cleanup = () => {
      cancelAnimationFrame(raf);
      state.overlay?.removeEventListener("pointermove", pointerMoveOverlay);
      state.overlay?.removeEventListener("pointerdown", pointerDownOverlay);
      state.overlay?.removeEventListener("pointerup", pointerUpOverlay);
      state.overlay?.removeEventListener("pointercancel", pointerUpOverlay);
      document.removeEventListener("pointermove", pointerMoveDoc);
      try {
        state.overlay?.remove();
      } catch {}
      state.overlay = null;
      state.drags = new Map();
      state.lockedAnchors = new Map();
      state.gestureBaseParams = null;
      state.hover = null;
      state.anchors = [];
      state.lastTarget = null;
      state.overTarget = false;
      state.targetRect = null;
      state.rebasing = false;
      state.growPreview = null;
    };
    Promise.resolve(invalidation).then(cleanup);
    if (callerInvalidation) Promise.resolve(callerInvalidation).then(cleanup);
  };
  ensureOverlay();
  svgEditor_setOverlayVisible(
    state.overlay,
    !!state.drags?.size || !!state.overTarget
  );
  return Object.assign(state, {
    value: {
      headless: true,
      overlay: state.overlay,
      multitouch: true,
      mode: editorMode
    }
  });
};
const _1qwm53c = function _inverseConfig(Inputs){return(
Inputs.form({
  method: Inputs.select([
    'L2 damped pseudoinverse',
    'Jacobian transpose',
    'Sparse (1 param)',
    'Sparse (2 params)'
  ], {
    label: 'Inverse method',
    value: 'L2 damped pseudoinverse'
  }),
  damping: Inputs.number({
    label: 'Damping (λ, for L2 / stability)',
    value: 0.000001,
    step: 0.000001
  }),
  alpha: Inputs.number({
    label: 'Alpha (step size, Jacobian transpose)',
    value: 0.2,
    step: 0.01
  }),
  l1Weight: Inputs.number({
    label: 'L1 weight (sparsity penalty, sparse modes)',
    value: 0.001,
    step: 0.001
  })
}, { label: 'Inverse solver' })
)};
const _m9slbk = (G, _) => G.input(_);
const _zhvt9n = function _parametricSVGEditorModule(thisModule){return(
thisModule()
)};
const _6tex8v = (G, _) => G.input(_);
const _1kkxlbk = function _svgEditorStatus(EventTarget)
{
  const v = this ?? Object.assign(new EventTarget(), { value: {} });
  return v;
};
const _oi7gqz = (G, _) => G.input(_);
const _1o2cjqr = function _svgTargetName(Inputs){return(
Inputs.input()
)};
const _1ejew6y = (G, _) => G.input(_);
const _kmivws = function _svgTargetModule(Inputs,parametricSVGEditorModule){return(
Inputs.input(parametricSVGEditorModule, { label: 'svgTargetModule' })
)};
const _6v324l = (G, _) => G.input(_);
const _4kjrtv = function _scissorProse(md){return(
md`### Affordance: a CRUD primitive over a parameter window

\`affordance\` is a one-stop shop for **every** interaction on a living SVG template. Each affordance owns a contiguous slice of the parameter vector, paints itself however the author likes, and routes pointer gestures (click, drag, shift-click) to behaviours (create / read / update / delete) — all framework-mediated. Affordances compose recursively: a segment's render can spawn more affordances inside it.

#### The shape

\`\`\`js
ctx.affordance(id, pos, {
  handleRender,                          // paint the glyph
  dims, render,                          // segment with children (recurse)
  onClick:  api => …,                    // gestures…
  onDrag:   ({dx, dy, phase}, api) => …,
  onShiftClick: api => …,
  spawn:    (dx, dy, cur) => newDims     // sugar for "drag at terminal => appendAfter"
})
\`\`\`

The framework hands every handler an \`api\` bound to the affordance's owned slice — the author never indexes into the global vector:

\`\`\`js
api.params         // read-only snapshot of the owned dims
api.initial        // snapshot at the start of the current gesture
api.update(slice)  // write a new slice into the owned offset
api.delete()       // splice the owned slice out
api.appendAfter(extraDims)  // insert dims right after the owned window
\`\`\`

#### Mapping gestures to behaviours

UX is decoupled from semantics. A click can mean delete or create or something else — the author chooses the mapping. In the scissor below:

* **Wing** (blue square) — \`onDrag\` projects cursor delta onto the segment normal and writes \`api.update([px, py, w + dw])\` (update).
* **Mid** (orange diamond) — \`onDrag\` writes \`api.update([px+2dx, py+2dy, w])\` so the midpoint tracks the cursor (update).
* **Delete dot** (red ✕ next to mid) — \`onClick: api => api.delete()\` (delete).
* **Tip** (dashed orange "+") — \`spawn(dx, dy, cur)\` returns a fresh \`(dx, dy, w)\` triple and the framework \`api.appendAfter\`s it (create).

Every other anchor (the lines themselves, anything created via plain \`ctx.anchor\`) still goes through the Jacobian solver — that's the default when no handlers are provided.

#### Recursive composition

\`ctx.affordance(childId, childPos, childOpts)\` from inside \`render\` either:

* **Recurses** into a fresh segment (when \`childOpts\` provides \`dims+render\`) — the child carves its own slice \`[index+dims..index+2·dims)\`.
* **Inlines a leaf** (when \`childOpts\` is just handlers) — the leaf shares the parent segment's slice, so its handlers update the same \`(dx, dy, w)\` the segment owns.

The default \`childOpts\` is the *current* drag, so a chain self-continues; pass a different spec at any depth to switch affordance type mid-chain. Newly placed widgets are themselves built from \`ctx.affordance\`, so they can contain further affordances — recursion bottoms out at a leaf with no \`dims\`.`
)};
const _u09z55 = function _scissorParams(vector){return(
vector([
  -200,
  400
], {
  label: 'scissor params',
  dimensions: 12,
  value: [
    70,
    0,
    25,
    70,
    0,
    25,
    70,
    0,
    25,
    70,
    0,
    25
  ],
  variate: true
})
)};
const _2jlpc2 = (G, _) => G.input(_);
const _190xpi9 = function _scissorSvg(htl,affordance,scissorParams)
{
  const scissors = {
    dims: 3,
    spawn: (dx, dy, cur) => {
      const lastW = cur.length >= 1 ? cur[cur.length - 1] : 25;
      return [
        dx,
        dy,
        lastW
      ];
    },
    handleRender: ctx => {
      const p = ctx.parent;
      return htl.svg`<g class="__handle-glyph" pointer-events="none">
        <circle cx=${ p.x } cy=${ p.y } r="9" fill="#fa4" fill-opacity="0.18" stroke="#fa4" stroke-width="1.5" stroke-dasharray="2,2"/>
        <line x1=${ p.x - 4 } y1=${ p.y } x2=${ p.x + 4 } y2=${ p.y } stroke="#fa4" stroke-width="1.6" stroke-linecap="round"/>
        <line x1=${ p.x } y1=${ p.y - 4 } x2=${ p.x } y2=${ p.y + 4 } stroke="#fa4" stroke-width="1.6" stroke-linecap="round"/>
      </g>`;
    },
    render: ctx => {
      const [dx, dy, w] = ctx.params;
      const p = ctx.parent;
      const c = {
        x: p.x + dx,
        y: p.y + dy
      };
      const mx = (p.x + c.x) / 2, my = (p.y + c.y) / 2;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const wA = {
        x: mx + w * nx,
        y: my + w * ny
      };
      const wB = {
        x: mx - w * nx,
        y: my - w * ny
      };
      const nextStart = ctx.index + ctx.dims;
      const isLast = nextStart + ctx.dims > ctx.full.length;
      const tipId = isLast ? 'scissor-tip' : `pivot:${ nextStart }`;
      const wingDrag = ({
        dx: ddx,
        dy: ddy,
        phase
      }, api) => {
        if (!api?.initial)
          return;
        const [px, py, w0] = api.initial;
        const ll = Math.sqrt(px * px + py * py) || 1;
        const nnx = -py / ll, nny = px / ll;
        const dw = ddx * nnx + ddy * nny;
        api.update([
          px,
          py,
          Math.max(0, w0 + dw)
        ]);
      };
      const midDrag = ({
        dx: ddx,
        dy: ddy,
        phase
      }, api) => {
        if (!api?.initial)
          return;
        const [px, py, w0] = api.initial;
        api.update([
          px + 2 * ddx,
          py + 2 * ddy,
          w0
        ]);
      };
      const deleteSeg = api => api.delete();
      const padlock = (cx, cy) => htl.svg`<g pointer-events="none" transform="translate(${ cx + 6 } ${ cy - 8 })">
        <rect x="-3" y="0" width="6" height="5" fill="#ffd700" stroke="#444" stroke-width="0.8"/>
        <path d="M -2 0 V -2 a 2 2 0 0 1 4 0 V 0" fill="none" stroke="#444" stroke-width="0.8"/>
      </g>`;
      const wingGlyph = hctx => htl.svg`<g pointer-events="none">
        <rect x=${ hctx.parent.x - 5 } y=${ hctx.parent.y - 5 } width="10" height="10" fill=${ hctx.frozen ? '#ffd700' : '#4af' } fill-opacity="0.85" stroke="#fff" stroke-width="1.5"/>
        ${ hctx.frozen ? padlock(hctx.parent.x, hctx.parent.y) : null }
      </g>`;
      const midGlyph = hctx => htl.svg`<g pointer-events="none">
        <polygon points="${ hctx.parent.x },${ hctx.parent.y - 6 } ${ hctx.parent.x + 6 },${ hctx.parent.y } ${ hctx.parent.x },${ hctx.parent.y + 6 } ${ hctx.parent.x - 6 },${ hctx.parent.y }" fill=${ hctx.frozen ? '#ffd700' : '#fa4' } fill-opacity="0.85" stroke="#fff" stroke-width="1.5"/>
        ${ hctx.frozen ? padlock(hctx.parent.x, hctx.parent.y) : null }
      </g>`;
      const deleteGlyph = hctx => htl.svg`<g pointer-events="none">
        <circle cx=${ hctx.parent.x } cy=${ hctx.parent.y } r="6" fill="#e44" fill-opacity="0.85" stroke="#fff" stroke-width="1.2"/>
        <line x1=${ hctx.parent.x - 3 } y1=${ hctx.parent.y - 3 } x2=${ hctx.parent.x + 3 } y2=${ hctx.parent.y + 3 } stroke="#fff" stroke-width="1.5"/>
        <line x1=${ hctx.parent.x + 3 } y1=${ hctx.parent.y - 3 } x2=${ hctx.parent.x - 3 } y2=${ hctx.parent.y + 3 } stroke="#fff" stroke-width="1.5"/>
      </g>`;
      return htl.svg`<g>
        <line x1=${ p.x } y1=${ p.y } x2=${ wA.x } y2=${ wA.y } stroke="#4af" stroke-width="2"/>
        <line x1=${ wA.x } y1=${ wA.y } x2=${ c.x } y2=${ c.y } stroke="#4af" stroke-width="2"/>
        <line x1=${ p.x } y1=${ p.y } x2=${ wB.x } y2=${ wB.y } stroke="#fa4" stroke-width="2"/>
        <line x1=${ wB.x } y1=${ wB.y } x2=${ c.x } y2=${ c.y } stroke="#fa4" stroke-width="2"/>
        ${ ctx.affordance(`wing:${ ctx.index }`, wA, {
        handleRender: wingGlyph,
        onDrag: wingDrag
      }) }
        ${ ctx.affordance(`mid:${ ctx.index }`, {
        x: mx,
        y: my
      }, {
        handleRender: midGlyph,
        onDrag: midDrag
      }) }
        ${ ctx.affordance(`del:${ ctx.index }`, {
        x: mx + 14 * nx,
        y: my + 14 * ny
      }, {
        handleRender: deleteGlyph,
        onClick: deleteSeg
      }) }
        ${ ctx.affordance(tipId, c) }
      </g>`;
    }
  };
  return htl.svg`<svg viewBox="0 0 400 400" width="400" height="400" style="border-radius:8px; background:#0d1117; display:block;">
    ${ affordance('scissor-root', {
    x: 50,
    y: 200,
    params: scissorParams,
    drag: scissors
  }) }
  </svg>`;
};
const _1czpsnh = function _scissorEditor(scissorShape,svgEditor,parametricSVGEditorModule,invalidation)
{
  scissorShape;
  return svgEditor({
    target: 'scissorSvg',
    module: parametricSVGEditorModule,
    invalidation
  });
};
const _e50qn0 = function _scissorShape(Generators,$0){return(
Generators.observe(notify => {
  const viewEl = $0;
  let lastLen = -1;
  const tick = () => {
    const cur = viewEl.value.length;
    if (cur !== lastLen) {
      lastLen = cur;
      notify(cur);
    }
  };
  tick();
  viewEl.addEventListener('input', tick);
  return () => viewEl.removeEventListener('input', tick);
})
)};
const _1j4gmz4 = function _trellisProse(md){return(
md`### Example: Trellis — A Tree of X-Units

Each unit is a quadrilateral with two diagonal rods crossing at a computed pivot. The tree shape lives in the slice metadata: each unit's six params are \`[parentIdx, edgeIdx, c2x, c2y, c3x, c3y]\`. \`parentIdx = -1\` means attached to the ground (one corner fixed at origin, the other draggable).

- **Drag** a top corner to reshape the unit.
- **+** on a free edge spawns a new unit using that edge as its bottom — branch in three directions per node.
- **✕** on the pivot deletes the unit and all its descendants.
- The whole sub-tree folds and unfolds as you drag the ground's free point.

The chain stays linear in the params array; the tree is implicit in the metadata. Each unit's render reads its own \`parentIdx\` to look up where its bottom edge sits — so the existing affordance API handles a tree without any tree-aware machinery.`
)};
const _z537y = function _trellisGround(vector){return(
vector([
  -200,
  400
], {
  label: 'trellis ground',
  dimensions: 2,
  value: [
    220,
    360
  ],
  variate: false
})
)};
const _gahzu0 = (G, _) => G.input(_);
const _lmqfdg = function _trellisUnits(vector){return(
vector([
  -10,
  400
], {
  label: 'trellis units',
  dimensions: 4,
  value: [],
  variate: true,
  step: 0.01
})
)};
const _nmm7uw = (G, _) => G.input(_);
const _1q6ebgf = function _trellisSvg($0,trellisGround,Event,trellisUnits,htl,affordance)
{
  const FIXED_BL = {
    x: 60,
    y: 360
  };
  const VIEW_W = 400, VIEW_H = 400;
  const trellisUnitsView = $0;
  const cornersOf = (units, idx) => {
    const slice = units.slice(idx * 4, idx * 4 + 4);
    const parentIdx = Math.round(slice[0]);
    const edgeIdx = Math.round(slice[1]);
    const L1 = slice[2];
    const L2 = slice[3];
    let c0, c1, parentRef;
    if (parentIdx === -1) {
      c0 = FIXED_BL;
      c1 = {
        x: trellisGround[0],
        y: trellisGround[1]
      };
      parentRef = {
        x: (c0.x + c1.x) / 2,
        y: (c0.y + c1.y) / 2 + 100
      };
    } else if (parentIdx >= 0 && parentIdx < units.length / 4 && parentIdx !== idx) {
      const parent = cornersOf(units, parentIdx);
      const edges = [
        [
          parent.c0,
          parent.c1
        ],
        [
          parent.c1,
          parent.c3
        ],
        [
          parent.c3,
          parent.c2
        ],
        [
          parent.c2,
          parent.c0
        ]
      ];
      const e = edges[Math.max(0, Math.min(3, edgeIdx))] || edges[0];
      c0 = e[0];
      c1 = e[1];
      parentRef = parent.pivot;
    } else {
      c0 = FIXED_BL;
      c1 = FIXED_BL;
      parentRef = c0;
    }
    const r1 = L1 / 2, r2 = L2 / 2;
    const ex = c1.x - c0.x, ey = c1.y - c0.y;
    const d = Math.hypot(ex, ey) || 1;
    const ux = ex / d, uy = ey / d;
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const hSq = r1 * r1 - a * a;
    const h = hSq > 0 ? Math.sqrt(hSq) : 0;
    const footX = c0.x + a * ux;
    const footY = c0.y + a * uy;
    const candA = {
      x: footX - h * uy,
      y: footY + h * ux
    };
    const candB = {
      x: footX + h * uy,
      y: footY - h * ux
    };
    const dA = (candA.x - parentRef.x) ** 2 + (candA.y - parentRef.y) ** 2;
    const dB = (candB.x - parentRef.x) ** 2 + (candB.y - parentRef.y) ** 2;
    const pivot = dA > dB ? candA : candB;
    const c3 = {
      x: 2 * pivot.x - c0.x,
      y: 2 * pivot.y - c0.y
    };
    const c2 = {
      x: 2 * pivot.x - c1.x,
      y: 2 * pivot.y - c1.y
    };
    return {
      c0,
      c1,
      c2,
      c3,
      pivot
    };
  };
  const writeUnits = next => {
    trellisUnitsView.value = next;
    trellisUnitsView.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const groundSpec = {
    dims: 2,
    render: ctx => {
      const [brx, bry] = ctx.params;
      const bR = {
        x: brx,
        y: bry
      };
      const mid = {
        x: (FIXED_BL.x + bR.x) / 2,
        y: (FIXED_BL.y + bR.y) / 2
      };
      let groundOccupied = false;
      for (let i = 0; i < trellisUnits.length; i += 4) {
        if (Math.round(trellisUnits[i]) === -1) {
          groundOccupied = true;
          break;
        }
      }
      const fixedGlyph = () => htl.svg`<g pointer-events="none">
        <circle cx=${ FIXED_BL.x } cy=${ FIXED_BL.y } r="6" fill="#888" stroke="#fff" stroke-width="1.4"/>
        <line x1=${ FIXED_BL.x - 9 } y1=${ FIXED_BL.y + 6 } x2=${ FIXED_BL.x + 9 } y2=${ FIXED_BL.y + 10 } stroke="#888" stroke-width="2"/>
        <line x1=${ FIXED_BL.x - 7 } y1=${ FIXED_BL.y + 10 } x2=${ FIXED_BL.x - 10 } y2=${ FIXED_BL.y + 14 } stroke="#888" stroke-width="1.5"/>
        <line x1=${ FIXED_BL.x - 1 } y1=${ FIXED_BL.y + 10 } x2=${ FIXED_BL.x - 4 } y2=${ FIXED_BL.y + 14 } stroke="#888" stroke-width="1.5"/>
        <line x1=${ FIXED_BL.x + 5 } y1=${ FIXED_BL.y + 10 } x2=${ FIXED_BL.x + 2 } y2=${ FIXED_BL.y + 14 } stroke="#888" stroke-width="1.5"/>
      </g>`;
      const draggableGlyph = hctx => htl.svg`<g pointer-events="none">
        <circle cx=${ hctx.parent.x } cy=${ hctx.parent.y } r="7" fill="#4af" fill-opacity="0.9" stroke="#fff" stroke-width="1.4"/>
      </g>`;
      const dragBR = ({dx, dy}, api) => {
        if (!api?.initial)
          return;
        const [x0, y0] = api.initial;
        api.update([
          x0 + dx,
          y0 + dy
        ]);
      };
      const plusGlyph = hctx => htl.svg`<g pointer-events="none">
        <circle cx=${ hctx.parent.x } cy=${ hctx.parent.y } r="9" fill="#0d1117" stroke="#5c5" stroke-width="1.4" stroke-dasharray="3,2"/>
        <line x1=${ hctx.parent.x - 4 } y1=${ hctx.parent.y } x2=${ hctx.parent.x + 4 } y2=${ hctx.parent.y } stroke="#5c5" stroke-width="1.8"/>
        <line x1=${ hctx.parent.x } y1=${ hctx.parent.y - 4 } x2=${ hctx.parent.x } y2=${ hctx.parent.y + 4 } stroke="#5c5" stroke-width="1.8"/>
      </g>`;
      const spawnGroundChild = () => {
        const ex = bR.x - FIXED_BL.x, ey = bR.y - FIXED_BL.y;
        const d = Math.hypot(ex, ey) || 1;
        writeUnits([
          ...trellisUnitsView.value,
          -1,
          0,
          d * 1.3,
          d * 1.3
        ]);
      };
      return htl.svg`<g>
        <line x1=${ FIXED_BL.x } y1=${ FIXED_BL.y } x2=${ bR.x } y2=${ bR.y } stroke="#666" stroke-width="3" stroke-linecap="round"/>
        ${ ctx.affordance('ground-fixed', FIXED_BL, { handleRender: fixedGlyph }) }
        ${ ctx.affordance('ground-bR', bR, {
        handleRender: draggableGlyph,
        onDrag: dragBR
      }) }
        ${ groundOccupied ? null : ctx.affordance('ground-plus', mid, {
        handleRender: plusGlyph,
        onClick: spawnGroundChild
      }) }
      </g>`;
    }
  };
  const unitSpec = {
    dims: 4,
    render: ctx => {
      const myIdx = ctx.index / 4;
      const {c0, c1, c2, c3, pivot} = cornersOf(ctx.full, myIdx);
      const occupied = new Set();
      for (let i = 0; i < ctx.full.length; i += 4) {
        if (i === ctx.index)
          continue;
        if (Math.round(ctx.full[i]) === myIdx) {
          occupied.add(Math.round(ctx.full[i + 1]));
        }
      }
      const pivotGlyph = hctx => htl.svg`<g pointer-events="none">
        <circle cx=${ hctx.parent.x } cy=${ hctx.parent.y } r="6" fill="#888" fill-opacity="0.9" stroke="#fff" stroke-width="1.2"/>
      </g>`;
      const dragPivot = ({dx, dy}, api) => {
        if (!api?.initial)
          return;
        const [pIdx, eIdx] = api.initial;
        const newPx = pivot.x + dx, newPy = pivot.y + dy;
        const newL1 = 2 * Math.hypot(newPx - c0.x, newPy - c0.y);
        const newL2 = 2 * Math.hypot(newPx - c1.x, newPy - c1.y);
        api.update([
          pIdx,
          eIdx,
          newL1,
          newL2
        ]);
      };
      const cornerGlyph = colour => hctx => htl.svg`<g pointer-events="none">
        <circle cx=${ hctx.parent.x } cy=${ hctx.parent.y } r="5" fill=${ colour } fill-opacity="0.9" stroke="#fff" stroke-width="1.2"/>
      </g>`;
      const dragRodEnd = which => ({dx, dy}, api) => {
        if (!api?.initial)
          return;
        const [pIdx, eIdx, oldL1, oldL2] = api.initial;
        if (which === 'L1') {
          const newL1 = Math.hypot(c3.x + dx - c0.x, c3.y + dy - c0.y);
          api.update([
            pIdx,
            eIdx,
            newL1,
            oldL2
          ]);
        } else {
          const newL2 = Math.hypot(c2.x + dx - c1.x, c2.y + dy - c1.y);
          api.update([
            pIdx,
            eIdx,
            oldL1,
            newL2
          ]);
        }
      };
      const plusGlyph = hctx => htl.svg`<g pointer-events="none">
        <circle cx=${ hctx.parent.x } cy=${ hctx.parent.y } r="8" fill="#0d1117" stroke="#5c5" stroke-width="1.3" stroke-dasharray="3,2"/>
        <line x1=${ hctx.parent.x - 3 } y1=${ hctx.parent.y } x2=${ hctx.parent.x + 3 } y2=${ hctx.parent.y } stroke="#5c5" stroke-width="1.6"/>
        <line x1=${ hctx.parent.x } y1=${ hctx.parent.y - 3 } x2=${ hctx.parent.x } y2=${ hctx.parent.y + 3 } stroke="#5c5" stroke-width="1.6"/>
      </g>`;
      const deleteGlyph = hctx => htl.svg`<g pointer-events="none">
        <circle cx=${ hctx.parent.x } cy=${ hctx.parent.y } r="6" fill="#e44" fill-opacity="0.9" stroke="#fff" stroke-width="1.2"/>
        <line x1=${ hctx.parent.x - 3 } y1=${ hctx.parent.y - 3 } x2=${ hctx.parent.x + 3 } y2=${ hctx.parent.y + 3 } stroke="#fff" stroke-width="1.6"/>
        <line x1=${ hctx.parent.x + 3 } y1=${ hctx.parent.y - 3 } x2=${ hctx.parent.x - 3 } y2=${ hctx.parent.y + 3 } stroke="#fff" stroke-width="1.6"/>
      </g>`;
      const edgeMid = (a, b) => ({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
      });
      const spawnAtEdge = (eIdx, ea, eb) => () => {
        const len = Math.hypot(eb.x - ea.x, eb.y - ea.y) || 1;
        writeUnits([
          ...trellisUnitsView.value,
          myIdx,
          eIdx,
          len * 1.3,
          len * 1.3
        ]);
      };
      const cascadeDelete = () => {
        const all = trellisUnitsView.value;
        const n = all.length / 4;
        const remove = new Set([myIdx]);
        let changed = true;
        while (changed) {
          changed = false;
          for (let i = 0; i < n; i++) {
            if (remove.has(i))
              continue;
            const p = Math.round(all[i * 4]);
            if (remove.has(p)) {
              remove.add(i);
              changed = true;
            }
          }
        }
        const oldToNew = new Map();
        let newIdx = 0;
        for (let i = 0; i < n; i++) {
          if (remove.has(i))
            continue;
          oldToNew.set(i, newIdx);
          newIdx++;
        }
        const next = [];
        for (let i = 0; i < n; i++) {
          if (remove.has(i))
            continue;
          const slice = all.slice(i * 4, i * 4 + 4);
          const oldP = Math.round(slice[0]);
          if (oldP !== -1)
            slice[0] = oldToNew.get(oldP) ?? 0;
          next.push(...slice);
        }
        writeUnits(next);
      };
      const edgePoints = [
        [
          c0,
          c1
        ],
        [
          c1,
          c3
        ],
        [
          c3,
          c2
        ],
        [
          c2,
          c0
        ]
      ];
      const isLast = ctx.index + ctx.dims >= ctx.full.length;
      return htl.svg`<g>
        <line x1=${ c0.x } y1=${ c0.y } x2=${ c3.x } y2=${ c3.y } stroke="#4af" stroke-width="2"/>
        <line x1=${ c1.x } y1=${ c1.y } x2=${ c2.x } y2=${ c2.y } stroke="#fa4" stroke-width="2"/>
        ${ ctx.affordance(`pivot:${ myIdx }`, pivot, {
        handleRender: pivotGlyph,
        onDrag: dragPivot,
        onClick: cascadeDelete,
        onShiftClick: () => {
        }
      }) }
        ${ ctx.affordance(`L1end:${ myIdx }`, c3, {
        handleRender: cornerGlyph('#4af'),
        onDrag: dragRodEnd('L1'),
        onShiftClick: () => {
        }
      }) }
        ${ ctx.affordance(`L2end:${ myIdx }`, c2, {
        handleRender: cornerGlyph('#fa4'),
        onDrag: dragRodEnd('L2'),
        onShiftClick: () => {
        }
      }) }
        ${ [
        1,
        2,
        3
      ].map(eIdx => occupied.has(eIdx) ? null : ctx.affordance(`plus:${ myIdx }:${ eIdx }`, edgeMid(edgePoints[eIdx][0], edgePoints[eIdx][1]), {
        handleRender: plusGlyph,
        onClick: spawnAtEdge(eIdx, edgePoints[eIdx][0], edgePoints[eIdx][1])
      })) }
        ${ isLast ? null : ctx.affordance(`next:${ myIdx + 1 }`, {
        x: 0,
        y: 0
      }) }
      </g>`;
    }
  };
  return htl.svg`<svg viewBox="0 0 ${ VIEW_W } ${ VIEW_H }" width="${ VIEW_W }" height="${ VIEW_H }" style="border-radius:8px; background:#0d1117; display:block;">
    ${ affordance('trellis-ground', {
    x: 0,
    y: 0,
    params: trellisGround,
    drag: groundSpec
  }) }
    ${ affordance('trellis-units', {
    x: 0,
    y: 0,
    params: trellisUnits,
    drag: unitSpec
  }) }
  </svg>`;
};
const _1fvgbbc = function _trellisEditor(trellisShape,svgEditor,parametricSVGEditorModule,invalidation)
{
  trellisShape;
  return svgEditor({
    target: 'trellisSvg',
    module: parametricSVGEditorModule,
    invalidation
  });
};
const _1lmv8u8 = function _trellisShape(Generators,$0){return(
Generators.observe(notify => {
  const viewEl = $0;
  let lastLen = -1;
  const tick = () => {
    const cur = viewEl.value.length;
    if (cur !== lastLen) {
      lastLen = cur;
      notify(cur);
    }
  };
  tick();
  viewEl.addEventListener('input', tick);
  return () => viewEl.removeEventListener('input', tick);
})
)};
const _1ov5t0f = function _svgEditorArgs(Inputs){return(
Inputs.input({ mode: 'solve' })
)};
const _q4y63c = (G, _) => G.input(_);
const _1oj0ekd = function _constraint(){return(
(type, opts = {}) => {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.classList.add('__constraint');
  g.setAttribute('pointer-events', 'none');
  const name = opts.name ?? `${ type }_${ Math.random().toString(36).slice(2, 8) }`;
  g.dataset.constraintName = name;
  g.dataset.constraintType = type;
  g.dataset.weight = String(opts.weight ?? 1);
  if (type === 'coincident') {
    const ax = +opts.ax, ay = +opts.ay, bx = +opts.bx, by = +opts.by;
    g.dataset.residual = JSON.stringify([
      ax - bx,
      ay - by
    ]);
  } else {
    g.dataset.residual = JSON.stringify(opts.residual ?? [0]);
  }
  return g;
}
)};
const _1gakv0r = function _constraintsFromSvg(){return(
svgEl => {
  const els = svgEl?.querySelectorAll?.('.__constraint');
  if (!els || !els.length)
    return [];
  return Array.from(els).map(el => {
    let residual = [];
    try {
      residual = JSON.parse(el.dataset.residual || '[]');
    } catch {
    }
    return {
      name: el.dataset.constraintName,
      type: el.dataset.constraintType,
      residual,
      weight: +el.dataset.weight || 1
    };
  });
}
)};
const _zorryd = function _svgEditor_estimateJacobianForConstraint(){return(
async ({name, p0, renderProbe, paramNames, constraintsFn}) => {
  const baseSvg = await renderProbe(p0);
  const c0 = constraintsFn(baseSvg).find(c => c.name === name);
  if (!c0)
    return null;
  const r0 = c0.residual.map(v => +v || 0);
  const k = r0.length;
  const n = paramNames.length;
  const J = Array.from({ length: k }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const pname = paramNames[i];
    const v = +p0[pname];
    if (!Number.isFinite(v))
      continue;
    const eps = Math.max(Math.abs(v) * 0.000001, 0.000001);
    const p1 = {
      ...p0,
      [pname]: v + eps
    };
    const svg1 = await renderProbe(p1);
    const c1 = constraintsFn(svg1).find(c => c.name === name);
    if (!c1)
      continue;
    for (let j = 0; j < k; j++)
      J[j][i] = ((+c1.residual[j] || 0) - r0[j]) / eps;
  }
  return {
    name,
    J,
    r0,
    weight: c0.weight
  };
}
)};
const _gu3nwx = function _constraintProse(md){return(
md`### Declarative Geometric Constraints

Two line segments with four independent endpoints A, B, C, D — eight free parameters, no shared variables. Toggle **constraint** on and drag any endpoint: B and C now track each other.

#### What changed
The SVG template adds one element:
\`\`\`js
\${constraintEnabled ? constraint("coincident", {name:"BC", ax: cBx, ay: cBy, bx: cCx, by: cCy}) : null}
\`\`\`
\`constraint()\` returns an invisible \`<g class="__constraint">\` carrying a **residual vector** in its dataset — here \`[cBx − cCx, cBy − cCy]\`, which is zero iff B = C.

#### How the solver finds it
Each gesture, the controller scrapes \`.__constraint\` elements from the rendered SVG and finite-differences their residuals with respect to every parameter. That produces extra rows \`(∂r/∂p) · Δp = −r\` stacked onto the same system that handles drag and lock rows. The pseudo-inverse handles all three kinds uniformly — it doesn't know what a "constraint" is.

#### Why this decouples cleanly
- **Parameters stay off-the-shelf** \`viewof\`s. No special registration.
- **Observations live in the markup.** A residual is just a DOM node exposing a scalar and a target.
- **The solver is unchanged** — new constraint types become new markup, not new code paths.

Toggle the constraint off and the segments split again — the row disappears from the next gesture's system, so each drag stops forcing the coincidence.`
)};
const _gfk87u = function _constraintEnabled(Inputs){return(
Inputs.toggle({
  label: 'constraint',
  value: false
})
)};
const _tw7waq = (G, _) => G.input(_);
const _1hwvwcb = function _cAx(Inputs){return(
Inputs.range([
  0,
  400
], {
  label: 'A.x',
  step: 1,
  value: 80
})
)};
const _efs6g6 = (G, _) => G.input(_);
const _1j4930j = function _cAy(Inputs){return(
Inputs.range([
  0,
  400
], {
  label: 'A.y',
  step: 1,
  value: 140
})
)};
const _npmjqp = (G, _) => G.input(_);
const _3rd91d = function _cBx(Inputs){return(
Inputs.range([
  0,
  400
], {
  label: 'B.x',
  step: 1,
  value: 180
})
)};
const _vq23ix = (G, _) => G.input(_);
const _shuxo1 = function _cBy(Inputs){return(
Inputs.range([
  0,
  400
], {
  label: 'B.y',
  step: 1,
  value: 200
})
)};
const _1b75nse = (G, _) => G.input(_);
const _d0vomz = function _cCx(Inputs){return(
Inputs.range([
  0,
  400
], {
  label: 'C.x',
  step: 1,
  value: 220
})
)};
const _ad5now = (G, _) => G.input(_);
const _f20eky = function _cCy(Inputs){return(
Inputs.range([
  0,
  400
], {
  label: 'C.y',
  step: 1,
  value: 220
})
)};
const _w4e717 = (G, _) => G.input(_);
const _1ucp1vv = function _cDx(Inputs){return(
Inputs.range([
  0,
  400
], {
  label: 'D.x',
  step: 1,
  value: 320
})
)};
const _1so4ikb = (G, _) => G.input(_);
const _sedl1f = function _cDy(Inputs){return(
Inputs.range([
  0,
  400
], {
  label: 'D.y',
  step: 1,
  value: 280
})
)};
const _x0w80g = (G, _) => G.input(_);
const _y4car0 = function _constraintSvg(htl,cAx,cAy,cBx,cBy,cCx,cCy,cDx,cDy,anchor,constraintEnabled,constraint){return(
htl.svg`<svg width="400" height="400" viewBox="0 0 400 400" style="border-radius:8px; overflow:hidden; background:#0d1117;">
  <line x1=${ cAx } y1=${ cAy } x2=${ cBx } y2=${ cBy } stroke="#4af" stroke-width="3"/>
  <line x1=${ cCx } y1=${ cCy } x2=${ cDx } y2=${ cDy } stroke="#fa4" stroke-width="3"/>
  ${ anchor('A', {
  x: cAx,
  y: cAy
}) }
  ${ anchor('B', {
  x: cBx,
  y: cBy
}) }
  ${ anchor('C', {
  x: cCx,
  y: cCy
}) }
  ${ anchor('D', {
  x: cDx,
  y: cDy
}) }
  ${ constraintEnabled ? constraint('coincident', {
  name: 'BC',
  ax: cBx,
  ay: cBy,
  bx: cCx,
  by: cCy
}) : null }
</svg>`
)};
const _1rbg3n9 = function _constraintEditor(svgEditor,parametricSVGEditorModule,invalidation){return(
svgEditor({
  target: 'constraintSvg',
  module: parametricSVGEditorModule,
  invalidation
})
)};
const _1f5w792 = function _affordance(Event,anchor){return(
(id, opts) => {
  const {x, y, params, drag} = opts;
  const findParamsView = () => {
    for (const el of document.querySelectorAll('form')) {
      if (el.value === params)
        return el;
    }
    return null;
  };
  const writeView = (view, next) => {
    view.value = next;
    view.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const makeApi = (view, index, dims, ctx = {}) => ({
    get params() {
      const v = view.value;
      return v.slice(index, index + dims);
    },
    update(slice) {
      if (ctx.locksActive && ctx.locksActive() && ctx.solveLockedUpdate) {
        const j = ctx.anchorJacobian?.();
        const last = ctx.lastAuthorSlice?.();
        ctx.solveLockedUpdate(view, index, dims, slice, j, last);
        ctx.setLastAuthorSlice?.(Array.isArray(slice) ? slice.slice() : slice);
        return;
      }
      const v = view.value;
      const next = v.slice();
      const w = Math.min(dims, slice.length);
      for (let i = 0; i < w; i++)
        next[index + i] = slice[i];
      writeView(view, next);
    },
    delete() {
      const v = view.value;
      writeView(view, [
        ...v.slice(0, index),
        ...v.slice(index + dims)
      ]);
    },
    appendAfter(extraDims) {
      const v = view.value;
      writeView(view, [
        ...v.slice(0, index + dims),
        ...extraDims,
        ...v.slice(index + dims)
      ]);
    },
    appendNew(extra) {
      writeView(view, [
        ...view.value,
        ...extra
      ]);
    },
    get frozen() {
      return !!view.__lopecodeLocks?.has(ctx.anchorId);
    },
    setFrozen(bool) {
      const cur = !!view.__lopecodeLocks?.has(ctx.anchorId);
      if (!!bool !== cur && ctx.toggleLock)
        ctx.toggleLock(ctx.anchorId);
    }
  });
  const attachSpawn = (el, spawn, dims) => {
    if (!spawn)
      return;
    el.__drag = (evt, {overlay}) => {
      try {
        overlay.setPointerCapture(evt.pointerId);
      } catch {
      }
      const targetSvg = el.ownerSVGElement;
      const toLocal = ev => {
        const pt = targetSvg.createSVGPoint();
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        return pt.matrixTransform(targetSvg.getScreenCTM().inverse());
      };
      const start = {
        x: +el.getAttribute('cx'),
        y: +el.getAttribute('cy')
      };
      const NS = 'http://www.w3.org/2000/svg';
      const preview = document.createElementNS(NS, 'line');
      preview.setAttribute('x1', start.x);
      preview.setAttribute('y1', start.y);
      preview.setAttribute('x2', start.x);
      preview.setAttribute('y2', start.y);
      preview.setAttribute('stroke', '#fa4');
      preview.setAttribute('stroke-width', '2');
      preview.setAttribute('stroke-dasharray', '6,3');
      preview.style.pointerEvents = 'none';
      targetSvg.appendChild(preview);
      const onMove = e => {
        const p = toLocal(e);
        preview.setAttribute('x2', p.x);
        preview.setAttribute('y2', p.y);
      };
      const onUp = e => {
        overlay.removeEventListener('pointermove', onMove);
        overlay.removeEventListener('pointerup', onUp);
        overlay.removeEventListener('pointercancel', onUp);
        preview.remove();
        const p = toLocal(e);
        const dx = p.x - start.x, dy = p.y - start.y;
        if (Math.hypot(dx, dy) < 5)
          return;
        const view = findParamsView();
        if (!view)
          return;
        const raw = view.value;
        const trimmedLen = dims > 0 ? Math.floor(raw.length / dims) * dims : raw.length;
        if (trimmedLen < raw.length)
          view.value = raw.slice(0, trimmedLen);
        const cur = view.value;
        const seg = spawn(dx, dy, cur);
        if (!seg)
          return;
        makeApi(view, cur.length, 0).appendAfter(seg);
      };
      overlay.addEventListener('pointermove', onMove);
      overlay.addEventListener('pointerup', onUp);
      overlay.addEventListener('pointercancel', onUp);
    };
  };
  const attachGesture = (el, handlers, ownIndex, ownDims) => {
    if (!handlers.onClick && !handlers.onDrag && !handlers.onShiftClick)
      return;
    el.__drag = (evt, {overlay, toggleLock, anchorId, locksActive, solveLockedUpdate, estimateAnchorJacobian}) => {
      try {
        overlay.setPointerCapture(evt.pointerId);
      } catch {
      }
      const toLocal = ev => {
        const pt = overlay.createSVGPoint();
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        return pt.matrixTransform(overlay.getScreenCTM().inverse());
      };
      const start = toLocal(evt);
      const startMod = {
        shift: !!evt.shiftKey,
        alt: !!evt.altKey
      };
      const dragThreshold = 5;
      let dragged = false;
      let initial = null;
      let cachedView = findParamsView();
      let cachedAnchorJ = null;
      let lastAuthorSlice = null;
      if (anchorId && estimateAnchorJacobian && locksActive && locksActive()) {
        estimateAnchorJacobian(anchorId).then(j => {
          cachedAnchorJ = j;
        }).catch(() => {
        });
      }
      const buildApi = () => {
        if (!cachedView)
          return null;
        const api = makeApi(cachedView, ownIndex, ownDims, {
          anchorId,
          toggleLock,
          locksActive,
          solveLockedUpdate,
          anchorJacobian: () => cachedAnchorJ,
          lastAuthorSlice: () => lastAuthorSlice,
          setLastAuthorSlice: s => {
            lastAuthorSlice = s;
          }
        });
        api.initial = initial;
        return api;
      };
      const onMove = e => {
        const p = toLocal(e);
        const dx = p.x - start.x, dy = p.y - start.y;
        if (!dragged && !startMod.shift && Math.hypot(dx, dy) > dragThreshold) {
          dragged = true;
          initial = cachedView ? cachedView.value.slice(ownIndex, ownIndex + ownDims) : null;
        }
        if (dragged && handlers.onDrag) {
          handlers.onDrag({
            dx,
            dy,
            phase: 'move'
          }, buildApi());
        }
      };
      const onUp = e => {
        overlay.removeEventListener('pointermove', onMove);
        overlay.removeEventListener('pointerup', onUp);
        overlay.removeEventListener('pointercancel', onUp);
        const p = toLocal(e);
        const dx = p.x - start.x, dy = p.y - start.y;
        if (dragged) {
          if (handlers.onDrag)
            handlers.onDrag({
              dx,
              dy,
              phase: 'end'
            }, buildApi());
        } else {
          if (startMod.shift) {
            if (handlers.onShiftClick)
              handlers.onShiftClick(buildApi());
            else if (!handlers.onClick && toggleLock && anchorId)
              toggleLock(anchorId);
          } else if (handlers.onClick) {
            handlers.onClick(buildApi());
          }
        }
      };
      overlay.addEventListener('pointermove', onMove);
      overlay.addEventListener('pointerup', onUp);
      overlay.addEventListener('pointercancel', onUp);
    };
  };
  const renderAt = ({
    id,
    parent,
    drag: currentDrag,
    index,
    depth,
    apiIndex,
    apiDims
  }) => {
    const {dims = 0, render, spawn, handleRender, onClick, onDrag, onShiftClick} = currentDrag;
    const ownIndex = apiIndex !== undefined ? apiIndex : index;
    const ownDims = apiDims !== undefined ? apiDims : dims;
    const hasGesture = !!(onClick || onDrag || onShiftClick);
    const stashView = marker => {
      const view = findParamsView();
      if (view)
        marker.__paramsView = view;
      return view;
    };
    const wrapWithVisual = (marker, view) => {
      if (!handleRender)
        return marker;
      const NS = 'http://www.w3.org/2000/svg';
      const g = document.createElementNS(NS, 'g');
      g.classList.add('__handle');
      g.appendChild(marker);
      const hctx = {
        parent,
        params: params.slice(ownIndex, ownIndex + ownDims),
        index: ownIndex,
        depth,
        dims: ownDims,
        full: params,
        anchor,
        frozen: !!view?.__lopecodeLocks?.has(id)
      };
      const visual = handleRender(hctx);
      if (visual)
        g.appendChild(visual);
      return g;
    };
    if (dims > 0 && index + dims > params.length) {
      const marker = anchor(id, {
        x: parent.x,
        y: parent.y,
        kind: 'handle'
      });
      const view = stashView(marker);
      attachSpawn(marker, spawn, dims);
      attachGesture(marker, {
        onClick,
        onDrag,
        onShiftClick
      }, ownIndex, ownDims);
      return wrapWithVisual(marker, view);
    }
    if (!(dims > 0 && render)) {
      const marker = anchor(id, {
        x: parent.x,
        y: parent.y,
        kind: hasGesture || handleRender ? 'handle' : undefined
      });
      const view = stashView(marker);
      attachGesture(marker, {
        onClick,
        onDrag,
        onShiftClick
      }, ownIndex, ownDims);
      return wrapWithVisual(marker, view);
    }
    const view = params.slice(index, index + dims);
    const ctx = {
      parent,
      params: view,
      index,
      depth,
      dims,
      full: params,
      anchor,
      affordance: (childId, childPos, childOpts = currentDrag) => {
        const childIsSegment = childOpts.dims > 0 && childOpts.render;
        return renderAt({
          id: childId,
          parent: childPos,
          drag: childOpts,
          index: childIsSegment ? index + dims : index,
          depth: depth + 1,
          apiIndex: childIsSegment ? index + dims : index,
          apiDims: childIsSegment ? childOpts.dims : dims
        });
      }
    };
    return render(ctx);
  };
  return renderAt({
    id,
    parent: {
      x,
      y
    },
    drag,
    index: 0,
    depth: 0
  });
}
)};
const _15l1hje = function _111(svgEditor,parametricSVGEditorModule){return(
svgEditor({
  target: 'mySvg',
  module: parametricSVGEditorModule
})
)};
const _ayzpen = function _anchorTreeData(){return(
new Map([[
    'root',
    {
      children: [
        {
          id: 'b0',
          angleIdx: 0,
          lengthIdx: 1
        },
        {
          id: 'b1',
          angleIdx: 2,
          lengthIdx: 3
        }
      ]
    }
  ]])
)};
const _bnt873 = (M, _) => new M(_);
const _mkf6du = _ => _.generator;
const _1guzhsu = function _robotEditor(svgEditor,parametricSVGEditorModule){return(
svgEditor({
  target: 'robotArm',
  module: parametricSVGEditorModule
})
)};
const _32mwiz = function _growEdge(htl){return(
(start, end) => htl.svg`<line
  x1=${ start.x } y1=${ start.y }
  x2=${ end.x } y2=${ end.y }
  stroke="#4af" stroke-width="2"/>`
)};
const _c70qsy = function _115(md){return(
md
)};
const _14xrdks = function _treeAnchor(){return(
(() => {
  const findParametersView = params => {
    for (const el of document.querySelectorAll('form')) {
      if (el.value === params)
        return el;
    }
    return null;
  };
  const makeAnchor = (id, x, y) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.classList.add('__anchor');
    c.dataset.anchorId = id;
    c.setAttribute('cx', x);
    c.setAttribute('cy', y);
    c.setAttribute('r', '0.001');
    c.setAttribute('fill', 'none');
    c.style.pointerEvents = 'none';
    return c;
  };
  const defaultEdge = (start, end) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', start.x);
    line.setAttribute('y1', start.y);
    line.setAttribute('x2', end.x);
    line.setAttribute('y2', end.y);
    line.setAttribute('stroke', '#4af');
    line.setAttribute('stroke-width', '2');
    return line;
  };
  const buildNode = (parentX, parentY, nodeId, treeOpts, rootId) => {
    const {
      data: treeData,
      parameters: params,
      edge: edgeTemplate = defaultEdge
    } = treeOpts;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('__tree-anchor');
    g.dataset.nodeId = nodeId;
    if (nodeId === rootId) {
      const rootNode = treeData.get(rootId);
      if (rootNode) {
        if (!rootNode.__parametersView || rootNode.__parametersView.value !== params) {
          rootNode.__parametersView = findParametersView(params);
        }
      }
    }
    const anchorEl = makeAnchor(nodeId, parentX, parentY);
    anchorEl.__tree = treeOpts;
    anchorEl.__treeNode = {
      id: nodeId,
      __rootId: rootId
    };
    g.appendChild(anchorEl);
    const node = treeData.get(nodeId);
    if (node) {
      for (const child of node.children || []) {
        const angle = params[child.angleIdx] ?? 0;
        const length = params[child.lengthIdx] ?? 50;
        const rad = angle * Math.PI / 180;
        const cx = parentX + length * Math.cos(rad);
        const cy = parentY + length * Math.sin(rad);
        const edgeEl = edgeTemplate({
          x: parentX,
          y: parentY
        }, {
          x: cx,
          y: cy
        }, {
          parentId: nodeId,
          childId: child.id,
          rootId
        });
        if (edgeEl)
          g.appendChild(edgeEl);
        g.appendChild(buildNode(cx, cy, child.id, treeOpts, rootId));
      }
    }
    return g;
  };
  return (parentX, parentY, rootId, treeOpts) => buildNode(parentX, parentY, rootId, treeOpts, rootId);
})()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/dataflow-templating", async () => runtime.module((await import("/@tomlarkworthy/dataflow-templating.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/manipulate", async () => runtime.module((await import("/@tomlarkworthy/manipulate.js?v=4")).default));  
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));  
  $def("_4uvzms", null, ["md","tex"], _4uvzms);  
  $def("_42rckw", "anchor", [], _42rckw);  
  $def("_1yqv8c5", "viewof theta1", ["Inputs"], _1yqv8c5);  
  $def("_3xd66j", "theta1", ["Generators","viewof theta1"], _3xd66j);  
  $def("_11rtwmp", "viewof theta2", ["Inputs"], _11rtwmp);  
  $def("_1ig5yha", "theta2", ["Generators","viewof theta2"], _1ig5yha);  
  $def("_oe6tzf", "viewof theta3", ["Inputs"], _oe6tzf);  
  $def("_hsqtfd", "theta3", ["Generators","viewof theta3"], _hsqtfd);  
  $def("_12r0it", "robotArm", ["theta1","theta2","theta3","htl","anchor"], _12r0it);  
  $def("_1z0tw2c", null, ["svgEditor","parametricSVGEditorModule"], _1z0tw2c);  
  $def("_fmya46", null, ["md"], _fmya46);  
  $def("_fvrxem", null, ["md"], _fvrxem);  
  $def("_1egnsh9", "viewof aCx", ["Inputs"], _1egnsh9);  
  $def("_1m2viru", "aCx", ["Generators","viewof aCx"], _1m2viru);  
  $def("_1h07ofk", "viewof aCy", ["Inputs"], _1h07ofk);  
  $def("_1m2fexh", "aCy", ["Generators","viewof aCy"], _1m2fexh);  
  $def("_11hd0zp", "viewof aSize", ["Inputs"], _11hd0zp);  
  $def("_chhbnw", "aSize", ["Generators","viewof aSize"], _chhbnw);  
  $def("_1d3l6la", "viewof bX1", ["Inputs"], _1d3l6la);  
  $def("_1h9y2jr", "bX1", ["Generators","viewof bX1"], _1h9y2jr);  
  $def("_zepm9z", "viewof bY1", ["Inputs"], _zepm9z);  
  $def("_1v09gwa", "bY1", ["Generators","viewof bY1"], _1v09gwa);  
  $def("_8jku9i", "viewof bX2", ["Inputs"], _8jku9i);  
  $def("_1oqgtq2", "bX2", ["Generators","viewof bX2"], _1oqgtq2);  
  $def("_pyzqil", "viewof bY2", ["Inputs"], _pyzqil);  
  $def("_1ejcd6f", "bY2", ["Generators","viewof bY2"], _1ejcd6f);  
  $def("_138qp1", "viewof circleCx", ["Inputs"], _138qp1);  
  $def("_woge47", "circleCx", ["Generators","viewof circleCx"], _woge47);  
  $def("_1qtl9fi", "viewof circleCy", ["Inputs"], _1qtl9fi);  
  $def("_hzdbg", "circleCy", ["Generators","viewof circleCy"], _hzdbg);  
  $def("_cr8e2i", "viewof circleR", ["Inputs"], _cr8e2i);  
  $def("_7bf5w0", "circleR", ["Generators","viewof circleR"], _7bf5w0);  
  $def("_3l4ock", "mySvg", ["aCx","aSize","aCy","bX1","bX2","bY1","bY2","htl","anchor","circleCx","circleCy","circleR"], _3l4ock);  
  $def("_1eq061g", null, ["svgEditor","parametricSVGEditorModule"], _1eq061g);  
  $def("_17rihsi", null, ["md"], _17rihsi);  
  $def("_yuv4z3", null, ["md"], _yuv4z3);  
  $def("_1jtqw73", "bezierProse", ["md"], _1jtqw73);  
  $def("_1wvdm5d", "vector", ["Event"], _1wvdm5d);  
  $def("_mvq0hr", "viewof bezierSamples", ["Inputs"], _mvq0hr);  
  $def("_15z6cd8", "bezierSamples", ["Generators","viewof bezierSamples"], _15z6cd8);  
  $def("_j6jh4p", "viewof bezierPts", ["vector"], _j6jh4p);  
  $def("_164jo1i", "bezierPts", ["Generators","viewof bezierPts"], _164jo1i);  
  $def("_1scrabk", "bezierSvg", ["bezierPts","bezierSamples","htl","anchor"], _1scrabk);  
  $def("_l2g7e7", "bezierEditor", ["svgEditor","parametricSVGEditorModule"], _l2g7e7);  
  $def("_3wt318", "treeProse", ["md"], _3wt318);  
  $def("_k9161g", null, [], _k9161g);  
  $def("_8iy367", "viewof branchAngles", ["vector"], _8iy367);  
  $def("_11pakqo", "branchAngles", ["Generators","viewof branchAngles"], _11pakqo);  
  $def("_zwojll", "viewof trunkLength", ["Inputs"], _zwojll);  
  $def("_s9t678", "trunkLength", ["Generators","viewof trunkLength"], _s9t678);  
  $def("_qq4uj6", "viewof lengthDecay", ["Inputs"], _qq4uj6);  
  $def("_cwmic4", "lengthDecay", ["Generators","viewof lengthDecay"], _cwmic4);  
  $def("_1aurib9", "viewof branchThickness", ["Inputs"], _1aurib9);  
  $def("_1ia8f5o", "branchThickness", ["Generators","viewof branchThickness"], _1ia8f5o);  
  $def("_1ipxkga", "treeSvg", ["branchAngles","lengthDecay","trunkLength","branchThickness","htl","anchor"], _1ipxkga);  
  $def("_1wuq7ru", "treeEditor", ["svgEditor","parametricSVGEditorModule"], _1wuq7ru);  
  $def("_fzs368", "treeKKTProse", ["md","tex"], _fzs368);  
  $def("_1aubbgi", "fourBarProse", ["md"], _1aubbgi);  
  $def("_74tudw", "viewof crankAngle", ["Inputs"], _74tudw);  
  $def("_73s2iy", "crankAngle", ["Generators","viewof crankAngle"], _73s2iy);  
  $def("_29bydr", "viewof groundWidth", ["Inputs"], _29bydr);  
  $def("_dx8ifz", "groundWidth", ["Generators","viewof groundWidth"], _dx8ifz);  
  $def("_px8l2u", "fourBarLinkage", ["groundWidth","crankAngle","htl","anchor"], _px8l2u);  
  $def("_1czrhce", "fourBarEditor", ["svgEditor","parametricSVGEditorModule"], _1czrhce);  
  $def("_rdlwyg", null, ["md"], _rdlwyg);  
  $def("_1o5dq5", null, ["md"], _1o5dq5);  
  $def("_oujfvl", "svgEditor", ["cloneDataflow","svgEditor_template","Event"], _oujfvl);  
  $def("_1jm6gd7", "svgEditor_template", ["lookupVariable","parametricSVGEditorModule"], _1jm6gd7);  
  $def("_1xvm7s5", "svgTemplateVariable", ["lookupVariable","svgTargetName","svgTargetModule"], _1xvm7s5);  
  $def("_1pklbvm", "svgRenderDefinition", ["svgTemplateVariable"], _1pklbvm);  
  $def("_1n4g802", "svgInputNames", ["svgTemplateVariable"], _1n4g802);  
  $def("_s0of79", "svgParameterNames", ["svgParameterViews"], _s0of79);  
  $def("_15if1ue", "svgParameterViewByName", ["svgParameterNames","svgParameterViews"], _15if1ue);  
  $def("_pnltr3", "svgParameterVarByName", ["svgTemplateVariable","svgParameterNames"], _pnltr3);  
  $def("_p4f9sn", "svgParameterViewElByName", ["svgParameterNames","svgParameterVarByName"], _p4f9sn);  
  $def("_ows4y8", "svgParameterViews", ["svgTemplateVariable"], _ows4y8);  
  $def("_m2bixk", "resolveSvgRenderArgs", ["svgTemplateVariable","svgInputNames"], _m2bixk);  
  $def("_1b9quok", "renderProbe", ["resolveSvgRenderArgs","svgTemplateVariable"], _1b9quok);  
  $def("_1uoqxo5", "svgPointFromClient", [], _1uoqxo5);  
  $def("_13rrcm9", "rectAnchors", [], _13rrcm9);  
  $def("_1wzvplf", "rectAnchorsStable", [], _1wzvplf);  
  $def("_qi8jfq", "pickAnchor", [], _qi8jfq);  
  $def("_in6c8b", "pseudoInverseStepMxN", ["inverseConfig"], _in6c8b);  
  $def("_1exsn58", null, ["svgEditorStatus"], _1exsn58);  
  $def("_1izbfy1", "getCurrentParams", ["svgParameterViewElByName","svgParameterNames"], _1izbfy1);  
  $def("_h6x759", "svgEditor_setStatus", ["Event"], _h6x759);  
  $def("_gl4xy8", "svgEditor_getSvgNumericWidthHeight", [], _gl4xy8);  
  $def("_72xg9t", "svgEditor_createOverlay", [], _72xg9t);  
  $def("_8w4dic", "svgEditor_setOverlayVisible", [], _8w4dic);  
  $def("_psap3x", "svgEditor_syncOverlayToTarget", ["svgEditor_getSvgNumericWidthHeight"], _psap3x);  
  $def("_1gplv37", "svgEditor_clearOverlay", [], _1gplv37);  
  $def("_1so0muw", "svgEditor_drawOverlay", ["svgEditor_clearOverlay"], _1so0muw);  
  $def("_vnp9gy", "svgEditor_computeOverTarget", [], _vnp9gy);  
  $def("_1wtvo8y", "svgEditor_clampToView", [], _1wtvo8y);  
  $def("_a0xnw7", "svgEditor_commitParams", ["svgEditor_clampToView","Event"], _a0xnw7);  
  $def("_1al84jc", "svgEditor_anchorFromSvgById", [], _1al84jc);  
  $def("_1qicecz", "svgEditor_estimateJacobianForAnchor", ["svgEditor_anchorFromSvgById"], _1qicecz);  
  $def("_1rvpchm", "svgEditorController", ["svgEditor_setStatus","viewof svgEditorStatus","svgEditorArgs","svgEditor_createOverlay","htl","pseudoInverseStepMxN","svgParameterViews","rectAnchorsStable","svgPointFromClient","svgEditor_estimateJacobianForAnchor","renderProbe","constraintsFromSvg","svgEditor_estimateJacobianForConstraint","Event","svgEditor_drawOverlay","inverseConfig","svgEditor_commitParams","pickAnchor","svgEditor_setOverlayVisible","svgTemplateVariable","svgEditor_computeOverTarget","svgEditor_syncOverlayToTarget","svgEditor_clearOverlay","invalidation"], _1rvpchm);  
  $def("_1qwm53c", "viewof inverseConfig", ["Inputs"], _1qwm53c);  
  $def("_m9slbk", "inverseConfig", ["Generators","viewof inverseConfig"], _m9slbk);  
  $def("_zhvt9n", "viewof parametricSVGEditorModule", ["thisModule"], _zhvt9n);  
  $def("_6tex8v", "parametricSVGEditorModule", ["Generators","viewof parametricSVGEditorModule"], _6tex8v);  
  $def("_1kkxlbk", "viewof svgEditorStatus", ["EventTarget"], _1kkxlbk);  
  $def("_oi7gqz", "svgEditorStatus", ["Generators","viewof svgEditorStatus"], _oi7gqz);  
  $def("_1o2cjqr", "viewof svgTargetName", ["Inputs"], _1o2cjqr);  
  $def("_1ejew6y", "svgTargetName", ["Generators","viewof svgTargetName"], _1ejew6y);  
  $def("_kmivws", "viewof svgTargetModule", ["Inputs","parametricSVGEditorModule"], _kmivws);  
  $def("_6v324l", "svgTargetModule", ["Generators","viewof svgTargetModule"], _6v324l);  
  $def("_4kjrtv", "scissorProse", ["md"], _4kjrtv);  
  $def("_u09z55", "viewof scissorParams", ["vector"], _u09z55);  
  $def("_2jlpc2", "scissorParams", ["Generators","viewof scissorParams"], _2jlpc2);  
  $def("_190xpi9", "scissorSvg", ["htl","affordance","scissorParams"], _190xpi9);  
  $def("_1czpsnh", "scissorEditor", ["scissorShape","svgEditor","parametricSVGEditorModule","invalidation"], _1czpsnh);  
  $def("_e50qn0", "scissorShape", ["Generators","viewof scissorParams"], _e50qn0);  
  $def("_1j4gmz4", "trellisProse", ["md"], _1j4gmz4);  
  $def("_z537y", "viewof trellisGround", ["vector"], _z537y);  
  $def("_gahzu0", "trellisGround", ["Generators","viewof trellisGround"], _gahzu0);  
  $def("_lmqfdg", "viewof trellisUnits", ["vector"], _lmqfdg);  
  $def("_nmm7uw", "trellisUnits", ["Generators","viewof trellisUnits"], _nmm7uw);  
  $def("_1q6ebgf", "trellisSvg", ["viewof trellisUnits","trellisGround","Event","trellisUnits","htl","affordance"], _1q6ebgf);  
  $def("_1fvgbbc", "trellisEditor", ["trellisShape","svgEditor","parametricSVGEditorModule","invalidation"], _1fvgbbc);  
  $def("_1lmv8u8", "trellisShape", ["Generators","viewof trellisUnits"], _1lmv8u8);  
  $def("_1ov5t0f", "viewof svgEditorArgs", ["Inputs"], _1ov5t0f);  
  $def("_q4y63c", "svgEditorArgs", ["Generators","viewof svgEditorArgs"], _q4y63c);  
  $def("_1oj0ekd", "constraint", [], _1oj0ekd);  
  $def("_1gakv0r", "constraintsFromSvg", [], _1gakv0r);  
  $def("_zorryd", "svgEditor_estimateJacobianForConstraint", [], _zorryd);  
  $def("_gu3nwx", "constraintProse", ["md"], _gu3nwx);  
  $def("_gfk87u", "viewof constraintEnabled", ["Inputs"], _gfk87u);  
  $def("_tw7waq", "constraintEnabled", ["Generators","viewof constraintEnabled"], _tw7waq);  
  $def("_1hwvwcb", "viewof cAx", ["Inputs"], _1hwvwcb);  
  $def("_efs6g6", "cAx", ["Generators","viewof cAx"], _efs6g6);  
  $def("_1j4930j", "viewof cAy", ["Inputs"], _1j4930j);  
  $def("_npmjqp", "cAy", ["Generators","viewof cAy"], _npmjqp);  
  $def("_3rd91d", "viewof cBx", ["Inputs"], _3rd91d);  
  $def("_vq23ix", "cBx", ["Generators","viewof cBx"], _vq23ix);  
  $def("_shuxo1", "viewof cBy", ["Inputs"], _shuxo1);  
  $def("_1b75nse", "cBy", ["Generators","viewof cBy"], _1b75nse);  
  $def("_d0vomz", "viewof cCx", ["Inputs"], _d0vomz);  
  $def("_ad5now", "cCx", ["Generators","viewof cCx"], _ad5now);  
  $def("_f20eky", "viewof cCy", ["Inputs"], _f20eky);  
  $def("_w4e717", "cCy", ["Generators","viewof cCy"], _w4e717);  
  $def("_1ucp1vv", "viewof cDx", ["Inputs"], _1ucp1vv);  
  $def("_1so4ikb", "cDx", ["Generators","viewof cDx"], _1so4ikb);  
  $def("_sedl1f", "viewof cDy", ["Inputs"], _sedl1f);  
  $def("_x0w80g", "cDy", ["Generators","viewof cDy"], _x0w80g);  
  $def("_y4car0", "constraintSvg", ["htl","cAx","cAy","cBx","cBy","cCx","cCy","cDx","cDy","anchor","constraintEnabled","constraint"], _y4car0);  
  $def("_1rbg3n9", "constraintEditor", ["svgEditor","parametricSVGEditorModule","invalidation"], _1rbg3n9);  
  $def("_1f5w792", "affordance", ["Event","anchor"], _1f5w792);  
  $def("_15l1hje", null, ["svgEditor","parametricSVGEditorModule"], _15l1hje);  
  $def("_ayzpen", "initial anchorTreeData", [], _ayzpen);  
  $def("_bnt873", "mutable anchorTreeData", ["Mutable","initial anchorTreeData"], _bnt873);  
  $def("_mkf6du", "anchorTreeData", ["mutable anchorTreeData"], _mkf6du);  
  $def("_1guzhsu", "robotEditor", ["svgEditor","parametricSVGEditorModule"], _1guzhsu);  
  $def("_32mwiz", "growEdge", ["htl"], _32mwiz);  
  $def("_c70qsy", null, ["md"], _c70qsy);  
  $def("_14xrdks", "treeAnchor", [], _14xrdks);  
  main.define("cloneDataflow", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("cloneDataflow", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("manipulate", ["module @tomlarkworthy/manipulate", "@variable"], (_, v) => v.import("manipulate", _));  
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  return main;
}