export const srcs: [string, string][] = [
  ["in-narrow", `const b = async (c: {}) => { if ("text" in c) { const t = c.text; return typeof t; } return "no"; };`],
  ["typeof-fn", `const b = async (c: {}) => { if ("text" in c && typeof c.text === "function") { return await c.text(); } return "no"; };`],
  ["typeof-obj", `const b = (c: unknown) => { if (typeof c === "object" && c !== null && "text" in c) return typeof c.text; return "no"; };`],
  ["cast-back", `const b = (c: {}) => cast<{ readonly ok: boolean }>(c);`],
  ["call-unknown-fn", `const b = (c: { readonly t: unknown }) => { const t = c.t; if (typeof t === "function") return t(); return 0; };`],
  ["unbound-call", `const b = async (r: { readonly t: () => Promise<string> }) => { const f = r.t; return await f(); };`],
];
