#!/usr/bin/env python3
"""Apply the constants recovered from the Unity source to corepox-engine.

Idempotent and assertive: every edit checks its anchor, so a partial apply fails
loudly instead of leaving the module half-converted (which is how the previous
attempt truncated the file).
"""
import sys
P = "modules/@tomlarkworthy/corepox-engine.js"
s = open(P).read()
def sub(old, new, what):
    global s
    if new in s and old not in s:
        print(f"  skip (already applied): {what}"); return
    assert old in s, f"ANCHOR MISSING: {what}"
    s = s.replace(old, new, 1)
    print(f"  ok: {what}")

# ---------------------------------------------------------------- 1. HP + turret
sub('''// HP collapsed 2026-08-18. The original 20..100 spread put 820 HP of shell around a
// 20 HP Brain -- a 138s time-to-kill in a 60s match, which is why no player ever
// used Armour (0 of 492 corpus ships). See plan/corepox-design.md S1.2.''',
'''// HP is the SHIPPED table, recovered 2026-08-19. maxHp lives in the binary Unity
// prefabs, but every serialised ship carries each component's current hp and
// assets.json carries a creation_date per ship, so the values can be DATED rather
// than guessed. 303 of 892 ships are dated, spanning 2017-11-23..2018-02-24, and
// they show one balance patch on 2018-01-14 (tools/corepox-hp-eras.ts):
//
//   type          before 2018-01-14   after      n
//   Armour              75             100      499
//   Binary             100              25      196
//   Constant            50              25      760
//   LaserTurret2       100              50      116
//   Lazer              100              75      863
//   Radar               50              25      219
//   Brain               50              20      272   (nerfed earlier, 2017-11-29)
//   Engine              50              50      981   (unchanged)
//   Hyperdrive / Orb    --         200 / 75          (both first appear 2018-01-14)
//
// The patch made everything fragile except Armour, which got tougher. Armour 100
// against a Brain 20 is 5:1, so the game is about EXPOSING a core, not out-shooting
// a shell -- which matches Tom's memory of Armour being good. The earlier "no
// player used Armour" reading came from the wrong dump (S1.3, retracted).''', "HP comment")
for old, new, what in [
  ('Brain:        {hp: 15,', 'Brain:        {hp: 20,', 'Brain hp'),
  ('Constant:     {hp: 15,', 'Constant:     {hp: 25,', 'Constant hp'),
  ('Binary:       {hp: 15,', 'Binary:       {hp: 25,', 'Binary hp'),
  ('Radar:        {hp: 15,', 'Radar:        {hp: 25,', 'Radar hp'),
  ('Engine:       {hp: 15,', 'Engine:       {hp: 50,', 'Engine hp'),
  ('Lazer:        {hp: 20,', 'Lazer:        {hp: 75,', 'Lazer hp'),
  ('Orb:          {hp: 20,', 'Orb:          {hp: 75,', 'Orb hp'),
  ('Armour:       {hp: 25,', 'Armour:       {hp: 100,', 'Armour hp'),
  ('LaserTurret2: {hp: 40,', 'LaserTurret2: {hp: 50,', 'Turret hp'),
  ('Hyperdrive:   {hp: 30,', 'Hyperdrive:   {hp: 200,', 'Hyperdrive hp'),
  ('Composite:    {hp: 15,', 'Composite:    {hp: 25,', 'Composite hp'),
]: sub(old, new, what)

