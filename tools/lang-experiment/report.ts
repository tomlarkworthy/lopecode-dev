// bun report.ts ports/<name> [--json]
// Combines check --json and run --json (both orders) into one table.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CheckResult } from "./check.ts";
import { compareOrders, type RunResult } from "./run.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

function sub<T>(args: string[]): T {
  const p = Bun.spawnSync(["bun", ...args], { cwd: HERE, stdout: "pipe", stderr: "pipe" });
  const out = p.stdout.toString();
  try {
    return JSON.parse(out) as T;
  } catch {
    throw new Error(`bun ${args.join(" ")} produced no JSON:\n${out}\n${p.stderr.toString()}`);
  }
}

// MAP.md: the first markdown table whose header has a "tier" column; one row per original cell.
function mapTiers(dir: string): Record<string, number> | null {
  const f = join(dir, "MAP.md");
  if (!existsSync(f)) return null;
  const rows = readFileSync(f, "utf8").split("\n").filter((l) => l.trim().startsWith("|"));
  const split = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
  const hi = rows.findIndex((l) => split(l).some((h) => h.toLowerCase() === "tier"));
  if (hi < 0) return null;
  const col = split(rows[hi]).findIndex((h) => h.toLowerCase() === "tier");
  const counts: Record<string, number> = {};
  for (const l of rows.slice(hi + 1)) {
    const cells = split(l);
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const t = (cells[col] ?? "").replace(/`/g, "").toLowerCase();
    if (t) counts[t] = (counts[t] ?? 0) + 1;
  }
  return counts;
}

const lines = (p: string) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter((l, i, a) => i < a.length - 1 || l !== "").length : 0);

export function report(dirIn: string) {
  const dir = resolve(dirIn);
  const check = sub<CheckResult>(["check.ts", dir, "--json"]);
  const fwd = sub<RunResult>(["run.ts", dir, "--order", "forward", "--json"]);
  const rev = sub<RunResult>(["run.ts", dir, "--order", "reverse", "--json"]);

  const tiers: Record<string, number> = { default: 0, "mut-local": 0, owner: 0, ref: 0, shell: 0, prose: 0, import: 0 };
  for (const c of check.cells) if (c.tier !== "shell") tiers[c.tier]++;
  const map = mapTiers(dir);
  if (map) for (const t of ["shell", "prose", "import"]) tiers[t] = map[t] ?? 0;
  else tiers.shell = check.cells.filter((c) => c.tier === "shell").length;
  const denom = tiers.default + tiers["mut-local"] + tiers.owner + tiers.ref + tiers.shell;

  const diffs = compareOrders(fwd, rev);

  // Tests whose whole in-module support has no shell cell and no effect foreign.
  const byName = new Map(check.cells.map((c) => [c.name, c]));
  const effect = new Set(check.foreign.filter((f) => f.marker === "effect").map((f) => f.name));
  const pure = (name: string) => {
    const seen = new Set<string>();
    const stack = [name];
    while (stack.length) {
      const c = byName.get(stack.pop()!);
      if (!c || seen.has(c.name)) continue;
      seen.add(c.name);
      if (c.tier === "shell") return false;
      for (const i of c.inputs) {
        if (effect.has(i.name) && (i.source === "foreign" || i.source === "shell")) return false;
        if (i.source === "cell" || i.source === "shell") stack.push(i.name);
      }
    }
    return true;
  };
  const tests = check.cells.filter((c) => c.name.startsWith("test_"));
  const pureTests = tests.filter((t) => pure(t.name)).length;
  const t = (r: RunResult) => `${r.tests.pass}/${r.tests.pass + r.tests.fail + r.tests.blocked}${r.tests.blocked ? ` (${r.tests.blocked} blocked by shell)` : ""}`;

  return {
    port: dir,
    check: { ok: check.ok, errors: check.errors.length },
    tiers,
    tierDenominator: denom,
    tests: { total: tests.length, forward: fwd.tests, reverse: rev.tests, pureSupport: pureTests },
    identicalAcrossOrders: diffs.length === 0,
    diffs,
    settled: { forward: fwd.settled, reverse: rev.settled },
    trustSurface: check.foreign.length,
    lines: { cells: lines(join(dir, "cells.ts")), shell: lines(join(dir, "shell.ts")) },
    tierSource: map ? "MAP.md (shell/prose/import), check (checked tiers)" : "check (shell = shell.ts)",
    text: () => {
      const pct = (n: number) => (denom ? ` (${Math.round((100 * n) / denom)}%)` : "");
      const rows: [string, string][] = [
        ["check", check.ok ? "passes" : `${check.errors.length} error(s)`],
        ["cells: default", `${tiers.default}${pct(tiers.default)}`],
        ["cells: mut-local", `${tiers["mut-local"]}${pct(tiers["mut-local"])}`],
        ["cells: owner", `${tiers.owner}${pct(tiers.owner)}`],
        ["cells: ref", `${tiers.ref}${pct(tiers.ref)}`],
        ["cells: shell", `${tiers.shell}${pct(tiers.shell)}`],
        ["cells: prose / import (excluded)", `${tiers.prose} / ${tiers.import}`],
        ["tests passing, forward order", t(fwd)],
        ["tests passing, reverse order", t(rev)],
        ["tests + non-shell values identical across orders", diffs.length === 0 ? "yes" : `no: ${diffs.join("; ")}`],
        ["runtime settled (fwd / rev)", `${fwd.settled} / ${rev.settled}`],
        ["tests with no shell cell or effect foreign in support", `${pureTests}/${tests.length}`],
        ["foreign.d.ts declarations (trust surface)", String(check.foreign.length)],
        ["lines cells.ts + shell.ts", `${lines(join(dir, "cells.ts"))} + ${lines(join(dir, "shell.ts"))}`],
      ];
      const w = Math.max(...rows.map((r) => r[0].length));
      return [`| ${"metric".padEnd(w)} | value |`, `| ${"-".repeat(w)} | ----- |`, ...rows.map(([k, v]) => `| ${k.padEnd(w)} | ${v} |`)].join("\n") +
        `\n\ntier source: ${map ? "MAP.md for shell/prose/import; check for checked tiers" : "check; shell = shell.ts cells"}`;
    },
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) { console.error("usage: bun report.ts ports/<name> [--json]"); process.exit(2); }
  const r = report(dir);
  if (args.includes("--json")) { const { text, ...rest } = r; void text; console.log(JSON.stringify(rest, null, 2)); }
  else console.log(r.text());
}
