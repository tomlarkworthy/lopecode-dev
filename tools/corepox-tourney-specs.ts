// Archetype layouts. Rebuilt 2026-08-18 on the real footprints -- the originals
// were authored when every component was assumed 1x1, and 6 of 7 overlapped or
// came apart once Radar became 2x3, Binary a T, Engine 2x1 and Lazer 3x1
// (tools/corepox-archetype-check.ts prints the collisions).
//
// Wires name COMPONENTS, not grid cells. Ship.at() resolves an endpoint by ANCHOR
// cell (`comps.find(c => c.px === x && c.py === y)`), so a wire has to carry the
// anchor, not the cell the port sits on -- and the anchor moves whenever a layout
// changes. Naming the component makes that impossible to get wrong; build() also
// rejects a port name the type does not have. +y is forward.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const PORTS: any = await m.value("PORTS");

type Part = {id: string, type: string, pos: number[], param?: string};
export function build(name: string, parts: Part[], links: [string,string,string,string][]) {
  const by: any = {}; for (const p of parts) by[p.id] = p;
  const anchor = (id: string, port: string, kind: string) => {
    const p = by[id]; if (!p) throw new Error(`${name}: no part "${id}"`);
    if (!PORTS[p.type]?.[kind]?.[port]) throw new Error(`${name}: ${p.type} has no ${kind} port "${port}"`);
    return p.pos;
  };
  return {
    name,
    components: parts.map(p => ({type: p.type, pos: p.pos, dir: "up", ...(p.param ? {param: p.param} : {})})),
    connections: links.map(([a, ap, b, bp]) =>
      ({from: anchor(a, ap, "outs"), fromPort: ap, to: anchor(b, bp, "ins"), toPort: bp}))
  };
}

// A Binary's bar spans px-1..px+1 at py and its stem sits at py-1, so a column of
// them stacks on a 2-row pitch; Radar occupies px..px+1 by py..py+2; Engine is the
// anchor cell plus the one behind it; Lazer the anchor cell plus two ahead.

export const WALL = build("wall", [                 // no sensing at all
  {id:"brain", type:"Brain",    pos:[0,0]},
  {id:"k",     type:"Constant", pos:[0,-1], param:"100"},
  ...[-4,-2,0,2,4].map((x,i) => ({id:"g"+i, type:"Lazer", pos:[x,1]})),
  // the lazers are 1 wide but 3 long, so the gaps between them need filling or
  // the wall is five separate bodies
  ...[-3,-1,1,3].map((x,i) => ({id:"s"+i, type:"Armour", pos:[x,1]})),
], [..."01234".split("").map((_,i) => ["k","out","g"+i,"in"] as [string,string,string,string])]);

export const BRAITENBERG = build("braitenberg", [   // the recovered relic
  {id:"brain", type:"Brain",    pos:[0,0]},
  {id:"radar", type:"Radar",    pos:[-1,1]},
  {id:"k",     type:"Constant", pos:[2,0], param:"50"},
  {id:"sub",   type:"Binary",   pos:[0,-1], param:"MINUS"},
  {id:"engL",  type:"Engine",   pos:[-2,-2]},
  {id:"engR",  type:"Engine",   pos:[2,-2]},
  {id:"gun",   type:"Lazer",    pos:[1,1]},
], [
  ["radar","bearing","sub","a"], ["k","out","sub","b"],
  ["sub","out","engL","in"], ["radar","bearing","engR","in"],
  ["k","out","gun","in"],
]);

export const SEEKER = build("seeker", [             // bang-bang, the shape most players reached
  {id:"brain", type:"Brain",    pos:[0,0]},
  {id:"k",     type:"Constant", pos:[0,1],  param:"100"},
  {id:"radar", type:"Radar",    pos:[-1,2]},
  {id:"gun",   type:"Lazer",    pos:[2,2]},
  {id:"gt",    type:"Binary",   pos:[2,1],  param:"GT"},
  {id:"lt",    type:"Binary",   pos:[-2,1], param:"LT"},
  {id:"mulR",  type:"Binary",   pos:[2,-1], param:"TIMES"},
  {id:"mulL",  type:"Binary",   pos:[-2,-1],param:"TIMES"},
  {id:"engR",  type:"Engine",   pos:[2,-3]},
  {id:"engL",  type:"Engine",   pos:[-2,-3]},
  {id:"engC",  type:"Engine",   pos:[0,-1]},
], [
  ["radar","bearing","gt","a"], ["radar","bearing","lt","a"],
  ["gt","out","mulR","a"],  ["k","out","mulR","b"],
  ["lt","out","mulL","a"],  ["k","out","mulL","b"],
  ["mulR","out","engL","in"], ["mulL","out","engR","in"],   // crossed, as before
  ["k","out","engC","in"], ["k","out","gun","in"],
]);

