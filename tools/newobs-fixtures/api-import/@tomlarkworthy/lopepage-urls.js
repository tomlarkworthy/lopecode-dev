const _330 = function(tests){return(
tests()
)};

const _13 = function dslExamples(){return(
[
  "view=200@tomlarkworthy/slug,25@owner/page#cell",
  "view=@tomlarkworthy/slug,@owner/page",
  "view=C(@tomlarkworthy/slug,@owner/page)",
  "view=45@tomlarkworthy/slug,56@owner/page",
  "view=@tomlarkworthy/slug,R32(@owner/page,@owner/page2)",
  "view=200@tomlarkworthy/slug,25@owner/page",
  "C100(S50(@tomlarkworthy/module-selection),S50(@tomlarkworthy/dom-view))",
  "d/1f41fef8b019cf4e@94",
  "view=C100(S50(@tomlarkworthy/cells-to-clipboard,@tomlarkworthy/module-selection),S50(@tomlarkworthy/module-selection))",
  "R100(C50(S50(@tomlarkworthy/module-selection),S50(@tomlarkworthy/editor)),S50(@tomlarkworthy/svg-boinger))"
]
)};

const _5 = function parseViewDSL(){return(
function parseViewDSL(input) {
  if (!input)
    return {
      nodeType: "group",
      groupType: "S",
      weight: null,
      children: []
    };
  if (input.startsWith("view=")) {
    input = input.slice(5);
  }
  let i = 0;
  function err(msg) {
    throw new Error(msg + " at pos " + i + " for " + input);
  }
  function parseNumber() {
    let start = i;
    while (i < input.length && /[0-9]/.test(input[i])) {
      i++;
    }
    if (start === i) return null;
    return parseInt(input.slice(start, i), 10);
  }
  function parseModule() {
    let weight = parseNumber(); // optional
    if (input[i] == "@") {
      i++; // consume '@'
      let start = i;
      // Read slug until a comma or closing parenthesis.
      while (i < input.length && input[i] !== "," && input[i] !== ")") {
        i++;
      }
      let slug = "@" + input.slice(start, i).trim();
      return { nodeType: "module", weight, slug };
    } else if (input[i] == "d" && input[i + 1] == "/") {
      const start = i;
      let amp = Number.MAX_VALUE;
      while (i < input.length && input[i] !== "," && input[i] !== ")") {
        if (input[i] === "@") amp = i;
        i++;
      }
      let slug = input.slice(start, Math.min(amp, i)).trim();
      return { nodeType: "module", weight, slug };
    } else {
      err(`Expected ${input[i]}`);
    }
  }
  function parseGroup() {
    let groupType = "SCR".includes(input[i]) ? input[i++] : "S";
    let weight = parseNumber();
    if (input[i] == "(") i++; // skip '('
    let children = parseList();
    if (input[i] == ")") i++; // skip ')'
    return { nodeType: "group", groupType, weight, children };
  }
  function parseItem() {
    while (i < input.length && /\s/.test(input[i])) i++;
    if (i < input.length && "SCR".includes(input[i])) {
      return parseGroup();
    } else if (
      i < input.length &&
      (input[i] === "@" ||
        /[0-9]/.test(input[i]) ||
        (input[i] === "d" && input[i + 1] === "/"))
    ) {
      return parseModule();
    } else {
      err("Unexpected character: " + input[i]);
    }
  }
  function parseList() {
    let items = [];
    while (i < input.length && input[i] !== ")") {
      while (i < input.length && /\s/.test(input[i])) i++;
      items.push(parseItem());
      while (i < input.length && /\s/.test(input[i])) i++;
      if (i < input.length && input[i] === ",") {
        i++; // skip comma
      } else {
        break;
      }
    }
    return items;
  }
  const ast = parseGroup();
  while (i < input.length && /\s/.test(input[i])) i++;
  if (i < input.length) err("Unexpected input remaining");
  return ast;
}
)};

const _79 = function(){return(
"SRC".includes("S")
)};

const _36 = function test_parseViewDSL(dslExamples,parseViewDSL){return(
dslExamples.map((dsl, idx) => parseViewDSL(dsl))
)};

