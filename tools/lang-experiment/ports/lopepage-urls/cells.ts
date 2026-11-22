// Port of @tomlarkworthy/lopepage-urls: the checked cells. See MAP.md for the cell-by-cell mapping.

type ModuleNode = { readonly nodeType: "module"; readonly weight: number | null; readonly slug: string };
type GroupNode = {
  readonly nodeType: "group";
  readonly groupType: string;
  readonly weight: number | null;
  readonly children: readonly ViewNode[];
};
type ViewNode = ModuleNode | GroupNode;

// Golden-layout config, before and after normalizeWeights.
type GLNode = {
  readonly type: string;
  readonly title?: string;
  readonly weight?: number | null;
  readonly size?: string | number;
  readonly content?: readonly GLNode[];
  readonly id?: string;
  readonly maximised?: boolean;
  readonly isClosable?: boolean;
  readonly reorderEnabled?: boolean;
  readonly componentType?: string;
  readonly componentState?: {};
  readonly activeItemIndex?: number;
};

type ModuleTitle = { readonly title: string; readonly cell: string | undefined };
type NavIntent = {
  readonly module?: string;
  readonly open?: string;
  readonly close?: string;
  readonly focus?: string;
  readonly op?: string;
  readonly cell?: string;
  readonly source?: string | null;
};
type NavTarget = string | NavIntent | null | undefined;
type LinkOpts = {
  readonly baseURI: string;
  readonly onObservable: boolean;
  readonly source?: string | null;
  readonly op?: string;
};
type Cursor = { i: number };

let dslExamples = () => [
  "view=200@tomlarkworthy/slug,25@owner/page#cell",
  "view=@tomlarkworthy/slug,@owner/page",
  "view=C(@tomlarkworthy/slug,@owner/page)",
  "view=45@tomlarkworthy/slug,56@owner/page",
  "view=@tomlarkworthy/slug,R32(@owner/page,@owner/page2)",
  "view=200@tomlarkworthy/slug,25@owner/page",
  "C100(S50(@tomlarkworthy/module-selection),S50(@tomlarkworthy/dom-view))",
  "d/1f41fef8b019cf4e@94",
  "view=C100(S50(@tomlarkworthy/cells-to-clipboard,@tomlarkworthy/module-selection),S50(@tomlarkworthy/module-selection))",
  "R100(C50(S50(@tomlarkworthy/module-selection),S50(@tomlarkworthy/editor)),S50(@tomlarkworthy/svg-boinger))",
];

// The original closes over `let i`; nested functions may not assign a captured let, so the
// position is a Mut cursor passed explicitly to each helper.
let parseViewDSL = () =>
  function parseViewDSL(raw: string): GroupNode {
    if (!raw)
      return {
        nodeType: "group",
        groupType: "S",
        weight: null,
        children: [],
      };
    const input = raw.startsWith("view=") ? raw.slice(5) : raw;
    function err(c: Mut<Cursor>, msg: string): never {
      throw new Error(msg + " at pos " + c.i + " for " + input);
    }
    function parseNumber(c: Mut<Cursor>): number | null {
      const start = c.i;
      while (c.i < input.length && /[0-9]/.test(input[c.i])) {
        c.i++;
      }
      if (start === c.i) return null;
      return parseInt(input.slice(start, c.i), 10);
    }
    function parseModule(c: Mut<Cursor>): ModuleNode {
      const weight = parseNumber(c); // optional
      if (input[c.i] == "@") {
        c.i++; // consume '@'
        const start = c.i;
        // Read slug until a comma or closing parenthesis.
        while (c.i < input.length && input[c.i] !== "," && input[c.i] !== ")") {
          c.i++;
        }
        const slug = "@" + input.slice(start, c.i).trim();
        return { nodeType: "module", weight, slug };
      } else if (input[c.i] == "d" && input[c.i + 1] == "/") {
        const start = c.i;
        let amp = Number.MAX_VALUE;
        while (c.i < input.length && input[c.i] !== "," && input[c.i] !== ")") {
          if (input[c.i] === "@") amp = c.i;
          c.i++;
        }
        const slug = input.slice(start, Math.min(amp, c.i)).trim();
        return { nodeType: "module", weight, slug };
      } else {
        return err(c, `Expected ${input[c.i]}`);
      }
    }
    function parseGroup(c: Mut<Cursor>): GroupNode {
      const groupType = "SCR".includes(input[c.i]) ? input[c.i++] : "S";
      const weight = parseNumber(c);
      if (input[c.i] == "(") c.i++; // skip '('
      const children = parseList(c);
      if (input[c.i] == ")") c.i++; // skip ')'
      return { nodeType: "group", groupType, weight, children };
    }
    function parseItem(c: Mut<Cursor>): ViewNode {
      while (c.i < input.length && /\s/.test(input[c.i])) c.i++;
      if (c.i < input.length && "SCR".includes(input[c.i])) {
        return parseGroup(c);
      } else if (
        c.i < input.length &&
        (input[c.i] === "@" || /[0-9]/.test(input[c.i]) || (input[c.i] === "d" && input[c.i + 1] === "/"))
      ) {
        return parseModule(c);
      } else {
        return err(c, "Unexpected character: " + input[c.i]);
      }
    }
    function parseList(c: Mut<Cursor>): ViewNode[] {
      const items: Mut<ViewNode[]> = [];
      while (c.i < input.length && input[c.i] !== ")") {
        while (c.i < input.length && /\s/.test(input[c.i])) c.i++;
        items.push(parseItem(c));
        while (c.i < input.length && /\s/.test(input[c.i])) c.i++;
        if (c.i < input.length && input[c.i] === ",") {
          c.i++; // skip comma
        } else {
          break;
        }
      }
      return items;
    }
    const cursor: Mut<Cursor> = { i: 0 };
    const ast = parseGroup(cursor);
    while (cursor.i < input.length && /\s/.test(input[cursor.i])) cursor.i++;
    if (cursor.i < input.length) err(cursor, "Unexpected input remaining");
    return ast;
  };

