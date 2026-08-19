// The corpus shows two HP values for most types. assets.json carries a
// creation_date per ship, so the split can be dated instead of guessed.
const fs = await import("node:fs");
const meta = JSON.parse(fs.readFileSync("vendor/corepox/firebase/data/assets.json","utf8"));
const dates: Record<string, number> = {};
for (const [id, m] of Object.entries<any>(meta.metadata.ships)) dates[id] = m.creation_date;
const ships: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  const id = line.slice(0, i).replace(/^"|"$/g, "");
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) ships.push({id, s, t: dates[id]}); } catch {}
}
const dated = ships.filter(x => x.t);
console.log(`${dated.length}/${ships.length} ships carry a creation date`);
const ts = dated.map(x => x.t).sort((a, b) => a - b);
const d = (t: number) => new Date(t).toISOString().slice(0, 10);
console.log(`range ${d(ts[0])} .. ${d(ts[ts.length - 1])}`);

// For each type with two common hp values, when was each used?
const byType: Record<string, Map<number, number[]>> = {};
for (const {s, t} of dated) for (const c of s.components ?? []) {
  const ty = (c.type ?? "").replace(/\(Clone\)/, ""); if (!ty || c.hp == null) continue;
  ((byType[ty] ??= new Map()).get(c.hp) ?? byType[ty].set(c.hp, []).get(c.hp)!).push(t);
}
console.log("\ntype             hp      n   first seen   last seen");
for (const ty of Object.keys(byType).sort()) {
  const rows = [...byType[ty].entries()].filter(([, a]) => a.length >= 20)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [hp, arr] of rows) {
    arr.sort((a, b) => a - b);
    console.log(`${ty.padEnd(15)} ${String(hp).padStart(4)} ${String(arr.length).padStart(6)}   ${d(arr[0])}   ${d(arr[arr.length - 1])}`);
  }
}