const _38 = function test_reserialized(dslExamples,convertToGoldenLayout,parseViewDSL){return(
dslExamples.map((dsl, idx) =>
  convertToGoldenLayout(parseViewDSL(dsl))
)
)};

const _9 = function normalizeWeights(){return(
function normalizeWeights(node) {
  if (node.content && node.content.length > 0) {
    let total = 0;
    for (const child of node.content) {
      total += child.weight || 100.0 / node.content.length;
    }
    for (const child of node.content) {
      let w = child.weight || 100.0 / node.content.length;
      child.size = ((w / total) * 100).toFixed(2) + "%";
      delete child.weight;
      normalizeWeights(child);
    }
  }
  if (!node.size) {
    node.size = "1fr";
    delete node.weight;
  }
}
)};

const _11 = function parseGoldenDSL(parseViewDSL,convertToGoldenLayout,normalizeWeights){return(
function parseGoldenDSL(dsl) {
  const intermediate = parseViewDSL(dsl);
  const glConfig = convertToGoldenLayout(intermediate);
  normalizeWeights(glConfig);
  return glConfig;
}
)};

const _16 = function layouts(dslExamples,parseGoldenDSL){return(
dslExamples.map((dsl, idx) => parseGoldenDSL(dsl))
)};

const _95 = function serializeGoldenDSL(){return(
function serializeGoldenDSL(layout) {
  function serialize(node) {
    if (node.type === "component") {
      return `${node.title}`;
    }
    let size;
    if (node.size === "1fr" || !node.size.endsWith) {
      size = "100";
    } else {
      size = node.size.endsWith("%")
        ? Math.round(node.size.slice(0, -1))
        : Math.round(node.size);
    }

    const childrenStr = (node.content || []).map(serialize).join(",");
    if (node.type === "row") {
      return `R${size}(${childrenStr})`;
    } else if (node.type === "stack") {
      return `S${size}(${childrenStr})`;
    } else if (node.type === "column") {
      return `C${size}(${childrenStr})`;
    }
    throw new Error("Unknown node type: " + node.type);
  }
  return serialize(layout);
}
)};

const _100 = function test_serializeGoldenDSL(layouts,serializeGoldenDSL){return(
layouts.map(serializeGoldenDSL)
)};

const _128 = function test_parseGoldenDSL(test_serializeGoldenDSL,parseGoldenDSL){return(
test_serializeGoldenDSL.map(parseGoldenDSL)
)};

const _57 = function listModules(_getModuleTitles,parseGoldenDSL){return(
(hash) => {
  if (!hash) return new Map();
  return new Map(
    _getModuleTitles(parseGoldenDSL(hash)).map((c) => [c.title, c])
  );
}
)};

const _55 = function _getModuleTitles(){return(
function _getModuleTitles(ast) {
  let titles = [];
  if (ast.type === "component") {
    titles.push({
      title: ast.title.split("#")[0],
      cell: ast.title.split("#")[1]
    });
  }
  if (Array.isArray(ast.content)) {
    for (const child of ast.content) {
      titles = titles.concat(_getModuleTitles(child));
    }
  }
  return titles;
}
)};

const _62 = function test_list_modules(dslExamples,listModules){return(
dslExamples.map((dsl, idx) => listModules(dsl))
)};

const _388 = function getCell(_getModuleTitles,parseGoldenDSL){return(
(hash, module) => {
  if (!hash) return undefined;
  return _getModuleTitles(parseGoldenDSL(hash));
}
)};

const _417 = function navHref(){return(
function navHref(
  target,
  {
    source = null,
    op = "open" // "open" | "close" | "focus"
  } = {}
) {
  if (typeof target === "string" && target.startsWith("#")) return target;

  const isIntent =
    typeof target === "object" &&
    target !== null &&
    ("module" in target ||
      "open" in target ||
      "close" in target ||
      "focus" in target ||
      "op" in target);

  let module = null;
  let cell = null;
  let finalOp = op;
  let finalSource = source;

  if (!isIntent) {
    const raw = String(target ?? "");
    const parts = raw.split("#");
    module = parts[0] || null;
    cell = parts[1] || null;
    finalOp = "open";
  } else {
    module =
      target.module || target.open || target.close || target.focus || null;
    cell = target.cell || null;
    finalSource = target.source ?? finalSource;
    finalOp =
      target.op || (target.close ? "close" : target.focus ? "focus" : "open");
  }

  return `#${finalOp}=${cell ? `${module}#${cell}` : module}`;
}
)};

