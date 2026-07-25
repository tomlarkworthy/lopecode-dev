// Render the ground-truth Mess3 MSP (belief-state fractal) via chaos game.
import { mess3, sampleSeq, beliefTrajectory, mulberry32 } from "./processes";
import { scatterPNG, baryXY, beliefColor, type Pt } from "./png";

const proc = mess3(0.05, 0.85);
const rng = mulberry32(1);
const pts: Pt[] = [];
const NSEQ = 4000, LEN = 16;
for (let s = 0; s < NSEQ; s++) {
  const { tokens } = sampleSeq(proc, LEN, rng);
  const { beliefs } = beliefTrajectory(proc, tokens);
  for (const eta of beliefs) {
    const [x, y] = baryXY(eta);
    const [r, g, b] = beliefColor(eta);
    pts.push({ x, y, r, g, b });
  }
}
const png = scatterPNG(700, 620, pts);
await Bun.write(new URL("./out/msp_truth.png", import.meta.url).pathname, png);
console.log(`wrote out/msp_truth.png with ${pts.length} belief points`);
console.log(`stationary: ${Array.from(proc.stationary).map((v) => v.toFixed(4)).join(", ")}`);
