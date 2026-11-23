// bun causes.ts: each silent program of every <set>-<mode>.txt assigned to one cause by its name (first rule that matches)
import { readFileSync } from "node:fs";
const R: [string, RegExp][] = [
  ["R  method registration overwritten (mode A) + an S4.11 hole", /^b6-|^b7-R-|^b7-min-R/],
  ["Q2 destructured set/update", /destr-(set|update|rename|before)|helper-destr|lis-destr|Q2-destr/],
  ["Q3 computed s['set']/s['update']", /computed|st-optional|st-paren|Q3-/],
  ["Q1 set/update read before the Mut is declared", /st-before|up-before|foreach-st|st-wrapped|st-record|st-width|st-method|st-decl|st-loop-later|lis-st|lis-event-rec|jsx-st|action-memo-st|Q1-|min-Q1/],
  ["Q5 write through a helper's result", /getter|Q5/],
  ["Q6 at-once callback run more than once", /cb-|lis-foreach|inner-action-foreach|Q6/],
  ["Q4 a name bound after the point", /alias|destr-(rec|arr)-after|member-alias|forof|foreach-param|map-param|reduce-acc|catch|read-after|throw-caught|Q4/],
];
const sets = ["b1", "b2", "b4", "b5", "b6", "b7", "b8"];
for (const m of ["a", "b"]) {
  const by = new Map<string, string[]>();
  for (const s of sets) for (const l of readFileSync(`${s}-${m}.txt`, "utf8").split("\n")) {
    const x = l.match(/^SILENT [^:]+:(\S+)/); if (!x) continue;
    const c = R.find(([, re]) => re.test(x[1]!))?.[0] ?? "?? unassigned";
    by.set(c, [...(by.get(c) ?? []), x[1]!]);
  }
  console.log(`## mode ${m.toUpperCase()}: ${[...by.values()].flat().length} silent`);
  for (const [c, ns] of by) console.log(`${ns.length}\t${c}\n\t${ns.join(" ")}`);
}
