// Hand-check of classify.ts on @tomlarkworthy/lopepage-urls (predicted 77% Y by lines): cells written in
// SoundScript, closest to the original, run through the real checker (checkSources, notebook-module
// mode as port-editor5/probes.ts). Each case also notes the rewrite it needed.
import { checkSources, type Sources } from "../lite/core.ts";
const nb = (cells: string, outside: { name: string; view?: boolean }[] = []): Sources => ({ cells, tsx: true, outside });
const report = (id: string, note: string, src: Sources) => {
  const r = checkSources(src);
  const mod = r.module.map((e: any) => `module [${e.rule}] ${e.msg}`);
  const cells = r.cells.map((x: any) => `${x.name}: ${x.status}${x.errors?.length ? " " + x.errors.map((e: any) => `[${e.rule}] L${e.line} ${e.msg}`).join("; ") : ""}`);
  console.log(`${id} ${note}\n   ${[...mod, ...cells].join("\n   ")}`);
};

const TYPES = `
type DslNode = { readonly nodeType: "group"; readonly groupType: string; readonly weight: number | null; readonly children: readonly DslNode[] }
  | { readonly nodeType: "module"; readonly weight: number | null; readonly slug: string };
type GL = { readonly type: string; readonly title?: string | undefined; readonly size?: string | undefined; readonly weight?: number | undefined; readonly content?: readonly GL[] | undefined };
`;

// 1. dslExamples, parseViewDSL as written (untyped JS), test_parseViewDSL
report("L1", "parseViewDSL verbatim from the module (no types added)", nb(String.raw`
const dslExamples = () => ["view=@tomlarkworthy/slug,@owner/page", "C100(S50(@tomlarkworthy/module-selection),S50(@tomlarkworthy/dom-view))"];
const parseViewDSL = () => function parseViewDSL(input) {
  if (!input) return { nodeType: "group", groupType: "S", weight: null, children: [] };
  if (input.startsWith("view=")) { input = input.slice(5); }
  let i = 0;
  function err(msg) { throw new Error(msg + " at pos " + i + " for " + input); }
  function parseNumber() {
    let start = i;
    while (i < input.length && /[0-9]/.test(input[i])) { i++; }
    if (start === i) return null;
    return parseInt(input.slice(start, i), 10);
  }
  function parseList() {
    let items = [];
    while (i < input.length && input[i] !== ")") { items.push(1); i++; }
    return items;
  }
  return parseList();
};`));

// 2. the same with types and the rewrites the checker asked for
report("L2", "parseViewDSL typed; push -> spread, input[i] -> charAt, err(): never", nb(TYPES + String.raw`
const dslExamples = (): string[] => ["view=@tomlarkworthy/slug,@owner/page", "C100(S50(@tomlarkworthy/module-selection),S50(@tomlarkworthy/dom-view))", "d/1f41fef8b019cf4e@94"];
const parseViewDSL = () => (input0: string): DslNode => {
  if (!input0) return { nodeType: "group", groupType: "S", weight: null, children: [] };
  const input = input0.startsWith("view=") ? input0.slice(5) : input0;
  let i = 0;
  function err(msg: string): never { throw new Error(msg + " at pos " + i + " for " + input); }
  function parseNumber(): number | null {
    const start = i;
    while (i < input.length && /[0-9]/.test(input.charAt(i))) { i++; }
    if (start === i) return null;
    return parseInt(input.slice(start, i), 10);
  }
  function parseModule(): DslNode {
    const weight = parseNumber();
    if (input.charAt(i) === "@") {
      i++;
      const start = i;
      while (i < input.length && input.charAt(i) !== "," && input.charAt(i) !== ")") { i++; }
      return { nodeType: "module", weight, slug: "@" + input.slice(start, i).trim() };
    } else if (input.charAt(i) === "d" && input.charAt(i + 1) === "/") {
      const start = i;
      let amp = Number.MAX_VALUE;
      while (i < input.length && input.charAt(i) !== "," && input.charAt(i) !== ")") { if (input.charAt(i) === "@") amp = i; i++; }
      return { nodeType: "module", weight, slug: input.slice(start, Math.min(amp, i)).trim() };
    }
    return err("Expected " + input.charAt(i));
  }
  function parseGroup(): DslNode {
    const groupType = "SCR".includes(input.charAt(i)) ? input.charAt(i++) : "S";
    const weight = parseNumber();
    if (input.charAt(i) === "(") i++;
    const children = parseList();
    if (input.charAt(i) === ")") i++;
    return { nodeType: "group", groupType, weight, children };
  }
  function parseItem(): DslNode {
    while (i < input.length && /\s/.test(input.charAt(i))) i++;
    if (i < input.length && "SCR".includes(input.charAt(i))) return parseGroup();
    if (i < input.length && (input.charAt(i) === "@" || /[0-9]/.test(input.charAt(i)) || (input.charAt(i) === "d" && input.charAt(i + 1) === "/"))) return parseModule();
    return err("Unexpected character: " + input.charAt(i));
  }
  function parseList(): DslNode[] {
    let items: DslNode[] = [];
    while (i < input.length && input.charAt(i) !== ")") {
      while (i < input.length && /\s/.test(input.charAt(i))) i++;
      items = [...items, parseItem()];
      while (i < input.length && /\s/.test(input.charAt(i))) i++;
      if (i < input.length && input.charAt(i) === ",") { i++; } else { break; }
    }
    return items;
  }
  const ast = parseGroup();
  while (i < input.length && /\s/.test(input.charAt(i))) i++;
  if (i < input.length) err("Unexpected input remaining");
  return ast;
};
const test_parseViewDSL = (dslExamples, parseViewDSL) => dslExamples.map((dsl) => parseViewDSL(dsl));`));

