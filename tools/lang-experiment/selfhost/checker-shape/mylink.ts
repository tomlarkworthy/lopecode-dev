// lite/link.ts with one addition: `given` supplies a cell's value from outside (the registry, which is not ported,
// and a cell replaced by the differential's control). link.ts re-evaluates each cell's text, so a closure cannot be
// passed as a replacement cell; here it is passed as a value.
import * as acorn from "acorn";
import { PRELUDE_FNS } from "../../lite/intrinsics.ts";

type Cell = (...inputs: never[]) => unknown;
export function link(cells: Record<string, Cell>, prelude: Record<string, unknown>, given: Record<string, unknown> = {}): Record<string, any> {
  const scope = [...PRELUDE_FNS].filter((n) => n in prelude);
  const scopeValues = scope.map((n) => prelude[n]);
  const values = new Map<string, unknown>(Object.entries(given)), open = new Set<string>();
  const value = (name: string): unknown => {
    if (values.has(name)) return values.get(name);
    const f: unknown = cells[name];
    if (typeof f !== "function") throw new Error(`link: ${name} is not a cell`);
    if (open.has(name)) throw new Error(`link: dependency cycle through ${name}`);
    open.add(name);
    const text = String(f);
    const node: any = acorn.parseExpressionAt(`(${text})`, 0, { ecmaVersion: "latest" });
    const inputs = node.params.map((p: any) => {
      if (p.type !== "Identifier") throw new Error(`link: ${name} has a parameter that is not a name`);
      return value(p.name);
    });
    const v = new Function(...scope, `return (${text});`)(...scopeValues)(...inputs);
    open.delete(name);
    values.set(name, v);
    return v;
  };
  return Object.fromEntries(Object.keys(cells).map((n) => [n, value(n)]));
}
