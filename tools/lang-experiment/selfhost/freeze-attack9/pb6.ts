export const srcs: [string, string][] = [
  ["narrow-helper-plain", `type U = { readonly ok: true; readonly value: number } | { readonly ok: false };\nconst g = () => { const mk = (b: boolean): U => (b ? { ok: true, value: 1 } : { ok: false }); let r = mk(true); const bad = () => { r = mk(false); }; if (r.ok) { bad(); return typeof r.value; } return "R"; };`],
  ["narrow-helper-nullable", `const g = () => { let r: number | null = 1; const bad = () => { r = null; }; if (r !== null) { bad(); return r.toFixed(1); } return "R"; };`],
  ["narrow-helper-cast", `const n = () => 5;\nconst g = (n: number) => { let r = cast<number>(n); const bad = () => { r = cast<number>("x"); }; if (r.ok) { bad(); return typeof r.value; } return "R"; };`],
];
