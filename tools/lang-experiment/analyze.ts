// Syntactic analysis of a port directory, shared by check.ts, run.ts and report.ts.
import ts from "typescript";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const CAPABILITIES: Record<string, string> = {
  now: "Clock",
  random: "Random",
  fetch: "Fetch",
  log: "Log",
  invalidation: "Invalidation",
};
// Observable standard-library names a shell cell may take; at run time they resolve (or fail) via globalThis.
export const SHELL_STDLIB = new Set([
  "md", "htl", "html", "svg", "Inputs", "d3", "Plot", "DOM", "Files", "Generators", "Promises",
  "require", "resolve", "FileAttachment", "width", "visibility", "Mutable", "tex", "dot", "mermaid",
  "_", "aq", "Arrow", "DuckDBClient", "SQLite", "topojson", "vl", "L", "htm", "katex",
]);

export type Kind = "arrow" | "function" | "generator" | "async";
export type Facet = "value" | "state" | "capability" | "foreign";
export type Source = "cell" | "shell" | "foreign" | "capability" | "stdlib" | "unknown";

export type Param = {
  name: string; // "" when not an identifier
  node: ts.ParameterDeclaration;
  typed: boolean;
  refTyped: boolean; // annotated State<...>
  plain: boolean; // identifier, no default, no rest
  facet: Facet;
  source: Source;
};

export type Cell = {
  name: string;
  file: "cells.ts" | "shell.ts";
  kind: Kind;
  fn: ts.FunctionLikeDeclaration; // the function that defines the cell (outer params = inputs)
  statement: ts.Statement;
  params: Param[];
  returnsRef: boolean;
  isGenerator: boolean;
  isAsync: boolean;
  line: number; // 1-based
};

export type ForeignDecl = { name: string; marker: "pure" | "effect" | null; line: number; kind: string };

export type SyntaxError_ = { file: string; line: number; rule: string; message: string };

export type PortFiles = {
  dir: string;
  cells: string | null;
  shell: string | null;
  foreign: string | null;
};

export function readPort(dir: string): PortFiles {
  const d = resolve(dir);
  const rd = (f: string) => (existsSync(join(d, f)) ? readFileSync(join(d, f), "utf8") : null);
  return { dir: d, cells: rd("cells.ts"), shell: rd("shell.ts"), foreign: rd("foreign.d.ts") };
}

const hasExport = (n: ts.Node) =>
  !!(ts.canHaveModifiers(n) && ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));

