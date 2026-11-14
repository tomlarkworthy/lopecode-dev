// compile mistakes, one per bad_* cell. ok_* cells and the support cells must be ok.
export const a = () => 2;
export const b = (a: number) => a * 3;
export const stamp = (a: number, now) => a + now();
export const late = async (a: number) => a + 1;
export const bad_member = (a: number): number => a + "x";
export const twice = () => (n: number) => n * 2;
export const level = (): RefCell<number> => ref(1);
export const scaled = (a: number, level: number) => a * level;
export const names = () => ["a"];

export const ok_plain = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["b"] });
export const ok_pool = (compile: Compile, pool: Pool) => compile({ inputs: [], refs: ["a"], outputs: ["b"], options: { runtime: pool } });
export const ok_ref = (compile: Compile) => compile({ inputs: ["a"], refs: ["level"], outputs: ["scaled"] });
export const ok_call = async (ok_plain) => (await ok_plain({ a: 5 })).b;

export const bad_unknown = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["nope"] });
export const bad_capability = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["stamp"] });
export const bad_ref_cell = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["scaled"] });
export const bad_async = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["late"] });
export const bad_rejected = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["bad_member"] });
export const bad_boundary = (compile: Compile) => compile({ inputs: [], refs: [], outputs: ["twice"] });
export const bad_options = (compile: Compile) => compile({ inputs: ["a"], refs: [], outputs: ["b"], options: { runtime: 4 } });
export const bad_call_type = async (ok_plain) => (await ok_plain({ a: "5" })).b;
export const bad_call_missing = async (ok_plain) => (await ok_plain({})).b;
export const uns_nonliteral = (compile: Compile, names: string[]) => compile({ inputs: names, refs: [], outputs: ["b"] });
