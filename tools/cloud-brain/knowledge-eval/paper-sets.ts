#!/usr/bin/env bun
// Asks the two question sets of plan/cloud-brain-paper-summarizer-persona.md ("The question sets") and prints the
// rank of each wanted entry. Reads only, with the token loop-knowledge. The sets are read from the plan, so the
// questions asked are the ones written there.
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-eval/paper-sets.ts            set A by meaning and by words, set B by meaning
//   … --out FILE       the same lines, written to FILE as one JSON document
//   … --held           no search: for each question of set B, which of its numbers the summary of its paper holds
//                      (<papers>/<id>.summary.txt up to the line "Summary by paper-summarizer")
//   … --plan FILE --kind doc     the two sets of another plan, of entries of kind doc (sd-3-pilot-ten: sets K and L of
//                      plan/cloud-brain-docs-summarised-for-search.md). Four arms: each set by words and by meaning.
//                      FILE is a path from the working directory. --kind is paper with none; --held is the papers' alone.
// by meaning: knowledge.search?semantic=true&limit=20&q=   (all kinds, as the plan measured it)
// by words:   knowledge.search?kind=<paper|doc>&limit=20&q=
// A rank is the place of the wanted id in the answer, from 1; null when it is not in the 20.
// tests/tools/paper-sets.test.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { numbers, stateDir, SUMMARY_LINE } from "../summarize-papers.ts";

const here = dirname(new URL(import.meta.url).pathname), root = join(here, "..", "..", "..");
export const PLAN = join(root, "plan/cloud-brain-paper-summarizer-persona.md");

export type Question = { want: string; was: number; q: string };
// The two fenced blocks under "## The question sets": a line is `<id>  <rank on 2026-10-11>  <question>`.
export const parseSets = (plan: string): { A: Question[]; B: Question[] } => {
  const at = plan.indexOf("## The question sets");
  if (at < 0) throw new Error('the plan has no "## The question sets"');
  const blocks = [...plan.slice(at).matchAll(/```\n([\s\S]*?)```/g)].map((m) =>
    m[1].split("\n").filter(Boolean).map((l) => {
      const p = /^(\S+)\s+(\d+)\s+(.+)$/.exec(l.trim());
      if (!p) throw new Error("not a question line: " + l);
      return { want: p[1], was: Number(p[2]), q: p[3].trim() };
    }));
  if (blocks.length !== 2) throw new Error(`the plan has ${blocks.length} blocks under the question sets, not 2`);
  return { A: blocks[0], B: blocks[1] };
};

export const rankOf = (ids: string[], want: string) => { const i = ids.indexOf(want); return i < 0 ? null : i + 1; };
// MRR with a wanted entry that is not found counted 0, as knowledge-eval.ts counts it.
export const score = (ranks: (number | null)[]) => {
  const n = ranks.length, at = (k: number) => ranks.filter((r) => r != null && r <= k).length;
  return { n, mrr: n ? Math.round((ranks.reduce((a: number, r) => a + (r ? 1 / r : 0), 0) / n) * 1000) / 1000 : null, first: at(1), in3: at(3), in10: at(10), notFound: ranks.filter((r) => r == null).length,
    lowest: ranks.some((r) => r == null) ? null : Math.max(...(ranks as number[])) };
};
// The arms asked, each a name, its questions and the search's parameters. A paper's are the three the papers' plan
// measured. A doc's are both sets both ways: the first set (K) by words is the gate of R5 in the docs' plan.
export const armsOf = (sets: { A: Question[]; B: Question[] }, kind: "paper" | "doc"): [string, Question[], string][] =>
  kind === "doc"
    ? [["K by words", sets.A, "kind=doc"], ["K by meaning", sets.A, "semantic=true"], ["L by words", sets.B, "kind=doc"], ["L by meaning", sets.B, "semantic=true"]]
    : [["A by meaning", sets.A, "semantic=true"], ["A by words", sets.A, "kind=paper"], ["B by meaning", sets.B, "semantic=true"]];
// Which numbers of a question the summary holds, read as summarize-papers.ts reads a number.
export const held = (q: string, summary: string) => {
  const has = numbers(summary), of = [...numbers(q)];
  return { numbers: of, held: of.filter((n) => has.has(n)) };
};

if (import.meta.main) {
  const arg = (k: string) => { const i = process.argv.indexOf("--" + k); return i < 0 ? undefined : process.argv[i + 1]; };
  const kind = arg("kind") ?? "paper";
  if (kind !== "paper" && kind !== "doc") { console.error("--kind paper | doc"); process.exit(2); }
  if (kind === "doc" && process.argv.includes("--held")) { console.error("--held reads the summaries of papers: not with --kind doc"); process.exit(2); }
  const sets = parseSets(readFileSync(arg("plan") ?? PLAN, "utf8")), state = stateDir();
  if (process.argv.includes("--held")) {
    const rows = sets.B.map((x) => {
      const f = join(state, "papers", x.want + ".summary.txt");
      if (!existsSync(f)) return { want: x.want, noFile: true };
      const t = readFileSync(f, "utf8"), cut = t.indexOf(SUMMARY_LINE);
      return { want: x.want, ...held(x.q, cut < 0 ? t : t.slice(0, cut)) };
    });
    for (const r of rows) console.log(JSON.stringify(r));
    const withN = rows.filter((r: any) => r.numbers?.length);
    console.log(JSON.stringify({ questions: rows.length, withNumbers: withN.length, allHeld: withN.filter((r: any) => r.held.length === r.numbers.length).length,
      someHeld: withN.filter((r: any) => r.held.length > 0).length, noFile: rows.filter((r: any) => r.noFile).length }));
    process.exit(0);
  }
  if (!process.env.BRAIN_BASE) throw new Error("BRAIN_BASE");
  const ask = (more: string, q: string): string[] => {
    for (let n = 0; ; n++) {
      const r = spawnSync("bun", [join(root, "tools/cloud-brain/brain.ts"), "curl", `/xrpc/com.lopecode.brain.knowledge.search?${more}&limit=20&q=${encodeURIComponent(q)}`, "--as", "loop-knowledge", "-sS", "-m", "60"],
        { encoding: "utf8", env: { ...process.env, BRAIN_STATE_DIR: state }, maxBuffer: 1 << 26 });
      const st = /\[(\d+)\]\s*$/.exec(r.stderr || "");
      if (st && st[1] === "200") return (JSON.parse(r.stdout).entries as any[]).map((e) => e.id);
      if (n >= 2) throw new Error(`knowledge.search answered ${st ? st[1] : (r.stderr || r.stdout || "").slice(0, 200)}`);
    }
  };
  const arms = armsOf(sets, kind);
  const doc: Record<string, any> = { at: new Date().toISOString(), base: process.env.BRAIN_BASE };
  for (const [name, qs, more] of arms) {
    const ranks = qs.map((x) => rankOf(ask(more, x.q), x.want));
    doc[name] = { ...score(ranks), ranks: Object.fromEntries(qs.map((x, i) => [x.want, ranks[i]])) };
    console.log(JSON.stringify({ arm: name, ...doc[name] }));
  }
  const out = arg("out");
  if (out) writeFileSync(out, JSON.stringify(doc, null, 1) + "\n");
}
