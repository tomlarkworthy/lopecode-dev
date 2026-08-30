// Engine frame -> art frame, for the four joint-* investigation tools written
// before JOINTS moved. The engine stores the table in ENGINE frame from
// 2026-08-19 (+y forward). These tools reason in the frame the art tool emits
// (+y down) and hard-code cell keys like Lazer's "0,2", so they need the table
// put back the way they were written against.
//
// This is the ONLY conversion left. It is not on the runtime path -- the notebook
// modules and tools/corepox-draw.ts all read the engine-frame table directly.
export const ARTCELLS: any = {
  Engine: [[0,0],[0,1]], Lazer: [[0,0],[0,1],[0,2]],
  Binary: [[1,0],[0,1],[1,1],[2,1]],
  Radar: [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
  Orb: [[0,0],[1,0],[0,1],[1,1]], Armour: [[0,0]], Constant: [[0,0]],
  Explosive: [[0,0]], Brain: [[0,0]], LaserTurret2: [[0,0],[1,0]]
};

// The inverse of what @tomlarkworthy/corepox-components used to do on load. Only
// the s = -1 case ever occurred except for Binary, whose art grid cannot be laid
// on its footprint by a y-flip at all.
export function toArtFrame(JOINTS: any, TYPES: any) {
  const key = (a: number[]) => a[0] + "," + a[1];
  const out: any = {};
  for (const type of Object.keys(JOINTS)) {
    const art = ARTCELLS[type], eng = TYPES[type]?.tiles;
    if (!art || !eng) { out[type] = JOINTS[type]; continue; }
    // FIRST fit wins, exactly as the forward conversion did -- a symmetric
    // footprint admits both signs of y, and taking the last one silently returned
    // the mirrored table (Engine came back with its joints on the nozzle).
    const want = new Set(eng.map((t: number[]) => key(t)));
    const fit = (): number[] | null => {
      for (const s of [-1, 1]) for (const a of art) for (const e of eng) {
        const ox = e[0] - a[0], oy = e[1] - s * a[1];
        const got = art.map((c: number[]) => key([c[0] + ox, s * c[1] + oy]));
        if (got.length === want.size && got.every((k: string) => want.has(k))) return [ox, oy, s];
      }
      return null;
    };
    const al = fit();
    if (!al) { out[type] = JOINTS[type]; continue; }
    const [ox, oy, s] = al, tbl: any = {};
    for (const engKey of Object.keys(JOINTS[type])) {
      const [ex, ey] = engKey.split(",").map(Number);
      const k = (ex - ox) + "," + (s * (ey - oy));
      tbl[k] ??= {};
      for (const side of Object.keys(JOINTS[type][engKey])) {
        const name = s === 1 && (side === "N" || side === "S") ? (side === "N" ? "S" : "N") : side;
        const slots = JOINTS[type][engKey][side]
          .map((i: number) => s === -1 && (side === "E" || side === "W") ? 1 - i : i);
        tbl[k][name] = [...new Set([...(tbl[k][name] ?? []), ...slots])].sort();
      }
    }
    out[type] = tbl;
  }
  return out;
}

// `bun tools/corepox-art-frame.ts` -- the landing check. ART is the table
// tools/corepox-joints-from-art.py produced and the engine carried verbatim until
// 2026-08-19. Converting the engine-frame table back must reproduce it exactly; if
// it does not, the landing was not faithful and every joint tool below is reading
// a mirrored table.
const ART: any = {
  Engine:    {"0,0": {N: [0,1], E: [0], W: [0]}},
  Lazer:     {"0,2": {E: [1], S: [0,1], W: [1]}},
  Binary:    {"1,0": {E: [1], W: [1]},
              "0,1": {N: [0,1], S: [1], W: [0]},
              "1,1": {S: [0,1]},
              "2,1": {N: [0,1], E: [0], S: [0]}},
  Radar:     {"0,2": {S: [0,1], W: [1]}, "1,2": {E: [1], S: [0,1]}},
  Orb:       {"0,1": {S: [0,1]}, "1,1": {S: [0,1]}},
  Armour:    {"0,0": {N: [0,1], E: [0,1], S: [0,1], W: [0,1]}},
  Constant:  {"0,0": {N: [0,1], E: [0,1], S: [0,1], W: [0,1]}},
  Explosive: {"0,0": {N: [0,1], E: [0,1], S: [0,1], W: [0,1]}},
  Brain:     {"0,0": {N: [0,1], E: [0,1], S: [0,1], W: [0,1]}},
  // never had an art fit; passes through unconverted in both directions
  LaserTurret2: {"0,0": {S: [0,1], W: [0,1]}, "1,0": {S: [0,1], E: [0,1]}}
};
if (import.meta.main) {
  const {importNotebookModule} = await import("./notebook-import.ts");
  const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
  const back = toArtFrame(await m.value("JOINTS"), await m.value("TYPES"));
  const norm = (t: any) => JSON.stringify(Object.fromEntries(Object.keys(t).sort().map(k =>
    [k, Object.fromEntries(Object.keys(t[k]).sort().map(s => [s, [...t[k][s]].sort()]))])));
  let bad = 0;
  for (const type of Object.keys(ART)) {
    const ok = norm(back[type] ?? {}) === norm(ART[type]);
    if (!ok) { bad++; console.log(`FAIL ${type}\n  want ${norm(ART[type])}\n  got  ${norm(back[type] ?? {})}`); }
  }
  console.log(bad ? `${bad} type(s) do not round-trip` :
    `all ${Object.keys(ART).length} types round-trip to the recovered art table`);
  process.exit(bad ? 1 : 0);
}
