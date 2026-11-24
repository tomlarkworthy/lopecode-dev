// w1 (2026-11-24, C-1): each checkSources call the harnesses (run-sets.ts, drive-run.ts, drive-rt.ts) make that threw on
// a program that parses, as "<program>: <message>"; a harness that saw one prints them and exits 1, since the checker
// is to report, never throw. A program the parser (lite/parse.ts) refuses is a parse error, counted apart
import { parse } from "../../parse.ts";
export const checkerThrows: string[] = [];
export let parseErrors = 0;
export const noteThrow = (name: string, x: unknown, src: string | null): string => {
  const m = x instanceof Error ? x.message : String(x);
  let parses = src !== null;
  if (src !== null) { try { parse(src, { jsx: true }); } catch { parses = false; } }
  if (parses) checkerThrows.push(`${name}: ${m.slice(0, 160)}`); else parseErrors++;
  return m;
};
export const reportThrows = (): number => {
  console.log(`-- checker throws ${checkerThrows.length} (parse errors ${parseErrors})`);
  for (const t of checkerThrows) console.log(`CHECKER THREW ${t}`);
  return checkerThrows.length ? 1 : 0;
};
