const _1ej2r92 = function _intro(md){return(
md`# Plugin Registry

A foundational notebook for **decoupled reactive plugin wiring**.

Consumers get a realtime stream of all registered providers under a name. Providers can register themselves under a name. Neither has direct references between each other. This allows you to add more consumers and providers without changing individual providers and consumers. Useful for reactive plugin systems like audio instruments, dyamic menus, LLM tools and entity component systems.
`
)};
const _16jmxgh = function _diagram(htl){return(
htl.html`<svg viewBox="0 0 720 300" width="100%" style="max-width:720px;font-family:system-ui,sans-serif">
  <defs>
    <marker id="pr-arr" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--theme-foreground,#333)"></path>
    </marker>
    <style>
      .pr-box{fill:var(--theme-background-alt,#f4f4f6);stroke:var(--theme-foreground-faint,#bbb);stroke-width:1.5}
      .pr-hub{fill:var(--theme-foreground-faintest,#eef);stroke:var(--theme-foreground,#556);stroke-width:2}
      .pr-t{fill:var(--theme-foreground,#222);font-size:13px}
      .pr-s{fill:var(--theme-foreground-muted,#666);font-size:11px}
      .pr-e{stroke:var(--theme-foreground,#333);stroke-width:1.5;fill:none;marker-end:url(#pr-arr)}
    </style>
  </defs>

  <rect class="pr-box" x="10"  y="30"  width="170" height="48" rx="8"></rect>
  <text class="pr-t" x="95" y="52" text-anchor="middle">Provider A</text>
  <text class="pr-s" x="95" y="68" text-anchor="middle">plugins.add("x", v)</text>
  <rect class="pr-box" x="10"  y="120" width="170" height="48" rx="8"></rect>
  <text class="pr-t" x="95" y="142" text-anchor="middle">Provider B</text>
  <text class="pr-s" x="95" y="158" text-anchor="middle">plugins.add("x", v, {invalidation})</text>
  <text class="pr-s" x="95" y="215" text-anchor="middle">…N providers</text>

  <rect class="pr-hub" x="270" y="78"  width="180" height="112" rx="10"></rect>
  <text class="pr-t" x="360" y="104" text-anchor="middle" style="font-weight:600">plugins</text>
  <text class="pr-s" x="360" y="128" text-anchor="middle">Map&lt;name, Set&lt;value&gt;&gt;</text>
  <text class="pr-s" x="360" y="150" text-anchor="middle">add(name, value)</text>
  <text class="pr-s" x="360" y="168" text-anchor="middle">get(name) → Generator</text>

  <rect class="pr-box" x="540" y="30"  width="170" height="48" rx="8"></rect>
  <text class="pr-t" x="625" y="52" text-anchor="middle">Consumer 1</text>
  <text class="pr-s" x="625" y="68" text-anchor="middle">plugins.get("x")</text>
  <rect class="pr-box" x="540" y="120" width="170" height="48" rx="8"></rect>
  <text class="pr-t" x="625" y="142" text-anchor="middle">Consumer 2 (V2)</text>
  <text class="pr-s" x="625" y="158" text-anchor="middle">plugins.get("x")</text>
  <text class="pr-s" x="625" y="215" text-anchor="middle">…M consumers</text>

  <path class="pr-e" d="M180,54 C225,54 235,116 268,126"></path>
  <path class="pr-e" d="M180,144 C225,144 240,138 268,140"></path>
  <path class="pr-e" d="M452,128 C500,116 510,54 538,54"></path>
  <path class="pr-e" d="M452,142 C500,144 510,144 538,144"></path>
</svg>`
)};
const _xnvzuh = function _contracts(md){return(
md`## Contracts

| Guarantee | How |
|---|---|
| **Named sets** | \`plugins\` maps a name → a set of values. Providers \`add\`, consumers \`get\`; they coordinate only by name. |
| **Reactive** | \`get(name)\` is a Generator that yields the current set and re-yields on every add/remove for that name. |
| **N↔M decoupling** | Providers and consumers share only \`plugins\`. Any number of each; a name is the whole contract. |
| **Auto-cleanup** | \`add\` returns \`remove()\`. Pass \`{invalidation}\` (a cell's disposal promise) to remove automatically when the provider cell re-runs. |
| **No leaks** | \`get\`'s Generator unsubscribes on disposal; per-name listeners are dropped when the last consumer leaves. |
| **Eventual convergence** | Each consumer gets the current set immediately on \`get\`, then a full-set snapshot on every change — so any interleaving of add/remove/get converges. |`
)};
const _1ua5hud = function _apiReference(md){return(
md`## API reference

The whole API is two methods on \`plugins\`.

**\`plugins.add(name, value, options?)\`** → \`remove()\`
Add \`value\` to the set stored under \`name\` (creating the set on first use). Returns a \`remove()\` function
that takes this value back out. \`options.invalidation\` (optional, may be null/omitted) is a promise — when
it settles the value is removed automatically; pass a provider cell's built-in \`invalidation\` so re-running
the cell replaces rather than duplicates. \`value\` is anything; for shared views it is commonly a factory
\`() => element\` that each consumer calls to get its own instance.

**\`plugins.get(name)\`** → Generator&lt;value[]&gt;
Return a reactive Generator of the values currently in \`name\`'s set. It yields the current set immediately
(so a late consumer still converges), then re-yields the full set on every add/remove. Use it from a cell
and that cell recomputes on each change. Call it from as many consumers as you like (e.g. a module and its
V2) — each call is an independent Generator that cleans up when its cell is torn down.`
)};
const _1pzt22q = function _createPlugins(Generators)
{
  return function createPlugins() {
    const sets = new Map();
    // name -> Set<value>
    const listeners = new Map();
    // name -> Set<() => void>
    const notify = name => {
      const ls = listeners.get(name);
      if (ls)
        for (const l of [...ls])
          l();  // copy: a consumer may (un)subscribe while notifying
    };
    const add = (name, value, options) => {
      let set = sets.get(name);
      if (!set)
        sets.set(name, set = new Set());
      set.add(value);
      notify(name);
      const remove = () => {
        const s = sets.get(name);
        if (s && s.delete(value)) {
          if (s.size === 0)
            sets.delete(name);
          notify(name);
        }
      };
      const invalidation = options && options.invalidation;
      if (invalidation)
        Promise.resolve(invalidation).then(remove, remove);
      return remove;
    };
    const get = name => Generators.observe(change => {
      const push = () => change([...sets.get(name) ?? []]);
      push();
      // current set immediately → converges
      let ls = listeners.get(name);
      if (!ls)
        listeners.set(name, ls = new Set());
      ls.add(push);
      return () => {
        ls.delete(push);
        if (ls.size === 0)
          listeners.delete(name);
      };  // leak-safe
    });
    return {
      add,
      get,
      listenerCount: name => listeners.get(name)?.size ?? 0
    };
  };
};
const _1qu8dwj = function _plugins(createPlugins){return(
createPlugins()
)};
const _a7p1z5 = function _testsHeader(md){return(
md`## Tests`
)};
const _15xl311 = function _test_get_reflects_add(createPlugins){return(
(async () => {
  const p = createPlugins();
  const gen = p.get('x');
  if ((await (await gen.next()).value).length !== 0)
    throw new Error('new set should start empty');
  p.add('x', 1);
  const after = await (await gen.next()).value;
  if (after.length !== 1 || after[0] !== 1)
    throw new Error('get did not reflect the add');
  gen.return();
  return '\u2705 get(name) yields the named set and updates on add';
})()
)};
const _122zyhz = function _test_multi_provider_and_convergence(createPlugins)
{
  return (async () => {
    const p = createPlugins();
    const a = p.get('x'), b = p.get('x');
    // two independent consumers
    await (await a.next()).value;
    await (await b.next()).value;
    p.add('x', 'one');
    // provider 1
    p.add('x', 'two');
    // provider 2
    const va = (await (await a.next()).value).slice().sort().join(',');
    const vb = (await (await b.next()).value).slice().sort().join(',');
    if (va !== 'one,two' || vb !== 'one,two')
      throw new Error('consumers did not converge to the full set');
    a.return();
    b.return();
    return '\u2705 multiple providers accumulate; all consumers converge';
  })();
};
const _1lojas7 = function _test_remove_and_names_isolated(createPlugins){return(
(async () => {
  const p = createPlugins();
  const gx = p.get('x'), gy = p.get('y');
  await (await gx.next()).value;
  await (await gy.next()).value;
  const remove = p.add('x', 1);
  p.add('y', 2);
  if ((await (await gx.next()).value).join() !== '1')
    throw new Error('x set wrong');
  if ((await (await gy.next()).value).join() !== '2')
    throw new Error('names are not isolated');
  remove();
  if ((await (await gx.next()).value).length !== 0)
    throw new Error('remove() did not take the value out');
  gx.return();
  gy.return();
  return '\u2705 remove() works and names are isolated';
})()
)};
const _8240yg = function _test_invalidation_and_no_leak(createPlugins){return(
(async () => {
  const p = createPlugins();
  let settle;
  p.add('x', 1, { invalidation: new Promise(r => settle = r) });
  const gen = p.get('x');
  if ((await (await gen.next()).value).length !== 1)
    throw new Error('value should be present before invalidation');
  if (p.listenerCount('x') !== 1)
    throw new Error('get should have registered a listener');
  settle();
  await Promise.resolve();
  await Promise.resolve();
  if ((await (await gen.next()).value).length !== 0)
    throw new Error('invalidation did not remove the value');
  gen.return();
  if (p.listenerCount('x') !== 0)
    throw new Error('disposing the Generator leaked a listener');
  return '\u2705 {invalidation} auto-removes and get() leaks no listeners';
})()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1ej2r92", "intro", ["md"], _1ej2r92);  
  $def("_16jmxgh", "diagram", ["htl"], _16jmxgh);  
  $def("_xnvzuh", "contracts", ["md"], _xnvzuh);  
  $def("_1ua5hud", "apiReference", ["md"], _1ua5hud);  
  $def("_1pzt22q", "createPlugins", ["Generators"], _1pzt22q);  
  $def("_1qu8dwj", "plugins", ["createPlugins"], _1qu8dwj);  
  $def("_a7p1z5", "testsHeader", ["md"], _a7p1z5);  
  $def("_15xl311", "test_get_reflects_add", ["createPlugins"], _15xl311);  
  $def("_122zyhz", "test_multi_provider_and_convergence", ["createPlugins"], _122zyhz);  
  $def("_1lojas7", "test_remove_and_names_isolated", ["createPlugins"], _1lojas7);  
  $def("_8240yg", "test_invalidation_and_no_leak", ["createPlugins"], _8240yg);
  return main;
}
