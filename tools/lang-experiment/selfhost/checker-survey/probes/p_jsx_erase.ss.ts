// uses: ast, astlib
// lite/jsx/lower.ts lowerJsx and lite/browser/erase.ts erase (full bodies), module-js.ts syntaxStub; parse a stub.
export const parse = () => (src: string, opts: { jsx?: boolean } = {}): Parsed => { throw new Error("stub"); };
export const lowerJsx = (parse, kids) => (src: string, opts: { keep?: boolean } = {}): string => {
  const P = parse(src, { jsx: true });
  const out: Mut<string[]> = mut([]);
  let at = 0;
  function emit(n: JSXElement | JSXFragment): string {
    const children: Mut<string[]> = mut([]);
    for (const c of n.children) {
      if (c.type === "JSXText") {
        const t = c.value.replace(/\s*\n\s*/g, " ");
        if (t.trim() === "" && /\n/.test(c.value)) continue;
        children.push(JSON.stringify(t));
      } else if (c.type === "JSXExpressionContainer") {
        if (c.expression.type !== "JSXEmptyExpression") children.push(sub(c.expression));
      } else if (c.type === "JSXElement" || c.type === "JSXFragment") children.push(emit(c));
    }
    const cs = freeze(children);
    if (n.type === "JSXFragment") return `h(null, null${cs.map((c) => ", " + c).join("")})`;
    const op = n.openingElement;
    const name = op.name.type === "JSXIdentifier" ? op.name.name : "";
    const tag = /^[a-z]/.test(name) ? JSON.stringify(name) : name;
    const props: Mut<string[]> = mut([]);
    for (const a of op.attributes) {
      if (a.type !== "JSXAttribute") continue;
      const val = a.value;
      const v = val === null ? "true" : val.type === "Literal" ? JSON.stringify(val.value) : val.type === "JSXExpressionContainer" ? sub(val.expression) : "";
      props.push(`${JSON.stringify(a.name.type === "JSXIdentifier" ? a.name.name : "")}: ${v}`);
    }
    return `h(${tag}, {${freeze(props).join(", ")}}${cs.map((c) => ", " + c).join("")})`;
  }
  function sub(e: Node): string {
    const parts: Mut<string[]> = mut([]);
    let p = e.start;
    function walk(n: Node): void {
      if (n.type === "JSXElement" || n.type === "JSXFragment") { parts.push(src.slice(p, n.start), emit(n)); p = n.end; return; }
      for (const c of kids(n)) walk(c);
    }
    walk(e);
    parts.push(src.slice(p, e.end));
    return freeze(parts).join("");
  }
  function visit(n: Node): void {
    if (n.type === "JSXElement" || n.type === "JSXFragment") {
      out.push(src.slice(at, n.start), opts.keep ? `/*ss<${src.slice(n.start, n.end).replaceAll("*/", "*\\/")}*/${emit(n)}/*ss>*/` : emit(n));
      at = n.end;
      return;
    }
    for (const c of kids(n)) visit(c);
  }
  visit(P.program);
  out.push(src.slice(at));
  return freeze(out).join("");
};
// erase (full body): for…in over keys is fields(n); v.forEach(each) a loop; /re/.exec(gap)![0].length as the
// length of what replace removes
export const TYPE_KEYS = () => new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);
export const erase = (parse, fields, TYPE_KEYS) => (src: string): string => {
  const P = parse(src);
  const cuts: Mut<[number, number][]> = mut([]);
  function walk(n: Node): void {
    if (n.type === "TSTypeAliasDeclaration" || n.type === "TSInterfaceDeclaration" || n.type === "TSDeclareFunction" ||
      (n.type === "ImportDeclaration" && n.importKind === "type") ||
      (n.type === "ExportNamedDeclaration" && n.declaration && /^TS/.test(n.declaration.type))) {
      cuts.push([n.start, n.end]);
      return;
    }
    if (n.type === "ExportNamedDeclaration" && n.declaration) cuts.push([n.start, n.declaration.start]);
    if (n.type === "TSAsExpression" || n.type === "TSSatisfiesExpression") {
      const gap = src.slice(n.expression.end, n.typeAnnotation.start);
      const kw = gap.length - gap.replace(/^(?:\s|\)|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*/, "").length;
      cuts.push([n.expression.end + kw, n.end]);
      walk(n.expression);
      return;
    }
    if (n.type === "TSNonNullExpression") { cuts.push([n.end - 1, n.end]); walk(n.expression); return; }
    if (n.type === "Identifier" && n.optional) {
      const q = src.indexOf("?", n.start + n.name.length);
      if (q >= 0) cuts.push([q, q + 1]);
    }
    for (const f of fields(n)) {
      if (TYPE_KEYS.has(f.key)) cuts.push([f.node.start, f.node.end]);
      else walk(f.node);
    }
  }
  walk(P.program);
  const sorted = freeze(cuts).toSorted((a, b) => a[0] - b[0]);
  let out = "", at = 0;
  for (const [s, e] of sorted) {
    if (s < at) { at = Math.max(at, e); continue; }
    out += src.slice(at, s);
    at = e;
  }
  return out + src.slice(at);
};
// erase, original walk step: v.forEach(each) where each writes cuts
export const eraseEachReduced = () => (vs: Node[]): number => {
  const cuts: Mut<[number, number][]> = mut([]);
  const each = (x: Node): void => { cuts.push([x.start, x.end]); };
  vs.forEach(each);
  return cuts.length;
};
// syntaxStub (rewritten: msg returned, walk over fields, the deep `any` reads narrowed); parseExpr a stub
export const parseExpr = () => (src: string): Node => { throw new Error("stub"); };
export const syntaxStub = (parseExpr, fields) => (definition: string): string | null => {
  function walk(n: Node): string | null {
    const a = n.type === "ThrowStatement" ? n.argument : null;
    if (a && a.type === "CallExpression" && a.callee.type === "MemberExpression" && a.callee.object.type === "Identifier" && a.callee.object.name === "Object" &&
      a.callee.property.type === "Identifier" && a.callee.property.name === "assign") {
      const a0 = a.arguments[0], a1 = a.arguments[1];
      if (a0 && a0.type === "NewExpression" && a0.callee.type === "Identifier" && a0.callee.name === "SyntaxError" && a1 && a1.type === "ObjectExpression" &&
        a1.properties.some((p) => p.type === "Property" && p.key.type === "Identifier" && p.key.name === "_sourceExpression")) {
        const m = a0.arguments[0];
        return String(m && m.type === "Literal" ? m.value : undefined);
      }
    }
    for (const f of fields(n)) { const w = walk(f.node); if (w !== null) return w; }
    return null;
  }
  return walk(parseExpr(definition));
};
