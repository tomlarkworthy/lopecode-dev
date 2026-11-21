// bun compare.ts a.txt b.txt: how many of the per-script lines differ, and the first
const [a, b] = await Promise.all(process.argv.slice(2, 4).map((p) => Bun.file(p).text()));
const x = a.split("\n").filter(Boolean), y = b.split("\n").filter(Boolean);
let d = 0, first = "";
for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) { d++; if (!first) first = (x[i] ?? y[i] ?? "").split("\t")[0]; }
console.log(`${d} of ${x.length} scripts differ${first ? `, first script ${first}` : ""}`);
