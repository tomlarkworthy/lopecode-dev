# Fidelity pass against the recovered C# (Assets/scripts/game/components/*.cs).
import io
p="modules/@tomlarkworthy/corepox-engine.js"
s=io.open(p,encoding="utf8").read()
def sub(old,new,what):
    global s
    if new in s and old not in s: print("  (already)",what); return
    assert s.count(old)==1, f"{what}: {s.count(old)} matches"
    s=s.replace(old,new); print("  ",what)

# LaserTurret2's two inputs sit on its two BASE cells. TurretFn.Awake() puts the base
# at (0,0) and (1,0); ManualAim wires Constant(0,0) -> turret(0,1) and its objective
# text is "adjust turret ANGLE", so (0,0) is angle and (1,0) is fire. Strafer and
# StraferThin each dropped exactly the two wires that land on (1,0).
sub('  LaserTurret2: {outs: {},                                ins: {fire: [0, 0], angle: [-1, 0]}},',
    '  LaserTurret2: {outs: {},                                ins: {angle: [0, 0], fire: [1, 0]}},',
    "LaserTurret2 port cells")

# TurretFn: turretAngle = lazerAngle - (error * 0.25) * Time.deltaTime * 10, i.e. 5%
# of the error per 20ms frame -- a 0.4s time constant, with no per-frame cap. The old
# `err * 0.25` clamped at 4 deg/tick was 5x too fast.
sub("""          const err = geom.norm(want - (c.turret ?? 0));
          c.turret = geom.norm((c.turret ?? 0) + Math.max(-4, Math.min(4, err * 0.25)));""",
    """          const err = geom.norm(want - (c.turret ?? 0));
          c.turret = geom.norm((c.turret ?? 0) + err * 0.05);
          // isBetweenAngle(-turretAngle, selfAngle-90, selfAngle+90): the barrel
          // only lives in the forward half-plane of its own mounting, so a target
          // behind the turret cannot be engaged by turning it round.
          c.turret = Math.max(-90, Math.min(90, c.turret));""",
    "turret slew rate and 180-degree arc")

# LaserFn emits ttl 1.0 from local (0,2); TurretFn emits ttl 1.3 from (0,1.8). The
# difference is 9 tiles of reach, which is why the turret is the better gun.
sub("  BEAM_SPEED: 20 / 0.64, BEAM_TTL: 1.3, BEAM_MUZZLE: 1.8 / 0.64, BEAM_LEN: 1 / 0.64,",
    """  BEAM_SPEED: 20 / 0.64, BEAM_LEN: 1 / 0.64,
  BEAM_TTL: 1.0,        BEAM_MUZZLE: 2.0 / 0.64,      // LaserFn
  TURRET_TTL: 1.3,      TURRET_MUZZLE: 1.8 / 0.64,    // TurretFn""",
    "separate Lazer and turret beam constants")

sub("""  fire(ship, c, a) {
    const [ux, uy] = geom.unit(a);
    const [cx, cy] = ship.worldOf(c);
    this.emit(ship, c, "beam", cx + ux * UNITS.BEAM_MUZZLE, cy + uy * UNITS.BEAM_MUZZLE,
              ux * UNITS.BEAM_SPEED, uy * UNITS.BEAM_SPEED,
              UNITS.BEAM_TTL, UNITS.BEAM_DMG, {a});""",
    """  fire(ship, c, a, {ttl = UNITS.BEAM_TTL, muzzle = UNITS.BEAM_MUZZLE} = {}) {
    const [ux, uy] = geom.unit(a);
    const [cx, cy] = ship.worldOf(c);
    this.emit(ship, c, "beam", cx + ux * muzzle, cy + uy * muzzle,
              ux * UNITS.BEAM_SPEED, uy * UNITS.BEAM_SPEED,
              ttl, UNITS.BEAM_DMG, {a});""",
    "fire() takes the emitter's own ttl/muzzle")

sub("""          this.fire(ship, c, ship.a + c.dir + (c.turret ?? 0));""",
    """          this.fire(ship, c, ship.a + c.dir + (c.turret ?? 0),
                    {ttl: UNITS.TURRET_TTL, muzzle: UNITS.TURRET_MUZZLE});""",
    "turret uses its own beam")
io.open(p,"w",encoding="utf8").write(s)
