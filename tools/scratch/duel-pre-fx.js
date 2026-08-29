// Corepox duel: two ships, one outcome, callable from anywhere.
//
// There were three copies of "run a match" before this -- `simulate` in the engine,
// `runMatch` in the lab, and `tools/corepox-match.ts` -- and they disagreed on who
// counts as alive. `simulate` used `Ship.alive` (a powered Brain), which reports a
// brainless device dead on the first tick, so a ProximityMine "lost" every match it
// was in before it had done anything. This module takes the lab's rule: a ship that
// ARRIVED with a Brain needs one, and a ship that never had one is alive while it
// has parts.

const _title = function _title(md){return(
md`# Corepox duel

Two ships, a background and an outcome, with no UI attached. \`runDuel\` is headless and returns a
verdict; \`newDuel\`/\`stepDuel\` are the same match one tick at a time so a caller can drive it;
\`duelView\` puts it on screen. The map's encounters and a multiplayer session are both meant to be
callers of these three, not reimplementations of them.

\`\`\`js
runDuel({
  a: {spec: SHIPS.rocketCore, control: "auto"},   // "auto" | "wired" | "human"
  b: {spec: SHIPS.proximityMine},                 // default "wired": it flies its own program
  placement: {separation: 18, bearing: 30},       // tiles, degrees; or give x/y/a per ship
  mode: "elimination",                            // elimination | attrition | survival
  limit: 60                                       // seconds
})
\`\`\``
)};

// A mode decides, each tick, whether the match is over. null means keep going.
// Every one of them is total at the time limit -- a mode that can return null
// forever would hang a caller that trusts it.
const _DUEL_MODES = function _DUEL_MODES(){return(
{
  elimination: {
    label: "elimination", desc: "last side standing; a draw if both survive the limit",
    decide: (D) => D.aliveA && D.aliveB ? (D.timeUp ? "draw" : null)
                 : D.aliveA ? "a" : D.aliveB ? "b" : "draw"
  },
  attrition: {
    label: "attrition", desc: "as elimination, but at the limit the bigger survivor wins",
    decide: (D) => {
      if (!D.aliveA || !D.aliveB) return D.aliveA ? "a" : D.aliveB ? "b" : "draw";
      if (!D.timeUp) return null;
      const la = D.a.live.length, lb = D.b.live.length;
      return la === lb ? "draw" : la > lb ? "a" : "b";
    }
  },
  survival: {
    label: "survival", desc: "A only has to still be there at the limit",
    decide: (D) => !D.aliveA ? "b" : D.timeUp ? "a" : null
  },
  // The N-side rule, and the only mode that means anything with more than two
  // rosters in the world. It decides on TEAM rather than on side, so a 6-ship
  // free-for-all (six teams) and a 3v3 (two teams) are the same mode.
  melee: {
    label: "melee", desc: "last team standing; a draw if the limit finds more than one",
    decide: (D) => {
      const up = new Set();
      for (const id of D.sides) if (D.alive[id]) up.add(D.teamOf[id]);
      if (up.size > 1) return D.timeUp ? "draw" : null;
      return up.size === 1 ? [...up][0] : "draw";
    }
  }
}
)};

// The lab's rule, not Ship.alive -- see the note at the top of this module.
const _duelAlive = function _duelAlive(){return(
(ship, hadBrain) => ship.live.length > 0 &&
  (!hadBrain || ship.live.some(c => c.type === "Brain"))
)};

// Relative placement: a separation and a bearing, both of which a caller can hold
// fixed across a season so a rematch is the same fight. Explicit x/y/a on either
// side wins over it, which is what the mission editor needs.
const _duelPlacement = function _duelPlacement(geom){return(
({separation = 18, bearing = 0, faceEachOther = true} = {}, a = {}, b = {}) => {
  const [ux, uy] = geom.unit(bearing), h = separation / 2;
  const pa = {x: a.x ?? -ux * h, y: a.y ?? -uy * h};
  const pb = {x: b.x ??  ux * h, y: b.y ??  uy * h};
  pa.a = a.a ?? (faceEachOther ? geom.bearing(pa.x, pa.y, pb.x, pb.y) : 0);
  pb.a = b.a ?? (faceEachOther ? geom.bearing(pb.x, pb.y, pa.x, pa.y) : 180);
  return {a: pa, b: pb};
}
)};

