// 7 man ids whose 6-bit payloads are pairwise far apart, so a single-cell
// misread cannot turn one member of the target into another.
const pop = (x: number) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };
const d = (a: number, b: number) => pop(a ^ b);
let best: number[] | null = null, bestMin = 0, bestSum = 0;
// exhaustive over 7-subsets is C(64,7)=6.2e8 — too many; use the linear code
// [6,3] d=3 (8 codewords) and also greedy-verify nothing better exists at d=4.
const codes: number[] = [];
for (let m = 0; m < 8; m++) {
  const b = [(m >> 2) & 1, (m >> 1) & 1, m & 1];
  const p = [b[0] ^ b[1], b[1] ^ b[2], b[0] ^ b[2]];       // parity
  codes.push((b[0] << 5) | (b[1] << 4) | (b[2] << 3) | (p[0] << 2) | (p[1] << 1) | p[2]);
}
let mind = 9;
for (let i = 0; i < codes.length; i++) for (let j = i + 1; j < codes.length; j++) mind = Math.min(mind, d(codes[i], codes[j]));
console.log("[6,3] code:", codes.join(","), "min distance", mind);
// drop the all-zero word (id 0 is a legal man id but a poor visual anchor: all
// six cells the same) and keep 7
const kept = codes.filter((c) => c !== 0);
console.log("kept 7:", kept.join(","));
let m2 = 9; for (let i = 0; i < kept.length; i++) for (let j = i + 1; j < kept.length; j++) m2 = Math.min(m2, d(kept[i], kept[j]));
console.log("kept min distance", m2);
console.log("bits:", kept.map((c) => c.toString(2).padStart(6, "0")).join(" "));
// how many boundary teeth each has (bits j,j+1 equal) — more teeth = more evidence
for (const c of kept) {
  const b = c.toString(2).padStart(6, "0").split("").map(Number);
  let bt = 0; for (let j = 0; j < 5; j++) if (b[j] === b[j + 1]) bt++;
  console.log(`  id ${String(c).padStart(2)} ${b.join("")} boundary teeth ${bt}`);
}
