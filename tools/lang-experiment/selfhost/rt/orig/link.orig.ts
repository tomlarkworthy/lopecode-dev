// Links a file of SoundScript cells for bun, where no Observable runtime wires them: each exported cell is
// called once, with the values of the cells its parameters name. The checker allows a cell no free name but
// the prelude functions and the intrinsics, so each cell's text (erased JavaScript under bun) is evaluated
// again in a scope holding the prelude, as a compiled cell takes it from ss. Parameter names are read from
// that text's parse. Only cells of the same file can be taken.
import * as acorn from "acorn";
import * as prelude from "../prelude.runtime.ts";
import { PRELUDE_FNS } from "./intrinsics.ts";

type Cell = (...inputs: never[]) => unknown;
export type Linked<C> = { [K in keyof C]: C[K] extends (...inputs: never[]) => infer V ? V : never };
const scope = [...PRELUDE_FNS].filter((n) => n in prelude);
const scopeValues = scope.map((n) => (prelude as Record<string, unknown>)[n]);

export function link<C extends Record<string, Cell>>(cells: C): Linked<C> {
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
