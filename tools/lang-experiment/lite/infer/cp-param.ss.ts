// complete.ts addParameter (the add-as-parameter fix) and annotationOf (the annotation a value in another
// language suggests).

// the end of the parameter list opening at open (its ")"), and its segments as written; close -1 when it has none
export const cpParamSegments = () => (source: string, open: number): { close: number; segs: string[] } => {
  const segs: Mut<string[]> = [];
  let depth = 0, close = -1, seg = "";
  for (let i = open; i < source.length; i++) {
    const c = source.charAt(i);
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < source.length && source.charAt(j) !== c) j += source.charAt(j) === "\\" ? 2 : 1;
      seg += source.slice(i, j + 1); i = j; continue;
    }
    if ("([{<".includes(c)) depth++;
    else if (")]}>".includes(c) && !(c === ">" && source.charAt(i - 1) === "=")) {
      if (depth === 0) { if (c === ")") close = i; break; }
      depth--;
    }
    if (depth === 0 && c === ",") { segs.push(seg); seg = ""; continue; }
    seg += c;
  }
  segs.push(seg);
  return { close, segs: segs };
};
// the edit adding name (with its annotation) to the end of the cell's own parameter list; null when the text has
// no parameter list or already takes name
export const cpAddParameter = (cpHeadLen, cpParamSegments) => (source: string, name: string, annotation: string | null): CpEdit | null => {
  const open = cpHeadLen(source);
  if (open < 0) return null;
  const { close, segs } = cpParamSegments(source, open);
  if (close < 0 || segs.some((p) => /^\s*(?:\.\.\.)?\s*(?<n>[\w$]+)/.exec(p)?.groups?.n === name)) return null;
  const param = annotation !== null && annotation !== "" ? `${name}: ${annotation}` : name;
  const inner = source.slice(open, close);
  if (inner.trim() === "") return { from: open, to: close, insert: param };
  const last = open + inner.trimEnd().length;
  return { from: last, to: last, insert: inner.trimEnd().endsWith(",") ? ` ${param}` : `, ${param}` };
};
// the annotation of each element of an array, when all agree
export const cpAnnotationOfArray = () => (ann: (v: unknown, depth: number) => string | null, v: unknown[], depth: number): string | null => {
  if (v.length === 0 || v.length > 1000) return null;
  const first = ann(v[0], depth + 1);
  if (first === null || first === "") return null;
  for (let i = 1; i < v.length; i++) if (ann(v[i], depth + 1) !== first) return null;
  return `${first}[]`;
};
// annotationOf: number, string, boolean, a non-empty array whose elements agree, or a small plain object of those.
// plain: whether a value's prototype is Object.prototype or null; field: one own property's value. A cell can read neither.
export const cpAnnotationOf = (cpAnnotationOfArray) => (plain: (v: unknown) => boolean, field: (v: unknown, k: string) => unknown, v0: unknown): string | null => {
  function ann(v: unknown, depth: number): string | null {
    if (typeof v === "number") return "number";
    if (typeof v === "string") return "string";
    if (typeof v === "boolean") return "boolean";
    if (depth > 2 || v === null || typeof v !== "object") return null;
    if (Array.isArray(v)) return cpAnnotationOfArray(ann, v, depth);
    if (!plain(v)) return null;
    const keys = Object.keys(v);
    if (keys.length === 0 || keys.length > 8 || !keys.every((k) => /^[A-Za-z_$][\w$]*$/.test(k))) return null;
    const parts: Mut<string[]> = [];
    for (const k of keys) {
      const t = ann(field(v, k), depth + 1);
      if (t === null || t === "") return null;
      parts.push(`${k}: ${t}`);
    }
    const out = `{ ${parts.join("; ")} }`;
    return out.length > 120 ? null : out;
  }
  return ann(v0, 0);
};
