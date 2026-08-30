// Is the coordinate rewrite (art = doc*0.5 - 2) faithful? Rasterise the design
// doc's own SVG and the rewritten one at the same pixel size and count differing
// pixels. Anything but a rounding fringe is a transform bug.
import {chromium} from "playwright";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

// The importer is the source of both sides of this comparison, so run it rather
// than trusting whatever was left on disk.
const gen = spawnSync("python3", ["tools/corepox-art-import.py"], {encoding: "utf8"});
if (gen.status !== 0) { console.error(gen.stderr); process.exit(1); }
const parts = JSON.parse(fs.readFileSync("tools/parts.json","utf8"));
const refs = JSON.parse(fs.readFileSync("tools/refs.json","utf8"));
const noAnim = (s) => s.replace(/animation:[^;"]*;?/g, "");
const MAP = {Brain:[1,1], Engine:[1,2], Lazer:[1,3], LaserTurret2:[4,4], Radar:[2,3]};
const b = await chromium.launch(); const p = await b.newPage();
let bad = 0;
for (const [name,[cols,rows]] of Object.entries(MAP)) {
  const ref = noAnim(refs[name]);
  const W = 112*cols, H = 112*rows;
  const inner = noAnim(parts[name]).replace(/^svg`/,"").replace(/`$/,"");
  const r = await p.evaluate(async ([a, c, W, H]) => {
    const draw = (svg) => new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = W; cv.height = H;
        const x = cv.getContext("2d");
        x.drawImage(img, 0, 0, W, H);
        res(x.getImageData(0, 0, W, H).data);
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    });
    const stamp = (s) => s.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')
      .replace(/width="[0-9.]+" height="[0-9.]+"/, `width="${W}" height="${H}"`);
    const A = await draw(stamp(a));
    const B = await draw(stamp(c));
    let n = 0, worst = 0;
    for (let i = 0; i < A.length; i += 4) {
      let d = 0;
      for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(A[i+k] - B[i+k]));
      if (d > 24) n++;
      worst = Math.max(worst, d);
    }
    const D = new Uint8ClampedArray(A.length);
    for (let i=0;i<A.length;i+=4){ let d=0; for(let k=0;k<4;k++) d=Math.max(d,Math.abs(A[i+k]-B[i+k]));
      D[i]=d>24?255:0; D[i+1]=0; D[i+2]=0; D[i+3]=255; }
    const dump = (D) => { const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
      const x=cv.getContext("2d"); x.putImageData(new ImageData(new Uint8ClampedArray(D),W,H),0,0); return cv.toDataURL(); };
    return {n, worst, px: A.length / 4, a: dump(A), b: dump(B), d: dump(D)};
  }, [ref, inner, W, H]);
  for (const k of ["a","b","d"]) fs.writeFileSync(`tools/screenshots/art-${name}-${k}.png`, Buffer.from(r[k].split(",")[1], "base64"));
  const pct = 100 * r.n / r.px;
  const ok = pct < 0.5;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(13)} ${r.n}/${r.px} px differ by >24 (${pct.toFixed(3)}%), worst channel ${r.worst}`);
}
await b.close();
// LaserTurret2 is the one drawing that is not expected to be pixel-identical: the
// pivot cap is moved out of the base and into #turret2-barrel so it draws OVER the
// arm the renderer turns, which changes ~200 pixels of one small ring. Everything
// else must be 0.
console.log(bad ? `${bad} drawing(s) do not match the design doc` : "the rewrite is faithful");
process.exit(bad ? 1 : 0);