function unwrap(e: ts.Expression): ts.Expression {
  while (ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
  return e;
}

export function lineOf(sf: ts.SourceFile, pos: number) {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

function isRefTypeNode(t: ts.TypeNode | undefined) {
  return !!t && ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName) && t.typeName.text === "State";
}

// Does the function return state(...) directly (concise body or a top-level return)?
function returnsRefCall(fn: ts.FunctionLikeDeclaration): boolean {
  const isRefCall = (e: ts.Expression | undefined) => {
    if (!e) return false;
    e = unwrap(e);
    return ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "state";
  };
  if (fn.type && ts.isTypeReferenceNode(fn.type) && ts.isIdentifier(fn.type.typeName) && fn.type.typeName.text === "StateCell")
    return true;
  const body = fn.body;
  if (!body) return false;
  if (!ts.isBlock(body)) return isRefCall(body as ts.Expression);
  return body.statements.some((s) => ts.isReturnStatement(s) && isRefCall(s.expression));
}

export function extractCells(sf: ts.SourceFile, file: "cells.ts" | "shell.ts", errors: SyntaxError_[]): Cell[] {
  const cells: Cell[] = [];
  const add = (name: string, fn: ts.FunctionLikeDeclaration, statement: ts.Statement) => {
    const isGenerator = !!(fn as ts.FunctionDeclaration).asteriskToken;
    const isAsync = !!ts.getModifiers(fn as ts.FunctionDeclaration)?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
    const kind: Kind = isGenerator ? "generator" : isAsync ? "async" : ts.isArrowFunction(fn) ? "arrow" : "function";
    const params: Param[] = fn.parameters.map((p) => ({
      name: ts.isIdentifier(p.name) ? p.name.text : "",
      node: p,
      typed: !!p.type,
      refTyped: isRefTypeNode(p.type),
      plain: ts.isIdentifier(p.name) && !p.initializer && !p.dotDotDotToken,
      facet: "value",
      source: "unknown",
    }));
    cells.push({ name, file, kind, fn, statement, params, returnsRef: returnsRefCall(fn), isGenerator, isAsync, line: lineOf(sf, fn.getStart(sf)) });
  };
  const err = (n: ts.Node, rule: string, message: string) => errors.push({ file, line: lineOf(sf, n.getStart(sf)), rule, message });

  if (file === "shell.ts") {
    // Shell is ordinary TypeScript: only exported functions are cells; helpers are allowed.
    for (const st of sf.statements) {
      if (ts.isFunctionDeclaration(st) && hasExport(st) && st.name && st.body) add(st.name.text, st, st);
      else if (ts.isVariableStatement(st) && hasExport(st))
        for (const d of st.declarationList.declarations) {
          const init = d.initializer && unwrap(d.initializer);
          if (ts.isIdentifier(d.name) && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) add(d.name.text, init, st);
          else err(d, "cell-not-function", "a shell cell must be an arrow or function expression");
        }
    }
    return cells;
  }

  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st)) {
      // a cell with or without `export` (2026-11-15: without is the form)
      if (st.name && st.body) add(st.name.text, st, st);
      else err(st, "module-level", "module-level function must be a cell");
    } else if (ts.isVariableStatement(st)) {
      const flags = st.declarationList.flags;
      if (!(flags & ts.NodeFlags.Let) && !(flags & ts.NodeFlags.Const)) {
        err(st, "no-var", "var is banned");
        continue;
      }
      for (const d of st.declarationList.declarations) {
        const init = d.initializer && unwrap(d.initializer);
        if (ts.isIdentifier(d.name) && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) add(d.name.text, init, st);
        else err(d, "cell-not-function", `${ts.isIdentifier(d.name) ? d.name.text : "<pattern>"}: a cell must be an arrow or function expression`);
      }
    } else if (ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st)) {
      // allowed
    } else if (ts.isImportDeclaration(st) && file === "shell.ts") {
      // shell.ts is ordinary TypeScript
    } else if (ts.isImportDeclaration(st) && st.importClause?.isTypeOnly) {
      // import type
    } else if (ts.isEnumDeclaration(st)) err(st, "no-enum", "enum is banned");
    else if (ts.isModuleDeclaration(st)) err(st, "no-namespace", "namespace is banned");
    else if (ts.isClassDeclaration(st)) err(st, "no-class", "class is banned");
    else if (file === "cells.ts") err(st, "module-level", `${ts.SyntaxKind[st.kind]} not allowed at module level`);
  }
  return cells;
}

export function extractForeign(sf: ts.SourceFile, errors: SyntaxError_[]): ForeignDecl[] {
  const out: ForeignDecl[] = [];
  const seen = new Set<string>();
  const text = sf.getFullText();
  for (const st of sf.statements) {
    let names: string[] = [];
    let kind = "";
    if (ts.isVariableStatement(st)) {
      names = st.declarationList.declarations.filter((d) => ts.isIdentifier(d.name)).map((d) => (d.name as ts.Identifier).text);
      kind = "const";
    } else if (ts.isFunctionDeclaration(st) && st.name) {
      names = [st.name.text];
      kind = "function";
    } else if ((ts.isClassDeclaration(st) || ts.isModuleDeclaration(st)) && st.name && ts.isIdentifier(st.name)) {
      names = [st.name.text];
      kind = ts.isClassDeclaration(st) ? "class" : "namespace";
    } else continue; // types/interfaces are not trust surface
    const comments = (ts.getLeadingCommentRanges(text, st.getFullStart()) ?? []).map((c) => text.slice(c.pos, c.end));
    const marker = comments.some((c) => /^\/\*\*\s*pure\b/.test(c)) ? "pure" : comments.some((c) => /^\/\*\*\s*effect\b/.test(c)) ? "effect" : null;
    for (const name of names) {
      if (seen.has(name)) continue; // overloads count once
      seen.add(name);
      const line = lineOf(sf, st.getStart(sf));
      out.push({ name, marker, line, kind });
      if (!marker) errors.push({ file: "foreign.d.ts", line, rule: "foreign-unmarked", message: `${name}: mark /** pure */ or /** effect */` });
    }
  }
  return out;
}

