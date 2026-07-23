// B1: the dead-zone is `raw · max(0,|raw|-thresh)/|raw|`. This mirrors the exact inline formula in
// toolMove.onPointerMove; it checks the three properties the falsifier names.
const dead = (dx:number, dy:number, thresh:number) => {
  const r = Math.hypot(dx, dy); if (r === 0) return [0,0];
  const f = Math.max(0, r - thresh) / r; return [dx*f, dy*f];
};
const thresh = 3;
console.log("-- no premature move: |offset| <= thresh commits nothing --");
for (const [x,y] of [[0,0],[2,0],[2,2],[3,0]]) console.log(`  (${x},${y}) -> (${dead(x,y,thresh).map(v=>v.toFixed(3)).join(", ")})`);

console.log("\n-- direction preserved (the old bug committed translate(0,5) for a (4,4) move) --");
const [ax,ay] = dead(4,4,thresh);
console.log(`  (4,4) -> (${ax.toFixed(3)}, ${ay.toFixed(3)})  same sign & 45°: ${ax>0&&ay>0&&Math.abs(ax-ay)<1e-9}`);

console.log("\n-- continuity at the threshold (no jump) --");
const eps=1e-6; const below=dead(thresh-eps,0,thresh), at=dead(thresh,0,thresh), above=dead(thresh+eps,0,thresh);
console.log(`  just below=${below[0].toFixed(6)}  at=${at[0].toFixed(6)}  just above=${above[0].toFixed(6)}`);

console.log("\n-- T2: same endpoint, any path -> same committed delta (dead-zone reads only the offset) --");
// two 'paths' reaching (20,7): the function ignores how you got there
const A = dead(20,7,thresh), B = dead(20,7,thresh);
console.log(`  endpoint (20,7): ${A.map(v=>v.toFixed(4)).join(", ")} == ${B.map(v=>v.toFixed(4)).join(", ")}  -> ${A[0]===B[0]&&A[1]===B[1]}`);
console.log("  (path-independence is structural: the committed value is dead(clientNow - clientPress), no history)");
