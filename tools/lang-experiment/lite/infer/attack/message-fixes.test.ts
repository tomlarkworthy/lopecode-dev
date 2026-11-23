// e1 (2026-11-23), B1: each message that names a fix is given on `bad`, and `fix` (the fix applied as worded) is accepted
import { test, expect } from "bun:test";
import { checkSources } from "../../core.ts";
import { FIXES, type MessageFix } from "./message-fixes.ts";
const verdict = (f: MessageFix, src: string) => {
  const r = checkSources({ cells: src, tsx: !!f.tsx, outside: (f.outside ?? []).map((name) => ({ name })), foreign: null } as Parameters<typeof checkSources>[0]);
  const rules = [...r.module.map((e) => e.rule), ...r.cells.flatMap((c) => [...c.errors.map((e) => e.rule), ...(c.unsupported ?? []).map(() => "unsupported")])];
  return { rules, ok: rules.length === 0 && r.cells.length > 0 && r.cells.every((c) => c.status === "ok") };
};
for (const f of FIXES) test(`message fix ${f.id}`, () => {
  expect(verdict(f, f.bad).rules).toContain(f.rule);
  expect(verdict(f, f.fix)).toEqual({ rules: [], ok: true });
});
