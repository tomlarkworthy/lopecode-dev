// Why does awaiting per cell go quadratic? Four arms, same await count and (for live/array/noawait)
// the same n-term tail expression, so function SIZE is held constant and only liveness varies.
//
//   live      n consts, each awaited, all live across every later await   -> suspect
//   array     n awaits, results into one array; only the array is live     -> same size, O(1) live
//   noawait   identical to `live` with the awaits removed                  -> size/sum cost alone
//   dead      n awaits, one accumulator live                               -> minimal everything
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const sum = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join(" + ");

const build = {
  live: (n) => {
    const lines = Array.from({ length: n }, (_, i) => `  const v${i} = await (${i} + 1);`);
    return new AsyncFunction(`${lines.join("\n")}\n  return ${sum(n, (i) => `v${i}`)};`);
  },
  array: (n) => {
    const lines = Array.from({ length: n }, (_, i) => `  a[${i}] = await (${i} + 1);`);
    return new AsyncFunction(`  const a = new Array(${n});\n${lines.join("\n")}\n  return ${sum(n, (i) => `a[${i}]`)};`);
  },
  noawait: (n) => {
    const lines = Array.from({ length: n }, (_, i) => `  const v${i} = (${i} + 1);`);
    return new AsyncFunction(`${lines.join("\n")}\n  return ${sum(n, (i) => `v${i}`)};`);
  },
  dead: (n) => {
    const lines = Array.from({ length: n }, () => `  acc += await 1;`);
    return new AsyncFunction(`  let acc = 0;\n${lines.join("\n")}\n  return acc;`);
  }
};

const time = async (f, N) => {
  for (let i = 0; i < N; i++) await f(); // a full batch: 50 left a 500-cell function still tiering up
  const ts = [];
  for (let i = 0; i < N; i++) {
    const t = performance.now();
    await f();
    ts.push(performance.now() - t);
  }
  ts.sort((a, b) => a - b);
  return ts[ts.length >> 1];
};

const ARMS = ["live", "array", "noawait", "dead"];
console.log("median ms per call\n");
console.log(["n".padEnd(5), ...ARMS.map((a) => a.padStart(9)), "   live/array"].join(" "));
for (const n of [50, 100, 250, 500]) {
  const r = {};
  for (const a of ARMS) r[a] = await time(build[a](n), 300);
  console.log(
    [String(n).padEnd(5), ...ARMS.map((a) => r[a].toFixed(4).padStart(9)),
     "   " + (r.live / r.array).toFixed(1) + "x"].join(" ")
  );
}

// Where exactly does the live arm leave the quadratic? Per-await cost should rise LINEARLY with n
// if the model (cost per suspend proportional to live locals) is the whole story.
console.log("\nlive arm, per-await cost — linear in n means the total is quadratic\n");
console.log("n      median ms    ns per await   ratio vs previous");
let prev = null;
for (const n of [100, 200, 300, 400, 500, 600]) {
  const ms = await time(build.live(n), 200);
  const per = (ms * 1e6) / n;
  console.log(
    `${String(n).padEnd(6)} ${ms.toFixed(4).padStart(9)} ${per.toFixed(0).padStart(14)} ` +
      (prev ? `   ${(per / prev).toFixed(2)}x` : "")
  );
  prev = per;
}
