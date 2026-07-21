const _1g7wjzc = function _1(md){return(
md`# lopepage urls`
)};
const _1hsbxxe = function _2(md){return(
md`## Tests`
)};
const _1buq9dd = function _3(tests){return(
tests()
)};
const _5m77lz = function _dslExamples(){return(
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
const _2cnj2o = function _parseViewDSL(){return(
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
const _1d8nta8 = function _6(){return(
"SRC".includes("S")
)};
const _1v8gzuh = function _test_parseViewDSL(dslExamples,parseViewDSL){return(
dslExamples.map((dsl, idx) => parseViewDSL(dsl))
)};
const _y0dnb4 = function _test_reserialized(dslExamples,convertToGoldenLayout,parseViewDSL){return(
dslExamples.map((dsl, idx) =>
  convertToGoldenLayout(parseViewDSL(dsl))
)
)};
const _krxfrx = function _normalizeWeights(){return(
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
const _1xjlhra = function _parseGoldenDSL(parseViewDSL,convertToGoldenLayout,normalizeWeights){return(
function parseGoldenDSL(dsl) {
  const intermediate = parseViewDSL(dsl);
  const glConfig = convertToGoldenLayout(intermediate);
  normalizeWeights(glConfig);
  return glConfig;
}
)};
const _zhsr87 = function _layouts(dslExamples,parseGoldenDSL){return(
dslExamples.map((dsl, idx) => parseGoldenDSL(dsl))
)};
const _1cwof58 = function _12(md){return(
md`## Serialization`
)};
const _99c7dq = function _serializeGoldenDSL(){return(
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
const _1famjgd = function _test_serializeGoldenDSL(layouts,serializeGoldenDSL){return(
layouts.map(serializeGoldenDSL)
)};
const _13bri8r = function _test_parseGoldenDSL(test_serializeGoldenDSL,parseGoldenDSL){return(
test_serializeGoldenDSL.map(parseGoldenDSL)
)};
const _1sbnk2m = function _16(md){return(
md`## Flat listModules`
)};
const _u6m5s3 = function _listModules(_getModuleTitles,parseGoldenDSL){return(
(hash) => {
  if (!hash) return new Map();
  return new Map(
    _getModuleTitles(parseGoldenDSL(hash)).map((c) => [c.title, c])
  );
}
)};
const _gp1gp2 = function __getModuleTitles(){return(
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
const _1dpn90d = function _test_list_modules(dslExamples,listModules){return(
dslExamples.map((dsl, idx) => listModules(dsl))
)};
const _1utiv07 = function _20(md){return(
md`## Get cell`
)};
const _zzaa1z = function _getCell(_getModuleTitles,parseGoldenDSL){return(
(hash, module) => {
  if (!hash) return undefined;
  return _getModuleTitles(parseGoldenDSL(hash));
}
)};
const _1c5mz8f = function _22(md){return(
md`## navHref`
)};
const _pguvk3 = function _23(navHref,htl){return(
htl.html`<a href="${navHref("foo$ref")}">nav</a>`
)};
const _1buu6oo = function _navHref(){return(
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
const _1b41ote = function _25(md){return(
md`## Add linkTo`
)};
const _1xjzq9r = function _isOnObservableCom(location){return(
() =>
  location.href.includes("observableusercontent.com") &&
  !location.href.includes("blob:")
)};
const _gxaxgb = function _links(){return(
[
  "https://observablehq.com/@tom/foo",
  "https://observablehq.com/@tom/foo?query1#view=@tomlarkworthy/slug,@owner/page&foo=bar"
]
)};
const _17e89y0 = function _targets(){return(
["@tom/bar", "d/1f41fef8b019cf4e@94", "@tom/bar#cell"]
)};
const _bsoqwx = function _linkTo(isOnObservableCom)
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
};
const _jdyayh = function _vars(variables,runtime){return(
variables(runtime)
)};
const _mfvz6q = (G, _) => G.input(_);
const _1f44wsz = function _test_linkTo(links,targets,linkTo){return(
links.map((link) =>
  targets.map((target) =>
    linkTo(target, { baseURI: link, onObservable: false })
  )
)
)};
const _1pvanzz = function _32(md){return(
md`## Auto switch to url structure

Watch the runtime for imports and swap them for our structure`
)};
const _1gllckt = function _href_examples(){return(
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
const _133ucsn = function _test_extractNotebookAndCell(href_examples,extractNotebookAndCell){return(
href_examples.map(extractNotebookAndCell)
)};
const _cb1ope = function _extractNotebookAndCell(){return(
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
const _1xxtf0r = function _updateNotebookImports(vars,extractNotebookAndCell,linkTo)
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
};
const _hndgd1 = function _convertToGoldenLayout()
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
};
const _1uzvyu = function _test_bareModulesWrappedInRC(convertToGoldenLayout,parseViewDSL){return(
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

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));  
  $def("_1g7wjzc", null, ["md"], _1g7wjzc);  
  $def("_1hsbxxe", null, ["md"], _1hsbxxe);  
  $def("_1buq9dd", null, ["tests"], _1buq9dd);  
  $def("_5m77lz", "dslExamples", [], _5m77lz);  
  $def("_2cnj2o", "parseViewDSL", [], _2cnj2o);  
  $def("_1d8nta8", null, [], _1d8nta8);  
  $def("_1v8gzuh", "test_parseViewDSL", ["dslExamples","parseViewDSL"], _1v8gzuh);  
  $def("_y0dnb4", "test_reserialized", ["dslExamples","convertToGoldenLayout","parseViewDSL"], _y0dnb4);  
  $def("_krxfrx", "normalizeWeights", [], _krxfrx);  
  $def("_1xjlhra", "parseGoldenDSL", ["parseViewDSL","convertToGoldenLayout","normalizeWeights"], _1xjlhra);  
  $def("_zhsr87", "layouts", ["dslExamples","parseGoldenDSL"], _zhsr87);  
  $def("_1cwof58", null, ["md"], _1cwof58);  
  $def("_99c7dq", "serializeGoldenDSL", [], _99c7dq);  
  $def("_1famjgd", "test_serializeGoldenDSL", ["layouts","serializeGoldenDSL"], _1famjgd);  
  $def("_13bri8r", "test_parseGoldenDSL", ["test_serializeGoldenDSL","parseGoldenDSL"], _13bri8r);  
  $def("_1sbnk2m", null, ["md"], _1sbnk2m);  
  $def("_u6m5s3", "listModules", ["_getModuleTitles","parseGoldenDSL"], _u6m5s3);  
  $def("_gp1gp2", "_getModuleTitles", [], _gp1gp2);  
  $def("_1dpn90d", "test_list_modules", ["dslExamples","listModules"], _1dpn90d);  
  $def("_1utiv07", null, ["md"], _1utiv07);  
  $def("_zzaa1z", "getCell", ["_getModuleTitles","parseGoldenDSL"], _zzaa1z);  
  $def("_1c5mz8f", null, ["md"], _1c5mz8f);  
  $def("_pguvk3", null, ["navHref","htl"], _pguvk3);  
  $def("_1buu6oo", "navHref", [], _1buu6oo);  
  $def("_1b41ote", null, ["md"], _1b41ote);  
  $def("_1xjzq9r", "isOnObservableCom", ["location"], _1xjzq9r);  
  $def("_gxaxgb", "links", [], _gxaxgb);  
  $def("_17e89y0", "targets", [], _17e89y0);  
  $def("_bsoqwx", "linkTo", ["isOnObservableCom"], _bsoqwx);  
  $def("_jdyayh", "viewof vars", ["variables","runtime"], _jdyayh);  
  $def("_mfvz6q", "vars", ["Generators","viewof vars"], _mfvz6q);  
  $def("_1f44wsz", "test_linkTo", ["links","targets","linkTo"], _1f44wsz);  
  $def("_1pvanzz", null, ["md"], _1pvanzz);  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("variables", _));  
  $def("_1gllckt", "href_examples", [], _1gllckt);  
  $def("_133ucsn", "test_extractNotebookAndCell", ["href_examples","extractNotebookAndCell"], _133ucsn);  
  $def("_cb1ope", "extractNotebookAndCell", [], _cb1ope);  
  $def("_1xxtf0r", "updateNotebookImports", ["vars","extractNotebookAndCell","linkTo"], _1xxtf0r);  
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));  
  $def("_hndgd1", "convertToGoldenLayout", [], _hndgd1);  
  $def("_1uzvyu", "test_bareModulesWrappedInRC", ["convertToGoldenLayout","parseViewDSL"], _1uzvyu);
  return main;
}