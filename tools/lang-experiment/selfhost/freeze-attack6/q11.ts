export const srcs: [string, string][] = [
  ["usp-set", "const a = () => { const u = new URLSearchParams('a=1'); u.set('a', '2'); return u.toString(); };"],
  ["usp-delete", "const a = () => { const u = new URLSearchParams('a=1'); u.delete('a'); return u.toString(); };"],
  ["usp-sort", "const a = () => { const u = new URLSearchParams('b=1&a=2'); u.sort(); return u.toString(); };"],
  ["usp-url-sp-set", "const a = () => { const u = new URL('http://x/?a=1'); u.searchParams.set('a', '2'); return u.href; };"],
  ["usp-state", "const s = () => state<URLSearchParams | null>(null);\nconst put = (s: State<URLSearchParams | null>) => ({ go: action(() => { const u = new URLSearchParams('a=1'); s.set(u); u.set('a', '2'); }) });"],
];
