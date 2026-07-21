const _hhata = function _anonymous(md) {return (md`# js-toolchain

Invertible compile/decompile of **Notebook Kit 2.0** (Observable Notebooks 2.0) JavaScript cell syntax — the small-footprint counterpart to \`@tomlarkworthy/observablejs-toolchain\` (classic Observable JS).

Reuses \`acorn\` + \`acorn_walk\` from \`@tomlarkworthy/acorn-8-11-3\` (no new bundles). Invariant: \`decompile(compile(src)) === src\` (modulo a single leading/trailing newline).`);};
const _vyzr35 = function _acornOptions() {return ({
    ecmaVersion: 'latest',
    sourceType: 'module'
});};
const _ysf5w8 = function _defaultGlobals() {return (new Set([
    'Array',
    'ArrayBuffer',
    'atob',
    'AudioContext',
    'Blob',
    'Boolean',
    'BigInt',
    'btoa',
    'clearInterval',
    'clearTimeout',
    'console',
    'crypto',
    'CustomEvent',
    'DataView',
    'Date',
    'decodeURI',
    'decodeURIComponent',
    'devicePixelRatio',
    'document',
    'encodeURI',
    'encodeURIComponent',
    'Error',
    'escape',
    'eval',
    'fetch',
    'File',
    'FileList',
    'FileReader',
    'Float32Array',
    'Float64Array',
    'Function',
    'Headers',
    'Image',
    'ImageData',
    'Infinity',
    'Int16Array',
    'Int32Array',
    'Int8Array',
    'Intl',
    'isFinite',
    'isNaN',
    'JSON',
    'Map',
    'Math',
    'NaN',
    'Number',
    'navigator',
    'Object',
    'observable',
    'parseFloat',
    'parseInt',
    'performance',
    'Path2D',
    'Promise',
    'Proxy',
    'RangeError',
    'ReferenceError',
    'Reflect',
    'RegExp',
    'cancelAnimationFrame',
    'requestAnimationFrame',
    'Set',
    'setInterval',
    'setTimeout',
    'String',
    'Symbol',
    'SyntaxError',
    'TextDecoder',
    'TextEncoder',
    'this',
    'TypeError',
    'Uint16Array',
    'Uint32Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'undefined',
    'unescape',
    'URIError',
    'URL',
    'WeakMap',
    'WeakSet',
    'WebSocket',
    'Worker',
    'window'
]));};
const _g7gzfl = function _syntaxError(acorn) {return (function syntaxError(message, node, input) {
    const {line, column} = acorn.getLineInfo(input, node.start);
    return new SyntaxError(`${ message } (${ line }:${ column })`);
});};
const _jeqnou = function _findAwaits(acorn_walk) {return (function findAwaits(node) {
    const nodes = [];
    acorn_walk.recursive(node, null, {
        FunctionDeclaration() {
        },
        FunctionExpression() {
        },
        ArrowFunctionExpression() {
        },
        ForOfStatement(node, state, callback) {
            if (node.await)
                nodes.push(node);
            if (node.left)
                callback(node.left, state);
            if (node.right)
                callback(node.right, state);
            if (node.body)
                callback(node.body, state);
        },
        AwaitExpression(node) {
            nodes.push(node);
        }
    });
    return nodes;
});};
const _1f9hkb8 = function _findReferences(defaultGlobals,acorn_walk,syntaxError) {return (function findReferences(node, {input, globals = defaultGlobals, filterReference = id => !globals.has(id.name), filterDeclaration = () => true} = {}) {
    const isScope = n => n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration' || n.type === 'ArrowFunctionExpression' || n.type === 'Program';
    const isBlockScope = n => n.type === 'BlockStatement' || n.type === 'SwitchStatement' || n.type === 'ForInStatement' || n.type === 'ForOfStatement' || n.type === 'ForStatement' || isScope(n);
    const locals = new Map();
    const references = [];
    const hasLocal = (n, name) => locals.get(n)?.has(name) ?? false;
    const declareLocal = (n, id) => {
        if (!filterDeclaration(id))
            return;
        const l = locals.get(n);
        if (l)
            l.add(id.name);
        else
            locals.set(n, new Set([id.name]));
    };
    const declareClass = n => {
        if (n.id)
            declareLocal(n, n.id);
    };
    function declarePattern(n, parent) {
        switch (n.type) {
        case 'Identifier':
            declareLocal(parent, n);
            break;
        case 'ObjectPattern':
            n.properties.forEach(p => declarePattern(p.type === 'Property' ? p.value : p, parent));
            break;
        case 'ArrayPattern':
            n.elements.forEach(e => e && declarePattern(e, parent));
            break;
        case 'RestElement':
            declarePattern(n.argument, parent);
            break;
        case 'AssignmentPattern':
            declarePattern(n.left, parent);
            break;
        }
    }
    const declareFunction = n => {
        n.params.forEach(p => declarePattern(p, n));
        if (n.id)
            declareLocal(n, n.id);
        if (n.type !== 'ArrowFunctionExpression')
            declareLocal(n, { name: 'arguments' });
    };
    const declareCatchClause = n => {
        if (n.param)
            declarePattern(n.param, n);
    };
    acorn_walk.ancestor(node, {
        VariableDeclaration(n, _s, parents) {
            let parent = null;
            for (let i = parents.length - 1; i >= 0 && parent === null; --i) {
                if (n.kind === 'var' ? isScope(parents[i]) : isBlockScope(parents[i]))
                    parent = parents[i];
            }
            n.declarations.forEach(d => declarePattern(d.id, parent));
        },
        FunctionDeclaration(n, _s, parents) {
            let parent = null;
            for (let i = parents.length - 2; i >= 0 && parent === null; --i) {
                if (isScope(parents[i]))
                    parent = parents[i];
            }
            if (n.id)
                declareLocal(parent, n.id);
            declareFunction(n);
        },
        FunctionExpression: declareFunction,
        ArrowFunctionExpression: declareFunction,
        ClassDeclaration(n, _s, parents) {
            let parent = null;
            for (let i = parents.length - 2; i >= 0 && parent === null; --i) {
                if (isScope(parents[i]))
                    parent = parents[i];
            }
            if (n.id)
                declareLocal(parent, n.id);
        },
        ClassExpression: declareClass,
        CatchClause: declareCatchClause,
        ImportDeclaration(n, _s, parents) {
            const root = parents[0];
            n.specifiers.forEach(s => declareLocal(root, s.local));
        }
    });
    const identifier = (n, _s, parents) => {
        const name = n.name;
        if (name === 'undefined')
            return;
        for (let i = parents.length - 2; i >= 0; --i) {
            if (hasLocal(parents[i], name))
                return;
        }
        if (filterReference(n))
            references.push(n);
    };
    acorn_walk.ancestor(node, {
        Pattern(n, _s, parents) {
            if (n.type === 'Identifier')
                identifier(n, _s, parents);
        },
        VariablePattern(n, _s, parents) {
            if (n.type === 'Identifier')
                identifier(n, _s, parents);
        },
        Identifier: identifier
    });
    if (input !== undefined) {
        const isLocalA = ({name}, parents) => {
            for (const p of parents)
                if (locals.get(p)?.has(name))
                    return true;
            return false;
        };
        function checkConst(n, parents) {
            switch (n.type) {
            case 'Identifier':
                if (isLocalA(n, parents))
                    break;
                if (references.includes(n))
                    throw syntaxError(`Assignment to external variable '${ n.name }'`, n, input);
                if (globals.has(n.name))
                    throw syntaxError(`Assignment to global '${ n.name }'`, n, input);
                break;
            case 'ArrayPattern':
                for (const e of n.elements)
                    if (e)
                        checkConst(e, parents);
                break;
            case 'ObjectPattern':
                for (const p of n.properties)
                    checkConst(p.type === 'Property' ? p.value : p, parents);
                break;
            case 'RestElement':
                checkConst(n.argument, parents);
                break;
            }
        }
        const checkConstArg = ({argument}, parents) => checkConst(argument, parents);
        const checkConstLeft = ({left}, parents) => checkConst(left, parents);
        acorn_walk.ancestor(node, {
            AssignmentExpression: checkConstLeft,
            AssignmentPattern: checkConstLeft,
            UpdateExpression: checkConstArg,
            ForOfStatement: checkConstLeft,
            ForInStatement: checkConstLeft
        });
        const checkExport = child => {
            throw syntaxError('Unexpected token \'export\'', child, input);
        };
        acorn_walk.simple(node, {
            ExportAllDeclaration: checkExport,
            ExportNamedDeclaration: checkExport
        });
    }
    return references;
});};
const _1rm347p = function _findDeclarations(defaultGlobals,syntaxError) {return (function findDeclarations(node, input) {
    const declarations = [];
    const declareLocal = n => {
        if (defaultGlobals.has(n.name) || n.name === 'arguments')
            throw syntaxError(`Global '${ n.name }' cannot be redefined`, n, input);
        declarations.push(n);
    };
    function declarePattern(n) {
        switch (n.type) {
        case 'Identifier':
            declareLocal(n);
            break;
        case 'ObjectPattern':
            n.properties.forEach(p => declarePattern(p.type === 'Property' ? p.value : p));
            break;
        case 'ArrayPattern':
            n.elements.forEach(e => e && declarePattern(e));
            break;
        case 'RestElement':
            declarePattern(n.argument);
            break;
        case 'AssignmentPattern':
            declarePattern(n.left);
            break;
        }
    }
    for (const child of node.body) {
        switch (child.type) {
        case 'VariableDeclaration':
            child.declarations.forEach(d => declarePattern(d.id));
            break;
        case 'ClassDeclaration':
        case 'FunctionDeclaration':
            declareLocal(child.id);
            break;
        case 'ImportDeclaration':
            child.specifiers.forEach(s => declareLocal(s.local));
            break;
        }
    }
    return declarations;
});};
const _u077a3 = function _parseJavaScript(acorn,acornOptions,findDeclarations,findReferences,findAwaits) {return (function parseJavaScript(input) {
    const maybeParseExpression = input => {
        const parser = new acorn.Parser(acornOptions, input, 0);
        parser.nextToken();
        try {
            const node = parser.parseExpression();
            return parser.type === acorn.tokTypes.eof ? node : null;
        } catch {
            return null;
        }
    };
    let expression = maybeParseExpression(input);
    if (expression?.type === 'ClassExpression' && expression.id)
        expression = null;
    if (expression?.type === 'FunctionExpression' && expression.id)
        expression = null;
    const body = expression ?? acorn.Parser.parse(input, acornOptions);
    return {
        body,
        declarations: expression ? null : findDeclarations(body, input),
        references: findReferences(body, { input }),
        expression: !!expression,
        async: findAwaits(body).length > 0
    };
});};
const _xz0jn5 = function _Sourcemap() {return (class Sourcemap {
    constructor(input) {
        this.input = input;
        this._edits = [];
    }
    _bisectLeft(index) {
        let lo = 0, hi = this._edits.length;
        while (lo < hi) {
            const mid = lo + hi >>> 1;
            if (this._edits[mid].start < index)
                lo = mid + 1;
            else
                hi = mid;
        }
        return lo;
    }
    _bisectRight(index) {
        let lo = 0, hi = this._edits.length;
        while (lo < hi) {
            const mid = lo + hi >>> 1;
            if (this._edits[mid].start > index)
                hi = mid;
            else
                lo = mid + 1;
        }
        return lo;
    }
    _subsume(start, end) {
        let n = 0;
        for (let i = 0; i < this._edits.length; ++i) {
            const e = this._edits[i];
            if (start <= e.start && e.end < end)
                continue;
            this._edits[n++] = e;
        }
        this._edits.length = n;
    }
    insertLeft(index, value) {
        return this.replaceLeft(index, index, value);
    }
    insertRight(index, value) {
        return this.replaceRight(index, index, value);
    }
    delete(start, end) {
        return this.replaceRight(start, end, '');
    }
    replaceLeft(start, end, value) {
        this._subsume(start, end);
        this._edits.splice(this._bisectLeft(start), 0, {
            start,
            end,
            value
        });
        return this;
    }
    replaceRight(start, end, value) {
        this._subsume(start, end);
        this._edits.splice(this._bisectRight(start), 0, {
            start,
            end,
            value
        });
        return this;
    }
    trim() {
        const input = this.input;
        if (input.startsWith('\n'))
            this.delete(0, 1);
        if (input.endsWith('\n'))
            this.delete(input.length - 1, input.length);
        return this;
    }
    toString() {
        let output = '';
        let index = 0;
        for (const {start, end, value} of this._edits) {
            if (start > index)
                output += this.input.slice(index, start);
            output += value;
            index = end;
        }
        output += this.input.slice(index);
        return output;
    }
});};
const _65qyit = function _rewriteImportDeclarations(acorn_walk) {return (function rewriteImportDeclarations(output, body) {
    const decls = [];
    acorn_walk.simple(body, {
        ImportDeclaration(node) {
            if (node.source.type === 'Literal' && typeof node.source.value === 'string')
                decls.push(node);
        }
    });
    if (decls.length === 0)
        return 0;
    const bindingPattern = node => {
        const named = [];
        let def = null, ns = null;
        for (const s of node.specifiers) {
            if (s.type === 'ImportDefaultSpecifier')
                def = s.local.name;
            else if (s.type === 'ImportNamespaceSpecifier')
                ns = s.local.name;
            else {
                const imported = s.imported.type === 'Identifier' ? s.imported.name : s.imported.value;
                named.push(imported === s.local.name ? imported : `${ imported }: ${ s.local.name }`);
            }
        }
        if (ns && !def && named.length === 0)
            return ns;
        const props = [];
        if (def)
            props.push(`default: ${ def }`);
        props.push(...named);
        return props.length ? `{${ props.join(', ') }}` : null;
    };
    const lines = [];
    for (const node of decls) {
        output.delete(node.start, node.end + (output.input[node.end] === '\n' ? 1 : 0));
        const spec = JSON.stringify(node.source.value);
        const pattern = bindingPattern(node);
        lines.push(pattern ? `const ${ pattern } = await import(${ spec });\n` : `await import(${ spec });\n`);
    }
    output.insertLeft(0, lines.join(''));
    return decls.length;
});};
const _1j4k0ta = function _derewriteImports(acorn,acornOptions) {return (function derewriteImports(source) {
    if (!/\bawait\s+import\s*\(/.test(source))
        return source;
    let program;
    try {
        program = acorn.Parser.parse(source, acornOptions);
    } catch {
        return source;
    }
    const awaitImportSpecifier = node => {
        if (node?.type !== 'AwaitExpression')
            return null;
        const arg = node.argument;
        if (arg?.type !== 'ImportExpression')
            return null;
        if (arg.source?.type !== 'Literal' || typeof arg.source.value !== 'string')
            return null;
        return arg.source.raw;
    };
    const readPattern = pattern => {
        let def = null;
        const named = [];
        for (const p of pattern.properties) {
            if (p.type !== 'Property')
                continue;
            const key = p.key.type === 'Identifier' ? p.key.name : p.key.value;
            const value = p.value.name;
            if (key === 'default')
                def = value;
            else
                named.push(key === value ? key : `${ key } as ${ value }`);
        }
        return {
            def,
            named
        };
    };
    const matchImportStatement = stmt => {
        if (stmt.type === 'ExpressionStatement') {
            const spec = awaitImportSpecifier(stmt.expression);
            return spec == null ? null : `import ${ spec }`;
        }
        if (stmt.type !== 'VariableDeclaration' || stmt.kind !== 'const' || stmt.declarations.length !== 1)
            return null;
        const d = stmt.declarations[0];
        const spec = d.init && awaitImportSpecifier(d.init);
        if (spec == null)
            return null;
        if (d.id.type === 'Identifier')
            return `const ${ d.id.name } = await import(${ spec })`;
        if (d.id.type !== 'ObjectPattern')
            return null;
        const {def, named} = readPattern(d.id);
        if (def == null && named.length === 0)
            return null;
        const clause = [
            def,
            named.length ? `{${ named.join(', ') }}` : null
        ].filter(Boolean).join(', ');
        return `import ${ clause } from ${ spec }`;
    };
    const imports = [];
    let consumed = 0;
    for (const stmt of program.body) {
        const text = matchImportStatement(stmt);
        if (text == null)
            break;
        imports.push(text);
        consumed = stmt.end;
    }
    if (imports.length === 0)
        return source;
    const rest = source.slice(consumed).replace(/^\n/, '');
    return (imports.join('\n') + (rest ? '\n' + rest : '')).replace(/\n+$/, '');
});};
const _1cj0sh = function _transpileJavaScript(parseJavaScript,Sourcemap,rewriteImportDeclarations) {return (function transpileJavaScript(input) {
    const cell = parseJavaScript(input);
    let isAsync = cell.async;
    const inputs = Array.from(new Set(cell.references.map(r => r.name)));
    const outputs = Array.from(new Set((cell.declarations ?? []).map(r => r.name)));
    const output = new Sourcemap(input).trim();
    if (rewriteImportDeclarations(output, cell.body) > 0)
        isAsync = true;
    if (cell.expression)
        output.insertLeft(0, `return (\n`);
    output.insertLeft(0, `${ isAsync ? 'async ' : '' }(${ inputs }) => {\n`);
    if (outputs.length > 0)
        output.insertRight(input.length, `\nreturn {${ outputs }};`);
    if (cell.expression)
        output.insertRight(input.length, `\n)`);
    output.insertRight(input.length, '\n}');
    const body = String(output);
    const autodisplay = cell.expression && !(inputs.includes('display') || inputs.includes('view'));
    return {
        body,
        inputs,
        outputs,
        autodisplay,
        expression: cell.expression,
        isAsync
    };
});};
const _4bxks4 = function _detranspileJavaScript(derewriteImports) {return (function detranspileJavaScript({body, inputs = [], outputs = [], expression, isAsync}) {
    const head = `${ isAsync ? 'async ' : '' }(${ inputs }) => {\n` + (expression ? `return (\n` : ``);
    let tail = `\n}`;
    if (outputs.length > 0)
        tail = `\nreturn {${ outputs }};` + tail;
    else if (expression)
        tail = `\n)` + tail;
    if (!body.startsWith(head) || !body.endsWith(tail))
        throw new Error('js-toolchain: body does not match expected wrapper; cannot detranspile');
    const inner = body.slice(head.length, body.length - tail.length);
    return expression ? inner : derewriteImports(inner);
});};
const _kg7ead = function _compile(acorn,acornOptions,transpileJavaScript) {return (function compile(source, {
    id = 1
} = {}) {
    // kind B: reactive Observable imports (observable:@user/nb or bare @user/nb / d/<16hex>)
    const NOTEBOOK_ID = /^(@[^/]+\/[^/]+|d\/[a-f0-9]{16}(@\d+)?)$/;
    const isObs = s => s.startsWith('observable:') || NOTEBOOK_ID.test(s);
    const toNb = s => s.startsWith('observable:') ? s.slice(11) : s;
    const dedollar = str => {
        let d = 0, o = '';
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '$') {
                d++;
                continue;
            }
            if (d > 0) {
                o += d === 1 ? ' ' : '$'.repeat(d - 1);
                d = 0;
            }
            o += str[i];
        }
        if (d > 0)
            o += d === 1 ? ' ' : '$'.repeat(d - 1);
        return o;
    };
    let program;
    try {
        program = acorn.Parser.parse(source, acornOptions);
    } catch (_) {
        program = null;
    }
    if (program && program.body.length > 0 && program.body.every(n => n.type === 'ImportDeclaration') && program.body.every(d => typeof d.source.value === 'string' && isObs(d.source.value))) {
        const obsCells = [];
        const seen = new Set();
        for (const d of program.body) {
            const nb = toNb(d.source.value);
            const mod = `module ${ nb }`;
            if (!seen.has(mod)) {
                seen.add(mod);
                obsCells.push({
                    _name: mod,
                    _inputs: [],
                    _definition: `async () => runtime.module((await import(${ JSON.stringify('/' + nb + '.js?v=4') })).default)`
                });
            }
            for (const s of d.specifiers) {
                if (s.type !== 'ImportSpecifier')
                    throw new Error('js-toolchain: observable imports support only named specifiers (no default/namespace)');
                const imported = dedollar(s.imported.type === 'Identifier' ? s.imported.name : s.imported.value);
                const local = dedollar(s.local.name);
                obsCells.push({
                    _name: local,
                    _inputs: [
                        mod,
                        '@variable'
                    ],
                    _definition: `(_, v) => v.import(${ JSON.stringify(imported) }, _)`
                });
            }
        }
        return obsCells;
    }
    const t = transpileJavaScript(source);
    if (t.outputs.length === 0)
        return [{
                _name: null,
                _inputs: t.inputs,
                _definition: t.body
            }];
    const holderName = `cell ${ id }`;
    const cells = [{
            _name: holderName,
            _inputs: t.inputs,
            _definition: t.body
        }];
    for (const o of t.outputs)
        cells.push({
            _name: o,
            _inputs: [holderName],
            _definition: `(exports) => exports[${ JSON.stringify(o) }]`
        });
    return cells;
});};
const _1ssxyoy = function _decompile(detranspileJavaScript) {return (function decompile(cells) {
    if (!cells || cells.length === 0)
        throw new Error('js-toolchain: no cells to decompile');
    // kind B: reactive Observable imports
    const redollar = s => s.replace(/\$/g, '$$$$').replace(/ /g, '$');
    const IMPORT_PROJECTION = /^\(_, v\) => v\.import\(("(?:[^"\\]|\\.)*"), _\)$/;
    const MODULE_LOADER = /^async \(\) => runtime\.module\(\(await import\(("(?:[^"\\]|\\.)*")\)\)\.default\)$/;
    const obs = (() => {
        const loaders = new Map();
        const bindings = [];
        for (const c of cells) {
            const def = typeof c._definition === 'string' ? c._definition : String(c._definition);
            const name = c._name ?? '';
            const L = def.match(MODULE_LOADER);
            if (L && name.startsWith('module ')) {
                loaders.set(name, JSON.parse(L[1]).replace(/^\//, '').replace(/\.js\?v=4$/, ''));
                continue;
            }
            const P = def.match(IMPORT_PROJECTION);
            if (P && (c._inputs?.length ?? 0) === 2 && c._inputs[1] === '@variable' && c._inputs[0].startsWith('module ')) {
                bindings.push({
                    mod: c._inputs[0],
                    imported: JSON.parse(P[1]),
                    local: name
                });
                continue;
            }
            return null;
        }
        if (bindings.length === 0)
            return null;
        const order = [];
        const by = new Map();
        for (const b of bindings) {
            if (!loaders.has(b.mod))
                return null;
            if (!by.has(b.mod)) {
                by.set(b.mod, []);
                order.push(b.mod);
            }
            by.get(b.mod).push(b);
        }
        return order.map(mod => {
            const nb = loaders.get(mod);
            const specs = by.get(mod).map(({imported, local}) => {
                const i = redollar(imported), l = redollar(local);
                return i === l ? i : `${ i } as ${ l }`;
            });
            return `import {${ specs.join(', ') }} from ${ JSON.stringify('observable:' + nb) }`;
        }).join('\n');
    })();
    if (obs !== null)
        return obs;
    const PROJECTION = /^\((\w+)\)\s*=>\s*\1\[("(?:[^"\\]|\\.)*")\]$/;
    const projections = [];
    const others = [];
    for (const c of cells) {
        const def = typeof c._definition === 'string' ? c._definition : String(c._definition);
        const m = def.match(PROJECTION);
        if (m && (c._inputs?.length ?? 0) === 1)
            projections.push(JSON.parse(m[2]));
        else
            others.push(c);
    }
    if (others.length !== 1)
        throw new Error(`js-toolchain: decompile expects exactly one holder cell, got ${ others.length }`);
    const holder = others[0];
    const inputs = holder._inputs ?? [];
    const body = typeof holder._definition === 'string' ? holder._definition : String(holder._definition);
    const isAsync = body.startsWith('async ');
    if (projections.length > 0)
        return detranspileJavaScript({
            body,
            inputs,
            outputs: projections,
            expression: false,
            isAsync
        });
    try {
        return detranspileJavaScript({
            body,
            inputs,
            outputs: [],
            expression: true,
            isAsync
        });
    } catch (_) {
        return detranspileJavaScript({
            body,
            inputs,
            outputs: [],
            expression: false,
            isAsync
        });
    }
});};
const _1rhclmb = function _test_smoke_roundtrip(compile,decompile) {
    const src = 'const a = 1;\nconst b = a + 1';
    const cells = compile(src);
    const out = decompile(cells);
    if (out !== src)
        throw new Error(`roundtrip mismatch: got ${ JSON.stringify(out) }`);
    if (cells.length !== 3)
        throw new Error(`expected 3 cells, got ${ cells.length }`);
    return 'ok: ' + JSON.stringify(cells.map(c => c._name));
};
const _5o26f7 = function _test_roundtrip_corpus(decompile,compile) {
    const trimNL = s => s.replace(/^\n/, '').replace(/\n$/, '');
    const cases = [
        '1 + 1',
        'x + y',
        'Math.sqrt(2)',
        '({a: 1, b: 2})',
        '[1, 2, 3]',
        'foo.bar(baz)',
        '(a) => a + 1',
        'cond ? a : b',
        'await fetch(url)',
        'const x = 1',
        'let y = 2',
        'function f() { return 1; }',
        'class C { method() {} }',
        'const {a, b} = obj',
        'const [p, q] = arr',
        'const a = 1;\nconst b = 2',
        'const a = 1; const b = a + 1; const c = b * 2',
        'const x = await f();\nconst y = x + 1',
        'if (cond) { doThing(); }',
        'for (const item of items) consume(item);',
        'const x = 1; // trailing',
        '// leading\nconst x = 1',
        '{a: 1, b: 2}',
        '(exports) => exports[\'x\']',
        'const exports = whatever',
        'a + a + b',
        'const f = () => { return {z: 1}; }'
    ];
    let n = 0;
    for (const src of cases) {
        const out = decompile(compile(src));
        if (out !== trimNL(src))
            throw new Error(`mismatch for ${ JSON.stringify(src) }: got ${ JSON.stringify(out) }`);
        n++;
    }
    return `ok: ${ n } cases`;
};
const _1unguxf = function _test_imports(decompile,compile) {
    const id = [
        'import {a} from "npm:d3"',
        'import {a, b} from "npm:d3"',
        'import {a as x, b} from "npm:d3"',
        'import d from "npm:d3"',
        'import d, {a, b as c} from "npm:d3"',
        'import "npm:d3/dist/d3.css"',
        'import {scaleLinear} from "npm:d3-scale"\nconst s = scaleLinear()'
    ];
    for (const src of id) {
        const out = decompile(compile(src));
        if (out !== src)
            throw new Error(`import identity mismatch ${ JSON.stringify(src) }: got ${ JSON.stringify(out) }`);
    }
    const d1 = decompile(compile('import * as ns from "npm:d3"'));
    if (d1 !== 'const ns = await import("npm:d3")')
        throw new Error(`namespace got ${ JSON.stringify(d1) }`);
    const d2 = decompile(compile(d1));
    if (d2 !== d1)
        throw new Error(`namespace not idempotent: ${ JSON.stringify(d2) }`);
    return 'ok imports';
};
const _1dzs2f7 = function _test_inputs(compile) {
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const c1 = compile('x + y');
    if (!eq(c1[0]._inputs, [
            'x',
            'y'
        ]))
        throw new Error('inputs x+y: ' + JSON.stringify(c1[0]._inputs));
    const c2 = compile('const a = 1;\nconst b = a + 1');
    if (c2.length !== 3)
        throw new Error('multi-out cells: ' + c2.length);
    if (c2[0]._name !== 'cell 1')
        throw new Error('holder name: ' + c2[0]._name);
    if (!eq(c2.slice(1).map(c => c._name), [
            'a',
            'b'
        ]))
        throw new Error('projections: ' + JSON.stringify(c2.slice(1).map(c => c._name)));
    if (!eq(c2[0]._inputs, []))
        throw new Error('holder inputs should be empty: ' + JSON.stringify(c2[0]._inputs));
    const c3 = compile('foo(bar, baz)');
    if (!eq(c3[0]._inputs, [
            'foo',
            'bar',
            'baz'
        ]))
        throw new Error('inputs foo: ' + JSON.stringify(c3[0]._inputs));
    return 'ok inputs';
};
const _bpu0ol = function _test_observable_imports(decompile,compile) {return (function test_observable_imports() {
    const id = [
        'import {foo} from "observable:@user/nb"',
        'import {foo, bar} from "observable:@user/nb"',
        'import {foo as baz} from "observable:@user/nb"',
        'import {viewof$chart} from "observable:@user/nb"',
        'import {mutable$state, foo} from "observable:@user/nb"',
        'import {a} from "observable:@alice/one"\nimport {b, c as d} from "observable:@bob/two"',
        'import {x} from "observable:d/0123456789abcdef@408"'
    ];
    for (const src of id) {
        const out = decompile(compile(src));
        if (out !== src)
            throw new Error(`observable import mismatch ${ JSON.stringify(src) }: got ${ JSON.stringify(out) }`);
    }
    // bare @user/nb canonicalises to observable: then is stable
    const d1 = decompile(compile('import {foo} from "@user/nb"'));
    if (d1 !== 'import {foo} from "observable:@user/nb"')
        throw new Error(`bare canonicalise got ${ JSON.stringify(d1) }`);
    if (decompile(compile(d1)) !== d1)
        throw new Error('bare not idempotent');
    // shape: loader + @variable/v.import per binding, viewof dedollar
    const cells = compile('import {viewof$chart, bar as baz} from "observable:@user/nb"');
    if (JSON.stringify(cells.map(c => c._name)) !== JSON.stringify([
            'module @user/nb',
            'viewof chart',
            'baz'
        ]))
        throw new Error('shape names: ' + JSON.stringify(cells.map(c => c._name)));
    if (cells[2]._definition !== '(_, v) => v.import("bar", _)')
        throw new Error('alias def: ' + cells[2]._definition);
    return 'ok observable imports';
});};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_hhata", null, ["md"], _hhata);  
  main.define("module @tomlarkworthy/acorn-8-11-3", async () => runtime.module((await import("/@tomlarkworthy/acorn-8-11-3.js?v=4")).default));  
  main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn", _));  
  main.define("acorn_walk", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn_walk", _));  
  $def("_vyzr35", "acornOptions", [], _vyzr35);  
  $def("_ysf5w8", "defaultGlobals", [], _ysf5w8);  
  $def("_g7gzfl", "syntaxError", ["acorn"], _g7gzfl);  
  $def("_jeqnou", "findAwaits", ["acorn_walk"], _jeqnou);  
  $def("_1f9hkb8", "findReferences", ["defaultGlobals","acorn_walk","syntaxError"], _1f9hkb8);  
  $def("_1rm347p", "findDeclarations", ["defaultGlobals","syntaxError"], _1rm347p);  
  $def("_u077a3", "parseJavaScript", ["acorn","acornOptions","findDeclarations","findReferences","findAwaits"], _u077a3);  
  $def("_xz0jn5", "Sourcemap", [], _xz0jn5);  
  $def("_65qyit", "rewriteImportDeclarations", ["acorn_walk"], _65qyit);  
  $def("_1j4k0ta", "derewriteImports", ["acorn","acornOptions"], _1j4k0ta);  
  $def("_1cj0sh", "transpileJavaScript", ["parseJavaScript","Sourcemap","rewriteImportDeclarations"], _1cj0sh);  
  $def("_4bxks4", "detranspileJavaScript", ["derewriteImports"], _4bxks4);  
  $def("_kg7ead", "compile", ["acorn","acornOptions","transpileJavaScript"], _kg7ead);  
  $def("_1ssxyoy", "decompile", ["detranspileJavaScript"], _1ssxyoy);  
  $def("_1rhclmb", "test_smoke_roundtrip", ["compile","decompile"], _1rhclmb);  
  $def("_5o26f7", "test_roundtrip_corpus", ["decompile","compile"], _5o26f7);  
  $def("_1unguxf", "test_imports", ["decompile","compile"], _1unguxf);  
  $def("_1dzs2f7", "test_inputs", ["compile"], _1dzs2f7);  
  $def("_bpu0ol", "test_observable_imports", ["decompile","compile"], _bpu0ol);
  return main;
}