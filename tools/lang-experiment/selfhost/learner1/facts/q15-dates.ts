import { toSrcs, type Cand } from "./h.ts";
type C = Cand & { outside?: Record<string, [string[], (...a: any[]) => unknown]> };
export const cands: C[] = [
  { name: "reject-Date-now", src: `const t = () => Date.now();` },
  { name: "reject-new-Date", src: `const t = () => new Date();` },
  { name: "accept-now-is-ms-since-page-load", src: `const t = (now: Clock) => now();`, show: ["t"] },
  { name: "accept-date-from-ordinary-cell", src: `const year = (today: string) => Number(today.slice(0, 4));`, show: ["year"],
    outside: { today: [[], () => new Date(Date.UTC(2026, 10, 24)).toISOString()] } },
  { name: "accept-epoch-ms-from-ordinary-cell", src: `const days = (epochMs: number) => Math.floor(epochMs / 86400000);`, show: ["days"],
    outside: { epochMs: [[], () => Date.UTC(2026, 10, 24)] } },
  { name: "reject-ordinary-cell-without-type", src: `const year = (today) => today;`, outside: { today: [[], () => "2026-11-24"] } },
  { name: "reject-Intl", src: `const f = () => new Intl.DateTimeFormat("en").format(0);` },
  { name: "accept-format-by-hand", src: `const fmt = () => (y: number, m: number, d: number): string => [String(y), String(m).padStart(2, "0"), String(d).padStart(2, "0")].join("-");
const s = (fmt: (y: number, m: number, d: number) => string) => fmt(2026, 3, 7);`, show: ["s"] },
];
export const srcs = toSrcs(cands);
