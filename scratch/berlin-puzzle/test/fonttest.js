import { textStrokes } from "../lib/font.js";
import { svgDoc, scorePath, pathD, flipY } from "../lib/svg.js";
const lines = ["BERLIN", "MÜGGELSEE KÖPENICK", "ABCDEFGHIJKLM", "NOPQRSTUVWXYZ", "0123456789 -.'!&", "CURRY 36 & SPREE"];
let body = "";
lines.forEach((s, i) => {
  for (const st of textStrokes(s, { x: 100, y: 130 - i * 22, size: 10, anchor: "middle" }))
    body += scorePath(pathD(flipY(st, 150), false));
});
console.log(svgDoc({ w: 200, h: 150, body, bg: "#fff" }));
