// Strings and names of the toolchain (ss-toolchain.ts, comment-types.ts): the marker, the header, the escapes that keep
// text inside a comment, variable names, the input table, and the one cell that applies a list of edits.

// the values tc-shell.ts gives, taken once here with their types
export const tcLexed = (tcLex: (text: string, max: number) => TcToken[]) => tcLex;
export const tcFirstOf = (tcFirstComment: (js: string) => string | null) => tcFirstComment;
export const tcJsErrorOf = (tcJsError: (text: string) => string | null) => tcJsError;
export const tcNameOf = (tcDeclaredName: (text: string) => string | null) => tcDeclaredName;
export const tcLowered = (tcLower: (text: string, keep: boolean) => string) => tcLower;
export const tcInfosOf = (tcCellsOf: (text: string) => TcInfo[]) => tcCellsOf;
export const tcIdentOk = (tcIsIdentifier: (s: string) => boolean) => tcIsIdentifier;
export const tcCaps = (tcCapNames: () => string[]) => tcCapNames();
export const tcOjsInputGlobals = (tcOjsGlobals: () => string[]) => tcOjsGlobals();

export const tcLANG = () => '/*{lang:"ss"}*/';
export const tcOPEN = () => "/*ss:";
export const tcSTATE_VALUE = () => "(G, _) => G.input(_)";
// esc adds one backslash to every "*", backslashes, "/" run, so a comment's text never holds "*/"; unesc inverts it
export const tcEsc = () => (s: string): string => s.replace(/\*(\\*)\//g, "*\\$1/");
export const tcUnesc = () => (s: string): string => s.replace(/\*\\(\\*)\//g, "*$1/");
export const tcHeader = () => (o: unknown): string => `/*ss^${JSON.stringify(o).replaceAll("*/", "*\\/")}*/`;
// a kept JSX original: a JSON string (no line terminator, so no ASI after return), escaped for a comment
export const tcKeep = (tcEsc) => (s: string): string => tcEsc(JSON.stringify(s).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"));
export const tcUnkeep = (tcUnesc) => (s: string): string => {
  if (!s.startsWith('"')) return tcUnesc(s);
  const v = JSON.parse(tcUnesc(s));
  if (typeof v !== "string") throw new Error("tc-gap: a kept JSX original that is not a JSON string");
  return v;
};
// source with each edit's span replaced by its text; the edits do not overlap
export const tcApplyEdits = () => (src: string, edits: TcEdit[]): string => {
  let out = "", at = 0;
  for (const e of edits.toSorted((a, b) => a.from - b.from)) {
    out += src.slice(at, e.from) + e.text;
    at = e.to;
  }
  return out + src.slice(at);
};

export const tcPrelude = (tcPreludeFns: () => string[]) => [...tcPreludeFns(), "h"];
export const tcRuntimeCells = (tcPrelude) => [...tcPrelude, "ref", "events", "listen", "cross", "viewRef", "compileFor", "rejected", "release"];
// a capability or runtime cell -> the input that provides it: ss_<name>, except invalidation and, in the runtime module, its own cells
export const tcInputsIn = (tcCaps, tcRuntimeCells) => (runtimeModule: boolean): Map<string, string> =>
  new Map([...tcCaps, ...tcRuntimeCells].map((n) => [n, n === "invalidation" || (runtimeModule && tcRuntimeCells.includes(n)) ? n : `ss_${n}`]));
export const tcINPUTS = (tcInputsIn) => tcInputsIn(false);
// ss_<name> -> the runtime cell name
export const tcRuntimeInputs = (tcRuntimeCells, tcIn, tcINPUTS) => new Map(tcRuntimeCells.map((n) => [tcIn(tcINPUTS, n), n]));
// an index of a Record: a missing key is written as JavaScript would write it
export const tcIn = () => (IN: Map<string, string>, n: string): string => IN.get(n) ?? "undefined";

export const tcDupOf = () => (key: string): { readonly name: string; readonly n: string } | null => {
  const m = /^(?<name>[\w$]+) \((?<n>\d+)\)$/.exec(key);
  return m === null ? null : { name: m.groups?.name ?? "", n: m.groups?.n ?? "" };
};
export const tcVariableName = (tcDupOf) => (key: string): string => {
  const dup = tcDupOf(key);
  return dup !== null ? `$ss$${dup.n}$${dup.name}` : key.startsWith("type ") ? `$ss$type$${key.slice(5)}` : key;
};
export const tcKeyOfVariable = () => (name: string): string => {
  const n = name.replace(/^viewof /, "");
  const m = /^\$ss\$(?<a>type|\d+)\$(?<b>[\w$]+)$/.exec(n);
  if (m === null) return n;
  const a = m.groups?.a ?? "", b = m.groups?.b ?? "";
  return a === "type" ? `type ${b}` : `${b} (${a})`;
};
export const tcIsDuplicateKey = () => (key: string | null): boolean => key !== null && key !== "" && /^[\w$]+ \(\d+\)$/.test(key);
export const tcHandleName = (tcVariableName) => (key: string): string => `viewof ${tcVariableName(key)}`;
export const tcCellOfVariable = (tcKeyOfVariable) => (name: string): string => tcKeyOfVariable(name).replace(/^type /, "");
// comment-types.ts langOf: the language a {lang:"..."} first comment names
export const tcLangOf = (tcFirstOf) => (js: string): string | null => {
  const first = tcFirstOf(js);
  const m = first === null ? null : /^\{lang:"(?<l>[a-z]+)"\}$/.exec(first);
  return m === null ? null : m.groups?.l ?? null;
};