sub('''  // Base is 2x1 (Tom). Was 12 tiles transcribed from TurretFn.Awake(), which is
  // the turret's swept area, not its footprint. The corpus cannot tell these apart
  // (14% vs 16% multi-island, 48% vs 47% overlap), so this rests on Tom.
  // pivot is the centre of the 2x2 formed by the base and the row the gun sweeps.
  LaserTurret2: {hp: 50, pwr: 6, tiles: [[0,0],[1,0]], pivot: [0.5, -0.5],
                 ins: ["fire","angle"], outs: []},''',
'''  // 12 cells, verbatim from TurretFn.Awake() -- the SHIPPED occupancy, with the
  // ASCII in that comment matching cell for cell:
  //    XX        y=3      x=0..1
  //   XXXX       y=1..2   x=-1..2
  //    0X        y=0      x=0..1   <- the 2x1 BASE Tom described
  // Both readings were right: the base is the 2x1 that carries the joints, and the
  // rest is the arc the gun sweeps, which the prefab reserves so nothing can be
  // built into it. pivot is the centre of the 2x2 over the base and the row above
  // (Tom: "the rotation point is in the middle if it was a 2x2").
  LaserTurret2: {hp: 50, pwr: 6, pivot: [0.5, 0.5],
                 tiles: [[-1,1],[-1,2],[0,1],[0,2],[1,1],[1,2],[2,1],[2,2],
                         [0,0],[1,0],[0,3],[1,3]],
                 ins: ["fire","angle"], outs: []},''', "turret occupancy")

# ---------------------------------------------------------------- 2. UNITS cell
sub('const _TYPES = function _TYPES(){return(', '''// Unity worked in WORLD units at Metric.Tile2Pixel = 0.64 world units per tile
// (Metrics.cs:6). This engine lays components out in TILES, so every constant
// lifted from the original is divided by 0.64 to land in tile units. They are
// collected here rather than inlined, because getting one wrong is invisible --
// it just makes the game feel different.
const _UNITS = function _UNITS(){return(
{
  W: 0.64,                    // world units per tile (Metric.Tile2Pixel)
  // LaserFn.cs:22 emits a beam at local (0, 1.8) with local velocity (0, 20) and
  // ttl 1.3s. So a bolt TRAVELS -- 20/0.64 = 31.25 tiles/s for 1.3s = 40.6 tiles
  // of range -- and can miss a moving target. `beam.length = 100` is the visual
  // shaft scale, not the range; treating it as an instant 100-tile raycast made
  // every gun hitscan, which is most of why guns dominated self-play.
  BEAM_SPEED: 20 / 0.64, BEAM_TTL: 1.3, BEAM_MUZZLE: 1.8 / 0.64, BEAM_LEN: 1 / 0.64,
  BEAM_CYCLE: 1.0, BEAM_DMG: 5,          // FIRE_S 0.1 + RECHARGE_S 0.9
  // ExplosiveFn.cs: 32 fragments evenly around a circle at 2 world u/s, ttl 3s,
  // 5 dmg each -- a shrapnel bomb with a 9.4 tile reach, not a point blast.
  FRAG_N: 32, FRAG_SPEED: 2 / 0.64, FRAG_TTL: 3, FRAG_DMG: 5, FRAG_CHARGE: 0.1,
  // EngineFn.emitParticle: exhaust spawns 1.6 tiles behind the nozzle moving aft
  // at 1 world u/s with ttl U(0,1), carrying Damage's default dmg of 1. Poisson
  // rate EMIT * magnitude * dt, magnitude 0..100 -- 2 a tick at full thrust.
  EXHAUST_SPEED: 1 / 0.64, EXHAUST_BACK: 1.6, EXHAUST_DMG: 1, EXHAUST_RATE: 1,
  HIT_R: 0.5                  // a component is one tile across
}
)};

const _TYPES = function _TYPES(){return(''', "UNITS cell")
sub('  $def("_DT", "DT", [], _DT);',
    '  $def("_DT", "DT", [], _DT);\n  $def("_UNITS", "UNITS", [], _UNITS);', "UNITS $def")

# ---------------------------------------------------------------- 3. deps
sub('const _Ship = function _Ship(NEIGHBOURS, TYPES, DIRS, rotTile, geom, BINOPS, DT){return(',
    'const _Ship = function _Ship(NEIGHBOURS, TYPES, DIRS, rotTile, geom, BINOPS, DT, UNITS){return(', "Ship deps")
