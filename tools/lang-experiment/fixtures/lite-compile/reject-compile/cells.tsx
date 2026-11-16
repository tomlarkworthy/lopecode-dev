// compile mistakes, one per bad_* cell. ok_* cells and the support cells must be ok.
const a = () => 2;
const b = (a: number) => a * 3;
const stamp = (a: number, now) => a + now();
const late = async (a: number) => a + 1;
const bad_member = (a: number): number => a + "x";
const twice = () => (n: number) => n * 2;
const level = (): StateCell<number> => state(1);
const scaled = (a: number, level: number) => a * level;
const names = () => ["a"];

const ok_plain = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["b"] });
const ok_pool = (compile: Compile, pool: Pool) => compile({ inputs: [], refs: ["a"], outputs: ["b"], options: { runtime: pool } });
const ok_ref = (compile: Compile) => compile({ inputs: ["a"], refs: ["level"], outputs: ["scaled"] });
const ok_call = async (ok_plain) => (await ok_plain({ a: 5 })).b;

const bad_unknown = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["nope"] });
const bad_capability = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["stamp"] });
const bad_ref_cell = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["scaled"] });
const bad_async = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["late"] });
const bad_rejected = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["bad_member"] });
const bad_boundary = (compile: Compile) => compile({ inputs: [], refs: [], outputs: ["twice"] });
const bad_options = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["b"], options: { runtime: 4 } });
const bad_call_type = async (ok_plain) => (await ok_plain({ a: "5" })).b;
const bad_call_missing = async (ok_plain) => (await ok_plain({})).b;
const uns_nonliteral = (compile: Compile, names: string[]) => compile({ inputs: names, refs: [], outputs: ["b"] });
