// maxHp lives in the Unity prefabs, which are binary. But every serialised ship
// carries each component's CURRENT hp, and an undamaged ship carries maxHp -- so
// the top of the distribution per type recovers the prefab value.
const fs = await import("node:fs");
const raw:any[]=[];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json","utf8").split("\n")){
  const i=line.indexOf(","); if(i<0) continue;
  try{const s=JSON.parse(line.slice(i+1)); if(s?.components) raw.push(s);}catch{}
}
// Unity's JsonUtility emits bare Infinity for an unset override, which JSON.parse
// rejects; 1e400 round-trips to the same value.
const miss=JSON.parse(fs.readFileSync("scratch/corepox-missions.json","utf8")
  .replace(/:\s*(-?)Infinity/g, ": $11e400"));
for (const m of Object.values(miss) as any[]) for (const s of m.ships ?? []) raw.push(s);
const hp:Record<string,Map<number,number>>={};
const params:Record<string,Map<string,number>>={};
for(const s of raw) for(const c of s.components??[]){
  const t=(c.type??"").replace(/\(Clone\)/,"");
  if(!t) continue;
  (hp[t] ??= new Map()).set(c.hp, (hp[t].get(c.hp)??0)+1);
  if(c.param!=null&&c.param!=="") (params[t] ??= new Map()).set(c.param,(params[t].get(c.param)??0)+1);
}
console.log("type                n    maxHp   hp values seen (value x count)");
for(const t of Object.keys(hp).sort()){
  const e=[...hp[t].entries()].sort((a,b)=>b[1]-a[1]);
  const n=e.reduce((s,x)=>s+x[1],0);
  const max=Math.max(...e.map(x=>x[0]).filter(Number.isFinite));
  console.log(`${t.padEnd(16)} ${String(n).padStart(5)} ${String(max).padStart(8)}   ` +
    e.slice(0,6).map(([v,k])=>`${v}x${k}`).join("  "));
}
console.log("\nparams seen (top 6 per type):");
for(const t of Object.keys(params).sort())
  console.log(` ${t.padEnd(14)} ${[...params[t].entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([v,k])=>`${JSON.stringify(v)}x${k}`).join("  ")}`);
