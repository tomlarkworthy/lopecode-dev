// Replace whenVisible: release the height reservation once the content lands,
// and learn the height from the cell's OWN node rather than from the reserved
// host (which is at least the reservation, so the stored value could only
// ratchet up -- 2484px reserved against 1733px of content, measured in Tom's
// tab 2026-08-12).
import { readFileSync, writeFileSync } from "node:fs";

const p = "modules/@tomlarkworthy/coded-landmark-tracking.js";
const src = readFileSync(p, "utf8");

const START = "const _1visgate = function _whenVisible(IntersectionObserver,localStorage) {";
const END = "\nconst _sections = function _sections() {";
const i = src.indexOf(START);
const j = src.indexOf(END);
if (i < 0 || j < 0 || j < i) throw new Error("cell bounds not found");

const NEXT = `const _1visgate = function _whenVisible(IntersectionObserver,localStorage) {
  // A gated cell occupies 17px until it computes, so filling it in shoves the rest of the page
  // down under whatever the reader was looking at. Reserve the height it will need first. The
  // numbers are what these cells measured at 1400px wide, and they are only a first guess: a
  // report that wraps is 1467px on a laptop and 5478px on a phone, so each cell records its own
  // rendered height per width bucket and that wins on the next load.
  const DEFAULT = { hexFrameReport: 1467, hexRigSelfTest: 319, hexRendererCheck: 88 };
  const bucket = Math.round(window.innerWidth / 200) * 200;
  const key = (c) => "lazyReserve:" + c + ":" + bucket;
  const stored = (c) => { try { return +localStorage.getItem(key(c)) || 0; } catch (_) { return 0; } };

  // The reservation is scaffolding and comes down when the content arrives. Leaving it up cost
  // 751px of white space under hexFrameReport (2484px reserved, 1733px rendered, measured
  // 2026-08-12) -- and it was self-inflicted: the old code learned the height from the HOST
  // node, whose height is at least the reservation, so a stored value could only ever ratchet
  // up. Learn from the cell's own child instead, which can shrink.
  //
  // A stylesheet rather than an inline style because the inspector replaces the node when the
  // value lands, and !important because lopepage-2's
  // \`#lopepage-2 .lope-viz .observablehq{min-height:17px}\` outranks a bare attribute selector.
  const reserved = new Map();
  let sheet = null;
  const paint = () => {
    if (!sheet) return;
    sheet.textContent = [...reserved]
      .map(([c, px]) => '[cell="' + c + '"]{min-height:' + px + 'px !important}')
      .join("\\n");
  };
  const release = (c) => { if (reserved.delete(c)) paint(); };

  // Write EVERY reservation on the first call, not just this cell's: a gated cell that waits on
  // another gated cell never runs, so it would never get to reserve its own space.
  const ensureSheet = () => {
    if (sheet || document.getElementById("lazy-reserve-style")) return;
    sheet = document.createElement("style");
    sheet.id = "lazy-reserve-style";
    for (const c of Object.keys(DEFAULT)) reserved.set(c, stored(c) || DEFAULT[c]);
    paint();
    document.head.appendChild(sheet);
  };

  // Poll rather than ResizeObserver: the node the inspector mounts is replaced when the value
  // lands, so the thing to watch does not exist yet when we would attach.
  const settle = (c) => {
    let waited = 0;
    const tick = () => {
      const host = document.querySelector('[cell="' + c + '"]');
      const inner = host && host.firstElementChild;
      const h = inner ? Math.round(inner.getBoundingClientRect().height) : 0;
      if (h > 40) {
        try { localStorage.setItem(key(c), String(h)); } catch (_) {}
        release(c);
        return;
      }
      // Never rendered, or rendered tiny: a permanent hole is worse than a late jump.
      if ((waited += 250) > 60000) return release(c);
      setTimeout(tick, 250);
    };
    setTimeout(tick, 250);
  };

  return function whenVisible(cellName, invalidation) {
    // The runtime has a \`visibility\` input for exactly this, and it is inert in a lopecode page:
    // variable_intersector reads variable._observer._node at COMPUTE time, and a notebook booted
    // with "headless": true gets a node-less {} as every cell's observer, so \`visible = !node\`
    // resolves it immediately. The visualizer's own inspectors do carry a node -- it stamps
    // cell="<name>" on each one -- but they are not mounted until seconds later. So wait for the
    // node to APPEAR rather than asking for it once.
    if (typeof IntersectionObserver !== "function") return Promise.resolve();
    ensureSheet();
    return new Promise((resolve) => {
      let io, timer, done = false, waitedForNode = 0;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (io) io.disconnect();
        if (DEFAULT[cellName]) settle(cellName);
        resolve();
      };
      // Settle on invalidation too: a promise that never settles takes the whole runtime with it.
      if (invalidation && invalidation.then) invalidation.then(finish, finish);
      io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) return finish();
      });
      const seen = new WeakSet();
      const scan = () => {
        if (done) return;
        // Panes are built late and rebuilt on layout change, so keep picking up new nodes.
        const nodes = document.querySelectorAll('[cell="' + cellName + '"]');
        for (const n of nodes) if (!seen.has(n)) { seen.add(n); io.observe(n); }
        // Never rendered at all (an export, a headless run): degrade open, as the runtime does.
        if (!nodes.length && (waitedForNode += 250) > 8000) return finish();
        timer = setTimeout(scan, 250);
      };
      scan();
    });
  };
};
`;

writeFileSync(p, src.slice(0, i) + NEXT + src.slice(j + 1));
console.log("whenVisible replaced");
