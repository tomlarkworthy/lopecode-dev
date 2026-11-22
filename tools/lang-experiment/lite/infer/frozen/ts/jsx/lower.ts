// FROZEN FIXTURE (2026-11-22, switch4): lite/jsx/lower.ts as it was before the rg, cp and tc cells were switched on.
// Only the differentials and tests compare against it; nothing shipped imports it, and the build does not reach it.
// Source-to-source: replace each JSX node in a .tsx with h(...) calls, keeping everything else
// (types included) byte for byte, so the result is a cells.ts the existing harness can load.
import { parse, type Node } from "../parse.ts";
import { kids } from "../parse.ts";

// keep: wrap each lowered top-level element as /*ss<ORIGINAL*/h(...)/*ss>*/ so ss-toolchain can restore it.
export function lowerJsx(src: string, opts: { keep?: boolean } = {}): string {
  const P = parse(src, { jsx: true });
  const out: string[] = [];
  let at = 0;
  const visit = (n: Node) => {
    if (n.type === "JSXElement" || n.type === "JSXFragment") {
      out.push(src.slice(at, n.start), opts.keep ? `/*ss<${src.slice(n.start, n.end).replaceAll("*/", "*\\/")}*/${emit(n)}/*ss>*/` : emit(n));
      at = n.end;
      return;
    }
    for (const c of kids(n)) visit(c);
  };
  const emit = (n: Node): string => {
    const children: string[] = [];
    for (const c of n.children) {
      if (c.type === "JSXText") {
        const t = c.value.replace(/\s*\n\s*/g, " ");
        if (t.trim() === "" && /\n/.test(c.value)) continue;
        children.push(JSON.stringify(t));
      } else if (c.type === "JSXExpressionContainer") {
        if (c.expression.type !== "JSXEmptyExpression") children.push(sub(c.expression));
      } else children.push(emit(c));
    }
    if (n.type === "JSXFragment") return `h(null, null${children.map((c) => ", " + c).join("")})`;
    const op = n.openingElement;
    const name = op.name.name as string;
    const tag = /^[a-z]/.test(name) ? JSON.stringify(name) : name;
    const props = op.attributes.map((a: Node) => {
      const v = a.value === null ? "true" : a.value.type === "Literal" ? JSON.stringify(a.value.value) : sub(a.value.expression);
      return `${JSON.stringify(a.name.name)}: ${v}`;
    });
    return `h(${tag}, {${props.join(", ")}}${children.map((c) => ", " + c).join("")})`;
  };
  // an expression inside JSX may itself contain JSX
  const sub = (e: Node): string => {
    const parts: string[] = [];
    let p = e.start;
    const walk = (n: Node) => {
      if (n.type === "JSXElement" || n.type === "JSXFragment") {
        parts.push(src.slice(p, n.start), emit(n));
        p = n.end;
        return;
      }
      for (const c of kids(n)) walk(c);
    };
    walk(e);
    parts.push(src.slice(p, e.end));
    return parts.join("");
  };
  visit(P.program);
  out.push(src.slice(at));
  return out.join("");
}
