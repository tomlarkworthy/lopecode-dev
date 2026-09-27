const _intro = function intro(md){return( md`# Analog Clock` )};

const _clock = function clock(htl, d3, Generators){
  const size = 300, cx = 150, cy = 150, r = 130;

  function draw(now) {
    const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds(), ms = now.getMilliseconds();
    const sAngle = (s + ms / 1000) / 60 * 360 - 90;
    const mAngle = (m + s / 60) / 60 * 360 - 90;
    const hAngle = (h + m / 60) / 12 * 360 - 90;

    const svg = htl.html`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="max-width:300px">
      <style>
        .face { fill: #1a1a2e; stroke: #e0e0e0; stroke-width: 2.5; }
        .tick-major { stroke: #e0e0e0; stroke-width: 2.5; }
        .tick-minor { stroke: #555; stroke-width: 1; }
        .hand-h { stroke: #e0e0e0; stroke-width: 5; stroke-linecap: round; }
        .hand-m { stroke: #e0e0e0; stroke-width: 3; stroke-linecap: round; }
        .hand-s { stroke: #ff4d4d; stroke-width: 1.5; stroke-linecap: round; }
        .center { fill: #ff4d4d; }
        .numeral { fill: #e0e0e0; font: bold 15px sans-serif; text-anchor: middle; dominant-baseline: central; }
      </style>
      <circle class="face" cx="${cx}" cy="${cy}" r="${r}"/>
      ${d3.range(60).map(i => {
        const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
        const isMajor = i % 5 === 0;
        const r1 = isMajor ? r - 14 : r - 7;
        const r2 = r - 2;
        return htl.html`<line class="tick-${isMajor ? 'major' : 'minor'}"
          x1="${cx + r1 * Math.cos(a)}" y1="${cy + r1 * Math.sin(a)}"
          x2="${cx + r2 * Math.cos(a)}" y2="${cy + r2 * Math.sin(a)}"/>`;
      })}
      ${d3.range(1, 13).map(i => {
        const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
        return htl.html`<text class="numeral" x="${cx + (r - 28) * Math.cos(a)}" y="${cy + (r - 28) * Math.sin(a)}">${i}</text>`;
      })}
      <line class="hand-h" x1="${cx}" y1="${cy}" x2="${cx + 65 * Math.cos(hAngle * Math.PI / 180)}" y2="${cy + 65 * Math.sin(hAngle * Math.PI / 180)}"/>
      <line class="hand-m" x1="${cx}" y1="${cy}" x2="${cx + 90 * Math.cos(mAngle * Math.PI / 180)}" y2="${cy + 90 * Math.sin(mAngle * Math.PI / 180)}"/>
      <line class="hand-s" x1="${cx - 15 * Math.cos(sAngle * Math.PI / 180)}" y1="${cy - 15 * Math.sin(sAngle * Math.PI / 180)}"
            x2="${cx + 105 * Math.cos(sAngle * Math.PI / 180)}" y2="${cy + 105 * Math.sin(sAngle * Math.PI / 180)}"/>
      <circle class="center" cx="${cx}" cy="${cy}" r="4"/>
    </svg>`;
    return svg;
  }

  return draw(new Date()), Generators.observe(notify => {
    notify(draw(new Date()));
    let id = setInterval(() => notify(draw(new Date())), 1000);
    return () => clearInterval(id);
  });
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_clock", "clock", ["htl", "d3", "Generators"], _clock);
  return main;
}