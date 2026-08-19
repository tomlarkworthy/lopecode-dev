import {ROSTER, Ship} from "./corepox-roster.ts";
for (const spec of ROSTER as any[]) {
  const s = new Ship(spec, {team:"a"});
  const isl = s.islands();
  const unpowered = s.comps.filter((c:any)=>!c.powered).map((c:any)=>`${c.type}@${c.px},${c.py}`);
  const dangling = spec.connections.filter((k:any)=>!s.at(k.from[0],k.from[1])||!s.at(k.to[0],k.to[1]));
  console.log(`${spec.name.padEnd(13)} islands=${isl.length}` +
    (isl.length>1 ? `  LOOSE: ${isl.slice(1).flat().map((c:any)=>`${c.type}@${c.px},${c.py}`).join(" ")}` : "") +
    (unpowered.length ? `  UNPOWERED: ${unpowered.join(" ")}` : "") +
    (dangling.length ? `  DANGLING WIRES: ${dangling.length}` : ""));
}