const _397 = function isOnObservableCom(location){return(
() =>
  location.href.includes("observableusercontent.com") &&
  !location.href.includes("blob:")
)};

const _154 = function links(){return(
[
  "https://observablehq.com/@tom/foo",
  "https://observablehq.com/@tom/foo?query1#view=@tomlarkworthy/slug,@owner/page&foo=bar"
]
)};

const _156 = function targets(){return(
["@tom/bar", "d/1f41fef8b019cf4e@94", "@tom/bar#cell"]
)};

const _151 = function linkTo(isOnObservableCom)
{
    return function linkTo(target, {baseURI = document.baseURI, onObservable = isOnObservableCom(), source = null, op = 'open'    // "open" | "close" | "focus"
} = {}) {
        if (onObservable) {
            const t = typeof target === 'string' ? target : target?.module || target?.open || target?.close || '';
            return t.startsWith('#') ? t : '/' + t;
        }
        // Parse existing hash params manually to avoid percent-encoding DSL chars
        const base = new URL(baseURI);
        const rawHash = (base.hash || '#').slice(1);
        const hashParams = new Map();
        // open/close/focus/from are transient intents that lopepage consumes and
        // clears, so we do NOT deep-link them. view= is canonical layout state owned
        // by lopepage; if we baked the baseURI's view= into every link, the href
        // would be a snapshot from link-render time and clicking it would rewind the
        // layout (issue #150 — clicking a second module wiped the first because the
        // link carried the boot view=). Dropping view= here makes the link a pure
        // intent (e.g. "#cc=...&open=X"); sync_layout_from_url's
        // `if (!view && open)` branch then merges the intent into the live layout.
        const drop = new Set([
            'view',
            'open',
            'close',
            'focus',
            'from'
        ]);
        if (rawHash) {
            for (const part of rawHash.split('&')) {
                const eq = part.indexOf('=');
                const key = eq >= 0 ? part.slice(0, eq) : part;
                if (drop.has(key))
                    continue;
                const val = eq >= 0 ? part.slice(eq + 1) : '';
                hashParams.set(key, val);
            }
        }
        if (typeof target === 'string' && target.startsWith('#'))
            return target;
        const isIntent = typeof target === 'object' && target !== null && ('module' in target || 'open' in target || 'close' in target || 'focus' in target || 'op' in target);
        let module = null;
        let cell = null;
        if (!isIntent) {
            module = String(target ?? '');
            const parts = module.split('#');
            module = parts[0] || null;
            cell = parts[1] || null;
            op = 'open';
        } else {
            module = target.module || target.open || target.close || target.focus || null;
            cell = target.cell || null;
            source = target.source ?? source;
            op = target.op || (target.close ? 'close' : target.focus ? 'focus' : 'open');
        }
        if (!module)
            return base.toString();
        hashParams.set(op, cell ? `${ module }#${ cell }` : module);
        if (source)
            hashParams.set('from', source);
        // Build hash without URLSearchParams to preserve DSL chars unencoded.
        // Return hash-only for same-page links to avoid page reload.
        const hashStr = [...hashParams].map(([k, v]) => v ? `${ k }=${ v }` : k).join('&');
        return '#' + hashStr;
    };
}
;

const _214 = function viewof$vars(variables,runtime){return(
variables(runtime)
)};

const _159 = function test_linkTo(links,targets,linkTo){return(
links.map((link) =>
  targets.map((target) =>
    linkTo(target, { baseURI: link, onObservable: false })
  )
)
)};

const _216 = async (__variable) => {
const {runtime, variables} = await (import("./runtime-sdk").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("runtime")?.import("runtime", module);
  outputs.get("variables")?.import("variables", module);
  return {};
}));

return {runtime,variables};
};

const _282 = function href_examples(){return(
[
  "https://tomlarkworthy/import-notebook",
  "https://d/e1c39d41e8e944b0@939",
  "https://tomlarkworthy/visualizer#unorderedSync",
  "https://observablehq.com/@tomlarkworthy/robocoop",
  "https://observablehq.com/@tomlarkworthy/robocoop#on_prompt",
  "https://observablehq.com/d/936eb1bc1db1ac62",
  "@tomlarkworthy/robocoop#on_prompt"
]
)};