export type Analysis = {
  files: PortFiles;
  sfs: { cells?: ts.SourceFile; shell?: ts.SourceFile; foreign?: ts.SourceFile };
  cells: Cell[]; // cells.ts then shell.ts, source order
  foreign: ForeignDecl[];
  errors: SyntaxError_[];
};

// Resolve each parameter's facet and source, and report the purely syntactic injection errors.
export function analyze(dir: string): Analysis {
  const files = readPort(dir);
  const errors: SyntaxError_[] = [];
  const sfs: Analysis["sfs"] = {};
  const mk = (name: string, text: string) => ts.createSourceFile(join(files.dir, name), text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  if (files.cells != null) sfs.cells = mk("cells.ts", files.cells);
  if (files.shell != null) sfs.shell = mk("shell.ts", files.shell);
  if (files.foreign != null) sfs.foreign = mk("foreign.d.ts", files.foreign);
  const cells = [
    ...(sfs.cells ? extractCells(sfs.cells, "cells.ts", errors) : []),
    ...(sfs.shell ? extractCells(sfs.shell, "shell.ts", errors) : []),
  ];
  const foreign = sfs.foreign ? extractForeign(sfs.foreign, errors) : [];
  const byName = new Map<string, Cell>();
  for (const c of cells) {
    if (byName.has(c.name)) errors.push({ file: c.file, line: c.line, rule: "duplicate-cell", message: `cell ${c.name} defined twice` });
    else byName.set(c.name, c);
  }
  const foreignByName = new Map(foreign.map((f) => [f.name, f]));
  for (const c of cells) {
    const sf = c.file === "cells.ts" ? sfs.cells! : sfs.shell!;
    for (const p of c.params) {
      const line = lineOf(sf, p.node.getStart(sf));
      if (!p.plain) {
        errors.push({ file: c.file, line, rule: "inject-pattern", message: `${c.name}: injected parameter must be a plain identifier (no destructuring, default or rest)` });
        continue;
      }
      const target = byName.get(p.name);
      if (target) {
        p.source = target.file === "cells.ts" ? "cell" : "shell";
        p.facet = p.refTyped ? "state" : "value";
      } else if (foreignByName.has(p.name)) {
        p.source = "foreign";
        p.facet = "foreign";
      } else if (p.name in CAPABILITIES) {
        p.source = "capability";
        p.facet = "capability";
      } else if (c.file === "shell.ts" && SHELL_STDLIB.has(p.name)) {
        p.source = "stdlib";
        p.facet = "value";
      } else {
        errors.push({ file: c.file, line, rule: "inject-unknown", message: `${c.name}: parameter ${p.name} names no cell, foreign declaration or capability` });
      }
      if (p.refTyped && p.source !== "cell" && p.source !== "shell" && p.source !== "unknown")
        errors.push({ file: c.file, line, rule: "inject-state", message: `${c.name}: ${p.name} is typed State<…> but is not a cell` });
      if (c.file === "cells.ts" && p.source === "foreign" && foreignByName.get(p.name)!.marker === "effect")
        errors.push({ file: c.file, line, rule: "foreign-effect", message: `${c.name}: ${p.name} is an /** effect */ foreign; a checked cell may take only pure ones` });
      // A foreign declaration that names a shell cell gives that shell cell its trusted type.
      if (c.file === "cells.ts" && p.source === "shell" && foreignByName.get(p.name)?.marker === "effect")
        errors.push({ file: c.file, line, rule: "foreign-effect", message: `${c.name}: ${p.name} is declared /** effect */ in foreign.d.ts` });
    }
  }
  return { files, sfs, cells, foreign, errors };
}
