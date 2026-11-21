// lists intrinsic callees with more than one call signature (for a program that reaches call's overload retry)
import { Registry } from "../../../lite/registry.ts";
import { named } from "../../../lite/types.ts";
const reg = new Registry();
for (const [n, v] of reg.values) if (reg.callSigs(v.t).length > 1) console.log(`value ${n}: ${reg.callSigs(v.t).length}`);
for (const host of ["String", "Array", "Number", "Math", "Map", "Set", "JSON", "Object"]) {
  const d = reg.types.get(host); if (!d) continue;
  const r = reg.ifaceRec(host);
  for (const [k, p] of r.props) if (reg.callSigs(p.t).length > 1) console.log(`${host}.${k}: ${reg.callSigs(p.t).length}`);
}