let _6 = () => "SRC".includes("S");

let test_parseViewDSL = (dslExamples, parseViewDSL) => dslExamples.map((dsl, idx) => parseViewDSL(dsl));

let test_reserialized = (dslExamples, convertToGoldenLayout, parseViewDSL) =>
  dslExamples.map((dsl, idx) => convertToGoldenLayout(parseViewDSL(dsl)));

// The original mutates the config in place (sets size, deletes weight) and returns undefined.
// This returns a new config with the same keys in the same order.
let normalizeWeights = () => {
  const withoutWeight = (n: GLNode): GLNode => {
    const { weight, ...rest } = n;
    return rest;
  };
  return function normalizeWeights(node: GLNode): GLNode {
    const content = node.content;
    let out = node;
    if (content && content.length > 0) {
      let total = 0;
      for (const child of content) {
        total += child.weight || 100.0 / content.length;
      }
      const sized = content.map((child) => {
        const w = child.weight || 100.0 / content.length;
        return normalizeWeights({ ...withoutWeight(child), size: ((w / total) * 100).toFixed(2) + "%" });
      });
      out = { ...node, content: sized };
    }
    if (!out.size) {
      out = { ...withoutWeight(out), size: "1fr" };
    }
    return out;
  };
};

let parseGoldenDSL = (parseViewDSL, convertToGoldenLayout, normalizeWeights) =>
  function parseGoldenDSL(dsl: string): GLNode {
    const intermediate = parseViewDSL(dsl);
    const glConfig = convertToGoldenLayout(intermediate);
    return normalizeWeights(glConfig);
  };

let layouts = (dslExamples, parseGoldenDSL) => dslExamples.map((dsl, idx) => parseGoldenDSL(dsl));