const _284 = function test_extractNotebookAndCell(href_examples,extractNotebookAndCell){return(
href_examples.map(extractNotebookAndCell)
)};

const _260 = function extractNotebookAndCell(){return(
function extractNotebookAndCell(href) {
  const regex =
    /^(https:\/\/(?<host>[\w.-]+)\/)?(?<nb>(@?[\w-]+\/[\w-]+|d\/[a-f0-9]+|e\/[a-f0-9]+@[0-9]+|[a-f0-9]+@[0-9]+|[\w-]+))(?:#(?<cell>[\w-]+))?$/;
  const match = href.match(regex);
  if (match && match.groups) {
    let notebook;
    if (match.groups.host === "observablehq.com") {
      notebook = match.groups.nb;
    } else {
      // For non-observablehq.com hosts, prepend the host.

      notebook = match.groups.host
        ? `${match.groups.host}/${match.groups.nb}`
        : match.groups.nb;
    }
    // Optionally, you can append an "@" to the notebook identifier later if needed,
    if (!notebook.startsWith("d/") && notebook[0] !== "@") {
      notebook = "@" + notebook;
    }

    notebook = notebook.replace(/@[0-9]+$/, "");
    return { notebook, cell: match.groups.cell || null };
  }
  return null;
}
)};

const _227 = function updateNotebookImports(vars,extractNotebookAndCell,linkTo)
{
  for (const variable of vars) {
    let import_dom;
    if (
      (import_dom = variable?._observer?._node?.firstChild) &&
      import_dom?.classList?.contains("observablehq--import")
    ) {
      import_dom.querySelectorAll("[href]").forEach((link) => {
        const extracted = extractNotebookAndCell(link.href);
        if (extracted) {
          link.href = linkTo(extracted.notebook);
        }
      });
    }
  }
}
;

const _323 = async (__variable) => {
const {tests} = await (import("./tests").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("tests")?.import("tests", module);
  return {};
}));

return {tests};
};

const _435 = function convertToGoldenLayout()
{
  return function convertToGoldenLayout(intermediate) {
    // Convert a module to a component.
    function convertModule(item) {
      return {
        type: 'component',
        title: item.slug,
        weight: item.weight,
        size: '1fr',
        id: '',
        maximised: false,
        isClosable: true,
        reorderEnabled: true,
        componentType: 'module',
        componentState: {}
      };
    }
    // Convert an item (module or group).
    function convertItem(item) {
      if (item.nodeType === 'module') {
        return convertModule(item);
      } else if (item.nodeType === 'group') {
        if (item.groupType === 'S') {
          return {
            type: 'stack',
            content: item.children.map(convertItem),
            weight: item.weight,
            id: '',
            maximised: false,
            isClosable: true,
            activeItemIndex: 0,
            size: '1fr'
          };
        }
        let containerType = item.groupType === 'R' ? 'row' : 'column';
        // Golden-Layout 2.x requires components to live inside a stack
        return {
          type: containerType,
          weight: item.weight,
          content: item.children.map(child => {
            if (child.nodeType === 'module') {
              return {
                type: 'stack',
                content: [convertModule(child)],
                weight: child.weight,
                id: '',
                maximised: false,
                isClosable: true,
                activeItemIndex: 0,
                size: '1fr'
              };
            }
            return convertItem(child);
          }),
          id: '',
          isClosable: true
        };
      }
      throw new Error('Unknown node type: ' + item.nodeType);
    }
    return convertItem(intermediate);
  };
}
;

