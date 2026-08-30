// Parts II and III also ship as lopecode pages, so the table links there like
// IV does. Verified 2026-08-13: both answer 200 and their bootconf mains name
// the right module, so the page boots the notebook and not an empty shell.
import { readFileSync, writeFileSync } from "node:fs";
const P = "modules/@tomlarkworthy/coded-landmark-tracking.js";
let s = readFileSync(P, "utf8");
const sub = (from: string, to: string) => {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${n} matches for ${from}`);
  s = s.replace(from, to);
};
sub(`"https://observablehq.com/@tomlarkworthy/circular-barcode-simulator"`,
    `"https://tomlarkworthy.github.io/lopebooks/notebooks/@tomlarkworthy_circular-barcode-simulator.html"`);
sub(`"https://observablehq.com/@tomlarkworthy/fast-1d-circular-barcode-matching"`,
    `"https://tomlarkworthy.github.io/lopebooks/notebooks/@tomlarkworthy_fast-1d-circular-barcode-matching.html"`);
sub(`  // Destinations checked 2026-08-13: II and III answer 200 on observablehq.com;
  // IV is not published there (api.observablehq.com 404s for the slug) and
  // ships only as a lopecode page.`,
    `  // Every part links to its lopecode page, so one destination serves the whole
  // run. Checked 2026-08-13: all three answer 200 and their bootconf mains name
  // the right module, so the page boots the notebook rather than an empty shell.
  // II and III are also on observablehq.com; IV is not (api.observablehq.com
  // 404s for the slug), which is why the pages are the common ground.`);
writeFileSync(P, s);
console.log("links repointed");