let serializeGoldenDSL = () =>
  function serializeGoldenDSL(layout: GLNode): string {
    function serialize(node: GLNode): string {
      if (node.type === "component") {
        return `${node.title}`;
      }
      const s = node.size;
      // The original reads node.size.endsWith and throws a TypeError when size is missing.
      if (s === undefined) throw new TypeError("node.size is undefined");
      const size =
        s === "1fr" || typeof s !== "string"
          ? "100"
          : s.endsWith("%")
            ? Math.round(Number(s.slice(0, -1)))
            : Math.round(Number(s));

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
  };

let test_serializeGoldenDSL = (layouts, serializeGoldenDSL) => layouts.map(serializeGoldenDSL);

let test_parseGoldenDSL = (test_serializeGoldenDSL, parseGoldenDSL) => test_serializeGoldenDSL.map(parseGoldenDSL);

let listModules = (_getModuleTitles, parseGoldenDSL) => (hash: string) => {
  if (!hash) return new Map<string, ModuleTitle>();
  return new Map(_getModuleTitles(parseGoldenDSL(hash)).map((c): [string, ModuleTitle] => [c.title, c]));
};

let _getModuleTitles = () =>
  function getModuleTitles(ast: GLNode): ModuleTitle[] {
    const title = ast.title;
    // The original reads ast.title.split and throws a TypeError when title is missing.
    if (ast.type === "component" && title === undefined) throw new TypeError("ast.title is undefined");
    const own: ModuleTitle[] =
      ast.type === "component" && title !== undefined
        ? [{ title: title.split("#")[0], cell: title.split("#")[1] }]
        : [];
    const kids = Array.isArray(ast.content) ? ast.content.flatMap(getModuleTitles) : [];
    return [...own, ...kids];
  };

let test_list_modules = (dslExamples, listModules) => dslExamples.map((dsl, idx) => listModules(dsl));

let getCell = (_getModuleTitles, parseGoldenDSL) => (hash: string, module?: string) => {
  if (!hash) return undefined;
  return _getModuleTitles(parseGoldenDSL(hash));
};

let navHref = () =>
  function navHref(
    target: NavTarget,
    {
      source = null,
      op = "open", // "open" | "close" | "focus"
    }: { readonly source?: string | null; readonly op?: string } = {},
  ): string {
    if (typeof target === "string" && target.startsWith("#")) return target;

    const intent =
      typeof target === "object" &&
      target !== null &&
      ("module" in target || "open" in target || "close" in target || "focus" in target || "op" in target)
        ? target
        : null;

    let module: string | null = null;
    let cell: string | null = null;
    let finalOp = op;
    let finalSource = source;

    if (intent === null) {
      const raw = String(target ?? "");
      const parts = raw.split("#");
      module = parts[0] || null;
      cell = parts[1] || null;
      finalOp = "open";
    } else {
      module = intent.module || intent.open || intent.close || intent.focus || null;
      cell = intent.cell || null;
      finalSource = intent.source ?? finalSource;
      finalOp = intent.op || (intent.close ? "close" : intent.focus ? "focus" : "open");
    }

    return `#${finalOp}=${cell ? `${module}#${cell}` : module}`;
  };

let links = () => [
  "https://observablehq.com/@tom/foo",
  "https://observablehq.com/@tom/foo?query1#view=@tomlarkworthy/slug,@owner/page&foo=bar",
];

let targets = () => ["@tom/bar", "d/1f41fef8b019cf4e@94", "@tom/bar#cell"];

// linkTo's body with its two world-reading defaults (document.baseURI, isOnObservableCom())
// made required. The shell cell linkTo supplies them and calls this.
let linkToWith = (parseUrl) =>
  function linkTo(target: NavTarget, { baseURI, onObservable, source = null, op = "open" }: LinkOpts): string {
    if (onObservable) {
      const t = typeof target === "string" ? target : target?.module || target?.open || target?.close || "";
      return t.startsWith("#") ? t : "/" + t;
    }
    // Parse existing hash params manually to avoid percent-encoding DSL chars
    const base = parseUrl(baseURI);
    const rawHash = (base.hash || "#").slice(1);
    const hashParams = new Map<string, string>();
    // open/close/focus/from are transient intents that lopepage consumes and clears; view= is
    // canonical layout state owned by lopepage (issue #150). None of them is deep-linked.
    const drop = new Set(["view", "open", "close", "focus", "from"]);
    if (rawHash) {
      for (const part of rawHash.split("&")) {
        const eq = part.indexOf("=");
        const key = eq >= 0 ? part.slice(0, eq) : part;
        if (drop.has(key)) continue;
        const val = eq >= 0 ? part.slice(eq + 1) : "";
        hashParams.set(key, val);
      }
    }
    if (typeof target === "string" && target.startsWith("#")) return target;
    const intent =
      typeof target === "object" &&
      target !== null &&
      ("module" in target || "open" in target || "close" in target || "focus" in target || "op" in target)
        ? target
        : null;
    let module: string | null = null;
    let cell: string | null = null;
    if (intent === null) {
      module = String(target ?? "");
      const parts = module.split("#");
      module = parts[0] || null;
      cell = parts[1] || null;
      op = "open";
    } else {
      module = intent.module || intent.open || intent.close || intent.focus || null;
      cell = intent.cell || null;
      source = intent.source ?? source;
      op = intent.op || (intent.close ? "close" : intent.focus ? "focus" : "open");
    }
    if (!module) return base.href;
    hashParams.set(op, cell ? `${module}#${cell}` : module);
    if (source) hashParams.set("from", source);
    // Build hash without URLSearchParams to preserve DSL chars unencoded.
    // Return hash-only for same-page links to avoid page reload.
    const hashStr = [...hashParams].map(([k, v]) => (v ? `${k}=${v}` : k)).join("&");
    return "#" + hashStr;
  };

let test_linkTo = (links, targets, linkToWith) =>
  links.map((link) => targets.map((target) => linkToWith(target, { baseURI: link, onObservable: false })));

let href_examples = () => [
  "https://tomlarkworthy/import-notebook",
  "https://d/e1c39d41e8e944b0@939",
  "https://tomlarkworthy/visualizer#unorderedSync",
  "https://observablehq.com/@tomlarkworthy/robocoop",
  "https://observablehq.com/@tomlarkworthy/robocoop#on_prompt",
  "https://observablehq.com/d/936eb1bc1db1ac62",
  "@tomlarkworthy/robocoop#on_prompt",
];

let test_extractNotebookAndCell = (href_examples, extractNotebookAndCell) =>
  href_examples.map(extractNotebookAndCell);

let extractNotebookAndCell = () =>
  function extractNotebookAndCell(href: string): { readonly notebook: string; readonly cell: string | null } | null {
    const regex =
      /^(https:\/\/(?<host>[\w.-]+)\/)?(?<nb>(@?[\w-]+\/[\w-]+|d\/[a-f0-9]+|e\/[a-f0-9]+@[0-9]+|[a-f0-9]+@[0-9]+|[\w-]+))(?:#(?<cell>[\w-]+))?$/;
    const match = href.match(regex);
    if (match && match.groups) {
      let notebook: string;
      if (match.groups.host === "observablehq.com") {
        notebook = match.groups.nb;
      } else {
        // For non-observablehq.com hosts, prepend the host.
        notebook = match.groups.host ? `${match.groups.host}/${match.groups.nb}` : match.groups.nb;
      }
      if (!notebook.startsWith("d/") && notebook[0] !== "@") {
        notebook = "@" + notebook;
      }

      notebook = notebook.replace(/@[0-9]+$/, "");
      return { notebook, cell: match.groups.cell || null };
    }
    return null;
  };

let convertToGoldenLayout = () =>
  function convertToGoldenLayout(intermediate: ViewNode): GLNode {
    // Convert a module to a component.
    function convertModule(item: ModuleNode): GLNode {
      return {
        type: "component",
        title: item.slug,
        weight: item.weight,
        size: "1fr",
        id: "",
        maximised: false,
        isClosable: true,
        reorderEnabled: true,
        componentType: "module",
        componentState: {},
      };
    }
    // Convert an item (module or group).
    function convertItem(item: ViewNode): GLNode {
      const nodeType: string = item.nodeType;
      if (item.nodeType === "module") {
        return convertModule(item);
      } else if (item.nodeType === "group") {
        if (item.groupType === "S") {
          return {
            type: "stack",
            content: item.children.map(convertItem),
            weight: item.weight,
            id: "",
            maximised: false,
            isClosable: true,
            activeItemIndex: 0,
            size: "1fr",
          };
        }
        const containerType = item.groupType === "R" ? "row" : "column";
        // Golden-Layout 2.x requires components to live inside a stack
        return {
          type: containerType,
          weight: item.weight,
          content: item.children.map((child) => {
            if (child.nodeType === "module") {
              return {
                type: "stack",
                content: [convertModule(child)],
                weight: child.weight,
                id: "",
                maximised: false,
                isClosable: true,
                activeItemIndex: 0,
                size: "1fr",
              };
            }
            return convertItem(child);
          }),
          id: "",
          isClosable: true,
        };
      }
      throw new Error("Unknown node type: " + nodeType);
    }
    return convertItem(intermediate);
  };

let test_bareModulesWrappedInRC = (convertToGoldenLayout, parseViewDSL) =>
  (() => {
    const types = (node: GLNode) => (node.content || []).map((c) => c.type);
    const cases = [
      { dsl: "R100(@a, S50(@b))", wantRoot: "row", wantChildTypes: ["stack", "stack"] },
      { dsl: "C100(@a, @b)", wantRoot: "column", wantChildTypes: ["stack", "stack"] },
      { dsl: "R100(@a, R50(@b, @c))", wantRoot: "row", wantChildTypes: ["stack", "row"] },
      { dsl: "S100(@a, @b)", wantRoot: "stack", wantChildTypes: ["component", "component"] },
    ];
    for (const { dsl, wantRoot, wantChildTypes } of cases) {
      const got = convertToGoldenLayout(parseViewDSL(dsl));
      if (got.type !== wantRoot) throw new Error(`${dsl}: root ${got.type} != ${wantRoot}`);
      const gotTypes = types(got);
      if (gotTypes.join(",") !== wantChildTypes.join(","))
        throw new Error(`${dsl}: children [${gotTypes}] != [${wantChildTypes}]`);
    }
    return "ok";
  })();
