const _vyza3y = function _title(md){return(
md`# Code Metrics

Cell-by-cell code-health metrics for every named variable in the user-authored modules of this runtime — find refactor candidates by sorting on the **Maintainability Index** (lower = worse).

**Metrics** — LOC, cyclomatic complexity, cognitive complexity, max nesting, Halstead volume / difficulty, fan-in, fan-out, MI.`
)};
const _8nt6z2 = function _metricsChart(metricsRows,htl,Plot,linkTo)
{
    if (!metricsRows.length)
        return htl.html`<em>No data.</em>`;
    return Plot.plot({
        width: 720,
        height: 420,
        marginLeft: 50,
        marginBottom: 40,
        grid: true,
        x: {
            label: 'Lines of code \u2192',
            type: 'log'
        },
        y: {
            label: '\u2191 Cyclomatic complexity',
            type: 'log'
        },
        color: {
            label: 'Maintainability Index',
            type: 'linear',
            scheme: 'RdYlGn',
            domain: [
                20,
                85
            ],
            legend: true
        },
        r: {
            range: [
                2,
                14
            ],
            domain: [
                0,
                30
            ]
        },
        marks: [
            Plot.ruleY([10], {
                stroke: '#e11',
                strokeDasharray: '3,3',
                strokeOpacity: 0.6
            }),
            Plot.dot(metricsRows, {
                x: d => Math.max(d.loc, 1),
                y: d => Math.max(d.cyclomatic, 1),
                r: d => Math.max(d.fanOut, 1),
                fill: 'mi',
                stroke: '#333',
                strokeOpacity: 0.3,
                fillOpacity: 0.75,
                tip: true,
                href: d => linkTo(d.module + '#' + d.name),
                title: d => `${ d.name }  @  ${ d.module }\nMI ${ d.mi }  CC ${ d.cyclomatic }  Cog ${ d.cognitive }  Nest ${ d.nesting }\nLOC ${ d.loc }  H.Vol ${ d.vol }  H.Diff ${ d.diff }\nFan-in ${ d.fanIn }  Fan-out ${ d.fanOut }`
            })
        ]
    });
};
const _15k10yj = function _moduleFilter(Inputs,moduleStats,htl,linkTo){return(
Inputs.table(moduleStats, {
    columns: [
        'module',
        'title',
        'cells',
        'loc',
        'dependsOn',
        'dependedBy'
    ],
    header: {
        module: 'Module',
        title: 'Title',
        cells: 'Cells',
        loc: 'LOC',
        dependsOn: 'Deps\u2192',
        dependedBy: '\u2190Deps'
    },
    sort: 'loc',
    reverse: true,
    multiple: true,
    layout: 'auto',
    rows: 14,
    value: moduleStats,
    format: { module: v => htl.html`<a href="${ linkTo(v) }" target="_self">${ v }</a>` }
})
)};
const _8bwet6 = (G, _) => G.input(_);
const _1cydseu = function _summary(metricsRows,md)
{
    const total = metricsRows.length;
    if (total === 0)
        return md`_Select at least one module above._`;
    const lowMI = metricsRows.filter(r => r.mi < 65).length;
    const highCC = metricsRows.filter(r => r.cyclomatic >= 10).length;
    const deepNest = metricsRows.filter(r => r.nesting >= 4).length;
    return md`**${ total }** cells analyzed.

| Flag | Count | Threshold |
|------|-------|-----------|
| Low Maintainability Index | ${ lowMI } | MI &lt; 65 |
| High Cyclomatic Complexity | ${ highCC } | CC ≥ 10 |
| Deep Nesting | ${ deepNest } | depth ≥ 4 |
`;
};
const _13azngq = function _metricsTable(Inputs,metricsRows,htl,linkTo){return(
Inputs.table(metricsRows, {
    sort: 'mi',
    reverse: false,
    columns: [
        'mi',
        'name',
        'module',
        'loc',
        'cyclomatic',
        'cognitive',
        'nesting',
        'vol',
        'diff',
        'fanIn',
        'fanOut'
    ],
    header: {
        mi: 'MI',
        name: 'Name',
        module: 'Module',
        loc: 'LOC',
        cyclomatic: 'CC',
        cognitive: 'Cog',
        nesting: 'Nest',
        vol: 'H.Vol',
        diff: 'H.Diff',
        fanIn: 'In',
        fanOut: 'Out'
    },
    layout: 'auto',
    rows: 25,
    format: {
        name: (v, i) => {
            const row = metricsRows[i];
            return htl.html`<a href="${ linkTo(row.module) }" target="_self">${ v }</a>`;
        },
        module: v => htl.html`<a href="${ linkTo(v) }" target="_self">${ v }</a>`
    }
})
)};
const _99fyjz = (G, _) => G.input(_);
const _albbn6 = function _excludedModules(){return(
new Set([
    null,
    undefined,
    'bootloader',
    'builtin',
    '@tomlarkworthy/lopepage',
    '@tomlarkworthy/claude-code-pairing',
    '@tomlarkworthy/module-selection',
    '@tomlarkworthy/exporter-3',
    '@tomlarkworthy/exporter-2',
    '@tomlarkworthy/editor-5',
    '@tomlarkworthy/visualizer',
    '@tomlarkworthy/golden-layout-2-6-0',
    '@tomlarkworthy/inspector',
    '@tomlarkworthy/module-map',
    '@tomlarkworthy/lopepage-urls',
    '@tomlarkworthy/local-change-history',
    '@tomlarkworthy/runtime-sdk',
    '@tomlarkworthy/file-sync',
    '@tomlarkworthy/summarizejs',
    '@tomlarkworthy/observablejs-toolchain'
])
)};
const _1sdrmlf = function _moduleToName(currentModules)
{
    const map = new Map();
    for (const entry of currentModules.values()) {
        if (entry && entry.module && entry.name)
            map.set(entry.module, entry.name);
    }
    return map;
};
const _iizrk2 = function _moduleStats(currentModules,excludedModules,runtime_variables,moduleToName)
{
  const stats = new Map();
  for (const entry of currentModules.values()) {
    if (!entry || !entry.name) continue;
    if (excludedModules.has(entry.name)) continue;
    stats.set(entry.name, {
      module: entry.name,
      title: entry.title || "",
      cells: 0,
      loc: 0,
      dependsOn: (entry.dependsOn || []).length,
      dependedBy: (entry.dependedBy || []).length
    });
  }
  for (const v of runtime_variables) {
    const mod = v._module;
    if (!mod) continue;
    const name = moduleToName.get(mod);
    if (!name) continue;
    const s = stats.get(name);
    if (!s) continue;
    if (typeof v._definition !== "function" || !v._name) continue;
    s.cells++;
    let src;
    try {
      src = v._definition.toString();
    } catch (e) {
      continue;
    }
    if (!src) continue;
    for (const line of src.split("\n")) {
      const t = line.trim();
      if (t && !t.startsWith("//")) s.loc++;
    }
  }
  return [...stats.values()].sort((a, b) => b.loc - a.loc);
};
const _b985f3 = function _moduleFilterNames(moduleFilter){return(
new Set(moduleFilter.map(r => r.module))
)};
const _13aoao0 = function _allCells(runtime_variables,moduleToName,moduleFilterNames)
{
  runtime_variables;
  const out = [];
  for (const v of runtime_variables) {
    const mod = v._module;
    if (!mod) continue;
    const modName = moduleToName.get(mod);
    if (!modName) continue;
    if (!moduleFilterNames.has(modName)) continue;
    if (!v._name) continue;
    if (typeof v._definition !== "function") continue;
    if (v._name.startsWith("module ")) continue;
    out.push({
      variable: v,
      module: modName,
      name: v._name
    });
  }
  return out;
};
const _1t4wnm6 = function _parseAst(acorn){return(
def => {
    let src;
    try {
        src = def.toString();
    } catch (e) {
        return null;
    }
    if (!src || src.length === 0)
        return null;
    const opts = {
        ecmaVersion: 'latest',
        sourceType: 'script',
        allowReturnOutsideFunction: true
    };
    try {
        return acorn.parse(src, opts);
    } catch (e) {
        try {
            return acorn.parse('(' + src + ')', opts);
        } catch (e2) {
            return null;
        }
    }
}
)};
const _13yk2un = function _cyclomatic(acornWalk){return(
ast => {
    if (!ast)
        return 0;
    let cc = 1;
    acornWalk.simple(ast, {
        IfStatement() {
            cc++;
        },
        ConditionalExpression() {
            cc++;
        },
        ForStatement() {
            cc++;
        },
        ForInStatement() {
            cc++;
        },
        ForOfStatement() {
            cc++;
        },
        WhileStatement() {
            cc++;
        },
        DoWhileStatement() {
            cc++;
        },
        SwitchCase(node) {
            if (node.test)
                cc++;
        },
        CatchClause() {
            cc++;
        },
        LogicalExpression(node) {
            if (node.operator === '&&' || node.operator === '||' || node.operator === '??')
                cc++;
        }
    });
    return cc;
}
)};
const _ep9rbc = function _cognitive()
{
    const SKIP = new Set([
        'loc',
        'start',
        'end',
        'range',
        'leadingComments',
        'trailingComments'
    ]);
    function walk(node, nesting, ctx) {
        if (!node || typeof node !== 'object' || !node.type)
            return;
        let inc = 0, bumpNesting = 0;
        switch (node.type) {
        case 'IfStatement':
            inc = 1 + nesting;
            bumpNesting = 1;
            if (node.alternate && node.alternate.type !== 'IfStatement')
                ctx.score += 1;
            break;
        case 'ConditionalExpression':
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'CatchClause':
        case 'SwitchStatement':
            inc = 1 + nesting;
            bumpNesting = 1;
            break;
        case 'LogicalExpression':
            if (node.operator === '&&' || node.operator === '||' || node.operator === '??')
                inc = 1;
            break;
        case 'BreakStatement':
        case 'ContinueStatement':
            if (node.label)
                inc = 1;
            break;
        }
        ctx.score += inc;
        for (const key in node) {
            if (SKIP.has(key))
                continue;
            const child = node[key];
            if (!child)
                continue;
            if (Array.isArray(child)) {
                for (const c of child)
                    walk(c, nesting + bumpNesting, ctx);
            } else if (typeof child === 'object') {
                walk(child, nesting + bumpNesting, ctx);
            }
        }
    }
    return ast => {
        if (!ast)
            return 0;
        const ctx = { score: 0 };
        walk(ast, 0, ctx);
        return ctx.score;
    };
};
const _19dd1y6 = function _maxNesting()
{
    const SKIP = new Set([
        'loc',
        'start',
        'end',
        'range',
        'leadingComments',
        'trailingComments'
    ]);
    const NEST = new Set([
        'IfStatement',
        'ForStatement',
        'ForInStatement',
        'ForOfStatement',
        'WhileStatement',
        'DoWhileStatement',
        'SwitchStatement',
        'TryStatement',
        'CatchClause'
    ]);
    function walk(node, depth, ctx) {
        if (!node || typeof node !== 'object' || !node.type)
            return;
        const inc = NEST.has(node.type) ? 1 : 0;
        const newDepth = depth + inc;
        if (newDepth > ctx.max)
            ctx.max = newDepth;
        for (const key in node) {
            if (SKIP.has(key))
                continue;
            const child = node[key];
            if (!child)
                continue;
            if (Array.isArray(child)) {
                for (const c of child)
                    walk(c, newDepth, ctx);
            } else if (typeof child === 'object') {
                walk(child, newDepth, ctx);
            }
        }
    }
    return ast => {
        if (!ast)
            return 0;
        const ctx = { max: 0 };
        walk(ast, 0, ctx);
        return ctx.max;
    };
};
const _n0y53y = function _halstead()
{
    const SKIP = new Set([
        'loc',
        'start',
        'end',
        'range',
        'leadingComments',
        'trailingComments'
    ]);
    function bump(map, key) {
        map.set(key, (map.get(key) || 0) + 1);
    }
    function walk(node, ops, opn) {
        if (!node || typeof node !== 'object' || !node.type)
            return;
        switch (node.type) {
        case 'BinaryExpression':
        case 'AssignmentExpression':
        case 'LogicalExpression':
        case 'UpdateExpression':
        case 'UnaryExpression':
            bump(ops, node.operator);
            break;
        case 'Identifier':
            bump(opn, 'id:' + node.name);
            break;
        case 'Literal':
            bump(opn, 'lit:' + (node.raw || String(node.value)));
            break;
        case 'TemplateLiteral':
            bump(opn, 'tpl');
            break;
        case 'CallExpression':
        case 'NewExpression':
            bump(ops, 'call');
            break;
        case 'MemberExpression':
            bump(ops, '.');
            break;
        case 'IfStatement':
            bump(ops, 'if');
            break;
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
            bump(ops, 'for');
            break;
        case 'WhileStatement':
        case 'DoWhileStatement':
            bump(ops, 'while');
            break;
        case 'ReturnStatement':
            bump(ops, 'return');
            break;
        case 'ConditionalExpression':
            bump(ops, '?:');
            break;
        case 'TryStatement':
            bump(ops, 'try');
            break;
        case 'ThrowStatement':
            bump(ops, 'throw');
            break;
        }
        for (const key in node) {
            if (SKIP.has(key))
                continue;
            const child = node[key];
            if (!child)
                continue;
            if (Array.isArray(child)) {
                for (const c of child)
                    walk(c, ops, opn);
            } else if (typeof child === 'object') {
                walk(child, ops, opn);
            }
        }
    }
    return ast => {
        if (!ast)
            return {
                volume: 0,
                difficulty: 0,
                vocabulary: 0,
                length: 0
            };
        const ops = new Map(), opn = new Map();
        walk(ast, ops, opn);
        const n1 = ops.size, n2 = opn.size;
        let N1 = 0, N2 = 0;
        for (const v of ops.values())
            N1 += v;
        for (const v of opn.values())
            N2 += v;
        const vocab = n1 + n2;
        const length = N1 + N2;
        const volume = vocab > 0 ? length * Math.log2(vocab) : 0;
        const difficulty = n2 === 0 ? 0 : n1 / 2 * (N2 / n2);
        return {
            volume,
            difficulty,
            vocabulary: vocab,
            length
        };
    };
};
const _1dmh67e = function _loc(){return(
source => {
    if (!source)
        return 0;
    const lines = String(source).split('\n');
    let n = 0;
    for (const line of lines) {
        const t = line.trim();
        if (t === '' || t.startsWith('//'))
            continue;
        n++;
    }
    return n;
}
)};
const _1yiwmja = function _dependentsMap(allCells)
{
    const map = new Map();
    for (const {variable} of allCells) {
        const inputs = variable._inputs || [];
        for (const input of inputs) {
            let set = map.get(input);
            if (!set) {
                set = new Set();
                map.set(input, set);
            }
            set.add(variable);
        }
    }
    return map;
};
const _m1lnh9 = function _metricsRows(allCells,parseAst,loc,cyclomatic,cognitive,maxNesting,halstead,dependentsMap)
{
    const rows = [];
    for (const {variable, module, name} of allCells) {
        let src;
        try {
            src = variable._definition.toString();
        } catch (e) {
            src = '';
        }
        const ast = parseAst(variable._definition);
        const lc = loc(src);
        const cc = cyclomatic(ast);
        const cog = cognitive(ast);
        const nest = maxNesting(ast);
        const h = halstead(ast);
        const fanIn = (variable._inputs || []).length;
        const fanOut = (dependentsMap.get(variable) || new Set()).size;
        const miRaw = 171 - 5.2 * Math.log(Math.max(h.volume, 1)) - 0.23 * cc - 16.2 * Math.log(Math.max(lc, 1));
        const mi = Math.max(0, Math.min(100, miRaw * 100 / 171));
        rows.push({
            mi: Math.round(mi),
            name,
            module,
            loc: lc,
            cyclomatic: cc,
            cognitive: cog,
            nesting: nest,
            vol: Math.round(h.volume),
            diff: Math.round(h.difficulty * 10) / 10,
            fanIn,
            fanOut
        });
    }
    rows.sort((a, b) => a.mi - b.mi);
    return rows;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/acorn-8-11-3", async () => runtime.module((await import("/@tomlarkworthy/acorn-8-11-3.js?v=4")).default));  
  $def("_vyza3y", "title", ["md"], _vyza3y);  
  $def("_8nt6z2", "metricsChart", ["metricsRows","htl","Plot","linkTo"], _8nt6z2);  
  $def("_15k10yj", "viewof moduleFilter", ["Inputs","moduleStats","htl","linkTo"], _15k10yj);  
  $def("_8bwet6", "moduleFilter", ["Generators","viewof moduleFilter"], _8bwet6);  
  $def("_1cydseu", "summary", ["metricsRows","md"], _1cydseu);  
  $def("_13azngq", "viewof metricsTable", ["Inputs","metricsRows","htl","linkTo"], _13azngq);  
  $def("_99fyjz", "metricsTable", ["Generators","viewof metricsTable"], _99fyjz);  
  main.define("acornWalk", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("acorn_walk", "acornWalk", _));  
  $def("_albbn6", "excludedModules", [], _albbn6);  
  $def("_1sdrmlf", "moduleToName", ["currentModules"], _1sdrmlf);  
  $def("_iizrk2", "moduleStats", ["currentModules","excludedModules","runtime_variables","moduleToName"], _iizrk2);  
  $def("_b985f3", "moduleFilterNames", ["moduleFilter"], _b985f3);  
  $def("_13aoao0", "allCells", ["runtime_variables","moduleToName","moduleFilterNames"], _13aoao0);  
  $def("_1t4wnm6", "parseAst", ["acorn"], _1t4wnm6);  
  $def("_13yk2un", "cyclomatic", ["acornWalk"], _13yk2un);  
  $def("_ep9rbc", "cognitive", [], _ep9rbc);  
  $def("_19dd1y6", "maxNesting", [], _19dd1y6);  
  $def("_n0y53y", "halstead", [], _n0y53y);  
  $def("_1dmh67e", "loc", [], _1dmh67e);  
  $def("_1yiwmja", "dependentsMap", ["allCells"], _1yiwmja);  
  $def("_m1lnh9", "metricsRows", ["allCells","parseAst","loc","cyclomatic","cognitive","maxNesting","halstead","dependentsMap"], _m1lnh9);  
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));  
  main.define("runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime_variables", _));  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn", _));
  return main;
}