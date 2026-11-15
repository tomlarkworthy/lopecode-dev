const _1t29kxm = function _1(md){return(
md`# \`cellMap\`
## computes the mapping of reactive variables to higher level notebook cells, grouped by module`
)};
const _199r1h0 = function _showBuiltins(Inputs){return(
Inputs.toggle({ label: "builtins?", value: false })
)};
const _v3idap = (G, _) => G.input(_);
const _jqf42f = function _showAnon(Inputs){return(
Inputs.toggle({ label: "anonymous?", value: false })
)};
const _10za42b = (G, _) => G.input(_);
const _125g1nt = function _cellMapViz(hash,Plot,width,d3,filteredMap,edges,linkTo,isOnObservableCom)
{
  hash; // update links on hash change
  return Plot.plot({
    width,
    axis: null,
    y: {
      reverse: true
    },
    marks: [
      Plot.dot(
        [
          [-1, d3.min(filteredMap, (d) => d.module)],
          [1, d3.max(filteredMap, (d) => d.module) + "_"]
        ],
        {
          stroke: "none"
        }
      ),
      Plot.arrow(
        edges.filter((edge) => edge[1]),
        {
          x1: 0,
          y1: (edge) => `${edge[0].module}#${edge[0].name}`,
          x2: 0,
          y2: (edge) => `${edge[1].module}#${edge[1].name}`,
          stroke: (edge) => edge[0].module,
          headLength: 0,
          bend: 90
        }
      ),
      Plot.ruleY(new Set(filteredMap.map((cell) => cell.module + "-")), {
        y: (d) => d,
        stroke: (d) => d,
        strokeOpacity: 0.5,
        strokeDasharray: [5, 10]
      }),
      Plot.text(new Set(filteredMap.map((cell) => cell.module)), {
        x: -1,
        y: (d) => d + "_",
        fill: (d) => d,
        fontSize: 14,
        frameAnchor: "top-left",
        dy: 8,
        href: (cell) => linkTo(`${cell}`),
        ...(isOnObservableCom() && { target: "_blank" })
      }),
      Plot.text(
        filteredMap,
        Plot.pointerY({
          x: 1,
          text: (d) => `${d.module}#${d.name}`,
          y: (d) => `${d.module}#${d.name}`,
          fill: (d) => d.module,
          fontSize: 14,
          frameAnchor: "right",
          href: (cell) => {
            if (!cell) return undefined;
            return linkTo(`${cell.module}#${cell.name}`);
          },
          ...(isOnObservableCom() && { target: "_blank" })
        })
      )
    ]
  });
};
const _cjxin = (G, _) => G.input(_);
const _1nt2irf = function _detailVizTitle(cellMapViz,linkTo,md){return(
md`${cellMapViz ? `### [\`${cellMapViz?.module}#${cellMapViz?.name}\`](${linkTo(`${cellMapViz?.module}#${cellMapViz?.name}`)})` : `\`<click the above viz to pin a cell and open its dependancy graph below>\``}`
)};
const _1lxiffy = function _detailViz(Plot,width,nodes,variableToCell,modules,linkTo,isOnObservableCom){return(
Plot.plot({
  symbol: {
    domain: ["simple", "mutable", undefined, "import", " ", "viewof"],
    legend: true
  },
  margin: 50,
  axis: null,
  width,
  height: 1000,
  marks: [
    Plot.link(
      nodes
        .filter((d) => d.parent)
        .map((n) => {
          if (variableToCell.get(n.parent.data) == variableToCell.get(n.data)) {
            n.type = variableToCell.get(n.data).type;
          } else {
            n.type = "connector";
          }
          return n;
        }),
      {
        x1: "y",
        y1: "x",
        x2: (d) => d.parent.y,
        y2: (d) => d.parent.x,
        stroke: "type",
        strokeLinecap: "round",
        strokeWidth: (d) => (d.type == "connector" ? 2 : 20),
        opacity: (d) => (d.type == "connector" ? 0.5 : 0.1),
        inset: 0
      }
    ),
    Plot.dot(nodes, {
      x: "y",
      y: "x",
      r: 10,
      fill: "white",
      symbol: (node) => variableToCell.get(node.data)?.type,
      stroke: (d) => modules.get(d.data._module)?.name,
      strokeWidth: 4,
      href: (d) => {
        const cell = variableToCell.get(d.data);
        if (!cell) return undefined;
        return linkTo(`${cell.module}#${cell.name}`);
      },
      ...(isOnObservableCom() && { target: "_blank" })
    }),
    Plot.arrow(
      nodes
        .filter((d) => d.parent)
        .flatMap((d) => d.reused.map((reused) => ({ ...d, parent: reused }))),
      {
        x1: "y",
        y1: "x",
        x2: (d) => d.parent.y,
        y2: (d) => d.parent.x,
        bend: -10,
        strokeDasharray: [1, 5],
        stroke: "red",
        opacity: 0.5,
        inset: 14
      }
    ),
    Plot.text(nodes, {
      x: "y",
      y: "x",
      text: (d) => d.data._name,
      dy: 16
    })
  ]
})
)};
const _j5pb2k = (G, _) => G.input(_);
const _glmq4i = function _7(md){return(
md`## cellMap`
)};
const _izhsfx = function _8(Inputs,filteredMap){return(
Inputs.table(filteredMap, {
  layout: "auto",
  format: {
    variables: (d) => d.length
  }
})
)};
const _7t7pwf = function _9(md){return(
md`## \`liveCellMap\`

Prefer using this variable for an always live view of the runtime state`
)};
const _1xnzq7y = async function _liveCellMap(keepalive,cellMapModule,Inputs,cellMap,currentModules)
{
  keepalive(cellMapModule, "maintain_live_cell_map");
  return Inputs.input(await cellMap(undefined, currentModules));
};
const _14vvdt2 = (G, _) => G.input(_);
const _193osz9 = async function _maintain_live_cell_map(runtime_variables,$0,cellMap,Event,currentModules)
{
  runtime_variables;
  $0.value = await cellMap(undefined, currentModules);
  $0.dispatchEvent(new Event("input"));
};
const _1vhxngh = function _usage(md){return(
md`## cellMap function

You can call it with zero args to default to the current runtime, or pass in a subset of variables to extract the cell structure from just those.

\`\`\`js
import {cellMap, liveCellMap} from "@tomlarkworthy/cell-map"
\`\`\`

If you wanted to use the visualizations in your own notebooks. You would import the views e.g.

\`\`\`js
import {viewof cellMapViz, viewof detailViz, detailVizTitle} from "@tomlarkworthy/cell-map"
\`\`\`

and then call them in your notebooks`
)};
const _doc3rul = function _docs_algorithm(md){return(
md`## Algorithm

\`cellMap(variables, modules)\` returns \`Map<module, cell[]>\`. It reads each variable's \`_name\`, \`_type\`, \`_inputs\`, \`_module\`, \`_definition\` and \`_value\`. For each module:

1. Drop variables that are never cells: \`_type === 2\`, names starting \`@\`, names starting \`dynamic \`.
2. Mark import cells: a variable named \`module X\`, or an unnamed or \`cell N\` variable whose definition loads a module.
3. Give every other variable a role with \`roleOf\` (table below). A \`body\` roots a cell; a \`builtin\` is dropped.
4. Union the rest into cells. An alias not yet run joins its \`module X\`. A variable with an input from another module joins the import cell that owns that output. Anything else joins its first named input in the same module.
5. Sort cells by runtime order of their first member; an import cell by its first imported symbol. A variable with no owner is listed in \`cells.unresolved\`.

Each cell is

~~~js
{
  name,        // root variable name; a number if anonymous; \`mutable m\` for a mutable
  module,      // name of the containing module
  module_name, // on an import cell, the imported module's name; otherwise \`module\`
  type,        // "import" | "viewof" | "mutable" | "multi" | "simple", from the members' roles
  lang,        // ["<id>"] when a member's definition opens with /*{lang:"<id>"}*/ (fork in soundscript.html);
               // else ["ojs"], ["js"] or ["ojs", "js"]: the dialects that compile to this shape
  head,        // the \`mutable\` variable of a mutable, else the first member
  importInfo,  // {type, specifier, notebook, from, specifiers: [{imported, local}], meta: {variables}}, or null
  variables    // members in runtime order
}
~~~

State lives in three places. The runtime's variables are the only record of cell structure. \`defInfo\` caches what it reads from each definition in a \`WeakMap\` keyed by the definition function, so a redefined cell is read again. \`viewof liveCellMap\` holds the last map as its value; \`maintain_live_cell_map\` depends on \`runtime_variables\` and \`currentModules\`, recomputes on every variable add, redefine or delete, and dispatches \`input\`.`
)};
const _doc4glu = function _docs_glue(md){return(
md`## Glue shapes

| role | pattern | origin |
|---|---|---|
| \`shadow\` | type 2, no name | \`display\`/\`view\` state, \`define.ts:49,66\` |
| \`builtin\` | one input: the builtin of the same name | \`module.js:61\` |
| \`constant\` | type 2, no inputs | \`module.js:159\` |
| \`import-alias\` | an input from another module | \`variable.js:202\` |
| \`view-input\` | \`o\` ← \`viewof$o\` | \`define.ts:78\` |
| \`view-getter\` | \`o\` ← \`viewof o\` | legacy \`(G, _) => G.input(_)\` |
| \`mutator\` | \`cell N\` ← \`mutable o\`; \`mutable o\` ← \`initial o\` | \`define.ts:85\`; legacy \`new M(_)\` |
| \`mutable-accessor\` | \`mutable$o\` ← \`cell N\`; \`mutable o\` ← \`mutator o\` | \`define.ts:86\`; legacy |
| \`mutable-getter\` | \`o\` ← \`cell N\` holding \`mutable o\`; \`o\` ← \`mutable o\` | \`define.ts:82\`; legacy |
| \`projection\` | \`o\` ← \`cell N\` | \`define.ts:91\`, and an import's output before it runs |`
)};
const _17c6bac = function _cellMap(runtime,groupCells,runtimeAccessors) {
  return function cellMap(variables, modules) {
    const vars = [...(variables || runtime._variables)];
    const grouped = groupCells(vars, runtimeAccessors);
    const out = new Map();
    for (const [mod, cells] of grouped) {
      const rec = modules ? modules.get(mod) : null;
      const moduleName = rec && rec.name ? rec.name : "<unknown module>";
      const named = cells.map((c) => ({
        name: c.name,
        module: moduleName,
        // `module` is the CONTAINING module; `module_name` on an import cell is the module being
        // imported FROM, and createImportCellHeader reads that spelling. Keep both meanings distinct.
        // importInfo.from is the imported module's name however `module X` was bound (a loader or a value)
        module_name: c.type === "import" && c.importInfo?.from
          ? c.importInfo.from
          : moduleName,
        type: c.type,
        lang: c.lang,
        head: c.head,
        importInfo: c.importInfo,
        variables: c.variables
      }));
      if (cells.unresolved) named.unresolved = cells.unresolved;
      out.set(mod, named);
    }
    return out;
  };
};
const _r0le0f = function _roleOf() {
  const holder = (n) => typeof n === "string" && /^cell \d+$/.test(n);
  return function roleOf(v, a, lookup) {
    const n = a.name(v);
    const t = a.type(v);
    const ins = a.inputs(v);
    const one = ins.length === 1 ? ins[0] : null;
    if (one && one.builtin && one.name === n) return "builtin";
    if (t === 2) return n == null ? "shadow" : ins.length === 0 ? "constant" : "implicit";
    if (ins.some((i) => !i.builtin && i.module !== a.module(v))) return "import-alias";
    if (typeof n !== "string") return "body";
    if (ins.some((i) => i.name === "viewof$" + n)) return "view-input";
    if (ins.some((i) => i.name === "viewof " + n)) return "view-getter";
    if (holder(n)) return one && /^(mutable|initial) /.test(String(one.name)) ? "mutator" : "body";
    if (one && holder(one.name)) {
      if (n.startsWith("mutable$")) return "mutable-accessor";
      const h = lookup ? lookup(one.name) : undefined;
      return h && a.inputs(h).some((i) => i.name === "mutable " + n) ? "mutable-getter" : "projection";
    }
    const base = n.replace(/^(mutable|mutator) /, "");
    if (base !== n && ins.some((i) => i.name === "initial " + base)) return "mutator";
    if (one && one.name === "mutator " + base) return base !== n ? "mutable-accessor" : "mutable-getter";
    if (one && one.name === "mutable " + n) return "mutable-getter";
    return "body";
  };
};
const _xfa26q = function _notACell() {return ((name, type) =>
  type === 2 ||
  (typeof name === "string" && (name.startsWith("@") || name.startsWith("dynamic "))));};