sub('$def("_Ship", "Ship", ["NEIGHBOURS","TYPES","DIRS","rotTile","geom","BINOPS","DT"], _Ship);',
    '$def("_Ship", "Ship", ["NEIGHBOURS","TYPES","DIRS","rotTile","geom","BINOPS","DT","UNITS"], _Ship);', "Ship $def")
sub('const _World = function _World(Ship, TYPES, BINOPS, geom, DT){return(',
    'const _World = function _World(Ship, TYPES, BINOPS, geom, DT, UNITS){return(', "World deps")
sub('$def("_World", "World", ["Ship","TYPES","BINOPS","geom","DT"], _World);',
    '$def("_World", "World", ["Ship","TYPES","BINOPS","geom","DT","UNITS"], _World);', "World $def")

# ---------------------------------------------------------------- 4. force units
sub('''  force(wx, wy, fx, fy) {
    this.vx += fx / this.mass * DT;
    this.vy += fy / this.mass * DT;
    const rx = wx - this.x, ry = wy - this.y;
    this.w += (rx * fy - ry * fx) / this.I * DT / geom.D;
  }''',
'''  // Unity applied force at a world-unit position to a world-unit inertia. Working
  // in tiles the lever arm is 1/0.64 too long and the inertia 1/0.64^2 too small,
  // so BOTH accelerations pick up the same 1/0.64. The ratio is unchanged -- turn
  // radius is identical either way -- but absolute speed is 1.5625x, which is the
  // difference between matching the original's pace and not.
  force(wx, wy, fx, fy) {
    const k = DT / UNITS.W;
    this.vx += fx / this.mass * k;
    this.vy += fy / this.mass * k;
    const rx = wx - this.x, ry = wy - this.y;
    this.w += (rx * fy - ry * fx) / this.I * k / geom.D;
  }''', "force units")

# ---------------------------------------------------------------- 5. World state
sub('  constructor(ships = []) { this.ships = ships; this.beams = []; this.t = 0; this.tick = 0; }',
'''  static EXHAUST = true;   // off for bulk headless runs: it is most of the cost
  constructor(ships = []) {
    this.ships = ships; this.beams = []; this.particles = [];
    this.t = 0; this.tick = 0;
  }''', "World constructor")

# ---------------------------------------------------------------- 6. evaluate()
sub('''        if (!n) { c.out.dist = NaN; c.out.bearing = NaN; break; }
        c.out.dist = n.d;''',
'''        if (!n) { c.out.dist = NaN; c.out.bearing = NaN; break; }
        // RadarFn set distanceOutput to a WORLD-unit distance, so every player
        // program's threshold is in world units. Reporting tiles here silently
        // rescaled every `dist < k` test in the corpus by 1/0.64.
        c.out.dist = n.d * UNITS.W;''', "radar units")
sub('''          const [ux, uy] = geom.unit(ship.a + c.dir);
          ship.force(wx, wy, ux * f, uy * f);
        }
        break;''',
'''          const [ux, uy] = geom.unit(ship.a + c.dir);
          ship.force(wx, wy, ux * f, uy * f);
          this.exhaust(ship, c, wx, wy, ux, uy, v);
        }
        break;''', "engine exhaust")
sub('''        if (c.t > 1.0 && c.in.in > 0) {
          c.t = 0;
          const [wx, wy] = ship.worldOf(c);
          this.beams.push({ship, x: wx, y: wy, a: ship.a + c.dir, len: 100, dmg: 5});
          this.recoil(ship, c, wx, wy, ship.a + c.dir);
        }''',
'''        if (c.t > UNITS.BEAM_CYCLE && c.in.in > 0) {
          c.t = 0;
          this.fire(ship, c, ship.a + c.dir);
        }''', "lazer fire")
