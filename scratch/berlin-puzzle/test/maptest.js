import { blob, blobBB, spree, havel, lakes, mapXY } from "../lib/map.js";
import { svgDoc, cutPath, scorePath, pathD, flipY } from "../lib/svg.js";
const H = 290;
let body = cutPath(pathD(flipY(blob, H), true), true);
const sp = spree(), hv = havel();
for (const h of [...sp.holes, ...hv.holes, ...lakes()]) body += `<path d="${pathD(flipY(h, H), true)}" fill="#fff" stroke="#FF0000" stroke-width="0.15"/>`;
for (const m of [...sp.bridgeMarks, ...hv.bridgeMarks]) body += scorePath(pathD(flipY(m, H), false));
const marks = { fern: [13.4094, 52.526], tor: [13.3777, 52.513], saeule: [13.3501, 52.5145], oberbaum: [13.4457, 52.5019], bear: [13.30, 52.503], ampel: [13.428, 52.540], wurst: [13.388, 52.4938] };
for (const [k, [lo, la]] of Object.entries(marks)) {
  const [x, y] = mapXY(lo, la);
  body += `<circle cx="${x}" cy="${H - y}" r="1.6" fill="#0a0"/><text x="${x + 2}" y="${H - y}" font-size="5" fill="#0a0">${k}</text>`;
}
console.error("blob bbox", JSON.stringify(blobBB));
console.log(svgDoc({ w: 390, h: H, body, bg: "#fff" }));
