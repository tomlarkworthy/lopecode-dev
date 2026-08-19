// Round-robin self-play over hand-built archetypes, to find what dominates.
// Imports the real engine cells; nothing is reimplemented here.
import {importNotebookModule} from "./notebook-import.ts";

const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");

const C = (type: string, pos: number[], extra: any = {}) => ({type, pos, dir: "up", ...extra});
const wire = (from: number[], fromPort: string, to: number[], toPort: string) =>
  ({from, fromPort, to, toPort});

// ---- archetypes -----------------------------------------------------------
const WALL = {                                  // "wall of lasers": no sensing at all
  name: "wall",
  components: [C("Brain",[0,0]), C("Constant",[0,-1],{param:"100"}),
    ...[-2,-1,0,1,2].map(x => C("Lazer",[x,1])), C("Lazer",[0,2])],
  connections: [...[-2,-1,0,1,2].map(x => wire([0,-1],"out",[x,1],"in")),
                wire([0,-1],"out",[0,2],"in")]
};

const BRAITENBERG = {                           // the recovered relic, in engine format
  name: "braitenberg",
  components: [C("Brain",[0,0]), C("Radar",[0,1]), C("Constant",[2,0],{param:"50"}),
    C("Binary",[1,0],{param:"MINUS"}), C("Engine",[-1,0]), C("Engine",[1,-1]),
    C("Lazer",[0,2])],
  connections: [wire([0,1],"bearing",[1,0],"a"), wire([2,0],"out",[1,0],"b"),
    wire([1,0],"out",[-1,0],"in"), wire([0,1],"bearing",[1,-1],"in"),
    wire([2,0],"out",[0,2],"in")]
};

const SEEKER = {                                // bang-bang: the shape most players reached
  name: "seeker",
  components: [C("Brain",[0,0]), C("Radar",[0,1]), C("Constant",[2,1],{param:"100"}),
    C("Binary",[1,1],{param:"GT"}), C("Binary",[-1,1],{param:"LT"}),
    C("Binary",[1,0],{param:"TIMES"}), C("Binary",[-1,0],{param:"TIMES"}),
    C("Engine",[-1,-1]), C("Engine",[1,-1]), C("Engine",[0,-1]), C("Lazer",[0,2])],
  connections: [wire([0,1],"bearing",[1,1],"a"), wire([0,1],"bearing",[-1,1],"a"),
    wire([1,1],"out",[1,0],"a"), wire([2,1],"out",[1,0],"b"),
    wire([-1,1],"out",[-1,0],"a"), wire([2,1],"out",[-1,0],"b"),
    wire([1,0],"out",[-1,-1],"in"), wire([-1,0],"out",[1,-1],"in"),
    wire([2,1],"out",[0,-1],"in"), wire([2,1],"out",[0,2],"in")]
};

const PROP = {                                  // proportional: bearing scaled, not thresholded
  name: "proportional",
  components: [C("Brain",[0,0]), C("Radar",[0,1]), C("Constant",[2,1],{param:"3"}),
    C("Binary",[1,1],{param:"TIMES"}), C("Constant",[2,0],{param:"-3"}),
    C("Binary",[-1,1],{param:"TIMES"}),
    C("Engine",[-1,-1]), C("Engine",[1,-1]), C("Constant",[-1,0],{param:"60"}),
    C("Engine",[0,-1]), C("Lazer",[0,2])],
  connections: [wire([0,1],"bearing",[1,1],"a"), wire([2,1],"out",[1,1],"b"),
    wire([0,1],"bearing",[-1,1],"a"), wire([2,0],"out",[-1,1],"b"),
    wire([1,1],"out",[-1,-1],"in"), wire([-1,1],"out",[1,-1],"in"),
    wire([-1,0],"out",[0,-1],"in"), wire([2,1],"out",[0,2],"in")]
};

const RAMMER = {                                // explosives + full thrust at the target
  name: "rammer",
  components: [C("Brain",[0,0]), C("Radar",[0,1]), C("Constant",[2,1],{param:"100"}),
    C("Binary",[1,1],{param:"GT"}), C("Binary",[-1,1],{param:"LT"}),
    C("Binary",[1,0],{param:"TIMES"}), C("Binary",[-1,0],{param:"TIMES"}),
    C("Engine",[-1,-1]), C("Engine",[1,-1]), C("Engine",[0,-1]),
    C("Explosive",[0,2]), C("Explosive",[1,2]), C("Explosive",[-1,2]),
    C("Binary",[2,0],{param:"LT"}), C("Constant",[3,0],{param:"2"})],
  connections: [wire([0,1],"bearing",[1,1],"a"), wire([0,1],"bearing",[-1,1],"a"),
    wire([1,1],"out",[1,0],"a"), wire([2,1],"out",[1,0],"b"),
    wire([-1,1],"out",[-1,0],"a"), wire([2,1],"out",[-1,0],"b"),
    wire([1,0],"out",[-1,-1],"in"), wire([-1,0],"out",[1,-1],"in"),
    wire([2,1],"out",[0,-1],"in"),
    wire([0,1],"dist",[2,0],"a"), wire([3,0],"out",[2,0],"b"),
    wire([2,0],"out",[0,2],"in"), wire([2,0],"out",[1,2],"in"),
    wire([2,0],"out",[-1,2],"in")]
};

const TURTLE = {                                // pure armour brick, no control, no weapons
  name: "turtle",
  components: [C("Brain",[0,0]),
    ...[[-1,0],[1,0],[0,1],[0,-1],[-1,1],[1,1],[-1,-1],[1,-1]].map(p=>C("Armour",p))],
  connections: []
};

const SNIPER = {                                // fires only inside range, otherwise closes
  name: "sniper",
  components: [C("Brain",[0,0]), C("Radar",[0,1]), C("Constant",[2,1],{param:"100"}),
    C("Binary",[1,1],{param:"GT"}), C("Binary",[-1,1],{param:"LT"}),
    C("Binary",[1,0],{param:"TIMES"}), C("Binary",[-1,0],{param:"TIMES"}),
    C("Engine",[-1,-1]), C("Engine",[1,-1]),
    C("Binary",[2,-1],{param:"LT"}), C("Constant",[3,-1],{param:"12"}),
    C("Lazer",[0,2]), C("Lazer",[1,2]), C("Lazer",[-1,2])],
  connections: [wire([0,1],"bearing",[1,1],"a"), wire([0,1],"bearing",[-1,1],"a"),
    wire([1,1],"out",[1,0],"a"), wire([2,1],"out",[1,0],"b"),
    wire([-1,1],"out",[-1,0],"a"), wire([2,1],"out",[-1,0],"b"),
    wire([1,0],"out",[-1,-1],"in"), wire([-1,0],"out",[1,-1],"in"),
    wire([0,1],"dist",[2,-1],"a"), wire([3,-1],"out",[2,-1],"b"),
    wire([2,-1],"out",[0,2],"in"), wire([2,-1],"out",[1,2],"in"),
    wire([2,-1],"out",[-1,2],"in")]
};

const ROSTER = [WALL, BRAITENBERG, SEEKER, PROP, RAMMER, TURTLE, SNIPER];

export {ROSTER, WALL, BRAITENBERG, SEEKER, PROP, RAMMER, TURTLE, SNIPER, Ship, World};