sub('''        if (c.t > 1.0 && c.in.fire > 0) {
          c.t = 0;
          const [wx, wy] = ship.worldOf(c);
          this.beams.push({ship, x: wx, y: wy, a: ship.a + c.dir + (c.turret ?? 0),
                           len: 100, dmg: 5});
          this.recoil(ship, c, wx, wy, ship.a + c.dir + (c.turret ?? 0));
        }''',
'''        if (c.t > UNITS.BEAM_CYCLE && c.in.fire > 0) {
          c.t = 0;
          this.fire(ship, c, ship.a + c.dir + (c.turret ?? 0));
        }''', "turret fire")
sub('          if (c.t > 0.1) this.detonate(ship, c);',
    '          if (c.t > UNITS.FRAG_CHARGE) this.detonate(ship, c);', "explosive charge")

# ---------------------------------------------------------------- 7. emitters
sub('''  detonate(ship, c) {
    const [wx, wy] = ship.worldOf(c);
    ship.damage(c, c.hp);
    for (const s of this.ships) {
      if (!s.alive) continue;
      for (const o of s.live) {
        const [px, py] = s.worldOf(o);
        if ((px - wx) ** 2 + (py - wy) ** 2 < 9) s.damage(o, 5);
      }
    }
  }''',
'''  // Every weapon in the original was the same object: a Damage with a velocity, a
  // ttl and a dmg, which hits the first component it touches that is not its own
  // emitter (DamageParticle.cs:12, `component != this.owner`). Note what that does
  // NOT exclude -- your own ship. Your exhaust burns your own tail, your own
  // shrapnel shreds you, and a bolt from a rear gun can hit your own nose.
  emit(ship, comp, kind, x, y, vx, vy, ttl, dmg, extra = {}) {
    const [sx, sy] = ship.velAt(x, y);          // particles inherit ship velocity
    this.particles.push({kind, ship, comp, x, y, vx: vx + sx, vy: vy + sy,
                         ttl, dmg, ...extra});
  }

  fire(ship, c, a) {
    const [ux, uy] = geom.unit(a);
    const [cx, cy] = ship.worldOf(c);
    this.emit(ship, c, "beam", cx + ux * UNITS.BEAM_MUZZLE, cy + uy * UNITS.BEAM_MUZZLE,
              ux * UNITS.BEAM_SPEED, uy * UNITS.BEAM_SPEED,
              UNITS.BEAM_TTL, UNITS.BEAM_DMG, {a});
    this.recoil(ship, c, cx, cy, a);
  }

  exhaust(ship, c, wx, wy, ux, uy, magnitude) {
    if (!World.EXHAUST) return;
    // Misc.samplePoisson(EMIT * magnitude * dt), by Knuth. At full thrust lambda
    // is 2, so this is a stream of damage behind you, not an occasional spark.
    const lam = UNITS.EXHAUST_RATE * Math.max(0, Math.min(100, magnitude)) * DT;
    let n = 0, p = Math.random();
    const L = Math.exp(-lam);
    while (p > L && n < 8) { n++; p *= Math.random(); }
    for (let i = 0; i < n; i++)
      this.emit(ship, c, "exhaust",
                wx - ux * UNITS.EXHAUST_BACK, wy - uy * UNITS.EXHAUST_BACK,
                -ux * UNITS.EXHAUST_SPEED, -uy * UNITS.EXHAUST_SPEED,
                Math.random(), UNITS.EXHAUST_DMG);
  }

  // ExplosiveFn.destroy(): 32 fragments evenly around a circle, then the component
  // removes itself. It runs on DESTRUCTION, not only on trigger, which is why a
  // hit on a loaded bomb takes its neighbours with it.
  detonate(ship, c) {
    if (c.spent) return;
    c.spent = true;
    const [wx, wy] = ship.worldOf(c);
    for (let i = 0; i < UNITS.FRAG_N; i++) {
      const r = (i * Math.PI * 2) / UNITS.FRAG_N;
      this.emit(ship, c, "frag", wx, wy,
                Math.sin(r) * UNITS.FRAG_SPEED, -Math.cos(r) * UNITS.FRAG_SPEED,
                UNITS.FRAG_TTL, UNITS.FRAG_DMG);
    }
    ship.damage(c, c.hp);
  }

  // Move every particle, then damage the first component its swept segment
  // crosses. A bolt covers 0.625 tiles a tick against a half-tile component, so
  // the test is against the segment, not the point, or fast shots tunnel.
  stepParticles() {
    const alive = [];
    for (const b of this.particles) {
      const x0 = b.x, y0 = b.y;
      b.x += b.vx * DT; b.y += b.vy * DT; b.ttl -= DT;
      let tx = x0, ty = y0;
      if (b.kind === "beam") {                  // a bolt has length; its tail hits too
        const sp = Math.hypot(b.vx, b.vy) || 1;
        tx = x0 - b.vx / sp * UNITS.BEAM_LEN; ty = y0 - b.vy / sp * UNITS.BEAM_LEN;
      }
      const sx = b.x - tx, sy = b.y - ty, ss = sx * sx + sy * sy;
      let hit = null, best = Infinity;
      for (const s of this.ships) {
        if (!s.live.length) continue;
        const ddx = s.x - b.x, ddy = s.y - b.y;
        if (ddx * ddx + ddy * ddy > 2500) continue;                  // broad phase
        for (const c of s.live) {
          if (c === b.comp) continue;                    // never its own emitter
          const [px, py] = s.worldOf(c);
          let t = ss ? ((px - tx) * sx + (py - ty) * sy) / ss : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = tx + sx * t - px, qy = ty + sy * t - py;
          const d2 = qx * qx + qy * qy;
          if (d2 > UNITS.HIT_R * UNITS.HIT_R || d2 >= best) continue;
          best = d2; hit = {s, c, px, py};
        }
      }
      if (hit) {
        b.hx = hit.px; b.hy = hit.py; b.hitOk = true;
        const died = hit.s.damage(hit.c, b.dmg);
        if (died && hit.c.type === "Explosive") this.detonate(hit.s, hit.c);
      } else if (b.ttl > 0) alive.push(b);
    }
    this.particles = alive;
    this.beams = this.particles.filter(b => b.kind === "beam");
  }''', "emitters + stepParticles")

