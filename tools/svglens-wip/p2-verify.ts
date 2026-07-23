// Static check: the three dispatch loops must read the parameter, not the registry.
const text = await Bun.file('modules/@tomlarkworthy/svg-lens.js').text();
const lens = text.slice(text.indexOf('return function svgLens(node, options = {})'));
const body = lens.slice(0, lens.indexOf('\n};'));
const ok = (c: boolean, s: string) => console.log((c ? 'ok   ' : 'FAIL ') + s);
ok(/const tools = typeof options\.tools === "function"/.test(body), 'tools resolved from options');
ok((body.match(/for \(const t of tools\)/g) || []).length === 3, 'all 3 dispatch loops use it');
ok(!/for \(const t of svgTools\)/.test(body), 'no loop reads the registry directly');
ok(/options\.tools \|\| svgTools/.test(body), 'defaults to the ambient registry');