// N on a ring, facing the middle. The chord between neighbours is the `separation`
// a duel would have used, so R = sep / (2 sin(pi/n)) -- and at n = 2 that is
// sep / 2, which puts the two ships exactly where `duelPlacement` puts them. The
// half-turn offset is what keeps index 0 on the "a" side of the line rather than
// mirrored across it.
const _meleePlacement = function _meleePlacement(geom){return(
(n, {separation = 18, bearing = 0, radius = null} = {}) => {
  if (n < 2) return [{x: 0, y: 0, a: 0}];
  const R = radius ?? separation / (2 * Math.sin(Math.PI / n));
  return Array.from({length: n}, (_, i) => {
    const [ux, uy] = geom.unit(bearing + 180 + i * 360 / n);
    const x = ux * R, y = uy * R;
    return {x, y, a: geom.bearing(x, y, 0, 0)};
  });
}
)};

// The stock opponent: close to `standoff` and hold the nose on the target. It is
// deliberately dumb -- it exists so an unwired corpus hull can be a credible enemy
// without hand-authoring a control program for each of the 892 of them.
const _chaseCmd = function _chaseCmd(geom){return(
(self, foe, {standoff = 6, fireWithin = 26, fireArc = 25} = {}) => {
  if (!foe || !foe.live.length) return {target: null, face: null, fire: false};
  const d = Math.hypot(foe.x - self.x, foe.y - self.y);
  const brg = geom.bearing(self.x, self.y, foe.x, foe.y);
  const [ux, uy] = geom.unit(brg);
  // aim short of the target rather than at it, or the pilot flies into contact and
  // spends the match trying to stop on top of something that is moving
  const k = Math.max(0, d - standoff);
  return {target: [self.x + ux * k, self.y + uy * k], face: brg,
          fire: d < fireWithin && Math.abs(geom.norm(brg - self.a)) < fireArc};
}
)};

const _newDuel = function _newDuel(Ship, World, loadShipSpec, duelPlacement, meleePlacement, DUEL_MODES, DUEL_BACKDROP){return(
(cfg = {}) => {
  const {mode = "elimination", limit = 60, seed = 1} = cfg;
  const M = typeof mode === "string" ? DUEL_MODES[mode] : mode;
  if (!M) throw new Error("corepox-duel: unknown mode " + mode);
  const load = (s) => {
    if (!s) throw new Error("corepox-duel: both sides need a spec");
    // accept a raw spec or one already through the loader; loadShipSpec is
    // idempotent on its own output and expands Composites, which raw specs do not
    return loadShipSpec(s).spec;
  };
  // `ships: [...]` is the N-side form and `{a, b}` is the same thing with two
  // entries, so there is ONE code path below and the two-ship duel is a melee of
  // two. `a` and `b` stay on the returned object as aliases for the first two
  // sides, because every existing caller (runEncounter, duelView, the modes) reads
  // them by name and a duel must not change shape to gain a third opponent.
  const melee = Array.isArray(cfg.ships);
  const roster = melee ? cfg.ships : [cfg.a ?? {}, cfg.b ?? {}];
  const sides = melee ? roster.map((o, i) => o.id ?? "s" + i) : ["a", "b"];
  const place = melee
    ? meleePlacement(roster.length, cfg.placement)
    : (() => { const p = duelPlacement(cfg.placement, cfg.a ?? {}, cfg.b ?? {});
               return [p.a, p.b]; })();
  const mk = (id, o, i) => {
    // Explicit x/y/a on the entry still wins over the ring, which is what a mission
    // editor and a reproducible regression fixture both need.
    const at = {...place[i], ...(o.x != null ? {x: o.x} : {}), ...(o.y != null ? {y: o.y} : {}),
                ...(o.a != null ? {a: o.a} : {})};
    // A free-for-all is N teams, not one: the default team is the side's own id, so
    // nothing shoots at its own hull and everything shoots at everything else.
    const s = new Ship(load(o.spec), {team: o.team ?? id, ...at});
    s.vx = o.vx ?? 0; s.vy = o.vy ?? 0;
    return s;
  };
  const ship = {}, control = {}, cmd = {}, memo = {}, hadBrain = {}, teamOf = {}, alive = {};
  sides.forEach((id, i) => {
    const o = roster[i];
    const s = ship[id] = mk(id, o, i);
    control[id] = o.control ?? "wired";
    cmd[id] = {target: null, face: null, drive: null, fire: false};
    memo[id] = {};
    hadBrain[id] = s.comps.some(c => c.type === "Brain");
    teamOf[id] = s.team;
    alive[id] = true;
  });
  const a = ship[sides[0]], b = ship[sides[1]] ?? null;
  return {
    cfg, mode: M, limit, seed,
    world: new World(sides.map(id => ship[id])), a, b,
    sides, ship, teamOf, alive,
    control,
    // a `human` side reads its intent from here; a UI or a network peer writes it
    cmd, memo, hadBrain,
    backdrop: cfg.backdrop === false ? false
      : {...DUEL_BACKDROP, ...(cfg.backdrop ?? {}),
         sky: {...DUEL_BACKDROP.sky, seed, ...(cfg.backdrop?.sky ?? {})},
         body: {...DUEL_BACKDROP.body, seed: seed * 3 + 1, ...(cfg.backdrop?.body ?? {})}},
    outcome: null
  };
}
)};