const _436 = function test_bareModulesWrappedInRC(convertToGoldenLayout,parseViewDSL){return(
(() => {
  const types = node => (node.content || []).map(c => c.type);
  const cases = [
    {
      dsl: 'R100(@a, S50(@b))',
      wantRoot: 'row',
      wantChildTypes: [
        'stack',
        'stack'
      ]
    },
    {
      dsl: 'C100(@a, @b)',
      wantRoot: 'column',
      wantChildTypes: [
        'stack',
        'stack'
      ]
    },
    {
      dsl: 'R100(@a, R50(@b, @c))',
      wantRoot: 'row',
      wantChildTypes: [
        'stack',
        'row'
      ]
    },
    {
      dsl: 'S100(@a, @b)',
      wantRoot: 'stack',
      wantChildTypes: [
        'component',
        'component'
      ]
    }
  ];
  for (const {dsl, wantRoot, wantChildTypes} of cases) {
    const got = convertToGoldenLayout(parseViewDSL(dsl));
    if (got.type !== wantRoot)
      throw new Error(`${ dsl }: root ${ got.type } != ${ wantRoot }`);
    const gotTypes = types(got);
    if (gotTypes.join(',') !== wantChildTypes.join(','))
      throw new Error(`${ dsl }: children [${ gotTypes }] != [${ wantChildTypes }]`);
  }
  return 'ok';
})()
)};

const _440 = function(md){return(
md`## navigate

Follow a link built by \`linkTo\`/\`navHref\`. Assigning to \`location.hash\` looks equivalent and is,
until the page is a fork: a notebook opened from exporter-3's **Fork** lives on \`blob:null\`, an
opaque origin where fragment navigation is silently dropped, so the intent is lost and nothing
happens. The History API works there, but fires no \`hashchange\` of its own, so this announces the
change itself. Write hash intents through here rather than through \`location\`.`
)};

const _439 = function navigate(){return(
function navigate(href) {
  const target = String(href ?? "");
  // Not a fragment (an Observable path, an absolute URL): a real navigation, which works anywhere.
  if (!target.startsWith("#")) {
    window.location.href = target || "#";
    return false;
  }
  window.history.pushState(null, "", target);
  window.dispatchEvent(new window.HashChangeEvent("hashchange"));
  return true;
}
)};

export default function define(runtime) {
  const main = runtime.module();
  main.define("cell 330", ["tests"], _330);
  main.define("dslExamples", [], _13);
  main.define("parseViewDSL", [], _5);
  main.define("cell 79", [], _79);
  main.define("test_parseViewDSL", ["dslExamples","parseViewDSL"], _36);
  main.define("test_reserialized", ["dslExamples","convertToGoldenLayout","parseViewDSL"], _38);
  main.define("normalizeWeights", [], _9);
  main.define("parseGoldenDSL", ["parseViewDSL","convertToGoldenLayout","normalizeWeights"], _11);
  main.define("layouts", ["dslExamples","parseGoldenDSL"], _16);
  main.define("serializeGoldenDSL", [], _95);
  main.define("test_serializeGoldenDSL", ["layouts","serializeGoldenDSL"], _100);
  main.define("test_parseGoldenDSL", ["test_serializeGoldenDSL","parseGoldenDSL"], _128);
  main.define("listModules", ["_getModuleTitles","parseGoldenDSL"], _57);
  main.define("_getModuleTitles", [], _55);
  main.define("test_list_modules", ["dslExamples","listModules"], _62);
  main.define("getCell", ["_getModuleTitles","parseGoldenDSL"], _388);
  main.define("navHref", [], _417);
  main.define("isOnObservableCom", ["location"], _397);
  main.define("links", [], _154);
  main.define("targets", [], _156);
  main.define("linkTo", ["isOnObservableCom"], _151);
  main.define("viewof vars", ["variables","runtime"], _214);
  main.define("vars", ["Generators", "viewof vars"], (G, _) => G.input(_));
  main.define("test_linkTo", ["links","targets","linkTo"], _159);
  main.define("cell 216", ["@variable"], _216);
  main.define("runtime", ["cell 216"], (_) => _.runtime);
  main.define("variables", ["cell 216"], (_) => _.variables);
  main.define("href_examples", [], _282);
  main.define("test_extractNotebookAndCell", ["href_examples","extractNotebookAndCell"], _284);
  main.define("extractNotebookAndCell", [], _260);
  main.define("updateNotebookImports", ["vars","extractNotebookAndCell","linkTo"], _227);
  main.define("cell 323", ["@variable"], _323);
  main.define("tests", ["cell 323"], (_) => _.tests);
  main.define("convertToGoldenLayout", [], _435);
  main.define("test_bareModulesWrappedInRC", ["convertToGoldenLayout","parseViewDSL"], _436);
  main.define("cell 440", ["md"], _440);
  main.define("navigate", [], _439);
  return main;
}
