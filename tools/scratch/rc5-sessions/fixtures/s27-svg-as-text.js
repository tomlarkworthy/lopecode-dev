const _intro = function intro(md){return( md`# Analog Clock

A real-time analog clock that ticks every second.` )};

const _now = function now(Generators){return(
  Generators.observe(notify => {
    const id = setInterval(() => notify(new Date()), 1000);
    notify(new Date());
    return () => clearInterval(id);
  })
)};

const _clock = function clock(htl, now){
  const size = 300;
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 10;

  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours() % 12;

  const sAngle = (s / 60) * 360 - 90;
  const mAngle = ((m + s / 60) / 60) * 360 - 90;
  const hAngle = ((h + m / 60) / 12) * 360 - 90;

  const rad = a => a * Math.PI / 180;
  const hand = (angle, len, width, color) =>
    `<line x1="${cx}" y1="${cy}"
           x2="${cx + len * Math.cos(rad(angle))}"
           y2="${cy + len * Math.sin(rad(angle))}"
           stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;

  const tickMarks = Array.from({length: 60}, (_, i) => {
    const a = rad(i * 6 - 90);
    const inner = i % 5 === 0 ? r - 18 : r - 10;
    const outer = r - 2;
    const w = i % 5 === 0 ? 2.5 : 1;
    return `<line x1="${cx + inner * Math.cos(a)}" y1="${cy + inner * Math.sin(a)}"
                  x2="${cx + outer * Math.cos(a)}" y2="${cy + outer * Math.sin(a)}"
                  stroke="#333" stroke-width="${w}" stroke-linecap="round"/>`;
  }).join("");

  const hourLabels = Array.from({length: 12}, (_, i) => {
    const a = rad((i + 1) * 30 - 90);
    const lr = r - 30;
    return `<text x="${cx + lr * Math.cos(a)}" y="${cy + lr * Math.sin(a)}"
                  text-anchor="middle" dominant-baseline="central"
                  font-size="14" font-weight="bold" fill="#333">${i + 1}</text>`;
  }).join("");

  return htl.html`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="#333" stroke-width="3"/>
    ${tickMarks}
    ${hourLabels}
    ${hand(hAngle, r * 0.5, 5, "#222")}
    ${hand(mAngle, r * 0.7, 3, "#555")}
    ${hand(sAngle, r * 0.85, 1.5, "#e44")}
    <circle cx="${cx}" cy="${cy}" r="4" fill="#e44"/>
  </svg>`;
};

const _timeDisplay = function timeDisplay(htl, now){
  const pad = n => String(n).padStart(2, "0");
  return htl.html`<div style="text-align:center;font-family:monospace;font-size:1.2em;color:#555;margin-top:4px;">
    ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}
  </div>`;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_now", "now", ["Generators"], _now);
  $def("_clock", "clock", ["htl", "now"], _clock);
  $def("_timeDisplay", "timeDisplay", ["htl", "now"], _timeDisplay);
  return main;
}