// Lift the eleven COMPONENT symbols out of the generated SHEET and print them as
// corepox-components cell sources, one literal per component.
//
// Why: svg-lens writes back only into a literal template in the cell it is
// installed on -- holes are locked and the upstream sink was cut on 2026-07-26
// (knowledge/svg-editor-architecture.md:170). So art that is editable in the
// notebook has to BE a cell, and the generated string cannot also hold a copy:
// two copies with no diff between them is how art silently reverts on the next
// sketch2svg.py run. These eleven leave SHEET for good.
//
// Two pieces of runtime surgery in symbolSheet become source here, which is the
// point -- both were invisible to anyone reading the sheet:
//   * the binary trace is a y-mirror of the shipped sprite, and was flipped at
//     load. Now a <g transform> in the literal, where svg-lens can see it.
//   * turret2 is three drawings in one symbol and was sliced by child index.
//     Children 9-17 are a SECOND barrel attached to nothing -- it floated beside
//     every turret on the board until the split -- and they are dropped here
//     rather than carried and hidden.
//
// ONE-SHOT, and it has already fired. corepox-assets no longer holds the eleven
// symbols, so this cannot be re-run against the current module -- it is kept as
// the record of how the cells were derived, and it still runs against the
// pre-migration source, which is the corepox.html from before lopebooks 5cfb3c35:
//
//   git -C lopebooks show 5cfb3c35:notebooks/corepox.html > /tmp/pre.html
//   bun tools/lope-reader.ts /tmp/pre.html --get-module @tomlarkworthy/corepox-assets \
//     > /tmp/pre-assets.js
//   bun tools/corepox-art-extract.ts --from /tmp/pre-assets.js
//
//   --sheet    print SHEET with the eleven removed, instead of the cells
import {readFileSync} from "fs";

const i = process.argv.indexOf("--from");
const SRC = i > 0 ? process.argv[i + 1] : "modules/@tomlarkworthy/corepox-assets.js";
const src = readFileSync(SRC, "utf8");
const a = src.indexOf("`<svg"), b = src.indexOf("</svg>`", a);
if (a < 0 || b < 0) throw new Error("could not find the SHEET literal in " + SRC);
const sheet = src.slice(a + 1, b + 7);

// component type -> symbol name, straight off SYMBOL_FOR. Composite has no art.
const FOR: Record<string, string> = {
  Brain: "brain", Constant: "constant-3", Binary: "binary", Radar: "radar",
  Engine: "engine-3", Lazer: "lazer-2", Explosive: "explosive-3",
  Armour: "armour-2", Orb: "energy-store", LaserTurret2: "turret2",
  Hyperdrive: "hyperdrive"
};

const symbolOf = (name: string) => {
  const open = sheet.indexOf(`<symbol id="cp-${name}"`);
  if (open < 0) throw new Error("no symbol cp-" + name);
  const close = sheet.indexOf("</symbol>", open);
  const head = sheet.slice(open, sheet.indexOf(">", open) + 1);
  const vb = /viewBox="([^"]*)"/.exec(head)?.[1];
  if (!vb) throw new Error("cp-" + name + " has no viewBox");
  return {open, close: close + 9, vb, body: sheet.slice(sheet.indexOf(">", open) + 1, close)};
};

// Top-level children of a symbol body, by tracking tag depth rather than trusting
// the indentation -- brain and turret2 both nest <g>.
const children = (body: string) => {
  const out: string[] = [];
  let depth = 0, start = -1, i = 0;
  while (i < body.length) {
    if (body[i] !== "<") { i++; continue; }
    const end = body.indexOf(">", i);
    if (end < 0) break;
    const tag = body.slice(i, end + 1);
    const selfClosing = tag.endsWith("/>");
    const closing = tag[1] === "/";
    if (!closing && depth === 0) start = i;
    if (!closing && !selfClosing) depth++;
    else if (closing) depth--;
    if (depth === 0 && start >= 0) { out.push(body.slice(start, end + 1)); start = -1; }
    i = end + 1;
  }
  return out;
};

const IND = "  ";
const wrap = (kids: string[], indent: string) =>
  kids.map(k => indent + k.trim()).join("\n");

// The drawing each cell holds: an <svg> with the symbol's viewBox, so the cell
// renders on its own and svg-lens has a root to install on. symbolSheet turns it
// back into a <symbol> at load.
const drawing = (name: string) => {
  const s = symbolOf(name);
  let kids = children(s.body);
  let inner: string;
  if (name === "binary") {
    const h = s.vb.trim().split(/\s+/)[3];
    inner = `${IND}<g transform="matrix(1 0 0 -1 0 ${h})">\n` +
            wrap(kids, IND + IND) + `\n${IND}</g>`;
  } else if (name === "turret2") {
    const barrel = kids.slice(0, 9), base = kids.slice(18);
    inner = `${IND}<g id="turret2-base">\n` + wrap(base, IND + IND) + `\n${IND}</g>\n` +
            `${IND}<g id="turret2-barrel">\n` + wrap(barrel, IND + IND) + `\n${IND}</g>`;
  } else {
    inner = wrap(kids, IND);
  }
  // A drawing with no width fills its container, and a component symbol here is
  // 82 to 270 units across -- the page rendered a Brain a metre wide. Sized to
  // 320 on the long side, aspect kept, which is also a comfortable canvas to drag
  // handles on. svg-lens works off the viewBox, so this only affects layout.
  const [, , vw, vh] = s.vb.trim().split(/\s+/).map(Number);
  const k = 320 / Math.max(vw, vh);
  const r2 = (v: number) => Math.round(v * 10) / 10;
  return `<svg viewBox="${s.vb}" width="${r2(vw * k)}" height="${r2(vh * k)}">\n${inner}\n</svg>`;
};

if (process.argv.includes("--sheet")) {
  let out = sheet;
  for (const name of Object.values(FOR)) {
    const s = symbolOf(name);
    // recompute against the shrinking string
    const open = out.indexOf(`<symbol id="cp-${name}"`);
    const close = out.indexOf("</symbol>", open) + 9;
    let from = open, to = close;
    while (from > 0 && out[from - 1] !== "\n") from--;
    while (to < out.length && out[to] !== "\n") to++;
    out = out.slice(0, from) + out.slice(to + 1);
  }
  console.log(out);
} else {
  for (const [type, name] of Object.entries(FOR)) {
    const d = drawing(name);
    if (d.includes("`") || d.includes("${"))
      throw new Error(`cp-${name} would not survive a template literal`);
    console.log(`const _art_${type} = function _art_${type}(svg){return(\nsvg\`${d}\`\n)};\n`);
  }
  console.error(`${Object.keys(FOR).length} drawings, ` +
    `${Object.values(FOR).reduce((n, s) => n + drawing(s).length, 0)} bytes`);
}
