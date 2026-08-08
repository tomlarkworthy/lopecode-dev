// Draw labels on the frame itself, so "is this right" can be answered by looking.
//
//   bun scratch/rmbt/label-overlay.ts <case>            # golden labels (scratch/rmbt/golden.json)
//   bun scratch/rmbt/label-overlay.ts <case> --captured # the labels frozen at capture, for contrast
//
// green solid = measured from the dense scan, cyan dashed = predicted off the plane the measured
// marks determine, magenta dashed = captured. Each carries its evidence, so a circle that looks
// right but rests on nothing is visible as such.
import { chromium } from "playwright";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const CAPTURED = process.argv.includes("--captured");
if (!names.length) { console.error("usage: label-overlay.ts <case>... [--captured]"); process.exit(1); }
const golden = existsSync(resolve("scratch/rmbt/golden.json"))
  ? JSON.parse(readFileSync(resolve("scratch/rmbt/golden.json"), "utf8")) : [];

const browser = await chromium.launch();
for (const name of names) {
  const meta = JSON.parse(readFileSync(resolve("data/hexcases", name + ".json"), "utf8"));
  const gray = readFileSync(resolve("data/hexcases", name + ".gray"));
  const g = golden.find((r: any) => r.name === name);
  if (!CAPTURED && !g) { console.error(`no golden labels for ${name}`); continue; }
  const labels = CAPTURED
    ? (meta.truth ?? []).map((t: any) => ({ ...t, src: "captured", score: null, dirs: null }))
    : g.truth.map((t: any) => ({ ...t, ...g.quality.find((q: any) => q.id === t.id) }));

  const page = await browser.newPage({ viewport: { width: meta.w, height: meta.h } });
  await page.setContent(`<style>body{margin:0;background:#111}</style><canvas id="c" width="${meta.w}" height="${meta.h}"></canvas>`);
  await page.evaluate(({ b64, w, h, labels, title }) => {
    const bin = atob(b64);
    const ctx = (document.getElementById("c") as HTMLCanvasElement).getContext("2d")!;
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = bin.charCodeAt(i);
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.font = "15px monospace";
    ctx.lineWidth = 2.5;
    for (const t of labels) {
      const col = t.src === "measured" ? "#2fe08a" : t.src === "predicted" ? "#5ad8f5" : "#e05ad0";
      ctx.strokeStyle = col; ctx.fillStyle = col;
      ctx.setLineDash(t.src === "measured" ? [] : [7, 5]);
      ctx.beginPath(); ctx.arc(t.x, t.y, t.radiusPx, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(t.x - 9, t.y); ctx.lineTo(t.x + 9, t.y);
      ctx.moveTo(t.x, t.y - 9); ctx.lineTo(t.x, t.y + 9); ctx.stroke();
      const tag = t.src === "measured" ? `${t.id} ${t.dirs}d s=${t.score}`
        : t.src === "predicted" ? `${t.id} pred s=${t.score}` : `${t.id} ${t.state}`;
      ctx.fillText(tag, t.x - 30, t.y - t.radiusPx - 7);
    }
    ctx.fillStyle = "#fff"; ctx.font = "16px monospace";
    ctx.fillText(title, 10, 22);
  }, { b64: gray.toString("base64"), w: meta.w, h: meta.h, labels, title: `${name}  ${CAPTURED ? "CAPTURED" : `golden thr=${g.thr} planeRms=${g.planeRms}`}` });
  const out = `scratch/rmbt/overlay-${name}${CAPTURED ? "-captured" : ""}.png`;
  await page.locator("#c").screenshot({ path: out });
  await page.close();
  console.log(out);
}
await browser.close();
