// Lines of code (a line with a character outside a comment and outside whitespace, from the parse) per file and per
// top-level statement. Run: bun selfhost/render-cells/measure.ts
import { readFileSync } from "node:fs";
import { parse } from "../../lite/parse.ts";

function measure(path: string) {
  const src = readFileSync(new URL(path, import.meta.url).pathname, "utf8");
  const P: any = parse(src);
  const inComment = new Uint8Array(src.length);
  for (const c of P.comments ?? []) inComment.fill(1, c.start, c.end);
  const codeLines = (a: number, b: number) => {
    const seen = new Set<number>();
    for (let i = a; i < b; i++) if (!inComment[i] && src[i]!.trim() !== "") seen.add(P.line(i));
    return seen.size;
  };
  const stmts = (P.program.body as any[]).map((st) => {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    const kind = d?.type === "TSTypeAliasDeclaration" ? "type" : d?.type === "VariableDeclaration" ? "const" : d?.type === "FunctionDeclaration" ? "function" : st.type === "ImportDeclaration" ? "import" : "other";
    const name = d?.id?.name ?? d?.declarations?.[0]?.id?.name ?? "";
    return { kind, name, n: codeLines(st.start, st.end) };
  });
  return { total: codeLines(0, src.length), stmts };
}

for (const p of ["../../lite/jsx/render.ts", "../../lite/jsx/h.ts", "./render.ss.ts", "./shell.ts"]) {
  const m = measure(p);
  const by = (k: string) => m.stmts.filter((s) => s.kind === k).reduce((a, s) => a + s.n, 0);
  console.log(`${p}: ${m.total} code lines (import ${by("import")}, type ${by("type")}, const ${by("const")}, function ${by("function")}, other ${by("other")})`);
  if (p === "./render.ss.ts") {
    const cells = m.stmts.filter((s) => s.kind === "const"), ns = cells.map((c) => c.n).toSorted((a, b) => a - b);
    console.log(`  ${cells.length} cells, max ${ns.at(-1)}, median ${ns[Math.floor(ns.length / 2)]}, over 20: ${cells.filter((c) => c.n > 20).map((c) => c.name).join(", ") || "none"}`);
    console.log("  " + cells.map((c) => `${c.name} ${c.n}`).join(", "));
  } else if (p !== "../../lite/jsx/h.ts") console.log("  " + m.stmts.filter((s) => s.kind !== "import").map((s) => `${s.name || s.kind} ${s.n}`).join(", "));
}
