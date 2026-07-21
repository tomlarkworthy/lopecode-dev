const _e82nxn = function _1(md){return(
md`# Lazer Cut Plant Pot`
)};
const _18ve0s0 = function _width(Inputs){return(
Inputs.range([1, 200], { label: "width", value: 90, step: 1 })
)};
const _18yi11m = (G, _) => G.input(_);
const _1389ora = function _3(md){return(
md`## Side (x4)`
)};
const _u2ge3q = function _pot_side(width,htl,units,finger_clockwise_v1)
{
  const padding = 10;
  const total_width = width + 2 * padding;
  const total_height = width + 2 * padding;
  return htl.svg`<div 
    style="
            width: ${total_width}${units};
            height: ${total_height}${units};
            padding: 5px;
    ">
    <svg  class="lzr"
          filename="nozzle_end"
          width="${total_width}${units}"
          height="${total_height}${units}"
          viewBox="0 0 ${total_width} ${total_height}"
          fill="none"
    >
      <!--<rect stroke="green" x=${padding} y=${padding} width=${width} height=${width} />-->
      <path stroke="red" fill="none" d="
        M ${padding} ${padding}
        ${finger_clockwise_v1([padding, padding], [padding + width, padding])} 
        ${finger_clockwise_v1(
          [padding + width, padding],
          [padding + width, padding + width]
        )} 
        L ${padding + width - 10} ${padding + width}
        L ${padding + width - 10} ${padding + width - 5}
        L ${padding + width - 18} ${padding + width - 10}
        ${finger_clockwise_v1(
          [padding + width - 18, padding + width - 10],
          [padding + 18, padding + width - 10]
        )} 
        L ${padding + 18} ${padding + width - 10}
        L ${padding + 10} ${padding + width - 5}
        L ${padding + 10} ${padding + width}
        L ${padding} ${padding + width}
        ${finger_clockwise_v1([padding, padding + width], [padding, padding])} 
      "/>
  </div>`;
};
const _12lymt5 = function _5(md){return(
md`## Top
`
)};
const _1mf1jvh = function _pot_top(width,htl,units,mortise_clockwise_v1)
{
  const padding = 10;
  const total_width = width + 2 * padding;
  const total_height = width + 2 * padding;
  return htl.svg`<div 
    style="
            width: ${total_width}${units};
            height: ${total_height}${units};
            padding: 5px;
    ">
    <svg  class="lzr"
          filename="nozzle_end"
          width="${total_width}${units}"
          height="${total_height}${units}"
          viewBox="0 0 ${total_width} ${total_height}"
          fill="none"
    >
      <path stroke="red" fill="none" d="
        M ${padding} ${padding}
        ${mortise_clockwise_v1(
          [padding, padding],
          [padding + width - 3, padding]
        )} 
        M ${padding + width} ${padding}
        ${mortise_clockwise_v1(
          [padding + width, padding],
          [padding + width, padding + width - 3]
        )} 

        M ${padding + width} ${padding + width}
        ${mortise_clockwise_v1(
          [padding + width, padding + width],
          [padding + 3, padding + width]
        )} 

        M ${padding} ${padding + width}
        ${mortise_clockwise_v1(
          [padding, padding + width],
          [padding, padding + 3]
        )} 
        
        M ${padding - 3} ${padding - 3}
        L ${padding + 3 + width} ${padding - 3}
        L ${padding + 3 + width} ${padding + width + 3}
        L ${padding - 3} ${padding + width + 3}
        L ${padding - 3} ${padding - 3}

        
        M ${padding + 6} ${padding + 6}
        L ${padding + width - 6} ${padding + 6}
        L ${padding + width - 6} ${padding + width - 6}
        L ${padding + 6} ${padding + width - 6}
        L ${padding + 6} ${padding + 6}
      "/>
  </div>`;
};
const _9g5ror = function _7(md){return(
md`## Bottom`
)};
const _1lspqoj = function _pot_bottom(width,htl,units,mortise_clockwise_v1)
{
  const padding = 10;
  const total_width = width + 2 * padding;
  const total_height = width + 2 * padding;
  return htl.svg`<div 
    style="
            width: ${total_width}${units};
            height: ${total_height}${units};
            padding: 5px;
    ">
    <svg  class="lzr"
          filename="nozzle_end"
          width="${total_width}${units}"
          height="${total_height}${units}"
          viewBox="0 0 ${total_width} ${total_height}"
          fill="none"
    >
      <circle stroke="red" cx=${(2 * padding + width) * 0.5} cy=${
    (2 * padding + width) * 0.5
  } r=6 />
      <circle stroke="red" cx=${(2 * padding + width) * 0.7} cy=${
    (2 * padding + width) * 0.7
  } r=6 />
      <circle stroke="red" cx=${(2 * padding + width) * 0.3} cy=${
    (2 * padding + width) * 0.3
  } r=6 />
      <circle stroke="red" cx=${(2 * padding + width) * 0.7} cy=${
    (2 * padding + width) * 0.3
  } r=6 />
      <circle stroke="red" cx=${(2 * padding + width) * 0.3} cy=${
    (2 * padding + width) * 0.7
  } r=6 />
      <path stroke="red" fill="none" d="
        
        M ${padding} ${padding}
        L ${padding + 21} ${padding}
        L ${padding + 21} ${padding + 3}
        L ${padding + 3} ${padding + 3}
        L ${padding + 3} ${padding + 18}
        L ${padding} ${padding + 18}
        L ${padding} ${padding}

        
        M ${padding + width} ${padding}
        L ${padding + width} ${padding + 21}
        L ${padding + width - 3} ${padding + 21}
        L ${padding + width - 3} ${padding + 3}
        L ${padding + width - 18} ${padding + 3}
        L ${padding + width - 18} ${padding}
        L ${padding + width} ${padding}


        M ${padding + width} ${padding + width}
        L ${padding + width - 21} ${padding + width}
        L ${padding + width - 21} ${padding + width - 3}
        L ${padding + width - 3} ${padding + width - 3}
        L ${padding + width - 3} ${padding + width - 18}
        L ${padding + width} ${padding + width - 18}
        L ${padding + width} ${padding + width}


        M ${padding} ${padding + width}
        L ${padding} ${padding + width - 21}
        L ${padding + 3} ${padding + width - 21}
        L ${padding + 3} ${padding + width - 3}
        L ${padding + 18} ${padding + width - 3}
        L ${padding + 18} ${padding + width}
        L ${padding} ${padding + width}

        M ${padding - 3} ${padding - 3}
        L ${padding + 3 + width} ${padding - 3}
        L ${padding + 3 + width} ${padding + width + 3}
        L ${padding - 3} ${padding + width + 3}
        L ${padding - 3} ${padding - 3}

        M ${padding + 21} ${padding}
        ${mortise_clockwise_v1(
          [padding + 21, padding],
          [padding + width - 18, padding]
        )} 
        M ${padding + width} ${padding + 21}
        ${mortise_clockwise_v1(
          [padding + width, padding + 21],
          [padding + width, padding + width - 18]
        )} 

        M ${padding + width - 21} ${padding + width}
        ${mortise_clockwise_v1(
          [padding + width - 21, padding + width],
          [padding + 18, padding + width]
        )} 

        M ${padding} ${padding + width - 21}
        ${mortise_clockwise_v1(
          [padding, padding + width - 21],
          [padding, padding + 18]
        )} 
      "/>
  </div>`;
};
const _1so5ece = function _9(md){return(
md`## Cap`
)};
const _wu5u7 = function _pot_cap(width,htl,units)
{
  const padding = 10;
  const total_width = width + 2 * padding;
  const total_height = width + 2 * padding;
  return htl.svg`<div 
    style="
            width: ${total_width}${units};
            height: ${total_height}${units};
            padding: 5px;
    ">
    <svg  class="lzr"
          filename="nozzle_end"
          width="${total_width}${units}"
          height="${total_height}${units}"
          viewBox="0 0 ${total_width} ${total_height}"
          fill="none"
    >
      <path stroke="red" fill="none" d="
        
        M ${padding - 1} ${padding - 1}
        L ${padding + 1 + width} ${padding - 1}
        L ${padding + 1 + width} ${padding + width + 1}
        L ${padding - 1} ${padding + width + 1}
        L ${padding - 1} ${padding - 1}
        
        M ${padding + 4} ${padding + 4}
        L ${padding + width - 4} ${padding + 4}
        L ${padding + width - 4} ${padding + width - 4}
        L ${padding + 4} ${padding + width - 4}
        L ${padding + 4} ${padding + 4}
      "/>
  </div>`;
};
const _1plj4kf = function _11(md){return(
md`## Saucer Top`
)};
const _1kbzws8 = function _n(Inputs){return(
Inputs.range([1, 5], {
  label: "number of pots to hold",
  value: 2,
  step: 1
})
)};
const _1ydeilc = (G, _) => G.input(_);
const _123rney = function _extension(Inputs){return(
Inputs.range([1, 30], {
  label: "extension",
  value: 5,
  step: 1
})
)};
const _1plqgqn = (G, _) => G.input(_);
const _acn27w = function _saucer_main(width,n,htl,units,extension)
{
  const padding = 20;
  const unit_length = width + 10;
  const total_width = unit_length * n + 2 * padding;
  const total_height = unit_length + 2 * padding;
  return htl.svg`<div 
    style="
            width: ${total_width}${units};
            height: ${total_height}${units};
            padding: 5px;
    ">
    <svg  class="lzr"
          filename="nozzle_end"
          width="${total_width}${units}"
          height="${total_height}${units}"
          viewBox="0 0 ${total_width} ${total_height}"
          fill="none"
    >
      <path stroke="red" fill="none" d="
        
        M ${padding - 1 - extension} ${padding - 1 - extension}
        L ${padding + 1 + unit_length * (n - 1) + width + extension} ${
    padding - 1 - extension
  }
        L ${padding + 1 + unit_length * (n - 1) + width + extension} ${
    padding + width + 1 + extension
  }
        L ${padding - 1 - extension} ${padding + width + 1 + extension}
        L ${padding - 1 - extension} ${padding - 1 - extension}

        ${Array.from({ length: n })
          .map(
            (_, i) => `
              M ${padding + unit_length * i} ${padding}
              L ${padding + 21 + unit_length * i} ${padding}
              L ${padding + 21 + unit_length * i} ${padding + 3}
              L ${padding + 3 + unit_length * i} ${padding + 3}
              L ${padding + 3 + unit_length * i} ${padding + 18}
              L ${padding + unit_length * i} ${padding + 18}
              L ${padding + unit_length * i} ${padding}
      
              
              M ${padding + width + unit_length * i} ${padding}
              L ${padding + width + unit_length * i} ${padding + 21}
              L ${padding + width - 3 + unit_length * i} ${padding + 21}
              L ${padding + width - 3 + unit_length * i} ${padding + 3}
              L ${padding + width - 18 + unit_length * i} ${padding + 3}
              L ${padding + width - 18 + unit_length * i} ${padding}
              L ${padding + width + unit_length * i} ${padding}
      
      
              M ${padding + width + unit_length * i} ${padding + width}
              L ${padding + width - 21 + unit_length * i} ${padding + width}
              L ${padding + width - 21 + unit_length * i} ${padding + width - 3}
              L ${padding + width - 3 + unit_length * i} ${padding + width - 3}
              L ${padding + width - 3 + unit_length * i} ${padding + width - 18}
              L ${padding + width + unit_length * i} ${padding + width - 18}
              L ${padding + width + unit_length * i} ${padding + width}
      
      
              M ${padding + unit_length * i} ${padding + width}
              L ${padding + unit_length * i} ${padding + width - 21}
              L ${padding + 3 + unit_length * i} ${padding + width - 21}
              L ${padding + 3 + unit_length * i} ${padding + width - 3}
              L ${padding + 18 + unit_length * i} ${padding + width - 3}
              L ${padding + 18 + unit_length * i} ${padding + width}
              L ${padding + unit_length * i} ${padding + width}
            `
          )
          .join()}
      "/>
  </div>`;
};
const _rzflzq = function _saucer_top(width,n,htl,units)
{
  const padding = 10;
  const spacing = 10;
  const total_width = width * n + 2 * padding;
  const total_height = width + 2 * padding;
  return htl.svg`<div 
    style="
            width: ${total_width}${units};
            height: ${total_height}${units};
            padding: 5px;
    ">
    <svg  class="lzr"
          filename="nozzle_end"
          width="${total_width}${units}"
          height="${total_height}${units}"
          viewBox="0 0 ${total_width} ${total_height}"
          fill="none"
    >
      <path stroke="red" fill="none" d="
        
        M ${padding - 1} ${padding - 1}
        L ${padding + 1 + width * n} ${padding - 1}
        L ${padding + 1 + width * n} ${padding + width + 1}
        L ${padding - 1} ${padding + width + 1}
        L ${padding - 1} ${padding - 1}
        
        M ${padding + 4} ${padding + 4}
        L ${padding + width * n - 4} ${padding + 4}
        L ${padding + width * n - 4} ${padding + width - 4}
        L ${padding + 4} ${padding + width - 4}
        L ${padding + 4} ${padding + 4}
      "/>
  </div>`;
};
const _fy74h5 = function _16(md){return(
md`## Art`
)};
const _1wdorsv = function _plant(art)
{
  const blob = new Blob([art], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const image = document.createElement("img");
  image.src = url;
  return image;
};
const _8rla29 = function _19(art){return(
art.outerHTML
)};
const _fo6cls = function _plantURL(art)
{
  return "data:image/svg+xml," + encodeURIComponent(art.outerHTML);
  // const canvas = document.createElement("canvas");
  // canvas.width = 512;
  // canvas.height = 512;
  // const context = canvas.getContext("2d");

  // context.drawImage(await plant.image({ width: 512 }), 0, 0, 512, 512);
  // return canvas.toDataURL();
};
const _1sgrudy = function _21(md){return(
md`Can convert to vector with https://tech-lagoon.com/imagechef/en/image-to-edge.html

https://svgconverter.app/free`
)};
const _1ntev3j = function _material_thickness(){return(
3
)};
const _l7xmki = function _units(){return(
"mm"
)};
const _2ji7b4 = function _distance2DSquared(){return(
(a, b) =>
  (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])
)};
const _vs1pmn = function _mod(){return(
function mod(n, m) {
  return ((n % m) + m) % m;
}
)};
const _13hvxjo = function _26(md){return(
md`#### Mortise Joint`
)};
const _ub9x30 = function _mortise_clockwise_v1(distance2DSquared,material_thickness,mod){return(
(
  start,
  end,
  {
    offset,
    finger_depth = 3,
    finger_width = 3,
    cut_correction,
    end_anchor = false,
    reverse = false,
    delayStart = NaN,
    delayEnd = NaN,
    reverseDelay = false,
    debug = false
  } = {}
) => {
  const distance = (a, b) => Math.sqrt(distance2DSquared(a, b));
  finger_width = finger_width || 2;
  finger_depth = finger_depth || material_thickness;
  cut_correction = cut_correction || 0.1;
  offset = offset || 0;
  const dir = [end[0] - start[0], end[1] - start[1]];
  const length = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
  dir[0] /= length;
  dir[1] /= length;
  const commands = [];

  const in_cut = [-finger_depth * dir[1], finger_depth * dir[0]];

  const cos45 = 1 / Math.sqrt(2);
  const sin45 = 1 / Math.sqrt(2);
  const cos135 = -1 / Math.sqrt(2);
  const sin135 = 1 / Math.sqrt(2);

  const corner_cut_a = [
    (cos135 * dir[0] - sin135 * dir[1]) * cut_correction,
    (sin135 * dir[0] + cos135 * dir[1]) * cut_correction
  ];

  const corner_cut_b = [
    (cos45 * dir[0] - sin45 * dir[1]) * cut_correction,
    (sin45 * dir[0] + cos45 * dir[1]) * cut_correction
  ];

  if (debug) debugger;

  let on_outer;

  reverseDelay ^= reverse;

  const dist = distance(start, end);
  delayEnd = Math.min(delayEnd, dist);
  if (end_anchor) {
    offset = (dist % finger_width) + offset;
    on_outer = dist % (finger_width * 2) < finger_width;
    reverseDelay ^= on_outer;
  } else {
    on_outer = mod(offset, finger_width * 2) <= finger_width;
  }

  if (reverse) on_outer = !on_outer;

  // adjust delays to stop the delays from inverting
  // Some weird ruonding errors so we step a funny amount
  if (!Number.isNaN(delayStart))
    while (((delayStart - offset) / finger_width + reverseDelay) % 2 <= 1) {
      delayStart += finger_width / 3;
    }
  if (!Number.isNaN(delayEnd))
    while (
      delayEnd > 0 &&
      ((delayEnd - offset) / finger_width + reverseDelay) % 2 <= 1
    ) {
      delayEnd -= finger_width / 3;
    }

  // First cut on boundary
  if (
    on_outer ^
    end_anchor ^
    (((delayStart - offset) / finger_width) % 2 > 1)
  ) {
    commands.push(`
      L ${start[0]} ${start[1]}
    `);
  } else {
    commands.push(`
      L ${start[0] + in_cut[0]} ${start[1] + in_cut[1]}
    `);
  }

  for (
    let i = end_anchor ? 0 : 1;
    (i + offset / finger_width) * finger_width < length - 0.0001;
    i++
  ) {
    const i1 = i + offset / finger_width;
    if (i1 > delayEnd / finger_width) continue;
    if (!on_outer) {
      // outwards cut
      commands.push(`
          L ${start[0] + i1 * finger_width * dir[0] + in_cut[0]}
            ${start[1] + i1 * finger_width * dir[1] + in_cut[1]}
  
          L ${
            start[0] + i1 * finger_width * dir[0] + in_cut[0] + corner_cut_b[0]
          }
            ${
              start[1] +
              i1 * finger_width * dir[1] +
              in_cut[1] +
              corner_cut_b[1]
            }
  
  
          L ${start[0] + i1 * finger_width * dir[0] + in_cut[0]}
            ${start[1] + i1 * finger_width * dir[1] + in_cut[1]}

          L ${start[0] + i1 * finger_width * dir[0]}
            ${start[1] + i1 * finger_width * dir[1]}

          L ${start[0] + i1 * finger_width * dir[0] - corner_cut_a[0]}
            ${start[1] + i1 * finger_width * dir[1] - corner_cut_a[1]}
          
          L ${start[0] + i1 * finger_width * dir[0]}
            ${start[1] + i1 * finger_width * dir[1]}

          L ${start[0] + (i1 - 1) * finger_width * dir[0]}
            ${start[1] + (i1 - 1) * finger_width * dir[1]}


          L ${start[0] + (i1 - 1) * finger_width * dir[0] - corner_cut_b[0]}
            ${start[1] + (i1 - 1) * finger_width * dir[1] - corner_cut_b[1]}

          
          L ${start[0] + (i1 - 1) * finger_width * dir[0]}
            ${start[1] + (i1 - 1) * finger_width * dir[1]}
        `);
    } else {
      // inwards cut
      commands.push(`
          M ${start[0] + i1 * finger_width * dir[0]}
            ${start[1] + i1 * finger_width * dir[1]}
                  
          L ${start[0] + i1 * finger_width * dir[0] + in_cut[0]}
            ${start[1] + i1 * finger_width * dir[1] + in_cut[1]}
  
          L ${
            start[0] + i1 * finger_width * dir[0] + in_cut[0] + corner_cut_a[0]
          }
            ${
              start[1] +
              i1 * finger_width * dir[1] +
              in_cut[1] +
              corner_cut_a[1]
            }
  
          L ${start[0] + i1 * finger_width * dir[0] + in_cut[0]}
            ${start[1] + i1 * finger_width * dir[1] + in_cut[1]}
      `);
    }
    on_outer = !on_outer;
    if (i1 <= delayStart / finger_width) commands.pop();
  }

  // last cut on boundary
  if (on_outer) {
    commands.push(`
      M ${end[0]} ${end[1]}
    `);
  } else {
    commands.push(`
      M ${end[0] + in_cut[0]} ${end[1] + in_cut[1]}
    `);
  }
  return commands.join();
}
)};
const _1qlyuni = function _mortise_clockwise_v1_preview(mortise_clockwise_v1_config,htl,units,mortise_clockwise_v1)
{
  const total_width = 100;
  const total_height = 100;

  const { x0, x1, y0, y1 } = mortise_clockwise_v1_config;
  return htl.svg`<div 
    style="
            width: ${total_width}${units};
            height: ${total_height}${units};
            padding: 5px;
    ">
    <svg  class="lzr"
          filename="nozzle_end"
          width="${total_width}${units}"
          height="${total_height}${units}"
          viewBox="0 0 ${total_width} ${total_height}">
      <path stroke="red" fill="white" d="
        M ${x0} ${y0} 
        ${mortise_clockwise_v1(
          [x0, y0],
          [x1, y1],
          mortise_clockwise_v1_config
        )} 
      "/>
  </div>`;
};
const _2mjta4 = function _mortise_clockwise_v1_config(Inputs){return(
Inputs.form({
  x0: Inputs.range([0, 100], {
    label: "x0",
    value: 10
  }),
  y0: Inputs.range([0, 100], {
    label: "y0",
    value: 10
  }),
  x1: Inputs.range([0, 100], {
    label: "x0",
    value: 80
  }),
  y1: Inputs.range([0, 100], {
    label: "y1",
    value: 10
  }),
  offset: Inputs.range([-10, 10], {
    label: "offset",
    value: 0
  }),
  finger_depth: Inputs.range([0, 10], {
    label: "finger_depth",
    value: 2.1
  }),
  finger_width: Inputs.range([0, 10], {
    label: "finger_width",
    value: 2
  }),
  cut_correction: Inputs.range([0, 10], {
    label: "cut_correction",
    value: 0.1
  }),
  end_anchor: Inputs.toggle({
    label: "end_anchor",
    value: false
  }),
  reverse: Inputs.toggle({
    label: "reverse",
    value: false
  }),
  delayStart: Inputs.range([0, 100], {
    label: "delay start",
    value: 0
  }),
  delayEnd: Inputs.range([0, 100], {
    label: "delay end",
    value: 90
  }),
  reverseDelay: Inputs.toggle({
    label: "reverse delay",
    value: false
  }),
  debug: Inputs.toggle({
    label: "debug",
    value: false
  })
})
)};
const _13fkyid = (G, _) => G.input(_);
const _1w0r9rn = function _30(md){return(
md`#### Finger Joint`
)};
const _e3vdkz = function _finger_clockwise_v1(distance2DSquared,material_thickness,mod){return(
(
  start,
  end,
  {
    offset,
    finger_depth = 3,
    finger_width = 3,
    cut_correction,
    end_anchor = false,
    reverse = false,
    delayStart = NaN,
    delayEnd = NaN,
    reverseDelay = false,
    debug = false
  } = {}
) => {
  const distance = (a, b) => Math.sqrt(distance2DSquared(a, b));
  finger_width = finger_width || 2;
  finger_depth = finger_depth || material_thickness;
  cut_correction = cut_correction || 0.1;
  offset = offset || 0;
  const dir = [end[0] - start[0], end[1] - start[1]];
  const length = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
  dir[0] /= length;
  dir[1] /= length;
  const commands = [];

  const in_cut = [-finger_depth * dir[1], finger_depth * dir[0]];

  const cos45 = 1 / Math.sqrt(2);
  const sin45 = 1 / Math.sqrt(2);
  const cos135 = -1 / Math.sqrt(2);
  const sin135 = 1 / Math.sqrt(2);

  const corner_cut_a = [
    (cos135 * dir[0] - sin135 * dir[1]) * cut_correction,
    (sin135 * dir[0] + cos135 * dir[1]) * cut_correction
  ];

  const corner_cut_b = [
    (cos45 * dir[0] - sin45 * dir[1]) * cut_correction,
    (sin45 * dir[0] + cos45 * dir[1]) * cut_correction
  ];

  if (debug) debugger;

  let on_outer;

  reverseDelay ^= reverse;

  const dist = distance(start, end);
  delayEnd = Math.min(delayEnd, dist);
  if (end_anchor) {
    offset = (dist % finger_width) + offset;
    on_outer = dist % (finger_width * 2) < finger_width;
    reverseDelay ^= on_outer;
  } else {
    on_outer = mod(offset, finger_width * 2) <= finger_width;
  }

  if (reverse) on_outer = !on_outer;

  // adjust delays to stop the delays from inverting
  // Some weird ruonding errors so we step a funny amount
  if (!Number.isNaN(delayStart))
    while (((delayStart - offset) / finger_width + reverseDelay) % 2 <= 1) {
      delayStart += finger_width / 3;
    }
  if (!Number.isNaN(delayEnd))
    while (
      delayEnd > 0 &&
      ((delayEnd - offset) / finger_width + reverseDelay) % 2 <= 1
    ) {
      delayEnd -= finger_width / 3;
    }

  // First cut on boundary
  if (
    on_outer ^
    end_anchor ^
    (((delayStart - offset) / finger_width) % 2 > 1)
  ) {
    commands.push(`
      L ${start[0]} ${start[1]}
    `);
  } else {
    commands.push(`
      L ${start[0] + in_cut[0]} ${start[1] + in_cut[1]}
    `);
  }

  for (
    let i = end_anchor ? 0 : 1;
    (i + offset / finger_width) * finger_width < length - 0.0001;
    i++
  ) {
    const i1 = i + offset / finger_width;
    if (i1 > delayEnd / finger_width) continue;
    if (!on_outer) {
      // outwards cut
      commands.push(`
          L ${start[0] + i1 * finger_width * dir[0] + in_cut[0]}
            ${start[1] + i1 * finger_width * dir[1] + in_cut[1]}
  
          L ${
            start[0] + i1 * finger_width * dir[0] + in_cut[0] + corner_cut_b[0]
          }
            ${
              start[1] +
              i1 * finger_width * dir[1] +
              in_cut[1] +
              corner_cut_b[1]
            }
  
  
          L ${start[0] + i1 * finger_width * dir[0] + in_cut[0]}
            ${start[1] + i1 * finger_width * dir[1] + in_cut[1]}

          
          L ${start[0] + i1 * finger_width * dir[0]}
            ${start[1] + i1 * finger_width * dir[1]}
        `);
    } else {
      // inwards cut
      commands.push(`
          L ${start[0] + i1 * finger_width * dir[0]}
            ${start[1] + i1 * finger_width * dir[1]}
                  
          L ${start[0] + i1 * finger_width * dir[0] + in_cut[0]}
            ${start[1] + i1 * finger_width * dir[1] + in_cut[1]}
  
          L ${
            start[0] + i1 * finger_width * dir[0] + in_cut[0] + corner_cut_a[0]
          }
            ${
              start[1] +
              i1 * finger_width * dir[1] +
              in_cut[1] +
              corner_cut_a[1]
            }
  
          L ${start[0] + i1 * finger_width * dir[0] + in_cut[0]}
            ${start[1] + i1 * finger_width * dir[1] + in_cut[1]}
      `);
    }
    on_outer = !on_outer;
    if (i1 <= delayStart / finger_width) commands.pop();
  }

  // last cut on boundary
  if (on_outer) {
    commands.push(`
      L ${end[0]} ${end[1]}
    `);
  } else {
    commands.push(`
      L ${end[0] + in_cut[0]} ${end[1] + in_cut[1]}
    `);
  }
  return commands.join();
}
)};
const _1mbxjxm = function _fingers_clockwise_v1_preview(finger_clockwise_v1_config,htl,units,finger_clockwise_v1)
{
  const total_width = 100;
  const total_height = 100;

  const { x0, x1, y0, y1 } = finger_clockwise_v1_config;
  return htl.svg`<div 
    style="
            width: ${total_width}${units};
            height: ${total_height}${units};
            padding: 5px;
    ">
    <svg  class="lzr"
          filename="nozzle_end"
          width="${total_width}${units}"
          height="${total_height}${units}"
          viewBox="0 0 ${total_width} ${total_height}">
      <path stroke="red" fill="white" d="
        M ${x0} ${y0} 
        ${finger_clockwise_v1([x0, y0], [x1, y1], finger_clockwise_v1_config)} 
      "/>
  </div>`;
};
const _51jv8s = function _finger_clockwise_v1_config(Inputs){return(
Inputs.form({
  x0: Inputs.range([0, 100], {
    label: "x0",
    value: 10
  }),
  y0: Inputs.range([0, 100], {
    label: "y0",
    value: 10
  }),
  x1: Inputs.range([0, 100], {
    label: "x0",
    value: 80
  }),
  y1: Inputs.range([0, 100], {
    label: "y1",
    value: 10
  }),
  offset: Inputs.range([-10, 10], {
    label: "offset",
    value: 0
  }),
  finger_depth: Inputs.range([0, 10], {
    label: "finger_depth",
    value: 2.1
  }),
  finger_width: Inputs.range([0, 10], {
    label: "finger_width",
    value: 2
  }),
  cut_correction: Inputs.range([0, 10], {
    label: "cut_correction",
    value: 0.1
  }),
  end_anchor: Inputs.toggle({
    label: "end_anchor",
    value: false
  }),
  reverse: Inputs.toggle({
    label: "reverse",
    value: false
  }),
  delayStart: Inputs.range([0, 100], {
    label: "delay start",
    value: 0
  }),
  delayEnd: Inputs.range([0, 100], {
    label: "delay end",
    value: 90
  }),
  reverseDelay: Inputs.toggle({
    label: "reverse delay",
    value: false
  }),
  debug: Inputs.toggle({
    label: "debug",
    value: false
  })
})
)};
const _zf3eaj = (G, _) => G.input(_);
const _b0bm89 = function _35(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module d/2320fab09283ad21.js?v=4&resolutions=9db5cebfe7dcda5f@602", async () => runtime.module((await import("/d/2320fab09283ad21.js?v=4&resolutions=9db5cebfe7dcda5f@602.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_e82nxn", null, ["md"], _e82nxn);  
  $def("_18ve0s0", "viewof width", ["Inputs"], _18ve0s0);  
  $def("_18yi11m", "width", ["Generators","viewof width"], _18yi11m);  
  $def("_1389ora", null, ["md"], _1389ora);  
  $def("_u2ge3q", "pot_side", ["width","htl","units","finger_clockwise_v1"], _u2ge3q);  
  $def("_12lymt5", null, ["md"], _12lymt5);  
  $def("_1mf1jvh", "pot_top", ["width","htl","units","mortise_clockwise_v1"], _1mf1jvh);  
  $def("_9g5ror", null, ["md"], _9g5ror);  
  $def("_1lspqoj", "pot_bottom", ["width","htl","units","mortise_clockwise_v1"], _1lspqoj);  
  $def("_1so5ece", null, ["md"], _1so5ece);  
  $def("_wu5u7", "pot_cap", ["width","htl","units"], _wu5u7);  
  $def("_1plj4kf", null, ["md"], _1plj4kf);  
  $def("_1kbzws8", "viewof n", ["Inputs"], _1kbzws8);  
  $def("_1ydeilc", "n", ["Generators","viewof n"], _1ydeilc);  
  $def("_123rney", "viewof extension", ["Inputs"], _123rney);  
  $def("_1plqgqn", "extension", ["Generators","viewof extension"], _1plqgqn);  
  $def("_acn27w", "saucer_main", ["width","n","htl","units","extension"], _acn27w);  
  $def("_rzflzq", "saucer_top", ["width","n","htl","units"], _rzflzq);  
  $def("_fy74h5", null, ["md"], _fy74h5);  
  main.define("art", ["module d/2320fab09283ad21.js?v=4&resolutions=9db5cebfe7dcda5f@602", "@variable"], (_, v) => v.import("art", _));  
  $def("_1wdorsv", "plant", ["art"], _1wdorsv);  
  $def("_8rla29", null, ["art"], _8rla29);  
  $def("_fo6cls", "plantURL", ["art"], _fo6cls);  
  $def("_1sgrudy", null, ["md"], _1sgrudy);  
  $def("_1ntev3j", "material_thickness", [], _1ntev3j);  
  $def("_l7xmki", "units", [], _l7xmki);  
  $def("_2ji7b4", "distance2DSquared", [], _2ji7b4);  
  $def("_vs1pmn", "mod", [], _vs1pmn);  
  $def("_13hvxjo", null, ["md"], _13hvxjo);  
  $def("_ub9x30", "mortise_clockwise_v1", ["distance2DSquared","material_thickness","mod"], _ub9x30);  
  $def("_1qlyuni", "mortise_clockwise_v1_preview", ["mortise_clockwise_v1_config","htl","units","mortise_clockwise_v1"], _1qlyuni);  
  $def("_2mjta4", "viewof mortise_clockwise_v1_config", ["Inputs"], _2mjta4);  
  $def("_13fkyid", "mortise_clockwise_v1_config", ["Generators","viewof mortise_clockwise_v1_config"], _13fkyid);  
  $def("_1w0r9rn", null, ["md"], _1w0r9rn);  
  $def("_e3vdkz", "finger_clockwise_v1", ["distance2DSquared","material_thickness","mod"], _e3vdkz);  
  $def("_1mbxjxm", "fingers_clockwise_v1_preview", ["finger_clockwise_v1_config","htl","units","finger_clockwise_v1"], _1mbxjxm);  
  $def("_51jv8s", "viewof finger_clockwise_v1_config", ["Inputs"], _51jv8s);  
  $def("_zf3eaj", "finger_clockwise_v1_config", ["Generators","viewof finger_clockwise_v1_config"], _zf3eaj);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_b0bm89", null, ["footer"], _b0bm89);
  return main;
}