// 3. normalizeWeights: mutates its argument in place (classify.ts said Y)
report("L3", "normalizeWeights verbatim shape: writes child.size, delete child.weight on its argument", nb(TYPES + `
const normalizeWeights = () => function normalizeWeights(node: GL): void {
  if (node.content && node.content.length > 0) {
    for (const child of node.content) { child.size = "1fr"; delete child.weight; normalizeWeights(child); }
  }
};`));
report("L3b", "normalizeWeights rewritten to return a new tree", nb(TYPES + `
const normalizeWeights = () => function normalizeWeights(node: GL): GL {
  const kids = node.content ?? [];
  const n = kids.length;
  const total = kids.reduce((a, c) => a + (c.weight || 100.0 / n), 0);
  const content = kids.map((c): GL => normalizeWeights({ type: c.type, title: c.title, content: c.content, size: (((c.weight || 100.0 / n) / total) * 100).toFixed(2) + "%" }));
  return { type: node.type, title: node.title, content, size: node.size ?? "1fr" };
};`));

// 4. serializeGoldenDSL, extractNotebookAndCell
report("L4", "serializeGoldenDSL typed (groups.nb ?? \"\" in extractNotebookAndCell); Math.round(string) -> Number(); `!node.size.endsWith` -> size === undefined", nb(TYPES + "\n" + String.raw`
const serializeGoldenDSL = () => function serializeGoldenDSL(layout: GL): string {
  function serialize(node: GL): string {
    if (node.type === "component") return ` + "`${node.title}`" + String.raw`;
    const sz = node.size;
    const size = sz === undefined || sz === "1fr" ? "100" : String(sz.endsWith("%") ? Math.round(Number(sz.slice(0, -1))) : Math.round(Number(sz)));
    const childrenStr = (node.content || []).map(serialize).join(",");
    if (node.type === "row") return "R" + size + "(" + childrenStr + ")";
    if (node.type === "stack") return "S" + size + "(" + childrenStr + ")";
    if (node.type === "column") return "C" + size + "(" + childrenStr + ")";
    throw new Error("Unknown node type: " + node.type);
  }
  return serialize(layout);
};
const extractNotebookAndCell = () => function extractNotebookAndCell(href: string): { notebook: string; cell: string | null } | null {
  const regex = /^(https:\/\/(?<host>[\w.-]+)\/)?(?<nb>(@?[\w-]+\/[\w-]+|d\/[a-f0-9]+|e\/[a-f0-9]+@[0-9]+|[a-f0-9]+@[0-9]+|[\w-]+))(?:#(?<cell>[\w-]+))?$/;
  const match = href.match(regex);
  if (match && match.groups) {
    let notebook: string;
    const nb = match.groups.nb ?? "", host = match.groups.host;
    if (host === "observablehq.com") notebook = nb;
    else notebook = host ? host + "/" + nb : nb;
    if (!notebook.startsWith("d/") && notebook.charAt(0) !== "@") notebook = "@" + notebook;
    notebook = notebook.replace(/@[0-9]+$/, "");
    return { notebook, cell: match.groups.cell || null };
  }
  return null;
};`));

// 5. listModules returns a Map; lopepage (another module) imports it as a function
report("L5", "a consumer in another module takes listModules (a function) across the boundary", nb(`
const shown = (listModules: (hash: string) => readonly string[]) => listModules("view=@a/b").length;`, [{ name: "listModules" }]));