const _stepDuel = function _stepDuel(pilot, chaseCmd, duelAlive, nearestFoe){return(
(D) => {
  if (D.outcome) return D.outcome;
  for (const id of D.sides) {
    const c = D.control[id];
    if (c === "wired") continue;
    const self = D.ship[id];
    // With two sides the enemy is "the other one"; with N it has to be CHOSEN, and
    // nearest-living-enemy is the same rule `chaseCmd` already implies at n = 2.
    const cmd = c === "auto"
      ? (D.cmd[id] = chaseCmd(self, nearestFoe(D, id), D.cfg.ai))
      : D.cmd[id];
    pilot(self, cmd, D.memo[id]);
  }
  D.world.step();
  for (const id of D.sides) D.alive[id] = duelAlive(D.ship[id], D.hadBrain[id]);
  D.aliveA = D.alive[D.sides[0]];
  D.aliveB = D.sides.length > 1 ? D.alive[D.sides[1]] : false;
  D.timeUp = D.world.t >= D.limit;
  return (D.outcome = D.mode.decide(D) ?? null) ?? "playing";
}
)};

// Nearest LIVING ship on another team. `splitDetached` can put debris in
// `world.ships` that belongs to no side, so the search runs over the roster rather
// than over the world -- a pilot chasing a shard of its own wreck is not a target.
const _nearestFoe = function _nearestFoe(){return(
(D, id) => {
  const self = D.ship[id], team = D.teamOf[id];
  let best = null, bd = Infinity;
  for (const other of D.sides) {
    if (D.teamOf[other] === team) continue;
    const s = D.ship[other];
    if (!s.live.length) continue;
    const d = (s.x - self.x) ** 2 + (s.y - self.y) ** 2;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
)};

const _runDuel = function _runDuel(newDuel, stepDuel, DT){return(
(cfg = {}) => {
  const D = newDuel(cfg);
  const cap = Math.ceil((cfg.limit ?? 60) / DT) + 2;
  let out = "playing";
  for (let i = 0; i < cap && out === "playing"; i++) out = stepDuel(D);
  const sides = {};
  for (const id of D.sides)
    sides[id] = {live: D.ship[id].live.length, alive: !!D.alive[id], team: D.teamOf[id]};
  return {winner: out === "playing" ? "draw" : out,
          seconds: +D.world.t.toFixed(2), ticks: D.world.tick,
          a: {live: D.a.live.length, alive: !!D.aliveA},
          b: D.b ? {live: D.b.live.length, alive: !!D.aliveB} : null,
          sides, duel: D};
}
)};

const _DUEL_BACKDROP = function _DUEL_BACKDROP(){return(
{
 "sky": {
  "kind": "nebula",
  "seed": 7.0,
  "bg": "#02040a",
  "bgInner": "#0b1428",
  "cloudScale": 11.0,
  "stretch": 1.35,
  "octaves": 5.0,
  "knee": 0.42,
  "cloudBlur": 3.2,
  "coverage": 0.4,
  "cloudA": 0.95,
  "cloudB": 0.78,
  "hueA": "#6633dd",
  "hueB": "#19b3a8",
  "dust": 0.4,
  "filaments": 34.0,
  "filamentHue": "#ff3ea5",
  "filamentWidth": 1.6,
  "filamentBow": 0.34,
  "filamentGlow": 2.4,
  "filamentOpacity": 0.34,
  "galaxies": 9.0
 },
 "stars": {
  "seed": 7.0,
  "stars": 620.0,
  "starExp": 3.2,
  "starSize": 1.0,
  "softness": 0.45,
  "warm": 0.07,
  "bright": 3.0,
  "brightSize": 10.0,
  "spikeLen": 12.8
 },
 "parallax": {
  "seed": 21.0,
  "layers": 4.0,
  "perLayer": 160.0,
  "starSize": 1.1,
  "depthScale": 1.1,
  "starExp": 3.0,
  "softness": 0.45,
  "warm": 0.07,
  "speed": 1.0,
  "animate": true
 },
 "body": {
  "kind": "facet",
  "seed": 3.0,
  "R": 150.0,
  "detail": 16.0,
  "tilt": 21.0,
  "roll": -16.0,
  "spin": 0.18,
  "swirl": 0.5,
  "color": "#8fd0ff",
  "rim": "#3fd6c8",
  "animate": true
 },
 "comp": {
  "height": 620.0,
  "showSky": true,
  "showParallax": false,
  "showStars": true,
  "showBody": true,
  "bodyX": 0.3,
  "bodyY": 0.55,
  "bodyScale": 1.0,
  "animate": true
 }
}
)};

// ---------------------------------------------------------------------------
// Manual piloting
// ---------------------------------------------------------------------------

// The input half of `control: "human"`, which corepox-duel declares but gives a view
// no way to drive. WASD writes a drive command, a click writes a waypoint, and the
// two are exclusive -- pressing a key clears the waypoint, because a ship obeying
// both at once reads as a ship ignoring you.
//
// Keys are taken on the WINDOW, not the board, so the player does not have to click
// the battle first; the guard is a focused input, which is what makes a select or a
// text field usable on the same page.
const _humanControl = function _humanControl(){return(
// `side` names which of a duel's two command slots to write. A state that has only
// ONE ship under command -- the mining field -- passes null and gets `D.cmd` itself,
// which is what keeps this one control layer usable by both.
(host, D, side = "a") => {
  const DRIVE = {w: [1, 0], s: [-1, 0], a: [0, -1], d: [0, 1]};
  const held = new Set();
  const cmd = () => (side == null ? D.cmd : D.cmd[side]);
  const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "");
  const apply = () => {
    let thrust = 0, yaw = 0;
    for (const k of held) { thrust += DRIVE[k][0]; yaw += DRIVE[k][1]; }
    const c = cmd();
    c.drive = (thrust || yaw) ? {thrust: Math.max(-1, Math.min(1, thrust)),
                                yaw: Math.max(-1, Math.min(1, yaw))} : null;
    if (c.drive) { c.target = null; c.face = null; }
  };
  const key = (down) => (ev) => {
    if (typing()) return;
    const k = ev.key.toLowerCase();
    if (k === " ") { cmd().fire = down; ev.preventDefault(); return; }
    if (!DRIVE[k]) return;
    ev.preventDefault();
    down ? held.add(k) : held.delete(k);
    apply();
  };
  const kd = key(true), ku = key(false);
  const blur = () => { held.clear(); apply(); cmd().fire = false; };
  addEventListener("keydown", kd); addEventListener("keyup", ku);
  addEventListener("blur", blur);
  const svg = host.view?.svg;
  const point = (ev) => {
    if (!host.view) return;
    held.clear();
    const c = cmd();
    c.drive = null;
    c.target = host.view.tileAt(ev);       // the view's own map, never re-derived
    c.face = null;
  };
  svg?.addEventListener("pointerdown", point);
  return {stop: () => { removeEventListener("keydown", kd); removeEventListener("keyup", ku);
                        removeEventListener("blur", blur); svg?.removeEventListener("pointerdown", point);
                        blur(); },
          held};
}
)};

// The view is a thin shell: a backdrop behind, the shared battlefield on top, and a
// scoreboard. It owns no rules -- everything it shows comes from stepDuel.
const _duelView = function _duelView(newDuel, stepDuel, backdrop, battlefield, htl, DT){return(
(cfg = {}, {height = 520, span = 46, speed = 1, onEnd} = {}) => {
  const D = cfg.world ? cfg : newDuel(cfg);
  const root = htl.html`<div style="position:relative;border-radius:8px;overflow:hidden;
    background:#04050a;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#dbe6f2"></div>`;
  let bg = null;
  if (D.backdrop) {
    bg = backdrop({...D.backdrop, comp: {...D.backdrop.comp, W: 1400, height}});
    bg.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    bg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    root.append(bg);
  }
  const view = battlefield(D.world, {span, height, width: 900});
  view.svg.style.background = "transparent";
  // battlefield paints its own starfield first; two star layers over a nebula reads
  // as noise, so the backdrop replaces it rather than sitting under it
  if (bg && view.svg.firstElementChild?.tagName === "g") view.svg.firstElementChild.style.display = "none";
  view.svg.style.position = "relative";
  root.append(view.svg);
  const hud = htl.html`<div style="position:absolute;left:10px;top:8px;display:flex;gap:14px;
    pointer-events:none;text-shadow:0 1px 3px #000"></div>`;
  root.append(hud);

  let raf = 0, acc = 0, last = 0, stopped = false;
  // One readout per SIDE, not two hard-coded ones: a melee has N of them and the
  // 2-ship duel is the n = 2 case of the same loop. The first two keep the colours
  // A and B have always had so a duel looks unchanged.
  const HUE = ["#8ef0c0", "#ffc42e", "#7fd4ff", "#ff9a3c", "#c46bff", "#56e39f",
               "#ff6b9d", "#cdd94f"];
  const label = (id, i) => D.sides.length === 2 ? "AB"[i] : id.toUpperCase();
  const paint = () => {
    hud.innerHTML = D.sides.map((id, i) =>
      `<span style="color:${D.alive[id] === false ? "#ff6b6b" : HUE[i % HUE.length]}"
        >${label(id, i)} ${D.ship[id].live.length}</span>`).join(
      `<span style="color:#41505f">&middot;</span>`) +
      `<span style="color:#6f8299">&nbsp;&middot;&nbsp;${D.world.t.toFixed(1)}s / ${D.limit}s` +
      (D.outcome ? ` &middot; ${D.outcome.toUpperCase()}` : "") + `</span>`;
  };
  const loop = (now) => {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    acc += Math.min(0.1, (now - last) / 1000) * speed; last = now;
    while (acc >= DT) { acc -= DT; if (!D.outcome) stepDuel(D); }
    if (bg) bg.update(now / 1000);
    view.draw(); paint();
    if (D.outcome && onEnd) { onEnd(D.outcome, D); onEnd = null; }
  };
  last = performance.now();
  raf = requestAnimationFrame(loop);
  root.duel = D;
  root.view = view;              // a human-control layer needs its tileAt
  root.stop = () => { stopped = true; cancelAnimationFrame(raf); };
  root.value = D;
  return root;
}
)};

const _viewof_duelDemo = function _viewof_duelDemo(duelRoster, DUEL_MODES, duelView, htl, invalidation){
  let cur = null;
  // The two most-played designs in the corpus, by rank rather than by id so the
  // default survives a re-export. They are a real fight: decisive at 20.5s under
  // seed 4 (tools/scratch/duel-corpus.ts, 2026-08-20). The former default,
  // manualAim vs gunBoat, now draws at the 45s limit -- gunBoat only started
  // shooting once loadShipSpec stopped rewriting its `fire` wire to `angle`.
  const rank = (i) => duelRoster.groups[1].items[i].key;
  let cfg = {a: rank(0), b: rank(1), control: "auto", mode: "elimination", seed: 4};
  const root = htl.html`<div style="display:flex;flex-direction:column;gap:8px;
    font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#dbe6f2"></div>`;
  const bar = htl.html`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"></div>`;
  const stage = htl.html`<div></div>`;
  root.append(bar, stage);
  const sel = (extra = "") => htl.html`<select style="background:#0d1117;color:#dbe6f2;
    border:1px solid #2a3646;border-radius:4px;padding:3px 6px;font:inherit;${extra}"></select>`;
  const pick = (key, opts) => {
    const s = sel();
    s.append(...opts.map(o => htl.html`<option value=${o} selected=${cfg[key] === o}>${o}</option>`));
    s.onchange = () => { cfg[key] = s.value; go(); };
    return s;
  };
  // 1755 options per side, so the value is the key and the text is the label --
  // the ids are opaque hashes and the names are 1488-way ambiguous.
  const ship = (key) => {
    const s = sel("max-width:20em");
    s.append(...duelRoster.groups.map(g => htl.html`<optgroup label=${g.label}>${
      g.items.map(e => htl.html`<option value=${e.key} selected=${cfg[key] === e.key}>${e.label}</option>`)
    }</optgroup>`));
    s.onchange = () => { cfg[key] = s.value; go(); };
    return s;
  };
  const go = () => {
    cur?.stop();
    cur = duelView({
      seed: cfg.seed, mode: cfg.mode, limit: 45,
      a: {spec: duelRoster.byKey.get(cfg.a).spec, control: cfg.control},
      b: {spec: duelRoster.byKey.get(cfg.b).spec},
      placement: {separation: 20, bearing: 25}
    }, {height: 460});
    stage.replaceChildren(cur);
    root.value = cur.duel;
  };
  bar.append(ship("a"), ship("b"), pick("control", ["auto", "wired"]),
             pick("mode", Object.keys(DUEL_MODES)),
             htl.html`<button onclick=${() => { cfg.seed++; go(); }} style="background:#132033;
               color:#8ef0c0;border:1px solid #2d4a3d;border-radius:4px;padding:3px 10px;
               font:inherit;cursor:pointer">rematch</button>`);
  invalidation.then(() => cur?.stop());
  go();
  return root;
};
const _duelDemo = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  main.define("module @tomlarkworthy/corepox-engine",
    async () => runtime.module((await import("/@tomlarkworthy/corepox-engine.js?v=4")).default));
  main.define("module @tomlarkworthy/corepox-render",
    async () => runtime.module((await import("/@tomlarkworthy/corepox-render.js?v=4")).default));
  main.define("module @tomlarkworthy/corepox-backdrops",
    async () => runtime.module((await import("/@tomlarkworthy/corepox-backdrops.js?v=4")).default));
  main.define("module @tomlarkworthy/corepox-missions",
    async () => runtime.module((await import("/@tomlarkworthy/corepox-missions.js?v=4")).default));
  for (const n of ["Ship", "World", "geom", "DT", "pilot", "loadShipSpec", "TYPES", "TYPE_ALIAS", "RELICS"])
    main.define(n, ["module @tomlarkworthy/corepox-engine", "@variable"], (_, v) => v.import(n, _));
  main.define("battlefield", ["module @tomlarkworthy/corepox-render", "@variable"],
    (_, v) => v.import("battlefield", _));
  main.define("backdrop", ["module @tomlarkworthy/corepox-backdrops", "@variable"],
    (_, v) => v.import("backdrop", _));
  main.define("module @tomlarkworthy/corepox-shipyard",
    async () => runtime.module((await import("/@tomlarkworthy/corepox-shipyard.js?v=4")).default));
  main.define("SHIPS", ["module @tomlarkworthy/corepox-missions", "@variable"],
    (_, v) => v.import("SHIPS", _));
  main.define("CORPUS", ["module @tomlarkworthy/corepox-shipyard", "@variable"],
    (_, v) => v.import("CORPUS", _));
  // Was defined here until 2026-08-21; the shipyard's "start from" picker needs the
  // same list, and CORPUS lives there, so the roster moved down rather than being
  // copied up. Imported under the old name so nothing else here had to change.
  main.define("duelRoster", ["module @tomlarkworthy/corepox-shipyard", "@variable"],
    (_, v) => v.import("shipRoster", "duelRoster", _));

  $def("_title", "title", ["md"], _title);
  main.variable(observer("viewof duelDemo")).define("viewof duelDemo",
    ["duelRoster","DUEL_MODES","duelView","htl","invalidation"], _viewof_duelDemo).pid = "_viewof_duelDemo";
  main.variable(observer("duelDemo")).define("duelDemo",
    ["Generators","viewof duelDemo"], _duelDemo).pid = "_duelDemo";
  $def("_runDuel", "runDuel", ["newDuel","stepDuel","DT"], _runDuel);
  $def("_meleePlacement", "meleePlacement", ["geom"], _meleePlacement);
  $def("_nearestFoe", "nearestFoe", [], _nearestFoe);
  $def("_newDuel", "newDuel", ["Ship","World","loadShipSpec","duelPlacement","meleePlacement","DUEL_MODES","DUEL_BACKDROP"], _newDuel);
  $def("_stepDuel", "stepDuel", ["pilot","chaseCmd","duelAlive","nearestFoe"], _stepDuel);
  $def("_duelView", "duelView", ["newDuel","stepDuel","backdrop","battlefield","htl","DT"], _duelView);
  $def("_humanControl", "humanControl", [], _humanControl);
  $def("_DUEL_MODES", "DUEL_MODES", [], _DUEL_MODES);
  $def("_duelAlive", "duelAlive", [], _duelAlive);
  $def("_duelPlacement", "duelPlacement", ["geom"], _duelPlacement);
  $def("_chaseCmd", "chaseCmd", ["geom"], _chaseCmd);
  $def("_DUEL_BACKDROP", "DUEL_BACKDROP", [], _DUEL_BACKDROP);
  return main;
}