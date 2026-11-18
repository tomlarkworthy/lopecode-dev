// The writes behind MUTARG in its largest cells: which nested-function argument each cell writes, and how.
import { loadCorpus } from "./classify.ts";
import * as acorn from "acorn"; import * as walk from "acorn-walk";
const { mods } = loadCorpus();
const want: [string, string][] = [["@tomlarkworthy/mermaid-lens", "state"], ["@tomlarkworthy/linux-sbc", "execute"], ["@spec/ordinal-diagram", "engine"], ["@tomlarkworthy/belief-geometry", "beliefKitFactory"], ["@tomlarkworthy/parametric-svg", "pseudoInverseStepMxN"], ["@tomlarkworthy/coded-landmark-tracking", "fitHomographyScaled"]];
for (const [id, name] of want) {
  const c = mods.get(id)!.raw.find((x) => x.name === name)!;
  const ast: any = acorn.parse("(" + c.src + ")", { ecmaVersion: "latest" });
  const args = new Set<string>(); walk.full(ast, (n: any) => { if (/Function/.test(n.type) && n !== ast.body[0].expression) n.params.forEach((p: any) => p.type === "Identifier" && args.add(p.name)); });
  const hits: string[] = [];
  walk.full(ast, (n: any) => {
    const tgt = n.type === "AssignmentExpression" && n.left.type === "MemberExpression" ? n.left : n.type === "CallExpression" && n.callee.type === "MemberExpression" && /^(push|pop|splice|sort|set|delete|clear|add|fill|unshift|shift|reverse)$/.test(n.callee.property?.name) ? n.callee.object : null;
    if (!tgt) return; let r = tgt; while (r.type === "MemberExpression") r = r.object;
    if (r.type === "Identifier" && args.has(r.name)) hits.push(("(" + c.src + ")").slice(n.start, Math.min(n.end, n.start + 60)).replace(/\s+/g, " "));
  });
  console.log(`${id}.${name}: ${hits.length} writes to arguments, e.g. ${hits.slice(0, 4).join(" | ")}`);
}
