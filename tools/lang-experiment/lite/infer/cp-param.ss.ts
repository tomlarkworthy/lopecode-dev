// complete.ts addParameter (the add-as-parameter fix) and annotationOf (the annotation a value in another
// language suggests).

// the edit adding name (with its annotation) to the end of the cell's own parameter list; null when the text has
// no closed parameter list or already takes name
export const cpAddParameter = (cpHeadOf, cpParamNames) => (at: CpTreeAt, source: string, name: string, annotation: string | null): CpEdit | null => {
  const head = cpHeadOf(at, source);
  const close = head?.list.kids.find((k) => k.name === ")");
  if (head === null || close === undefined || cpParamNames(head.list, true).some((k) => source.slice(k.from, k.to) === name)) return null;
  const param = annotation !== null && annotation !== "" ? `${name}: ${annotation}` : name;
  const last = head.list.kids.filter((k) => k.to <= close.from && k.name !== "⚠").at(-1);
  if (last === undefined || last.name === "(") return { from: head.list.from + 1, to: close.from, insert: param };
  return { from: last.to, to: last.to, insert: last.name === "," ? ` ${param}` : `, ${param}` };
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
