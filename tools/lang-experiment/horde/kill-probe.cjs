// node horde/kill-probe.cjs [n] [frames] : the engine on the main thread with the bot; kills, contacts and nearest agent over time
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "proto/sim.gen.js"), "utf8") + fs.readFileSync(path.join(__dirname, "proto/engine.js"), "utf8") + "; return makeEngine";
const makeEngine = new Function(src)();
const n = +(process.argv[2] || 10000), F = +(process.argv[3] || 1800);
const e = makeEngine({ n, mode: "main", bot: true, god: true, fullWave: process.argv[4] === "full" });
(async () => {
  for (let f = 1; f <= F; f++) {
    await e.step();
    if (f % 120 === 0) {
      const a = e.chunks[0], S = e.S, p = e.player; let near = 1e9, alive = 0, within10 = 0;
      for (let i = 0; i < n; i++) if (a[i * S + 4] > 0) { alive++; const d = Math.hypot(a[i * S] - p[0], a[i * S + 1] - p[1]); if (d < near) near = d; if (d < 10) within10++; }
      console.log(`t ${(f / 60).toFixed(0)}s wave ${e.wave} active ${e.active} alive ${alive} kills ${e.kills} score ${e.score} health ${e.health.toFixed(0)} nearest ${near.toFixed(1)} within10 ${within10}`);
    }
  }
})();