export const PROP = build("proportional", [         // bearing scaled, not thresholded
  {id:"brain", type:"Brain",    pos:[0,0]},
  {id:"k",     type:"Constant", pos:[0,1],  param:"3"},
  {id:"nk",    type:"Constant", pos:[0,-1], param:"-3"},
  {id:"thr",   type:"Constant", pos:[0,3],  param:"60"},
  {id:"radar", type:"Radar",    pos:[-1,4]},
  {id:"gun",   type:"Lazer",    pos:[2,4]},
  {id:"mulR",  type:"Binary",   pos:[2,1],  param:"TIMES"},
  {id:"mulL",  type:"Binary",   pos:[-2,1], param:"TIMES"},
  {id:"engR",  type:"Engine",   pos:[2,-1]},
  {id:"engL",  type:"Engine",   pos:[-2,-1]},
  {id:"engC",  type:"Engine",   pos:[0,-2]},
], [
  ["radar","bearing","mulR","a"], ["k","out","mulR","b"],
  ["radar","bearing","mulL","a"], ["nk","out","mulL","b"],
  ["mulR","out","engL","in"], ["mulL","out","engR","in"],
  ["thr","out","engC","in"], ["k","out","gun","in"],
]);

export const RAMMER = build("rammer", [             // explosives + full thrust at the target
  {id:"brain", type:"Brain",    pos:[0,0]},
  {id:"k",     type:"Constant", pos:[0,1],  param:"100"},
  {id:"radar", type:"Radar",    pos:[-1,2]},
  {id:"gt",    type:"Binary",   pos:[2,1],  param:"GT"},
  {id:"lt",    type:"Binary",   pos:[-2,1], param:"LT"},
  {id:"mulR",  type:"Binary",   pos:[2,-1], param:"TIMES"},
  {id:"mulL",  type:"Binary",   pos:[-2,-1],param:"TIMES"},
  {id:"near",  type:"Binary",   pos:[0,-3], param:"LT"},
  {id:"k2",    type:"Constant", pos:[1,-4], param:"2"},
  {id:"engR",  type:"Engine",   pos:[2,-3]},
  {id:"engL",  type:"Engine",   pos:[-2,-3]},
  {id:"engC",  type:"Engine",   pos:[0,-1]},
  {id:"e1",    type:"Explosive",pos:[2,2]},
  {id:"e2",    type:"Explosive",pos:[2,3]},
  {id:"e3",    type:"Explosive",pos:[2,4]},
], [
  ["radar","bearing","gt","a"], ["radar","bearing","lt","a"],
  ["gt","out","mulR","a"], ["k","out","mulR","b"],
  ["lt","out","mulL","a"], ["k","out","mulL","b"],
  ["mulR","out","engL","in"], ["mulL","out","engR","in"],
  ["k","out","engC","in"],
  ["radar","dist","near","a"], ["k2","out","near","b"],
  ["near","out","e1","in"], ["near","out","e2","in"], ["near","out","e3","in"],
]);

export const TURTLE = build("turtle", [             // pure armour brick, unchanged: all 1x1
  {id:"brain", type:"Brain", pos:[0,0]},
  ...[[-1,0],[1,0],[0,1],[0,-1],[-1,1],[1,1],[-1,-1],[1,-1]]
    .map((p,i) => ({id:"a"+i, type:"Armour", pos:p})),
], []);

export const SNIPER = build("sniper", [             // fires only inside range
  {id:"brain", type:"Brain",    pos:[0,0]},
  {id:"k",     type:"Constant", pos:[0,1],  param:"100"},
  {id:"radar", type:"Radar",    pos:[-1,2]},
  {id:"gt",    type:"Binary",   pos:[2,1],  param:"GT"},
  {id:"lt",    type:"Binary",   pos:[-2,1], param:"LT"},
  {id:"mulR",  type:"Binary",   pos:[2,-1], param:"TIMES"},
  {id:"mulL",  type:"Binary",   pos:[-2,-1],param:"TIMES"},
  {id:"far",   type:"Binary",   pos:[0,-3], param:"LT"},
  {id:"k2",    type:"Constant", pos:[1,-4], param:"12"},
  {id:"engR",  type:"Engine",   pos:[2,-3]},
  {id:"engL",  type:"Engine",   pos:[-2,-3]},
  {id:"g1",    type:"Lazer",    pos:[2,2]},
  {id:"g2",    type:"Lazer",    pos:[3,2]},
  {id:"g3",    type:"Lazer",    pos:[4,2]},
], [
  ["radar","bearing","gt","a"], ["radar","bearing","lt","a"],
  ["gt","out","mulR","a"], ["k","out","mulR","b"],
  ["lt","out","mulL","a"], ["k","out","mulL","b"],
  ["mulR","out","engL","in"], ["mulL","out","engR","in"],
  ["radar","dist","far","a"], ["k2","out","far","b"],
  ["far","out","g1","in"], ["far","out","g2","in"], ["far","out","g3","in"],
]);

export const ROSTER = [WALL, BRAITENBERG, SEEKER, PROP, RAMMER, TURTLE, SNIPER];
