import io
p="modules/@tomlarkworthy/corepox-engine.js"
s=io.open(p,encoding="utf8").read()
def sub(old,new,what):
    global s
    if new in s and old not in s: print("  (already)",what); return
    assert s.count(old)==1, f"{what}: {s.count(old)} matches"
    s=s.replace(old,new); print("  patched",what)

# ComponentSpec.overrides is the SAVED VALUE of a connector. ShipComponent.deserialize
# restores them, so an unwired Engine whose input latched at 100 keeps thrusting after
# a reload -- that is how Cocoon's delay bomb starts its counter at -50. 881 of the 892
# corpus ships carry them and the engine was dropping all of them.
# Connector names are the Unity field names; ours are shorter.
sub("""const _PORTS = function _PORTS(){return(""",
    """// Unity connector field name -> our port name. From the ComponentSpec.overrides
// found in the corpus: Engine/Lazer/Explosive `input`, Constant/Binary `output`,
// LaserTurret2 `rot_input`/`fire_input`, Radar `angle`/`distance`.
const _OVERRIDE_PORT = function _OVERRIDE_PORT(){return(
{input: "in", output: "out", rot_input: "angle", fire_input: "fire",
 angle: "bearing", distance: "dist", a: "a", b: "b"}
)};

const _PORTS = function _PORTS(){return(""",
    "OVERRIDE_PORT map")

sub("""        hp: c.hp ?? T.hp, param: c.param, out: {}, in: {}, t: 0, powered: true,""",
    """        hp: c.hp ?? T.hp, param: c.param, out: applyOverrides(c, T.outs),
        in: applyOverrides(c, T.ins), t: 0, powered: true,""",
    "ctor applies overrides")

sub("""const _Ship = function _Ship(""",
    """// Pull the saved connector values that belong to this side of the component.
const _applyOverrides = function _applyOverrides(OVERRIDE_PORT){return(
(spec, ports) => {
  const out = {};
  for (const o of spec.overrides ?? []) {
    const port = OVERRIDE_PORT[o.name] ?? o.name;
    if ((ports ?? []).includes(port)) out[port] = o.value;
  }
  return out;
}
)};

const _Ship = function _Ship(""",
    "applyOverrides cell")
io.open(p,"w",encoding="utf8").write(s)
