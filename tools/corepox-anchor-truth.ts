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
//   tools/.venv-unity/bin/python tools/corepox-apk-sprites.py   # first
//   bun tools/corepox-anchor-truth.ts
import {importNotebookModule} from "./notebook-import.ts";
import {readFileSync} from "fs";

const TILE2PIXEL = 0.64;                        // Metric.Tile2Pixel, world units per tile
const a = await importNotebookModule("modules/@tomlarkworthy/corepox-assets.js");
const SYMBOLS: any = await a.value("SYMBOLS");
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
  const tw = s.rect[2] / (s.ppu * TILE2PIXEL), th = s.rect[3] / (s.ppu * TILE2PIXEL);
  const px = s.pivot[0] * W, py = (1 - s.pivot[1]) * H;
  const scaleX = W / tw, scaleY = H / th;
  const off = Math.hypot(px - ax, py - ay);
  const flag = off > TILE * 0.15 ? "  <-- WRONG" : "";
  console.log(`${type.padEnd(13)} ${sname.padEnd(13)} ${pad(tw, 5)}x${pad(th, 5)} tiles` +
    `   svg/tile ${pad(scaleX, 5)},${pad(scaleY, 5)}` +
    `   anchor have ${pad(ax)},${pad(ay)}  want ${pad(px)},${pad(py)}  off ${pad(off, 5)}${flag}`);
}
