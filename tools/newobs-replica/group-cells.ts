// Recover authored cells from a runtime dump, by name relations rather than glue source text.
//
// Glue source is bundle-dependent -- live Observable ships `e=>e[t]` / `Br` / `Jr`, the replica's
// unminified build ships `(exports) => exports[o]` / `input` / `Mutator` -- so matching definition
// text does not port between them. The relations define.ts emits between NAMES do port:
//
//   define.ts:91  multi-output   projection `o`      <- [`cell <id>`]        (holder)
//   define.ts:78  autoview       `x`                 <- [`viewof$x`]
//   define.ts:82  automutable    `x`, `mutable$x`    <- [`cell <id>`] <- [`mutable x`]
//   imports       output         <- a variable in ANOTHER module (edge to the import cell is gone)
//
// usage: bun tools/newobs-replica/group-cells.ts <eval.json> [--doc <document.json>]
const [dumpPath, ...rest] = process.argv.slice(2);
if (!dumpPath) throw new Error("usage: bun group-cells.ts <eval.json> [--doc <document.json>]");
const docPath = rest[rest.indexOf("--doc") + 1];

const dump = await Bun.file(dumpPath).json();
if (dump.error || dump.evalError) throw new Error(`dump unusable: ${dump.error ?? dump.evalError}`);

type V = { mod: string; name: string | null; obs: unknown; inputs: string[]; outs: string[]; def: string };
const vars: V[] = dump.vars;
const byMod = new Map<string, V[]>();
for (const v of vars) (byMod.get(v.mod) ?? byMod.set(v.mod, []).get(v.mod)!).push(v);

const isHolder = (n: string | null) => typeof n === "string" && /^cell \d+$/.test(n);
const foreign = (mod: string, input: string) => /@(M\d+|other)$/.test(input) && !input.endsWith(`@${mod}`);
const builtinInput = (input: string) => input.endsWith("@builtin");

