import io,sys
p="modules/@tomlarkworthy/corepox-engine.js"
s=io.open(p,encoding="utf8").read()
def sub(old,new,what):
    global s
    if new in s and old not in s: print("  (already)",what); return
    assert s.count(old)==1, f"{what}: {s.count(old)} matches"
    s=s.replace(old,new); print("  patched",what)

# 1. A ship with no Brain has no core to ration power FROM. The budget models a
#    core distributing supply; with no core there is nothing to brown out, and
#    every recovered mine in the campaign (ProximityMine, delayBomb) has no Brain.
sub("""    let budget = brains.length * Ship.SUPPLY;
    let q = brains.slice();
    const seen = new Set(q.map(c => c.i));""",
    """    // No Brain means no core to ration from: a dumb device is fully live, and
    // every mine the campaign uses (ProximityMine, delayBomb) is one.
    if (!brains.length) { for (const c of this.live) c.powered = true; this.power = 0; return; }
    let budget = brains.length * Ship.SUPPLY;
    let q = brains.slice();
    const seen = new Set(q.map(c => c.i));""",
    "powerUp: brainless ships are fully powered")

# 2. `alive` means "has a working core", which is the WIN condition, not the
#    condition for existing. A mine still drifts, computes and explodes.
sub("      if (!ship.alive) continue;\n      ship.propagate();",
    "      if (!ship.live.length) continue;\n      ship.propagate();",
    "step: brainless ships still run")
sub("      if (s.team === ship.team || !s.alive) continue;",
    "      if (s.team === ship.team || !s.live.length) continue;",
    "nearestEnemy: brainless ships are targets")
sub("""    for (const s of this.ships) {
      if (!s.alive) continue;
      for (const c of s.live) {
        if (c.type !== "Orb") continue;""",
    """    for (const s of this.ships) {
      if (!s.live.length) continue;
      for (const c of s.live) {
        if (c.type !== "Orb") continue;""",
    "orb contact: brainless hulls count")
io.open(p,"w",encoding="utf8").write(s)
