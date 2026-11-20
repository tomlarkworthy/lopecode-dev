// Links a file of SoundScript cells for bun, where no Observable runtime wires them: each exported cell is
// called once, with the values of the cells its parameters name. The checker allows a cell no free name but
// the prelude functions and the intrinsics, so each cell's text (erased JavaScript under bun) is evaluated
// again in a scope holding the prelude, as a compiled cell takes it from ss. Parameter names are read from
// that text's parse. Only cells of the same file can be taken.
// The caller passes the prelude: prelude.runtime.ts imports runtime-ss.ts, so this file importing it would be a
// cycle in which runtime-ss.ts links before the prelude's exports exist. runtime-ss.ts passes none: its cells
// use no built-in (a cell that does takes ss in the notebook, which the runtime module cannot give it).
import * as acorn from "acorn";
import { PRELUDE_FNS } from "./intrinsics.ts";

type Cell = (...inputs: never[]) => unknown;
export type Linked<C> = { [K in keyof C]: C[K] extends (...inputs: never[]) => infer V ? V : never };

export function link<C extends Record<string, Cell>>(cells: C, prelude: Record<string, unknown> = {}): Linked<C> {
  const scope = [...PRELUDE_FNS].filter((n) => n in prelude);
  const scopeValues = scope.map((n) => prelude[n]);
  const values = new Map<string, unknown>(), open = new Set<string>();
  const value = (name: string): unknown => {
    if (values.has(name)) return values.get(name);
    const f: unknown = cells[name];
    if (typeof f !== "function") throw new Error(`link: ${name} is not a cell of this file`);
    if (open.has(name)) throw new Error(`link: dependency cycle through ${name}`);
    open.add(name);
    const text = String(f);
    const node: any = acorn.parseExpressionAt(`(${text})`, 0, { ecmaVersion: "latest" });
    const inputs = node.params.map((p: any) => {
      if (p.type !== "Identifier") throw new Error(`link: ${name} has a parameter that is not a name`);
      return value(p.name);
    });
    const cell = new Function(...scope, `return (${text});`)(...scopeValues);
    const v = cell(...inputs);
    open.delete(name);
    values.set(name, v);
    return v;
  };
  return Object.fromEntries(Object.keys(cells).map((n) => [n, value(n)])) as Linked<C>;
}
