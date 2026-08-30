// Rasterise the component art cells, so a change to a drawing can be looked at
// beside the sprite it was measured from.
//
//   bun tools/corepox-art-shot.ts Radar Binary Constant
//   -> tools/screenshots/art-<Type>.png
import {chromium} from "playwright";
import {readFileSync, mkdirSync} from "fs";

const want = process.argv.slice(2);
const src = readFileSync("modules/@tomlarkworthy/corepox-components.js", "utf8");
const cells = [...src.matchAll(/const _art_(\w+) = function _art_\w+\(svg\)\{return\(\nsvg`(.*?)`\n\)\};/gs)]
  .filter(m => !want.length || want.includes(m[1]));
mkdirSync("tools/screenshots", {recursive: true});

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 700, height: 700}});
for (const [, type, art] of cells) {
  // The neon in the game is cp-bloom at draw time, not something in the vectors
  // (corepox-assets:19), so the drawing is shown through the same filter here or
  // it is not the thing anyone sees.
  await p.setContent(`<body style="margin:0;background:#0b1017;display:grid;place-items:center;height:100vh">
    <svg width="0" height="0"><defs>
      <filter id="cp-bloom" x="-75%" y="-75%" width="250%" height="250%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="n"/>
        <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="w"/>
        <feMerge><feMergeNode in="w"/><feMergeNode in="w"/><feMergeNode in="n"/>
          <feMergeNode in="n"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter></defs></svg>
    <div style="filter:url(#cp-bloom)">${art}</div></body>`);
  await p.screenshot({path: `tools/screenshots/art-${type}.png`});
  console.log(`tools/screenshots/art-${type}.png`);
}
await b.close();
