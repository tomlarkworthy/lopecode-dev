// Where each component's art hangs off its anchor cell -- from the shipped APK.
//
// A Unity Sprite stores m_Rect (its size in atlas pixels), m_PixelsToUnits and
// m_Pivot (the point of that rect the Transform sits on, in 0..1 of the rect).
// Those three ARE the anchor: art size in tiles is rect/(ppu * Metric.Tile2Pixel),
// and the anchor sits pivot.x/pivot.y of the way across it. The Unity project in
// vendor/corepox ships no art, so every SYMBOL_FOR entry was eyeballed off the SVG
// trace instead; this says which eyeballs were right.
//
// The SVG symbol is a trace of the same drawing, so with y flipped:
//     anchor_svg = (pivot.x * W,  (1 - pivot.y) * H)
// and the trace's own scale is a check on the whole chain: W / tilesWide should be
// TILE for every symbol, or the trace is not the sprite.
//
// Five parts stopped being traces on 2026-08-21. Brain, Engine, Lazer, Radar and
// LaserTurret2 are drawn ON the lattice now, from Tom's design doc, so they fill a
// whole cell where the sprite filled 0.9 of one and their anchor is the centre of
// cell [0,0] by construction. They read 3.3-3.7 units off here, and that is the
// redraw, not an error -- the sprite is no longer the authority for those five.
//
//   tools/.venv-unity/bin/python tools/corepox-apk-sprites.py   # first
//   bun tools/corepox-anchor-truth.ts
import {loadAssets, loadComponents as loadComponents_} from "./corepox-assets-headless.ts";
import {readFileSync} from "fs";

const TILE2PIXEL = 0.64;                        // Metric.Tile2Pixel, world units per tile
// Measured against the sprite's INK, not its rect. The rect carries the glow's
// transparent padding -- Constant's 222px rect holds a 174px square -- and an SVG
// trace has none of it, so rect-to-viewBox compares the wrong two things. It read
// "1.2 tiles" for a 1x1 Constant until this changed on 2026-08-19.
// data/corepox/sprites/*.png comes from tools/corepox-apk-sprite-png.py.
const INK: Record<string, number[]> = JSON.parse(readFileSync("data/corepox/sprite-ink.json", "utf8"));
// The eleven component drawings are cells now, so SYMBOLS is measured from each
// one's viewBox rather than read off a generated table -- which means this gate
// reads whatever the art is after an svg-lens edit, not what it was when the
// table was written.
const {assets: a} = await loadAssets();
const SYMBOLS: any = await a.value("SYMBOLS");
// Drawings carry a negative viewBox origin so their halo is not clipped
// (corepox-art-pad.py), and an anchor is a coordinate in the PATH space that
// origin sits in -- drawComponent adopts the art's children, never its viewBox.
// So the pivot's offset into the ink has to be placed relative to that origin or
// this reads 2.9 units of error that is not there.
const ART: any = await (await loadComponents_()).value("COMPONENT_ART");
const ORIGIN: Record<string, number[]> = {};
// COMPONENT_ART is keyed by SYMBOL name, not by component type.
for (const [sym, node] of Object.entries<any>(ART))
  ORIGIN[sym] = (node?.getAttribute?.("viewBox") ?? "0 0 0 0").trim().split(/\s+/).map(Number);
const SYMBOL_FOR: any = await a.value("SYMBOL_FOR");
const TILE: number = await a.value("TILE");
const sprites = JSON.parse(readFileSync("data/corepox/apk-sprites.json", "utf8"));

// component type -> the sprite the SpriteRenderer on its prefab draws
const SPRITE_FOR: Record<string, string> = {
  Brain: "brain", Constant: "constant", Binary: "binary", Radar: "radar",
  Engine: "engine", Explosive: "explosive", Armour: "armour",
  Hyperdrive: "hyperdrive",
  // LaserTurret2 is deliberately absent: its trace is cap + gear + barrel, three
  // sprites in one symbol, so no single pivot maps onto that frame.
};

console.log(`TILE = ${TILE} svg units.  sprite tiles = rect / (ppu * ${TILE2PIXEL})\n`);
const pad = (n: number, w = 7) => n.toFixed(1).padStart(w);
for (const [type, sname] of Object.entries(SPRITE_FOR)) {
  const s = sprites[sname]?.[0];
  const cur = SYMBOL_FOR[type];
  if (!s || !cur) { console.log(`${type}: no ${s ? "SYMBOL_FOR" : "sprite " + sname}`); continue; }
  const [sym, ax, ay] = cur;
  const [W, H] = SYMBOLS[sym] ?? [];
  if (W == null) { console.log(`${type}: symbol ${sym} not in SYMBOLS`); continue; }
  const ink = INK[sname];
  if (!ink) { console.log(`${type}: no ink for ${sname}`); continue; }
  const [ix, iy, iw, ih] = ink;
  const tw = iw / (s.ppu * TILE2PIXEL), th = ih / (s.ppu * TILE2PIXEL);
  const u = TILE / (s.ppu * TILE2PIXEL);        // svg units per sprite pixel
  const [ox, oy] = ORIGIN[sym] ?? [0, 0];
  const px = ox + (s.pivot[0] * s.rect[2] - ix) * u,
        py = oy + ((1 - s.pivot[1]) * s.rect[3] - iy) * u;
  const scaleX = W / tw, scaleY = H / th;
  const off = Math.hypot(px - ax, py - ay);
  const flag = off > TILE * 0.15 ? "  <-- WRONG" : "";
  console.log(`${type.padEnd(13)} ${sname.padEnd(13)} ${pad(tw, 5)}x${pad(th, 5)} tiles` +
    `   svg/tile ${pad(scaleX, 5)},${pad(scaleY, 5)}` +
    `   anchor have ${pad(ax)},${pad(ay)}  want ${pad(px)},${pad(py)}  off ${pad(off, 5)}${flag}`);
}
