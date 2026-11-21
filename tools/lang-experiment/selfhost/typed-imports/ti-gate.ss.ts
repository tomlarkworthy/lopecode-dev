// The last step of the gate "is this module SoundScript": the module's running SoundScript variables against what
// the toolchain compiles from their decompiled source, checked as the program checks it.

// a runtime variable as the gate reads it: its name, its inputs' names and its definition's text
export type TiVar = { readonly name: string; readonly inputs: string[]; readonly definition: string };
// the first difference between the running variables and the recompiled ones, or null when they are the same set
export const tiSameDefs = () => (running: TiVar[], recompiled: TiVar[]): string | null => {
  const want = new Map(recompiled.map((v): [string, TiVar] => [v.name, v]));
  for (const v of running) {
    const w = want.get(v.name);
    if (w === undefined) return `${v.name}: no variable of that name recompiles from the module's source`;
    if (w.definition !== v.definition) return `${v.name}: the definition does not recompile to itself`;
    if (w.inputs.length !== v.inputs.length || w.inputs.some((x, i) => x !== v.inputs[i])) return `${v.name}: inputs ${v.inputs.join(",")} recompile as ${w.inputs.join(",")}`;
  }
  const have = new Set(running.map((v) => v.name));
  const extra = recompiled.find((v) => !have.has(v.name));
  return extra === undefined ? null : `${extra.name}: the source compiles to a variable the module does not have`;
};