# ---------------------------------------------------------------- 8. step()
sub("""    this.beams.length = 0;
    for (const ship of this.ships) {""",
"""    for (const ship of this.ships) {""", "drop beam reset")
sub("""    // A real raycast. Testing only the nearest component (as this did until
    // 2026-08-18) made a shot aimed dead-on at any other component miss, which
    // held 86% of self-play matches to a draw.
    for (const b of this.beams) {
      const [ux, uy] = geom.unit(b.a);
      let hit = null, ht = Infinity;
      for (const s of this.ships) {
        if (s.team === b.ship.team || !s.alive) continue;
        for (const c of s.live) {
          const [px, py] = s.worldOf(c);
          const t = (px - b.x) * ux + (py - b.y) * uy;          // along the ray
          if (t <= 0 || t > b.len || t >= ht) continue;
          const perp = Math.abs((px - b.x) * -uy + (py - b.y) * ux);
          if (perp > 0.5) continue;                             // half a tile
          ht = t; hit = {s, c, px, py};
        }
      }
      if (hit) { b.hx = hit.px; b.hy = hit.py; hit.s.damage(hit.c, b.dmg); b.hitOk = true; }
    }
""",
"""    // Weapons are particles now, so this is where every one of them lands --
    // beams, shrapnel and exhaust alike, on friend and foe.
    this.stepParticles();
""", "step(): raycast -> stepParticles")

open(P, "w").write(s)
print("written", P)