// An import cell's body enumerates its own outputs; that is the only surviving link once it has run.
const importLocals = (def: string): string[] => {
  const viaImportCalls = [...def.matchAll(/outputs\.get\((["'])(.*?)\1\)\s*\?\.import\(/g)].map((m) => m[2]);
  if (viaImportCalls.length) return viaImportCalls;
  const destructure = def.match(/const\s*\{([^}]*)\}\s*=/)?.[1] ?? "";
  return destructure
    .split(",")
    .map((s) => s.split(":").pop()!.trim())
    .filter(Boolean);
};

// Recovered groups per module, kept so the ground-truth diff below can name what differs rather
// than report a bare count.
const recovered = new Map<string, Map<string, string[]>>();

// Glue the runtime generated, as opposed to a transpiled cell body. Short glue is matched
// structurally, which ports across bundles: the replica's unminified build emits
// `(exports) => exports[o2]` where live Observable emits `e=>e[t]`, and the /api/import hybrid
// emits plain source like `(G, _) => G.input(_)`.
const GLUE = [
  /^\(?\w+\)?\s*=>\s*\w+\[\w+\]$/, // projection, define.ts:91
  /^function \w+\(\w+\)\s*\{\s*return \w+;?\s*\}$/, // import identity
  /^\(\[\s*,?\s*\w*\s*,?\s*\]\)\s*=>\s*\w+$/, // ([mutable])=>mutable | ([,e])=>e | ([m])=>m
  /^\(G, _\) => G\.input\(_\)$/, // hybrid viewof value
  /^\(M, _\) =>/, // hybrid mutator
  /^\(\)\s*=>\s*\w+$/, // builtin accessor
];

// Two glue shapes are long functions whose text is entirely bundle-dependent -- the autoview value
// (`input` unminified, `Br` live) and the automutable holder (`Mutator` / `Jr`). Matching their
// source would pin this to one build, so they are recognised by the relation define.ts:78,81-87
// guarantees between NAMES, which holds in every dialect.
const autoviewValue = (v: V) =>
  typeof v.name === "string" && v.inputs.some((i) => i === `viewof$${v.name}` || i === `viewof ${v.name}`);
const automutableHolder = (v: V) =>
  isHolder(v.name) && v.inputs.length === 1 && /^(mutable|initial) /.test(v.inputs[0]);

for (const [mod, vs] of byMod) {
  if (mod === "builtin") continue;
  const key = (v: V) => (v.name === null ? `@anon#${vs.indexOf(v)}` : v.name);
  const parent = new Map<string, string>();
  vs.forEach((v) => parent.set(key(v), key(v)));
  const find = (x: string): string => {
    while (parent.get(x) !== x) parent.set(x, parent.get(parent.get(x)!)!), (x = parent.get(x)!);
    return x;
  };
  const union = (a: string, b: string) => {
    const [ra, rb] = [find(a), find(b)];
    if (ra !== rb) parent.set(ra, rb);
  };

  const skip = new Set<string>();
  // Not cells: the display/view shadow variables define.ts:47-70 creates (unnamed, _type 2), and
  // platform-injected bindings like `@variable`. Both sit in _variables and would inflate the count.
  for (const v of vs) {
    if ((v as any).type === 2) skip.add(key(v));
    if (typeof v.name === "string" && v.name.startsWith("@")) skip.add(key(v));
    // `dynamic observe <x>` variables are created by runtime observation, not authored. Legacy
    // cell-map already encodes this skip; exporter-3 has one (`dynamic observe futureExportedState`)
    // and counting it produced 105 cells against a 104-node document.
    if (typeof v.name === "string" && v.name.startsWith("dynamic ")) skip.add(key(v));
  }
  const importCells = vs.filter((v) => /_runtime\.module\(|t\.import\(/.test(v.def));
  const ownerOfOutput = new Map<string, V>();
  for (const ic of importCells) for (const l of importLocals(ic.def)) ownerOfOutput.set(l, ic);

  // Pass 1: builtin bridges mirror a builtin of the same name into module scope. They are not
  // cells, and they must not be union targets either -- hybrid glue reads [Generators, viewof x].
  const bridges = new Set<string>();
  for (const v of vs) {
    if (v.inputs.length === 1 && builtinInput(v.inputs[0]) && v.inputs[0].split("@")[0] === v.name) {
      skip.add(key(v));
      if (typeof v.name === "string") bridges.add(v.name);
    }
  }

  // Pass 2: glue attaches, bodies do not. Deciding by DEFINITION rather than by name relation is
  // what makes one pass handle every dialect -- notebook-kit `viewof$x`, hybrid `viewof x`, and
  // legacy alike. Name relations were tried first and failed: they merged the js holder `cell 32`
  // into its data dependency `x`, and merged all three import cells (also named `cell N`) together.
  const glueSeen = new Map<string, number>();
  const unknown: string[] = [];
  for (const v of vs) {
    const k = key(v);
    if (skip.has(k) || importCells.includes(v)) continue; // import cells are roots
    if (!(GLUE.some((r) => r.test(v.def)) || autoviewValue(v) || automutableHolder(v))) continue; // a body: its own cell
    glueSeen.set(v.def, (glueSeen.get(v.def) ?? 0) + 1);
    // Import output: the edge now points into the exporting module, so only the import cell's own
    // body says which cell it belongs to. With one import cell this is unambiguous anyway; with
    // several against the same module, the body enumeration is the ONLY discriminator.
    if (v.inputs.some((i) => foreign(v.mod, i))) {
      const owner = v.name != null ? ownerOfOutput.get(v.name) : undefined;
      if (owner) union(k, key(owner));
      else {
        skip.add(k);
        unknown.push(`unattributed import output: ${v.name}`);
      }
      continue;
    }
    const tgt = v.inputs.find(
      (i) => !builtinInput(i) && !i.startsWith("@") && !bridges.has(i) && vs.some((x) => x.name === i)
    );
    if (tgt) union(k, tgt);
    else unknown.push(`glue with no in-module target: ${v.name} <- [${v.inputs.join(",")}]`);
  }

  const groups = new Map<string, string[]>();
  for (const v of vs) {
    const k = key(v);
    if (skip.has(k)) continue;
    const r = find(k);
    (groups.get(r) ?? groups.set(r, []).get(r)!).push(v.name ?? "<anon>");
  }
  recovered.set(mod, groups);
  console.log(`\n######## ${mod}: ${vs.length} variables -> ${groups.size} cells  (${skip.size} builtin/unattributed skipped)`);
  for (const [root, mem] of groups) if (mem.length > 1) console.log("   ", root, "<=", mem.join(", "));
  if (glueSeen.size) {
    console.log("    -- glue definitions encountered (catalogue evidence) --");
    for (const [d, c] of [...glueSeen].sort((a, b) => b[1] - a[1])) console.log(`    ${String(c).padStart(3)} | ${d.slice(0, 90)}`);
  }
  // Unrecognised glue must be loud: silently treating it as a cell body is how a wrong grouping
  // passes for a right one.
  if (unknown.length) {
    console.log("    !! UNRESOLVED:");
    for (const u of unknown) console.log(`       ${u}`);
  }
}

if (docPath) {
  const doc = await Bun.file(docPath).json();
  const code = doc.nodes.filter((n: any) => n.mode !== "md" && n.mode !== "html");
  console.log(`\nGROUND TRUTH ${docPath}: ${doc.nodes.length} nodes, ${code.length} code + ${doc.nodes.length - code.length} md/html`);

  // Diff against the module carrying the document's own cells: the one with the most variables,
  // or --module <id>. A bare count matching proves little; naming what differs is the real check.
  const want = rest.includes("--module") ? rest[rest.indexOf("--module") + 1] : undefined;
  const target = want ?? [...recovered.keys()].sort((a, b) => (byMod.get(b)!.length - byMod.get(a)!.length))[0];
  const groups = recovered.get(target);
  if (!groups) throw new Error(`no such module ${target}`);

  const norm = (s: string) => s.replace(/\$/g, " ");
  const docNames = new Set<string>();
  let docAnon = 0;
  for (const n of doc.nodes) {
    if (n.mode === "md" || n.mode === "html") continue;
    const m = String(n.value).match(/^\s*(viewof\s+[\w$]+|mutable\s+[\w$]+|[A-Za-z_$][\w$]*)\s*=/);
    if (m && !/^import\b/.test(String(n.value).trim())) docNames.add(norm(m[1])); else docAnon++;
  }
  const named = new Set<string>();
  let holders = 0, anon = 0;
  for (const root of groups.keys()) {
    if (/^@anon#/.test(root)) anon++;
    else if (/^cell \d+$/.test(root)) holders++;
    else named.add(norm(root));
  }
  const missing = [...docNames].filter((n) => !named.has(n));
  const extra = [...named].filter((n) => !docNames.has(n));
  console.log(`\nDIFF vs ${target}: ${groups.size} recovered vs ${doc.nodes.length} nodes`);
  console.log(`  recovered: ${named.size} named, ${holders} \`cell N\` (imports + multi-output), ${anon} anonymous`);
  console.log(`  document : ${docNames.size} named, ${docAnon} anonymous/import`);
  if (missing.length) console.log(`  MISSING (in document, not recovered): ${missing.join(", ")}`);
  if (extra.length) console.log(`  EXTRA (recovered, not in document): ${extra.join(", ")}`);
  if (!missing.length && !extra.length) console.log("  named cells match exactly");
}