const _wyt7b6 = function _defInfo() {
  const cache = new WeakMap();
  // Notebook Kit writes `/api/import/@user/slug`, with no `.js`; matching only paths ending `.js` would
  // leave every Notebook Kit import unnamed.
  const specifierName = (specifier) => {
    if (specifier == null) return null;
    try {
      const p = new URL(String(specifier), "https://api.observablehq.com/").pathname;
      let m = p.match(/^\/api\/import\/(.+?)(?:\.js)?$/);
      if (m) return m[1];
      m = p.match(/\/(@[^/]+\/[^/]+)\.js$/);
      if (m) return m[1];
      m = p.match(/\/(d\/[0-9a-f]+(?:@\d+)?)\.js$/);
      if (m) return m[1];
      return null;
    } catch {
      return null;
    }
  };
  const derive = (raw) => {
    const src = String(raw).replace(/\s+/g, " ");
    const viaCalls = [...src.matchAll(/outputs\.get\((["'])(.*?)\1\)\s*\?\.import\(/g)].map(
      (m) => m[2]
    );
    const dm = viaCalls.length ? null : src.match(/const\s*\{([^}]*)\}\s*=/);
    const destructure = dm ? dm[1] : "";
    // An import cell takes ONE parameter; a compiled alias takes two — `(_, v) => v.import("x", _)`
    // — and also contains `.import(`. Counting aliases invents one cell per imported symbol.
    // Markers are matched against source with STRING LITERALS BLANKED. A cell that merely quotes
    // import source — every test cell in this module does — otherwise classifies as an import cell:
    // measured at 5 import cells in this module against 3 real loaders. Blanking keeps every true
    // positive, since `runtime.module(` and `outputs.get("")?.import(` survive it. Extraction below
    // still reads `src`, because the specifier and the alias names live inside those literals.
    // A parse would be exact; this is the cheap structural form, and defInfo stays regex-free of
    // anything that has to understand JS beyond "is this text code or a string".
    const code = src.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
    const aliasForm = /^\s*(async\s+)?\(\s*\w+\s*,\s*\w+\s*\)\s*=>\s*\w+\.import\(/.test(code);
    // The alias also names its REMOTE end. In a compiled module that is the only record of the
    // mapping, because a compiled loader carries no `outputs.get(…)` enumeration.
    const aliasMatch = src.match(
      /^\s*(?:async\s+)?\(\s*\w+\s*,\s*\w+\s*\)\s*=>\s*\w+\.import\(\s*(["'])(.*?)\1/
    );
    // A compiled loader both CONSTRUCTS a module and IMPORTS one. Requiring both markers is what
    // separates it from an ordinary `main = runtime.module()`, which constructs and imports nothing.
    const loaderForm = /_?runtime\.module\(/.test(code) && /\bimport(Shim)?\(/.test(code);
    const legacyImport = /\w\.import\(/.test(code);
    const enumeration = /outputs\.get\(.*?\)\s*\?\.import\(/.test(code);
    // The enumeration carries BOTH ends — `outputs.get("<local>")?.import("<imported>", …)`. Reading
    // only the get() key (what `locals` does) loses the alias mapping needed to render `a as b`.
    const pairs = [
      ...src.matchAll(/outputs\.get\((["'])(.*?)\1\)\s*\?\.import\(\s*(["'])(.*?)\3/g)
    ].map((m) => ({ local: m[2], imported: m[4] }));
    // `import("x")`, `importShim("x", …)` and `import(new URL("x", …))` all put the specifier first.
    const sm = src.match(/\bimport(?:Shim)?\(\s*(?:new URL\(\s*)?(["'])(.*?)\1/);
    return {
      src,
      importCell: !aliasForm && (loaderForm || legacyImport || enumeration),
      aliasOf: aliasMatch ? aliasMatch[2] : null,
      pairs,
      specifier: sm ? sm[2] : null,
      notebook: specifierName(sm ? sm[2] : null),
      locals: viaCalls.length
        ? viaCalls
        : destructure
            .split(",")
            .map((s) => s.split(":").pop().trim())
            .filter(Boolean)
    };
  };
  return (def) => {
    if (typeof def === "string") return derive(def);
    if (typeof def !== "function") return derive("");
    let info = cache.get(def);
    if (info) return info;
    info = derive(def);
    cache.set(def, info);
    return info;
  };
};
const _zdl9tm = function _runtimeAccessors() {return ({
  name: (v) => v._name,
  type: (v) => v._type,
  def: (v) => v._definition,
  module: (v) => v._module,
  // An import cell's VALUE is the module it loaded. That is the only link back to the exporting
  // module once a legacy alias has been rewired, since a compiled loader carries no output
  // enumeration to read the locals from.
  value: (v) => v._value,
  inputs: (v) =>
    (v._inputs || []).map((i) => ({
      name: i._name,
      module: i._module,
      builtin: i._module === v._module._runtime._builtin
    }))
});};
const _snkocq = function _groupCells(notACell,defInfo,roleOf,langTag) {
  const isHolder = (n) => typeof n === "string" && /^cell \d+$/.test(n);
  return function groupCells(variables, a) {
    const byModule = new Map();
    for (const v of variables) {
      const m = a.module(v);
      if (!byModule.has(m)) byModule.set(m, []);
      byModule.get(m).push(v);
    }
    const out = new Map();
    for (const [mod, all] of byModule) {
      // Filter non-cells BEFORE keying by name. The runtime leaves an implicit type-2 variable behind when a
      // name resolves to a browser global (window.toolbar, window.history, a named element), and it shares
      // its name with the real cell defined later; skipping by name dropped 8 real cells on the cell-map
      // notebook, 2026-09-14.
      const vs = all.filter((v) => !notACell(a.name(v), a.type(v)));
      const order = new Map(vs.map((v, i) => [v, i]));
      const keyOf = new Map(
        vs.map((v, i) => [v, a.name(v) == null ? "@anon#" + i : String(a.name(v))])
      );
      const named = new Map(
        vs.filter((v) => a.name(v) != null).map((v) => [String(a.name(v)), v])
      );
      const parent = new Map([...keyOf.values()].map((k) => [k, k]));
      const find = (x) => {
        while (parent.get(x) !== x) {
          parent.set(x, parent.get(parent.get(x)));
          x = parent.get(x);
        }
        return x;
      };
      const union = (x, y) => {
        const rx = find(x);
        const ry = find(y);
        if (rx !== ry) parent.set(rx, ry);
      };
      const skip = new Set();
      const bridges = new Set();
      for (const v of vs) {
        if (notACell(a.name(v), a.type(v))) skip.add(keyOf.get(v));
        const ins = a.inputs(v);
        if (ins.length === 1 && ins[0].builtin && ins[0].name === a.name(v)) {
          skip.add(keyOf.get(v));
          bridges.add(String(a.name(v)));
        }
      }
      // A classic compiled import is a `module X` variable and a Notebook Kit import is a `cell N` holder. A
      // named cell whose body both builds and imports a module (a bootloader, an exporter, a test fixture) is
      // not one: measured at 5 such cells misread as imports on the cell-map notebook, 2026-09-14.
      // Only the compiler writes a `module X` name, so that name is an import whatever its definition: a
      // module variable defined as a value (`() => lib`, as dataflow-templating and test fixtures do) has
      // no loader body and would otherwise give its aliases no import cell.
      const isModuleVar = (n) => String(n).startsWith("module ");
      const importShaped = (n) => n == null || /^cell \d+$/.test(String(n));
      const importCells = vs.filter((v) => isModuleVar(a.name(v)) || (importShaped(a.name(v)) && defInfo(a.def(v)).importCell));
      const importSet = new Set(importCells);
      // Two ways to attribute an imported symbol to its import cell. The body enumeration is
      // primary and is what keeps several imports of ONE module distinct. The value match is the
      // fallback for compiled/legacy form, where the loader has no enumeration — there the
      // compiler emits exactly one loader per source module, so it is unambiguous.
      const ownerOfOutput = new Map();
      const ownerOfModule = new Map();
      for (const ic of importCells) {
        for (const l of defInfo(a.def(ic)).locals) ownerOfOutput.set(l, ic);
        const loaded = a.value ? a.value(ic) : undefined;
        if (loaded && typeof loaded === "object" && !ownerOfModule.has(loaded))
          ownerOfModule.set(loaded, ic);
      }
      const unresolved = [];
      for (const v of vs) {
        const k = keyOf.get(v);
        if (skip.has(k) || importSet.has(v)) continue;
        const name = a.name(v);
        const ins = a.inputs(v);
        // A compiled import not yet computed has inputs [module X, @variable] in this module. It belongs in the
        // import cell from the start: visualizer's live map is not recomputed when the runtime later
        // rewrites those inputs, so leaving it out renders it as a cell of its own.
        const pendingOwner = defInfo(a.def(v)).aliasOf != null
          ? ins.map((i) => !i.builtin && i.module === mod ? named.get(String(i.name)) : undefined).find((x) => x && importSet.has(x))
          : undefined;
        if (pendingOwner) {
          union(k, keyOf.get(pendingOwner));
          continue;
        }
        if (roleOf(v, a, (n) => named.get(n)) === "body") continue;
        const foreign = ins.find((i) => !i.builtin && i.module !== mod);
        if (foreign) {
          const owner =
            (name != null ? ownerOfOutput.get(String(name)) : undefined) ||
            ownerOfModule.get(foreign.module);
          if (owner) union(k, keyOf.get(owner));
          else {
            skip.add(k);
            unresolved.push("unattributed import output: " + name);
          }
          continue;
        }
        const tgt = ins.find(
          (i) =>
            !i.builtin &&
            i.module === mod &&
            !String(i.name).startsWith("@") &&
            !bridges.has(String(i.name)) &&
            named.has(String(i.name))
        );
        if (tgt) union(k, String(tgt.name));
        else unresolved.push("glue with no in-module target: " + name);
      }
      const groups = new Map();
      for (const v of vs) {
        const k = keyOf.get(v);
        if (skip.has(k)) continue;
        const r = find(k);
        if (!groups.has(r)) groups.set(r, []);
        groups.get(r).push(v);
      }
      let anon = 0;
      const cells = [...groups.entries()]
        .map(([root, members]) => {
          members.sort((x, y) => order.get(x) - order.get(y));
          // a compiled `mutable m` is rooted at its seed `initial m`; consumers name the cell `mutable m`
          const seedOf = typeof root === "string" && root.startsWith("initial ") ? root.slice(8) : null;
          const name = /^@anon#/.test(root)
            ? anon++
            : seedOf != null && members.some((v) => a.name(v) === "mutable " + seedOf)
            ? "mutable " + seedOf
            : root;
          const roles = new Set(members.map((v) => roleOf(v, a, (n) => named.get(n))));
          const type = members.some((v) => importSet.has(v))
            ? "import"
            : roles.has("view-input") || roles.has("view-getter")
            ? "viewof"
            : roles.has("mutator") || roles.has("mutable-accessor") || roles.has("mutable-getter")
            ? "mutable"
            : roles.has("projection")
            ? "multi"
            : "simple";
          // Every language whose compiler emits this variable shape. A js declaration always emits a
          // holder with projections and ojs never does; a body that is unnamed, or named only
          // `cell N`, is either.
          // a member whose definition names its language in a marker settles it (fork in soundscript.html)
          const tags = [...new Set(members.map((v) => langTag(a.def(v))).filter(Boolean))];
          const lang = tags.length ? tags
            : type === "multi"
              ? ["js"]
              : type === "simple" && (name !== root || isHolder(String(root)))
              ? ["ojs", "js"]
              : ["ojs"];
          const head =
            type === "mutable"
              ? members.find((v) => /^mutable[$ ]/.test(String(a.name(v)))) ||
                members[1] ||
                members[0]
              : members[0];
          // The visualizer renders import cells from `importInfo`. Every field it reads is already in the
          // loader body, so it is derived here without decompiling, and this module stays on runtime data alone.
          let importInfo = null;
          if (type === "import") {
            const ic = members.find((v) => importSet.has(v));
            const info = ic ? defInfo(a.def(ic)) : null;
            const byLocal = new Map((info?.pairs ?? []).map((p) => [p.local, p.imported]));
            const specifiers = [];
            for (const v of members) {
              if (v === ic || a.name(v) == null) continue;
              const local = String(a.name(v));
              let imported = byLocal.get(local);
              if (imported == null) {
                // Compiled/legacy alias: `(_, v) => v.import("remote", _)` names the remote end.
                const am = String(a.def(v)).replace(/\s+/g, " ").match(/\.import\(\s*(["'])(.*?)\1/);
                // once a legacy alias runs, the runtime redefines it onto the remote variable and the
                // definition text no longer names the remote end; the input still does
                const remote = a.inputs(v).find((i) => !i.builtin && i.module !== a.module(v));
                imported = am ? am[2] : remote?.name ?? local;
              }
              specifiers.push({ imported, local });
            }
            // An enumerated symbol whose variable never materialised (an import that failed to
            // resolve) still belongs in the statement, or the rendering silently drops it.
            for (const p of info?.pairs ?? [])
              if (!specifiers.some((s) => s.local === p.local))
                specifiers.push({ imported: p.imported, local: p.local });
            // A COMPILED module has no enumeration: each symbol is its own `(_, v) => v.import(…)`
            // variable, which is not glue and has no foreign input, so it never joins this group and
            // the loops above find nothing. Read the mapping WITHOUT merging — merging would retype
            // those cells as `import` and move the grouping counts.
            if (ic)
              for (const v of vs) {
                const ao = defInfo(a.def(v)).aliasOf;
                if (!ao) continue;
                if (!a.inputs(v).some((i) => i.name === a.name(ic))) continue;
                const local = a.name(v) == null ? ao : String(a.name(v));
                if (!specifiers.some((s) => s.local === local))
                  specifiers.push({ imported: ao, local });
              }
            importInfo = {
              type: "import",
              specifier: info?.notebook ?? info?.specifier ?? null,
              notebook: info?.notebook ?? null,
              // the module name, which visualizer renders as `from "…"`; the loader URL stays in `specifier`
              from: info?.notebook ?? (members.map((v) => String(a.name(v))).find((n) => n.startsWith("module "))?.slice(7)) ?? info?.specifier ?? null,
              specifiers,
              meta: { variables: members }
            };
          }
          return {
            name,
            type,
            lang,
            head,
            importInfo,
            variables: members,
            // an import cell sorts at its first imported symbol, not at its module variable, so an import
            // header stays where the import was written
            order: order.get((type === "import" && members.find((v) => !importSet.has(v))) || members[0])
          };
        })
        .sort((x, y) =>
          x.order !== y.order ? x.order - y.order : String(x.name).localeCompare(String(y.name))
        )
        .map((c) => ({
          name: c.name,
          type: c.type,
          lang: c.lang,
          head: c.head,
          importInfo: c.importInfo,
          variables: c.variables
        }));
      if (unresolved.length) cells.unresolved = unresolved;
      out.set(mod, cells);
    }
    return out;
  };
};
const _1clgb7s = async function _test_cellmap_importInfo_on_real_import(cellMap,expect)
{
  const mapped = await cellMap();
  const allCells = [...mapped.values()].flat();
  const cell = allCells.find(
    (c) => c?.type === "import" && typeof c?.module_name === "string"
  );
  expect(Boolean(cell)).toBe(true);

  expect(cell.type).toBe("import");
  expect(cell.importInfo != null).toBe(true);
  expect(cell.importInfo.type).toBe("import");
  expect((cell.importInfo.specifiers?.length ?? 0) >= 1).toBe(true);

  const vars = cell.importInfo?.meta?.variables ?? [];
  expect(Array.isArray(vars)).toBe(true);
  expect(vars.length >= 1).toBe(true);

  return cell.importInfo;
};
const _k9te40 = function _test_recovers_this_notebooks_own_cells(cellMap,currentModules,cellMapModule) {
  const cells = cellMap(undefined, currentModules).get(cellMapModule);
  if (!cells) throw Error("this module not present in the map");
  const names = new Set(cells.map((c) => String(c.name)));
  for (const want of ["roleOf", "defInfo", "groupCells", "cellMap", "runtimeAccessors"])
    if (!names.has(want))
      throw Error("lost authored cell " + want + ", got " + [...names].join(", "));
  if (names.has("cellMapModule"))
    throw Error("viewof value was not grouped with its view");
  return "ok, " + cells.length + " cells";
};
const _1ekq6tt = function _test_no_unresolved_glue_anywhere(cellMap,currentModules) {
  const map = cellMap(undefined, currentModules);
  const bad = [];
  for (const [mod, cells] of map) {
    if (!cells.unresolved) continue;
    const rec = currentModules.get(mod);
    bad.push([rec ? rec.name : "<unknown>", cells.unresolved]);
  }
  if (bad.length) throw Error(JSON.stringify(bad.slice(0, 4)));
  return "ok, " + map.size + " modules clean";
};
const _17hxnwp = function _test_import_cells_stay_distinct(cellMap,currentModules) {
  const map = cellMap(undefined, currentModules);
  const imports = [];
  for (const [mod, cells] of map) for (const c of cells) if (c.type === "import") imports.push(c);
  if (!imports.length) throw Error("no import cells found");
  const seen = new Set();
  for (const c of imports)
    for (const v of c.variables) {
      if (seen.has(v)) throw Error("variable " + v._name + " attributed to two import cells");
      seen.add(v);
    }
  return "ok, " + imports.length + " import cells, " + seen.size + " variables, none shared";
};
const _19ojlg4 = function _test_defInfo_is_memoised_per_definition(defInfo) {
  const fn = (exports) => exports["a"];
  const a = defInfo(fn);
  const b = defInfo(fn);
  if (a !== b) throw Error("defInfo re-derived a definition it had already seen");
  if (defInfo(null).importCell) throw Error("a non-function must not classify as an import cell");
  return "ok";
};
const _r0letst = function _test_roleOf_reads_shape_not_definition_text(roleOf) {
  const vars = new Map();
  const def = (name, type, inputs) =>
    vars.set(name, { name, type, inputs: inputs.map(([n, b]) => ({ name: n, module: "M", builtin: !!b })) });
  const a = { name: (v) => v.name, type: (v) => v.type, module: () => "M", inputs: (v) => v.inputs };
  def("cell 4", 1, [["mutable m"]]);
  def("m", 1, [["cell 4"]]);
  def("mutable$m", 1, [["cell 4"]]);
  def("a", 1, [["cell 3"]]);
  def("v", 1, [["viewof$v"]]);
  def("w", 1, [["Generators", true], ["viewof w"]]);
  def("mutable q", 1, [["Mutable", true], ["initial q"]]);
  def("k", 1, []);
  const want = { "cell 4": "mutator", m: "mutable-getter", "mutable$m": "mutable-accessor", a: "projection",
    v: "view-input", w: "view-getter", "mutable q": "mutator", k: "body" };
  const wrong = Object.entries(want)
    .map(([n, r]) => [n, r, roleOf(vars.get(n), a, (x) => vars.get(x))])
    .filter(([, r, got]) => r !== got);
  if (wrong.length) throw Error(JSON.stringify(wrong));
  return "ok, " + Object.keys(want).length + " roles";
};
const _agctjt = function _test_compiled_alias_is_not_an_import_cell(defInfo) {
  const alias = '(_, v) => v.import("runtime", _)';
  if (defInfo(alias).importCell)
    throw Error("compiled alias misclassified as an import cell");
  // Taken verbatim from a loader in this page rather than invented: it must both CONSTRUCT a
  // module and IMPORT one.
  const real = 'async () => runtime.module((await importShim("/@tomlarkworthy/tests.js?v=4", \'file:///x.html\')).default)';
  if (!defInfo(real).importCell) throw Error("real import cell not recognised");
  if (defInfo("function _main(runtime){return(runtime.module())}").importCell)
    throw Error("`main = runtime.module()` misclassified as an import cell");
  return "ok";
};
const _t2ikl4 = function _test_import_locals_prefer_the_specifier_enumeration(defInfo) {
  const body =
    'async (module) => { const {dep2} = x; outputs.get("dep2")?.import("dep", "dep2", module); outputs.get("viewof$viewdep")?.import("viewof$viewdep", "viewof$viewdep", module); }';
  const info = defInfo(body);
  if (info.locals.join(",") !== "dep2,viewof$viewdep") throw Error(JSON.stringify(info.locals));
  if (!info.importCell) throw Error("enumeration alone should identify an import cell");
  return "ok";
};
const _yubgz5 = function _15(md){return(
md`### \`cellMapCompat\`

Migration helper from old cellMap`
)};
const _71n0hz = function _cellMapCompat(cellMap){return(
async (module, { excludeInbuilt = true } = {}) => {
  const map = await cellMap(
    [...module._runtime._variables].filter(
      (v) => v._module == module && (!excludeInbuilt || v._type == 1)
    )
  );
  const cells = map.get(module) || [];
  return new Map(cells.map((c) => [c.name, c.variables]));
}
)};
const _x7j8bo = function _17(md){return(
md`## Visualizations`
)};
const _1l7cvxn = function _nodeToSymbol(variableToCell){return(
(node) =>
  ({
    viewof: "triangle",
    mutable: "cross",
    import: "square",
    simple: "circle"
  }[variableToCell.get(node.data)?.type] || "diamond")
)};
const _y7kfs7 = function _focus_variables(cellMapViz,descendants,ascendants){return(
cellMapViz
  ? [
      ...descendants(cellMapViz.variables[0]),
      ...ascendants(cellMapViz.variables[0])
    ]
  : []
)};
const _14ty3wh = function _focus_cells(focus_variables,variableToCell){return(
new Set(focus_variables.map((v) => variableToCell.get(v)))
)};
const _12jpxa2 = function _descendents(d3,cellMapViz){return(
d3.hierarchy(
  cellMapViz ? cellMapViz.variables[0] : [],
  (variable) => {
    return variable._inputs;
  }
)
)};
const _16z9f8f = function _dedupeHierarchy(){return(
function dedupeHierarchy(root) {
  const key = (n) => n.data;
  const deepest = new Map(); // datum → deepest node

  // pass-1: pick deepest representative
  root.each((n) => {
    const k = key(n);
    if (!deepest.has(k) || n.depth > deepest.get(k).depth) deepest.set(k, n);
  });
  deepest.forEach((n) => {
    n.reused = [];
  });

  // pass-2: alias shallower nodes → deepest
  root.each((n) => {
    const rep = deepest.get(key(n));
    n.name = n.data._name;
    const p = n.parent;
    if (n !== rep) {
      if (p) {
        p.children = p.children.map((c) => (c === n ? rep : c));
        if (!rep.reused.includes(p) && p == deepest.get(key(p)))
          rep.reused.push(p);
      }
    }
  });
  return root;
}
)};
const _1j8atwc = function _layout(d3,descendents){return(
d3.tree()(descendents)
)};
const _eb858t = function _clustered(dedupeHierarchy,layout){return(
dedupeHierarchy(layout)
)};
const _17lllwm = function _nodes(clustered){return(
clustered.descendants().map((n) => ({ name: n.data._name, ...n }))
)};
const _ng770d = function _26(md){return(
md`### visualize the cell ordering`
)};
const _xpas1q = function _runtimeMap(runtime_variables,liveCellMap)
{
  runtime_variables;
  return [...liveCellMap.values()].flat();
};
const _hishw1 = function _variableToCell(runtimeMap){return(
new Map(
  runtimeMap.flatMap((cell) => cell.variables.map((v) => [v, cell]))
)
)};
const _szpnyp = function _filteredMap(runtimeMap,filter){return(
runtimeMap.filter(filter)
)};
const _1jdpo9p = function _filter(showBuiltins,showAnon){return(
(v) =>
  (showBuiltins || (v.module !== "builtin" && v.name !== "module builtin")) &&
  (showAnon || typeof v.name == "string")
)};
const _10gdqhm = function _edges(filteredMap,variableToCell,filter){return(
filteredMap.flatMap((cell) =>
  cell.variables.flatMap((variable) =>
    variable._inputs
      .map((input) => [variableToCell.get(variable), variableToCell.get(input)])
      .filter(([source, imported]) => imported && filter(imported))
  )
)
)};
const _qb7351 = function _cellMapModule(thisModule){return(
thisModule()
)};
const _120483s = (G, _) => G.input(_);
const _2ufyg8 = function _38(md){return(
md`## testing`
)};
const _18tubss = function _39(tests){return(
tests({
  filter: (t) =>
    t.name.includes("@tomlarkworthy/cell-map") || t.name.includes("main")
})
)};
const _kdc1xp = function _modules(moduleMap,runtime){return(
moduleMap(runtime)
)};
const _jrvq7q = function _moduleLookup(modules){return(
new Map([...modules.values()].map((info) => [info.name, info]))
)};
const _rlmpw8 = function _42(md){return(
md`low-level variables in this module`
)};
const _519lii = function _43(Inputs,runtime_variables,cellMapModule,toObject,modules){return(
Inputs.table(
  [...runtime_variables]
    .filter((v) => v._module == cellMapModule)
    .map(toObject),
  {
    columns: [
      "_name",
      "_inputs",
      "_definition",
      "_type",
      "_reachable",
      "_observer",
      "_module"
    ],
    format: {
      _inputs: (i) => i.map((i) => i._name).join(", "),
      _observer: (i) => i.toString(),
      _module: (m) => modules.get(m).name
    }
  }
)
)};
const _pyrytd = function _unreached_main_import(toObject,lookupVariable,cellMapModule){return(
toObject &&
  lookupVariable("repositionSetElement", cellMapModule)
)};
const _12euivr = function _reached_main_import(runtime,lookupVariable,cellMapModule){return(
runtime && lookupVariable("runtime", cellMapModule)
)};
const _1x88m7u = function _main_mutable(){return(
"OK"
)};
const _1c3nv1y = (M, _) => new M(_);
const _kbdqj3 = _ => _.generator;
const _1q0qa04 = async function _test_importedModule(expect,modules,importedModule,reached_main_import,unreached_main_import)
{
  expect(modules.get(await importedModule(reached_main_import)).name).toBe(
    "@tomlarkworthy/module-map"
  );

  expect(modules.get(await importedModule(unreached_main_import)).name).toBe(
    "@tomlarkworthy/runtime-sdk"
  );

  return "ok";
};
const _1tqu9mu = async function _test_findModuleName(expect,findModuleName,importedModule,reached_main_import,modules,unreached_main_import)
{
  expect(
    findModuleName(await importedModule(reached_main_import), modules)
  ).toBe("@tomlarkworthy/module-map");

  expect(
    findModuleName(await importedModule(unreached_main_import), modules)
  ).toBe("@tomlarkworthy/runtime-sdk");

  return "ok";
};
const _1mk5ruc = async function _test_cellmap_mutable(main_mutable,lookupVariable,cellMapModule,cellMap,modules,expect)
{
  const initialMutable =
    main_mutable &&
    (await lookupVariable("initial main_mutable", cellMapModule));
  const mutableMutable =
    main_mutable &&
    (await lookupVariable("mutable main_mutable", cellMapModule));
  const mainMutable =
    main_mutable && (await lookupVariable("main_mutable", cellMapModule));
  const mapped = await cellMap(
    [initialMutable, mutableMutable, mainMutable],
    modules
  );
  const module = mapped.get(cellMapModule);
  expect(module).toHaveLength(1);
  const mutableCell = module[0];

  expect(mutableCell.type).toBe("mutable");
  expect(mutableCell.variables).toHaveLength(3);
  return mutableCell;
};
const _rpm6xw = function _50(md){return(
md`### Notebook 2.0 Compatability`
)};
const _1rtpyzk = function _cellMapVizView($0){return(
$0
)};
const _1srzrzc = function _52(md){return(
md`detailVizView = viewof detailViz`
)};
const _1hybsm8 = function _coverage_failures(runtime_variables,liveCellMap,modules)
{
  const byModule = new Map();
  for (const v of runtime_variables) {
    const m = v._module;
    let arr = byModule.get(m);
    if (!arr) byModule.set(m, (arr = []));
    arr.push(v);
  }

  const isDynamic = (v) =>
    typeof v?._name === "string" && v._name.startsWith("dynamic");

  const failures = [];
  for (const [m, vars] of byModule.entries()) {
    const cells = liveCellMap.get(m) || [];
    const covered = new Set(cells.flatMap((c) => c.variables || []));
    const missing = vars.filter(
      (v) => v._type == 1 && !isDynamic(v) && !covered.has(v)
    );
    if (missing.length) {
      const moduleName = modules?.get(m)?.name ?? "<unknown module>";
      failures.push({
        module: moduleName,
        missing: missing.map((v, i) => v._name ?? `<anonymous ${i}>`)
      });
    }
  }
  return failures;
};
const _1p0qclg = function _test_cell_map_covers_all_runtime_variables(coverage_failures)
{
  if (coverage_failures.length) {
    throw JSON.stringify(coverage_failures);
  }
  return "pass";
};
const _1a18z7a = function _test_cell_map_no_variable_in_more_than_one_cell(runtime_variables,liveCellMap,modules)
{
  runtime_variables;

  const where = new Map(); // variable -> Set(cellId)
  const add = (v, cellId) => {
    let s = where.get(v);
    if (!s) where.set(v, (s = new Set()));
    s.add(cellId);
  };

  for (const [m, cells] of liveCellMap.entries()) {
    const moduleName = modules?.get(m)?.name ?? "<unknown module>";
    for (const c of cells ?? []) {
      const cellId = `${moduleName}#${String(c?.name ?? "<unknown cell>")}`;
      const vars = c?.variables ?? [];
      const uniq = new Set(vars);
      for (const v of uniq) add(v, cellId);
    }
  }

  const failures = [];
  for (const [v, cellIds] of where.entries()) {
    if (cellIds.size > 1) {
      const vModuleName = modules?.get(v?._module)?.name ?? "<unknown module>";
      failures.push({
        variable_module: vModuleName,
        variable_name: v?._name ?? "<anonymous>",
        cells: [...cellIds]
      });
    }
  }

  if (failures.length) throw JSON.stringify(failures);
  return "pass";
};
const _8nkqnx = function _56(md){return(
md`### Utilities`
)};
const _n7jdgk = function _findModuleName(){return(
(module, moduleMap, { unknown_id = Math.random() } = {}) => {
  try {
    const lookup = moduleMap.get(module);
    if (lookup) return lookup.name;
    return `<unknown ${unknown_id}>`;
  } catch (e) {
    debugger;
    return "error";
  }
}
)};
const _cmt00 = function _cmt00(md) {return (md`## Consumer contract tests`);};
const _cmt0t = function _cellmap_tests_enabled(Inputs,location){return(
Inputs.toggle({
  label: "Run cell-map tests",
  value: /(^#|&)cellmap_tests(=|&|$)/.test(location.hash)
})
)};
const _cmt0u = (G, _) => G.input(_);
const _cmt01 = function _cellMapFixture(createModule,deleteModule,runtime,realize,currentModules,cellMap,cellmap_tests_enabled) {
  let serial = 0;
  return async (fn) => {
    // the fixture creates and deletes modules, which floods a paired session with cell changes
    if (!cellmap_tests_enabled) return "skipped: turn on 'Run cell-map tests' (or add &cellmap_tests to the hash) to run this scenario";
    const id = `${Date.now().toString(36)}-${serial++}`;
    const libName = `@cellmap-test/lib-${id}`, appName = `@cellmap-test/app-${id}`;
    // the library is a module block and its loader goes through the page's import hook, as in an export
    const block = Object.assign(document.createElement("script"), {type: "text/plain", id: libName});
    block.setAttribute("data-mime", "application/javascript");
    block.textContent = `export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("a")).define("a", [], () => 1);
  main.variable(observer("b")).define("b", [], () => 2);
  main.variable(observer("x")).define("x", [], () => 3);
  return main;
}`;
    document.body.appendChild(block);
    const [loader, loaderQuoter] = await realize([
      `async () => runtime.module((await import(${JSON.stringify(`/${libName}.js?v=4`)})).default)`,
      // a named cell whose body builds and imports a module without being an import cell
      `function _loaderQuoter(runtime){return(\n(url) => runtime.module(import(url))\n)}`
    ], runtime);
    const app = createModule(appName, runtime);
    let lib;
    try {
      const def = (name, inputs, fn) => app.variable(true).define(name, inputs, fn);
      const v = {};
      v.module = def(`module ${libName}`, [], loader);
      // an input naming a cell defined later resolves to the browser global (window.toolbar) first, and the
      // runtime leaves that implicit variable behind once the real cell is defined
      v.toolbarUser = def("toolbarUser", ["toolbar"], (t) => t);
      v.toolbar = def("toolbar", [], () => "t");
      v.n = def("n", [], () => 1);
      // runtime is not in a createModule module's scope; the parameter name is what the source shows
      v.quoter = def("loaderQuoter", ["n"], loaderQuoter);
      v.anon = def(null, ["n"], (n) => n + 1);
      v.viewof = def("viewof x", [], () => Object.assign(new EventTarget(), {value: 5}));
      v.x = def("x", ["Generators", "viewof x"], (G, _) => G.input(_));
      v.initial = def("initial m", [], () => 3);
      v.mutable = def("mutable m", ["Mutable", "initial m"], (M, _) => new M(_));
      v.m = def("m", ["mutable m"], (_) => _.generator);
      v.a = def("a", [`module ${libName}`, "@variable"], (_, v) => v.import("a", _));
      v.b = def("b", [`module ${libName}`, "@variable"], (_, v) => v.import("b", _));
      v.c = def("c", [`module ${libName}`, "@variable"], (_, v) => v.import("x", "c", _));
      const values = await Promise.all(["n", "x", "m", "a", "b", "c"].map((name) => app.value(name)));
      await app.value("loaderQuoter");
      if (values.join() !== "1,5,3,1,2,3") throw new Error(`fixture did not compute: ${values}`);
      lib = await app.value(`module ${libName}`);
      const variables = [...runtime._variables].filter((x) => x._module === app && x._type === 1);
      const modules = new Map([...(currentModules ?? new Map())]);
      modules.set(lib, {name: libName, module: lib});
      modules.set(app, {name: appName, module: app});
      const cells = (await cellMap(variables, modules)).get(app) ?? [];
      const cellOf = (variable) => cells.filter((c) => c.variables?.includes(variable));
      return await fn({cells, cellOf, v, variables, app, lib, appName, libName, modules});
    } finally {
      // a left-behind implicit variable does not own its name, so variable.delete() throws on it (runtime variable.js)
      for (const x of [...runtime._variables]) if (x._module === app && x._name != null && app._scope.get(x._name) !== x) runtime._variables.delete(x);
      deleteModule(appName, runtime);
      if (lib) for (const x of [...runtime._variables]) if (x._module === lib) x.delete();
      block.remove();
    }
  };
};
const _cmt10 = function _test_cellmap_contract_every_variable_in_exactly_one_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, variables}) => {
  const counts = variables.map((x) => [x._name ?? "(anonymous)", cellOf(x).length]);
  expect(counts.filter(([, k]) => k !== 1)).toEqual([]);
  return `ok: ${variables.length} variables`;
})
)};
const _cmt11 = function _test_cellmap_contract_cells_follow_runtime_order(cellMapFixture,expect) {return (
cellMapFixture(({cells, variables}) => {
  // where an import cell sorts is a shape question (test_cellmap_shape_import_cell_sorts_by_its_first_import)
  const first = cells.filter((c) => c.type !== "import").map((c) => Math.min(...c.variables.map((x) => variables.indexOf(x)).filter((i) => i >= 0)));
  expect(first).toEqual([...first].sort((p, q) => p - q));
  return `ok: ${first.length} non-import cells`;
})
)};
const _cmt12 = function _test_cellmap_contract_named_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v, appName}) => {
  const [cell] = cellOf(v.n);
  expect({name: cell.name, type: cell.type, module: cell.module, variables: cell.variables}).toEqual({name: "n", type: "simple", module: appName, variables: [v.n]});
  expect(cell.lang).toContain("ojs");
  return "ok";
})
)};
const _cmt13 = function _test_cellmap_contract_anonymous_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  const [cell] = cellOf(v.anon);
  expect(cell.type).toBe("simple");
  expect(cell.variables).toEqual([v.anon]);
  // command-palette skips a cell whose name is falsy unless it is an import
  expect(typeof cell.name === "string" && cell.name !== "").toBe(false);
  return `ok: name ${JSON.stringify(cell.name)}`;
})
)};
const _cmt14 = function _test_cellmap_contract_viewof_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  const [cell] = cellOf(v.viewof);
  expect({name: cell.name, type: cell.type, variables: cell.variables}).toEqual({name: "viewof x", type: "viewof", variables: [v.viewof, v.x]});
  return "ok";
})
)};
const _cmt15 = function _test_cellmap_contract_mutable_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  const [cell] = cellOf(v.mutable);
  // visualizer renders variables[2] of a mutable: the live value, not the seed
  expect({name: cell.name, type: cell.type, variables: cell.variables}).toEqual({name: "mutable m", type: "mutable", variables: [v.initial, v.mutable, v.m]});
  return "ok";
})
)};
const _cmt16 = function _test_cellmap_contract_import_cells(cellMapFixture,expect) {return (
cellMapFixture(({cells, cellOf, v, libName}) => {
  const importCells = [...new Set([v.a, v.b, v.c].flatMap(cellOf))];
  expect(importCells.map((c) => c.type)).toEqual(importCells.map(() => "import"));
  expect(importCells.map((c) => c.module_name)).toEqual(importCells.map(() => libName));
  const specifiers = importCells.flatMap((c) => c.importInfo?.type === "import" ? c.importInfo.specifiers : []);
  const pairs = specifiers.map((s) => `${s.imported} as ${s.local}`).sort();
  expect(pairs).toEqual(["a as a", "b as b", "x as c"]);
  // visualizer renders `from "${importInfo.from}"`: the module name, not the loader URL
  expect(importCells.map((c) => c.importInfo?.from)).toEqual(importCells.map(() => libName));
  expect(cellOf(v.module).length).toBe(1);
  expect(cellOf(v.module)[0].type).toBe("import");
  return `ok: ${importCells.length} import cell(s)`;
})
)};
const _cmt18 = function _test_cellmap_contract_named_cell_calling_a_loader_is_not_an_import(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  // visualizer renders an import cell as a header, so a misread cell disappears from the page
  const [cell] = cellOf(v.quoter);
  expect({name: cell.name, type: cell.type, variables: cell.variables}).toEqual({name: "loaderQuoter", type: "simple", variables: [v.quoter]});
  return "ok";
})
)};
const _cmt19 = function _test_cellmap_contract_a_resolved_global_does_not_hide_a_cell(cellMapFixture,cellMap,runtime,expect) {return (
cellMapFixture(async ({app, v, modules}) => {
  // cellMap() with no arguments maps every runtime variable, implicit ones included
  const all = [...runtime._variables].filter((x) => x._module === app);
  expect(all.some((x) => x._name === "toolbar" && x !== v.toolbar)).toBe(true);
  const cells = (await cellMap(all, modules)).get(app) ?? [];
  expect(cells.filter((c) => c.variables.includes(v.toolbar)).map((c) => c.name)).toEqual(["toolbar"]);
  return "ok";
})
)};
const _cmt1a = function _test_cellmap_contract_import_from_a_module_value(cellMapFixture,createModule,deleteModule,runtime,cellMap,expect) {return (
cellMapFixture(async ({lib, libName, modules}) => {
  // dataflow-templating and the visualizer tests bind `module X` to a value, with no loader body;
  // visualizer still has to render one import header for it
  const name = `${libName}-value-importer`;
  const m = createModule(name, runtime);
  try {
    const mv = m.variable(true).define(`module ${libName}`, [], () => lib);
    const k = m.variable(true).define("k", [`module ${libName}`, "@variable"], (_, v) => v.import("a", "k", _));
    expect(await m.value("k")).toBe(1);
    const mods = new Map(modules).set(m, {name, module: m});
    const cells = (await cellMap([...runtime._variables].filter((x) => x._module === m && x._type === 1), mods)).get(m) ?? [];
    const holding = cells.filter((c) => c.variables.includes(mv) || c.variables.includes(k));
    expect(holding.map((c) => c.type)).toEqual(["import"]);
    expect(holding[0].variables.includes(mv) && holding[0].variables.includes(k)).toBe(true);
    expect(holding[0].importInfo.specifiers.map((s) => `${s.imported} as ${s.local}`)).toEqual(["a as k"]);
    // visualizer writes module_name into the header's data-module-name
    expect(holding[0].module_name).toBe(libName);
    return "ok";
  } finally {
    deleteModule(name, runtime);
  }
})
)};
const _cmt1b = function _test_cellmap_shape_import_cell_before_its_imports_resolve(cellMapFixture,createModule,deleteModule,runtime,cellMap,expect) {return (
cellMapFixture(async ({lib, libName, modules}) => {
  // until an import variable is computed its inputs are [module X, @variable] in its own module; a live map
  // taken then (visualizer's liveCellMap is not recomputed when the runtime rewrites those inputs) renders it
  // as a cell of its own, so the map puts it in the import cell before its imports resolve
  const name = `${libName}-unresolved`;
  const m = createModule(name, runtime);
  try {
    const mv = m.variable().define(`module ${libName}`, [], () => lib);
    const k = m.variable().define("k", [`module ${libName}`, "@variable"], (_, v) => v.import("a", "k", _));
    const j = m.variable().define("j", [`module ${libName}`, "@variable"], (_, v) => v.import("b", _));
    expect(k._inputs.map((i) => i._name)).toEqual([`module ${libName}`, "@variable"]);
    const mods = new Map(modules).set(m, {name, module: m});
    const cells = (await cellMap([...runtime._variables].filter((x) => x._module === m), mods)).get(m) ?? [];
    const holding = cells.filter((c) => [mv, k, j].some((x) => c.variables.includes(x)));
    // one import cell from the start, holding the module variable and both imports
    expect(holding.map((c) => c.type)).toEqual(["import"]);
    expect([mv, k, j].every((x) => holding[0].variables.includes(x))).toBe(true);
    expect(holding[0].importInfo.specifiers.map((s) => `${s.imported} as ${s.local}`).sort()).toEqual(["a as k", "b as j"]);
    return "ok";
  } finally {
    deleteModule(name, runtime);
  }
})
)};
const _cmt17 = function _test_cellmap_contract_first_variable_has_a_definition(cellMapFixture,expect) {return (
cellMapFixture(({cells}) => {
  // command-palette indexes variables[0]._definition as the cell's source
  expect(cells.filter((c) => typeof c.variables?.[0]?._definition !== "function").map((c) => c.name)).toEqual([]);
  return "ok";
})
)};
const _cmt20 = function _test_cellmap_shape_imports_from_one_module_are_one_cell(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  const importCells = new Set([v.module, v.a, v.b, v.c].flatMap(cellOf));
  expect(importCells.size).toBe(1);
  return "ok";
})
)};
const _cmt21 = function _test_cellmap_shape_anonymous_cell_lang(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  // an unnamed simple body is either dialect
  expect(cellOf(v.anon)[0].lang).toEqual(["ojs", "js"]);
  return "ok";
})
)};
const _cmt22 = function _test_cellmap_shape_import_cell_variables(cellMapFixture,expect) {return (
cellMapFixture(({cellOf, v}) => {
  const [cell] = cellOf(v.a);
  // members in runtime order, the module variable first
  expect(cell.variables.map((x) => x._name)).toEqual([v.module._name, "a", "b", "c"]);
  return "ok";
})
)};
const _cmt23 = function _test_cellmap_shape_import_cell_sorts_by_its_first_import(cellMapFixture,expect) {return (
cellMapFixture(({cells, cellOf, v}) => {
  // the fixture defines the module variable first and the imports last
  expect(cells.at(-1)).toBe(cellOf(v.a)[0]);
  return "ok";
})
)};
const _cmt24 = function _test_cellmap_shape_import_from_a_module_value_names_its_module(cellMapFixture,createModule,deleteModule,runtime,cellMap,expect) {return (
cellMapFixture(async ({lib, libName, modules}) => {
  // what visualizer prints after `from` when `module X` is bound to a value, which has no loader to read
  const name = `${libName}-value-named`;
  const m = createModule(name, runtime);
  try {
    m.variable(true).define(`module ${libName}`, [], () => lib);
    const k = m.variable(true).define("k", [`module ${libName}`, "@variable"], (_, v) => v.import("a", "k", _));
    await m.value("k");
    const mods = new Map(modules).set(m, {name, module: m});
    const cells = (await cellMap([...runtime._variables].filter((x) => x._module === m && x._type === 1), mods)).get(m) ?? [];
    const from = String(cells.find((c) => c.variables.includes(k))?.importInfo?.from);
    // the module name, read from the `module X` variable's own name
    expect(from).toBe(libName);
    return from;
  } finally {
    deleteModule(name, runtime);
  }
})
)};
const _cml00 = function _cellLanguagesDoc(md){return(
md`## Cell languages (fork in soundscript.html)

This copy of cell-map is a fork that exists only in \`lopebooks/notebooks/soundscript.html\`. A cell's \`lang\` is \`["<id>"]\` when the first comment of one of its variables' definitions is \`/*{lang:"<id>"}*/\` (\`langTag\`, the rule \`ss.langOf\` applies). It is read from the definition alone; no language needs to be loaded.

The registry of languages that can show and save such cells lives here too. A module registers one with

\`\`\`js
plugins.add("cell_languages", {
  id,                                      // the marker id, e.g. "ss"
  label,                                   // optional: the name the editor's language picker shows
  claimsSource: (source, cell) => boolean, // optional: typed source is in this language (the editor takes the
                                           // claim only when no other language claims it and the built-in parser rejects it)
  decompile: async (variables) => string,  // the source the editor shows
  apply: async (source, variables, cell) => string | undefined,
                                           // define the cell; the canonical source, or undefined when refused
  lint: (source, variables, cell) => [{from, to, severity, message}],  // optional
  header: (variables) => {inputs, outputs, type},                      // optional: the open editor's header line
  inspect: (variable, value, root) => Element | null,                  // optional: how the visualizer shows a value
  extension: (codemirror) => Extension     // optional: the CodeMirror language
}, { invalidation })
\`\`\`

\`languageOf(variables, cell, source)\` is the registered language whose \`id\` is the cell's tag, or, for a new cell with no variables, the first whose \`claimsSource\` accepts the source. \`unloadedLanguage(variables, cell)\` is a tag no registered language has: such a cell's source cannot be shown or saved.`
)};
const _cml01 = function _langTag() {
  // The id in a definition's first comment when that comment is /*{lang:"id"}*/, else null. Strings
  // and templates are skipped (a template's \${…} with a backtick inside ends it early); a regex
  // literal is not recognised, so one holding "/*" before the first comment is misread.
  const cache = new WeakMap();
  const MARK = /^\{lang:"([\w-]+)"\}$/;
  const scan = (s) => {
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '"' || c === "'" || c === "`") {
        for (i++; i < s.length && s[i] !== c; i++) if (s[i] === "\\") i++;
      } else if (c === "/" && s[i + 1] === "/") return null;
      else if (c === "/" && s[i + 1] === "*") {
        const end = s.indexOf("*/", i + 2);
        return MARK.exec(s.slice(i + 2, end < 0 ? s.length : end))?.[1] ?? null;
      }
    }
    return null;
  };
  return (def) => {
    if (typeof def === "string") return scan(def);
    if (typeof def !== "function") return null;
    if (!cache.has(def)) cache.set(def, scan(String(def)));
    return cache.get(def);
  };
};
const _cml02 = function _languageTagOf(langTag){return(
// a cell's language tag: the cell map's lang when it is not a dialect, else read from its variables;
// with no variables, cell is a new cell's anchor, whose tag is not the new cell's
(variables = [], cell) => {
  if (!variables.length) return null;
  const own = Array.isArray(cell?.lang) ? cell.lang.find((l) => l !== "ojs" && l !== "js") : undefined;
  if (own) return own;
  for (const v of variables) { const t = langTag(v?._definition); if (t) return t; }
  return null;
}
)};
const _cml03 = function _cellLanguagesRef(plugins,invalidation)
{
  // A holder the editor and visualizer read: depending on the set itself would rebuild every open
  // editor on each registration. version and listeners let cellLanguagesVersion follow a registration
  // that lands after boot.
  const ref = { current: [], version: 0, listeners: new Set() };
  const gen = plugins.get("cell_languages");
  let live = true;
  invalidation.then(() => { live = false; gen.return?.(); });
  (async () => {
    while (live) {
      const step = await gen.next();
      if (step.done) break;
      const languages = await step.value;
      if (!live) continue;
      const next = [...languages];
      // the set yields on every registration of any plugin; listeners hear only a change of languages
      const changed = next.length !== ref.current.length || next.some((l, i) => l !== ref.current[i]);
      ref.current = next;
      if (changed) {
        ref.version++;
        for (const f of ref.listeners) { try { f(); } catch (e) { console.error(e); } }
      }
    }
  })();
  return ref;
};
const _cml04 = function _languageOf(cellLanguagesRef,languageTagOf){return(
// the registered language of a cell's tag; for a new cell (no variables), of its typed source; else null
(variables = [], cell, source) => {
  const all = cellLanguagesRef.current;
  if (variables.length) {
    const tag = languageTagOf(variables, cell);
    return tag ? all.find((l) => l.id === tag) ?? null : null;
  }
  if (typeof source !== "string") return null;
  const ask = (f) => { try { return !!f(); } catch (e) { console.error(e); return false; } };
  return all.find((l) => l.claimsSource && ask(() => l.claimsSource(source, cell))) ?? null;
}
)};
const _cml05 = function _cellLanguagesVersion(cellLanguagesRef,Generators){return(
// changes when a language registers or leaves, so an editor opened before registration is rebuilt
Generators.observe((notify) => {
  notify(cellLanguagesRef.version ?? 0);
  const f = () => notify(cellLanguagesRef.version);
  cellLanguagesRef.listeners?.add(f);
  return () => cellLanguagesRef.listeners?.delete(f);
})
)};
const _cml06 = function _unloadedLanguage(cellLanguagesRef,languageTagOf){return(
// a cell's language tag when no registered language has it: its source cannot be shown or saved
(variables = [], cell) => {
  const tag = languageTagOf(variables, cell);
  return tag && !cellLanguagesRef.current.some((l) => l.id === tag) ? tag : null;
}
)};
const _cml10 = function _test_cellmap_lang_tag_reads_the_first_comment(langTag,expect)
{
  const cases = [
    ['($ss$) => { return $ss$.cell(/*{lang:"ss"}*/() => 1); }', "ss"],
    ['/*{lang:"qq-2"}*/ (a) => a', "qq-2"],
    ['/* note */ /*{lang:"ss"}*/ (a) => a', null],
    ['// note\n/*{lang:"ss"}*/ (a) => a', null],
    ['function _readme(md){return(md`the marker \\`/*{lang:"ss"}*/\\``)}', null],
    ['() => "/*{lang:\\"ss\\"}*/"', null],
    ["(a) => a", null],
  ];
  expect(cases.map(([d]) => langTag(d))).toEqual(cases.map(([, t]) => t));
  const f = new Function('return () => /*{lang:"ss"}*/ 1')();
  expect(langTag(f)).toBe("ss");
  expect(langTag(undefined)).toBe(null);
  return `${cases.length + 2} definitions: the marker counts only as the first comment`;
};
const _cml11 = function _test_cellmap_lang_from_the_marker(groupCells,expect)
{
  // runtime-shaped records through groupCells, so no module is made: a marked ref cell (handle and
  // value), a marked plain cell, an md cell quoting the marker, an ordinary viewof
  const mod = { _runtime: { _builtin: {} } };
  const mk = (name, inputs, def) => ({ _name: name, _type: 1, _module: mod, _inputs: [], _definition: def, _value: undefined, deps: inputs });
  const vs = [
    mk("tally", ["viewof tally"], (_, $ss$) => /*{lang:"ss"}*/ $ss$.refValues(_)),
    mk("viewof tally", [], ($ss$) => $ss$.cell(/*{lang:"ss"}*/ () => 0)),
    mk("doubled", ["tally"], ($ss$, tally) => $ss$.cell(/*{lang:"ss"}*/ (tally) => tally * 2)),
    mk("readme", [], function _readme(md) { return md`the marker \`/*{lang:"ss"}*/\``; }),
    mk("viewof x", [], () => 1),
    mk("x", ["viewof x"], (G, _) => G.input(_)),
  ];
  const byName = new Map(vs.map((v) => [v._name, v]));
  for (const v of vs) v._inputs = v.deps.map((n) => byName.get(n));
  const a = { name: (v) => v._name, type: (v) => v._type, def: (v) => v._definition, module: (v) => v._module, value: (v) => v._value,
    inputs: (v) => v._inputs.map((i) => ({ name: i._name, module: i._module, builtin: false })) };
  const cells = groupCells(vs, a).get(mod);
  const got = Object.fromEntries(cells.map((c) => [String(c.name), [c.type, c.lang.join()]]));
  expect(got).toEqual({ "viewof tally": ["viewof", "ss"], doubled: ["simple", "ss"], readme: ["simple", "ojs"], "viewof x": ["viewof", "ojs"] });
  return JSON.stringify(got);
};
const _cml12 = function _test_cellmap_language_registry(cellLanguagesRef,languageOf,unloadedLanguage,languageTagOf,expect)
{
  const saved = cellLanguagesRef.current;
  const marked = { _name: "x", _definition: new Function('return () => /*{lang:"qq"}*/ 1')() };
  const plain = { _name: "y", _definition: () => 1 };
  const qq = { id: "qq", claimsSource: (src) => /^qq /.test(src) };
  try {
    cellLanguagesRef.current = [];
    expect([languageTagOf([marked]), languageOf([marked]), unloadedLanguage([marked])]).toEqual(["qq", null, "qq"]);
    expect(languageTagOf([plain], { lang: ["ojs"] })).toBe(null);
    expect(languageTagOf([plain], { lang: ["qq"] })).toBe("qq");
    cellLanguagesRef.current = [qq];
    expect(languageOf([marked]) === qq && unloadedLanguage([marked]) === null).toBe(true);
    expect(languageOf([plain])).toBe(null);
    expect(languageOf([], {}, "qq new") === qq && languageOf([], {}, "x = 1") === null).toBe(true);
    return "a tag with no language is unloaded; a registered id is the cell's language; a new cell asks claimsSource";
  } finally {
    cellLanguagesRef.current = saved;
  }
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));
  main.define("module @tomlarkworthy/modules", async () => runtime.module((await import("/@tomlarkworthy/modules.js?v=4")).default));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("importedModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("importedModule", _));    
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));  
  main.define("module d/57d79353bac56631@44", async () => runtime.module((await import("/d/57d79353bac56631@44.js?v=4")).default));  
  $def("_1t29kxm", null, ["md"], _1t29kxm);  
  $def("_199r1h0", "viewof showBuiltins", ["Inputs"], _199r1h0);  
  $def("_v3idap", "showBuiltins", ["Generators","viewof showBuiltins"], _v3idap);  
  $def("_jqf42f", "viewof showAnon", ["Inputs"], _jqf42f);  
  $def("_10za42b", "showAnon", ["Generators","viewof showAnon"], _10za42b);  
  $def("_125g1nt", "viewof cellMapViz", ["hash","Plot","width","d3","filteredMap","edges","linkTo","isOnObservableCom"], _125g1nt);  
  $def("_cjxin", "cellMapViz", ["Generators","viewof cellMapViz"], _cjxin);  
  $def("_1nt2irf", "detailVizTitle", ["cellMapViz","linkTo","md"], _1nt2irf);  
  $def("_1lxiffy", "viewof detailViz", ["Plot","width","nodes","variableToCell","modules","linkTo","isOnObservableCom"], _1lxiffy);  
  $def("_j5pb2k", "detailViz", ["Generators","viewof detailViz"], _j5pb2k);  
  $def("_glmq4i", null, ["md"], _glmq4i);  
  $def("_izhsfx", null, ["Inputs","filteredMap"], _izhsfx);  
  $def("_7t7pwf", null, ["md"], _7t7pwf);  
  $def("_1xnzq7y", "viewof liveCellMap", ["keepalive","cellMapModule","Inputs","cellMap","currentModules"], _1xnzq7y);
  $def("_14vvdt2", "liveCellMap", ["Generators","viewof liveCellMap"], _14vvdt2);
  $def("_193osz9", "maintain_live_cell_map", ["runtime_variables","viewof liveCellMap","cellMap","Event","currentModules"], _193osz9);
  $def("_1vhxngh", "usage", ["md"], _1vhxngh);  
  $def("_doc3rul", "docs_algorithm", ["md"], _doc3rul);  
  $def("_doc4glu", "docs_glue", ["md"], _doc4glu);  
  $def("_17c6bac", "cellMap", ["runtime","groupCells","runtimeAccessors"], _17c6bac);  
  $def("_r0le0f", "roleOf", [], _r0le0f);  
  $def("_xfa26q", "notACell", [], _xfa26q);  
  $def("_wyt7b6", "defInfo", [], _wyt7b6);  
  $def("_zdl9tm", "runtimeAccessors", [], _zdl9tm);  
  $def("_snkocq", "groupCells", ["notACell","defInfo","roleOf","langTag"], _snkocq);
  $def("_cml00", "cellLanguagesDoc", ["md"], _cml00);
  $def("_cml01", "langTag", [], _cml01);
  $def("_cml02", "languageTagOf", ["langTag"], _cml02);
  $def("_cml03", "cellLanguagesRef", ["plugins","invalidation"], _cml03);
  $def("_cml04", "languageOf", ["cellLanguagesRef","languageTagOf"], _cml04);
  $def("_cml05", "cellLanguagesVersion", ["cellLanguagesRef","Generators"], _cml05);
  $def("_cml06", "unloadedLanguage", ["cellLanguagesRef","languageTagOf"], _cml06);
  $def("_cml10", "test_cellmap_lang_tag_reads_the_first_comment", ["langTag","expect"], _cml10);
  $def("_cml11", "test_cellmap_lang_from_the_marker", ["groupCells","expect"], _cml11);
  $def("_cml12", "test_cellmap_language_registry", ["cellLanguagesRef","languageOf","unloadedLanguage","languageTagOf","expect"], _cml12);  
  $def("_1clgb7s", "test_cellmap_importInfo_on_real_import", ["cellMap","expect"], _1clgb7s);  
  $def("_k9te40", "test_recovers_this_notebooks_own_cells", ["cellMap","currentModules","cellMapModule"], _k9te40);  
  $def("_1ekq6tt", "test_no_unresolved_glue_anywhere", ["cellMap","currentModules"], _1ekq6tt);  
  $def("_17hxnwp", "test_import_cells_stay_distinct", ["cellMap","currentModules"], _17hxnwp);  
  $def("_19ojlg4", "test_defInfo_is_memoised_per_definition", ["defInfo"], _19ojlg4);  
  $def("_r0letst", "test_roleOf_reads_shape_not_definition_text", ["roleOf"], _r0letst);  
  $def("_agctjt", "test_compiled_alias_is_not_an_import_cell", ["defInfo"], _agctjt);  
  $def("_t2ikl4", "test_import_locals_prefer_the_specifier_enumeration", ["defInfo"], _t2ikl4);  
  $def("_yubgz5", null, ["md"], _yubgz5);  
  $def("_71n0hz", "cellMapCompat", ["cellMap"], _71n0hz);  
  $def("_x7j8bo", null, ["md"], _x7j8bo);  
  $def("_1l7cvxn", "nodeToSymbol", ["variableToCell"], _1l7cvxn);  
  $def("_y7kfs7", "focus_variables", ["cellMapViz","descendants","ascendants"], _y7kfs7);  
  $def("_14ty3wh", "focus_cells", ["focus_variables","variableToCell"], _14ty3wh);  
  $def("_12jpxa2", "descendents", ["d3","cellMapViz"], _12jpxa2);  
  $def("_16z9f8f", "dedupeHierarchy", [], _16z9f8f);  
  $def("_1j8atwc", "layout", ["d3","descendents"], _1j8atwc);  
  $def("_eb858t", "clustered", ["dedupeHierarchy","layout"], _eb858t);  
  $def("_17lllwm", "nodes", ["clustered"], _17lllwm);  
  $def("_ng770d", null, ["md"], _ng770d);  
  $def("_xpas1q", "runtimeMap", ["runtime_variables","liveCellMap"], _xpas1q);  
  $def("_hishw1", "variableToCell", ["runtimeMap"], _hishw1);  
  $def("_szpnyp", "filteredMap", ["runtimeMap","filter"], _szpnyp);  
  $def("_1jdpo9p", "filter", ["showBuiltins","showAnon"], _1jdpo9p);  
  $def("_10gdqhm", "edges", ["filteredMap","variableToCell","filter"], _10gdqhm);  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));
  main.define("currentModules", ["module @tomlarkworthy/modules", "@variable"], (_, v) => v.import("currentModules", _));
  main.define("runtime", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime_variables", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("repositionSetElement", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("repositionSetElement", _));  
  main.define("ascendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("ascendants", _));  
  main.define("descendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("descendants", _));  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  $def("_qb7351", "viewof cellMapModule", ["thisModule"], _qb7351);  
  $def("_120483s", "cellMapModule", ["Generators","viewof cellMapModule"], _120483s);  
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));  
  $def("_2ufyg8", null, ["md"], _2ufyg8);  
  $def("_18tubss", null, ["tests"], _18tubss);  
  $def("_kdc1xp", "modules", ["moduleMap","runtime"], _kdc1xp);  
  $def("_jrvq7q", "moduleLookup", ["modules"], _jrvq7q);  
  $def("_rlmpw8", null, ["md"], _rlmpw8);  
  $def("_519lii", null, ["Inputs","runtime_variables","cellMapModule","toObject","modules"], _519lii);  
  $def("_pyrytd", "unreached_main_import", ["toObject","lookupVariable","cellMapModule"], _pyrytd);  
  $def("_12euivr", "reached_main_import", ["runtime","lookupVariable","cellMapModule"], _12euivr);  
  $def("_1x88m7u", "initial main_mutable", [], _1x88m7u);  
  $def("_1c3nv1y", "mutable main_mutable", ["Mutable","initial main_mutable"], _1c3nv1y);  
  $def("_kbdqj3", "main_mutable", ["mutable main_mutable"], _kbdqj3);  
  $def("_1q0qa04", "test_importedModule", ["expect","modules","importedModule","reached_main_import","unreached_main_import"], _1q0qa04);  
  $def("_1tqu9mu", "test_findModuleName", ["expect","findModuleName","importedModule","reached_main_import","modules","unreached_main_import"], _1tqu9mu);  
  $def("_1mk5ruc", "test_cellmap_mutable", ["main_mutable","lookupVariable","cellMapModule","cellMap","modules","expect"], _1mk5ruc);  
  $def("_rpm6xw", null, ["md"], _rpm6xw);  
  $def("_1rtpyzk", "cellMapVizView", ["viewof cellMapViz"], _1rtpyzk);  
  $def("_1srzrzc", null, ["md"], _1srzrzc);  
  $def("_1hybsm8", "coverage_failures", ["runtime_variables","liveCellMap","modules"], _1hybsm8);  
  $def("_1p0qclg", "test_cell_map_covers_all_runtime_variables", ["coverage_failures"], _1p0qclg);  
  $def("_1a18z7a", "test_cell_map_no_variable_in_more_than_one_cell", ["runtime_variables","liveCellMap","modules"], _1a18z7a);  
  $def("_8nkqnx", null, ["md"], _8nkqnx);  
  $def("_n7jdgk", "findModuleName", [], _n7jdgk);  
  $def("_cmt00", null, ["md"], _cmt00);  
  $def("_cmt0t", "viewof cellmap_tests_enabled", ["Inputs","location"], _cmt0t);  
  $def("_cmt0u", "cellmap_tests_enabled", ["Generators","viewof cellmap_tests_enabled"], _cmt0u);
  $def("_cmt01", "cellMapFixture", ["createModule","deleteModule","runtime","realize","currentModules","cellMap","cellmap_tests_enabled"], _cmt01);
  $def("_cmt10", "test_cellmap_contract_every_variable_in_exactly_one_cell", ["cellMapFixture","expect"], _cmt10);
  $def("_cmt11", "test_cellmap_contract_cells_follow_runtime_order", ["cellMapFixture","expect"], _cmt11);
  $def("_cmt12", "test_cellmap_contract_named_cell", ["cellMapFixture","expect"], _cmt12);
  $def("_cmt13", "test_cellmap_contract_anonymous_cell", ["cellMapFixture","expect"], _cmt13);
  $def("_cmt14", "test_cellmap_contract_viewof_cell", ["cellMapFixture","expect"], _cmt14);
  $def("_cmt15", "test_cellmap_contract_mutable_cell", ["cellMapFixture","expect"], _cmt15);
  $def("_cmt16", "test_cellmap_contract_import_cells", ["cellMapFixture","expect"], _cmt16);
  $def("_cmt18", "test_cellmap_contract_named_cell_calling_a_loader_is_not_an_import", ["cellMapFixture","expect"], _cmt18);
  $def("_cmt19", "test_cellmap_contract_a_resolved_global_does_not_hide_a_cell", ["cellMapFixture","cellMap","runtime","expect"], _cmt19);
  $def("_cmt1a", "test_cellmap_contract_import_from_a_module_value", ["cellMapFixture","createModule","deleteModule","runtime","cellMap","expect"], _cmt1a);
  $def("_cmt1b", "test_cellmap_shape_import_cell_before_its_imports_resolve", ["cellMapFixture","createModule","deleteModule","runtime","cellMap","expect"], _cmt1b);
  $def("_cmt17", "test_cellmap_contract_first_variable_has_a_definition", ["cellMapFixture","expect"], _cmt17);
  $def("_cmt20", "test_cellmap_shape_imports_from_one_module_are_one_cell", ["cellMapFixture","expect"], _cmt20);
  $def("_cmt21", "test_cellmap_shape_anonymous_cell_lang", ["cellMapFixture","expect"], _cmt21);
  $def("_cmt22", "test_cellmap_shape_import_cell_variables", ["cellMapFixture","expect"], _cmt22);
  $def("_cmt23", "test_cellmap_shape_import_cell_sorts_by_its_first_import", ["cellMapFixture","expect"], _cmt23);
  $def("_cmt24", "test_cellmap_shape_import_from_a_module_value_names_its_module", ["cellMapFixture","createModule","deleteModule","runtime","cellMap","expect"], _cmt24);  
  main.define("hash", ["module d/57d79353bac56631@44", "@variable"], (_, v) => v.import("hash", _));
  main.define("createModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("createModule", _));
  main.define("deleteModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("deleteModule", _));
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));
  return main;
}
