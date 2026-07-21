const _d8kr5r = function _1(md){return(
md`# Retro Title Graphic`
)};
const _1wdlnbt = function _gfx(svg,fov,width,horizonOffset,square,hackableY,topText,realtimeY,middleText){return(
svg`<svg viewBox="${-fov} ${-fov} ${2 * fov} ${2 * fov}"
width="${Math.min(width, 640)}px" height="${
  (Math.min(width, 640) * 630) / 1200
}px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>

    <linearGradient id="sky" gradientTransform="rotate(90)">
      <stop offset="0%" stop-color="#120017" />
      <stop offset="50%" stop-color="#26117D" />
      <stop offset="80%" stop-color="#D800AF" />
      <stop offset="90%" stop-color="#FF9FB7" />
      <stop offset="100%" stop-color="#6149ED" />
    </linearGradient>

    <linearGradient id="rainbowFill" gradientTransform="rotate(90)">
      <stop offset="20%" stop-color="#ADA6FF" />
      <stop offset="45%" stop-color="#404CFF" />
      <stop offset="55%" stop-color="#3EFF94" />
      <stop offset="65%" stop-color="#FF8F00" />
      <stop offset="90%" stop-color="#FFA5A5" />
      <stop offset="100%" stop-color="#FFCE29" />
    </linearGradient>

    
    <radialGradient id="groundFill" cy="0%" r="1">
      <stop offset="0%" stop-color="#6149ED"/>
      <stop offset="100%" stop-color="#120017" />
    </radialGradient>


    <linearGradient id="surfaceFill" gradientTransform="rotate(90)">
      <stop offset="0%" stop-color="yellow"  stop-opacity="0"/>
      <stop offset="13%" stop-color="yellow"  stop-opacity="0"/>
      <stop offset="16%" stop-color="yellow" />
      <stop offset="100%" stop-color="orange" />
    </linearGradient>


    <linearGradient id="chromeFill" gradientTransform="rotate(90)">
      <stop offset="15%" stop-color="#4E4A5F" />
      <stop offset="20%" stop-color="#C7C1EC" />
      <stop offset="30%" stop-color="#C3C5DE" />
      <stop offset="45%" stop-color="#DFD9DF" />
      <stop offset="60%" stop-color="#837199" />
      <stop offset="65%" stop-color="#271B5C" />
      <stop offset="75%" stop-color="#D7DEF0" />
    </linearGradient>
    
    <rect id="ground" x="-1" y="0" width= "2" height="${
      1 * fov
    }" fill="url(#groundFill)"/>

    <rect id="surface" x="-1" y="0" width= "2" height="${
      1 * fov
    }" fill="url(#surfaceFill)"/>

      

  </defs>
  
  <rect x="-1" y="${-1 * fov}" width= "2" height="${
  1 * fov + horizonOffset
}" fill="url(#sky)" />

  
  <rect id="ground" x="-1" y="${horizonOffset}" width= "2" height="${
  1 * fov - horizonOffset
}" fill="url(#groundFill)" />

  
    <clipPath id="cells">
      ${Array.from({ length: 4 * 15 }).map((_, xy) =>
        square([(xy % 4) - 2, Math.floor(xy / 4), 1], "url(#ground)")
      )}
    </clipPath>

  <use clip-path="url(#cells)" href="#surface" />

  <text y=${hackableY} stroke="url(#chromeFill)" stroke-width="0.005" fill="url(#chromeFill)"
    text-anchor = "middle"
    style="font: italic bold 0.15px sans-serif; font-family: helvetica; letter-spacing: 0px;">
    ${topText}
  </text>


  <text y=${realtimeY}
    fill="url(#rainbowFill)"
    stroke="url(#rainbowFill)"
    stroke-width="0.005"
    text-anchor = "middle"
    style="font-weight: bold; font-size:  0.15px; font-family: arial; letter-spacing: 0px;">
    ${middleText}
  </text>



</svg>`
)};
const _ub8ece = function _topText(Inputs){return(
Inputs.text({ label: "Silver text", value: "Top" })
)};
const _inq1em = (G, _) => G.input(_);
const _j97w9r = function _middleText(Inputs){return(
Inputs.text({
  label: "Rainbow text",
  value: "Rainbow Text"
})
)};
const _3i7qkq = (G, _) => G.input(_);
const _ki7knl = function _fov(Inputs){return(
Inputs.range([0, 2], { value: 0.5, label: "FOV" })
)};
const _1bwfjb9 = (G, _) => G.input(_);
const _ea76nl = function _corner_radius(Inputs){return(
Inputs.range([0, 1], {
  value: 0.3,
  label: "corner_radius"
})
)};
const _1ucvly6 = (G, _) => G.input(_);
const _1pdju9r = function _padding(Inputs){return(
Inputs.range([0, 1], {
  value: 0.02,
  label: "padding"
})
)};
const _1sz59vn = (G, _) => G.input(_);
const _1w6hdwu = function _horizonOffset(Inputs){return(
Inputs.range([-1, 1], {
  value: 0.125,
  label: "horizon offset"
})
)};
const _3kdxou = (G, _) => G.input(_);
const _fwksq = function _hackableY(Inputs){return(
Inputs.range([-1, 1], {
  value: -0.23,
  label: "hackableY"
})
)};
const _18hrbum = (G, _) => G.input(_);
const _1asuej3 = function _realtimeY(Inputs){return(
Inputs.range([-1, 1], {
  value: 0.0065283621064848,
  label: "realtimeY"
})
)};
const _1diurvu = (G, _) => G.input(_);
const _117sax8 = function _speed(Inputs){return(
Inputs.range([0, 10], {
  value: 0.3,
  label: "speed"
})
)};
const _ms03oh = (G, _) => G.input(_);
const _1oatmj6 = function _project(){return(
(d) =>
  d.map((d) => [
    d[0] / (d[1] + 1), // screen x
    d[2] / (d[1] + 1) // screen y
  ])
)};
const _1x5z634 = function _square(corner_radius,project,padding,speed){return(
([dx, dy, dz], color) => {
  const id = `s(${dx},${dy},${dz})`;
  const rounding = corner_radius;

  const p = project([
    [dx + rounding + padding, dy + padding, dz],
    [dx + 1 - rounding - padding, dy + padding, dz],
    [dx + 1 - padding, dy + padding, dz],
    [dx + 1 - padding, dy + rounding + padding, dz],
    [dx + 1 - padding, dy + 1 - rounding - padding, dz],
    [dx + 1 - padding, dy + 1 - padding, dz],
    [dx + 1 - rounding - padding, dy + 1 - padding, dz],
    [dx + rounding + padding, dy + 1 - padding, dz],
    [dx + padding, dy + 1 - padding, dz],
    [dx + padding, dy + 1 - rounding - padding, dz],
    [dx + padding, dy + rounding + padding, dz],
    [dx + padding, dy + padding, dz],

    [dx + rounding + padding, dy + 1 + padding, dz],
    [dx + 1 - rounding - padding, dy + 1 + padding, dz],
    [dx + 1 - padding, dy + 1 + padding, dz],
    [dx + 1 - padding, dy + 1 + rounding + padding, dz],
    [dx + 1 - padding, dy + 1 + 1 - rounding - padding, dz],
    [dx + 1 - padding, dy + 1 + 1 - padding, dz],
    [dx + 1 - rounding - padding, dy + 1 + 1 - padding, dz],
    [dx + rounding + padding, dy + 1 + 1 - padding, dz],
    [dx + padding, dy + 1 + 1 - padding, dz],
    [dx + padding, dy + 1 + 1 - rounding - padding, dz],
    [dx + padding, dy + 1 + rounding + padding, dz],
    [dx + padding, dy + 1 + padding, dz]
  ]);
  const coord = (index) => `${p[index][0]} ${p[index][1]}`;

  const d0 = `M ${coord(0)}
L ${coord(1)} 
C ${coord(2)}, ${coord(2)}, ${coord(3)}
L ${coord(4)}
C ${coord(5)},${coord(5)},${coord(6)}
L ${coord(7)} 
C ${coord(8)},${coord(8)},${coord(9)}
L ${coord(10)} 
C ${coord(11)},${coord(11)},${coord(0)}
Z`;

  const d1 = `M ${coord(0 + 12)}
L ${coord(1 + 12)} 
C ${coord(2 + 12)}, ${coord(2 + 12)}, ${coord(3 + 12)}
L ${coord(4 + 12)}
C ${coord(5 + 12)},${coord(5 + 12)},${coord(6 + 12)}
L ${coord(7 + 12)} 
C ${coord(8 + 12)},${coord(8 + 12)},${coord(9 + 12)}
L ${coord(10 + 12)} 
C ${coord(11 + 12)},${coord(11 + 12)},${coord(0 + 12)}
Z`;

  return `<path id=${id} d="${d0}" fill="${color}">
<animate xlink:href="#${id}"
    attributeName="d"
    attributeType="XML"
    begin="0s"
    from="${d1}"
    to="${d0}"
    dur="${speed}s" repeatCount="indefinite"
/>

</path>

`;
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_d8kr5r", null, ["md"], _d8kr5r);  
  $def("_1wdlnbt", "gfx", ["svg","fov","width","horizonOffset","square","hackableY","topText","realtimeY","middleText"], _1wdlnbt);  
  $def("_ub8ece", "viewof topText", ["Inputs"], _ub8ece);  
  $def("_inq1em", "topText", ["Generators","viewof topText"], _inq1em);  
  $def("_j97w9r", "viewof middleText", ["Inputs"], _j97w9r);  
  $def("_3i7qkq", "middleText", ["Generators","viewof middleText"], _3i7qkq);  
  $def("_ki7knl", "viewof fov", ["Inputs"], _ki7knl);  
  $def("_1bwfjb9", "fov", ["Generators","viewof fov"], _1bwfjb9);  
  $def("_ea76nl", "viewof corner_radius", ["Inputs"], _ea76nl);  
  $def("_1ucvly6", "corner_radius", ["Generators","viewof corner_radius"], _1ucvly6);  
  $def("_1pdju9r", "viewof padding", ["Inputs"], _1pdju9r);  
  $def("_1sz59vn", "padding", ["Generators","viewof padding"], _1sz59vn);  
  $def("_1w6hdwu", "viewof horizonOffset", ["Inputs"], _1w6hdwu);  
  $def("_3kdxou", "horizonOffset", ["Generators","viewof horizonOffset"], _3kdxou);  
  $def("_fwksq", "viewof hackableY", ["Inputs"], _fwksq);  
  $def("_18hrbum", "hackableY", ["Generators","viewof hackableY"], _18hrbum);  
  $def("_1asuej3", "viewof realtimeY", ["Inputs"], _1asuej3);  
  $def("_1diurvu", "realtimeY", ["Generators","viewof realtimeY"], _1diurvu);  
  $def("_117sax8", "viewof speed", ["Inputs"], _117sax8);  
  $def("_ms03oh", "speed", ["Generators","viewof speed"], _ms03oh);  
  $def("_1oatmj6", "project", [], _1oatmj6);  
  $def("_1x5z634", "square", ["corner_radius","project","padding","speed"], _1x5z634);
  return main;
}