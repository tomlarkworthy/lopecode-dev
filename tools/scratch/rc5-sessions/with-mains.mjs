// Copy a notebook with extra bootconf mains, so --run-tests sees a module nothing imports yet.
import { readFileSync, writeFileSync } from "node:fs";
const [src, dst, ...extra] = process.argv.slice(2);
let html = readFileSync(src, "utf8");
const re = /(<script id="bootconf\.json"[^>]*>)([\s\S]*?)(<\/script>)/g;
const blocks = [...html.matchAll(re)]; const last = blocks.at(-1);
const conf = JSON.parse(last[2]); conf.mains = [...new Set([...conf.mains, ...extra])];
html = html.slice(0, last.index) + last[1] + "\n" + JSON.stringify(conf, null, 2) + "\n" + last[3] + html.slice(last.index + last[0].length);
writeFileSync(dst, html); console.log("mains:", conf.mains.join(", "));
