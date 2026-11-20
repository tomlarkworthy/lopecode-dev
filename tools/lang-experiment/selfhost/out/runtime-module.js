const _ss0_0 = function _anonymous(md) {return (md`# SoundScript runtime

What compiled SoundScript cells call: state cells, actions and the write queue, events and listeners, the JSX renderer, and the checks on values from cells in other languages. This module imports nothing. Examples are in \`@tomlarkworthy/soundscript-tutorial\`.

The build generates these cells from \`tools/lang-experiment/prelude.runtime.ts\` and the TypeScript sources in \`tools/lang-experiment/lite/\`, so an edit made here is lost at the next build.`);};
const _ss1_0 = function _ss(action,actionNamer,actionQueue,borrow,compileFor,create,cross,crossings,entry,equals,events,freeze,h,idle,isEvents,joinCells,lazyPool,listen,listenerOrderChanged,mount,mut,on,pagePool,patch,pulling,read,ref,rejected,release,running,setListenerOrder,snapshot,state,sweep,viewRef) {return ({ action, actionNamer, actionQueue, borrow, compileFor, create, cross, crossings, entry, equals, events, freeze, h, idle, isEvents, joinCells, lazyPool, listen, listenerOrderChanged, mount, mut, on, pagePool, patch, pulling, read, ref, rejected, release, running, setListenerOrder, snapshot, state, sweep, viewRef });};
const _ss2_0 = function _anonymous(md) {return (md`## State cells and actions

The store behind each state cell and its handle, actions, the queue of top-level action calls, and the commit that applies their writes.`);};
const _ss3_0 = function _STATECELL() {return (Symbol.for("lc.statecell"));};
const _ss4_0 = function _ACTION() {return (Symbol.for("lc.action"));};
const _ss5_0 = function _REFHANDLE() {return (Symbol.for("lc.state"));};
const _ss6_0 = function _actionNames() {
  // the cell an action was defined by, when the runtime knows it; flush and listeners name actions by it
  const actionNames = new WeakMap();
  return actionNames;
};
const _ss7_0 = function _actionNamer() {
  // the host's lookup of the cell whose value an action is, for an action actionNames does not name
  const actionNamer = { of: null  };
  return actionNamer;
};
const _ss8_0 = function _nameOf(actionNames,actionNamer) {return ((a) => actionNames.get(a) ?? actionNamer.of?.(a) ?? "(anonymous)");};
const _ss9_0 = function _rt() {return ({
  evalDepth: 0, // >0 while a cell definition (or a generator step) runs synchronously
  actionDepth: 0, // >0 while an action's function runs synchronously
  // the top-level call in flight; one at a time for the whole runtime
  call: null ,
  // top-level calls waiting for the one in flight, in call order
  waiting: [] ,
  // set while an event handler, or a listener delivery runs: an action it calls is a
  // top-level call, even while another call is in flight
  entry: null ,
  // the writes of finished calls, in call order, until commit
  ready: new Map(),
  commits: 0,
});};
const _ss10_0 = function _idle(rt) {
  // no call in flight or waiting, and nothing left to commit
  const idle = () => !rt.call && !rt.waiting.length && !rt.ready.size;
  return idle;
};
const _ss11_0 = function _actionQueue(rt) {return (() => ({ inFlight: !!rt.call, waiting: rt.waiting.length }));};
const _ss12_0 = function _state(STATECELL) {return (function state(initial) {
  return { [STATECELL]: true, initial };
});};
const _ss13_0 = function _isStateCell(STATECELL) {return ((v) => !!v && typeof v === "object" && STATECELL in v);};
const _ss14_0 = function _isRefHandle(REFHANDLE) {return ((v) => !!v && typeof v === "object" && REFHANDLE in v);};
const _ss15_0 = function _stores() {
  // handle -> its store; a handle over another handle (an imported state cell's, viewHandle) -> that handle
  const stores = new WeakMap();
  return stores;
};
const _ss16_0 = function _over() {return (new WeakMap());};
const _ss17_0 = function _storeOf(stores,over) {return ((h) => stores.get(over.get(h) ?? h));};
const _ss18_0 = function _newStore() {return ((name, value) => ({ name, value }));};
const _ss19_0 = function _owner(rt) {
  // the call a write or read belongs to: the one running synchronously, or, outside any cell evaluation,
  // the one in flight (its code after an await)
  const owner = () => (rt.actionDepth > 0 || rt.evalDepth === 0 ? rt.call : null);
  return owner;
};
const _ss20_0 = function _current(rt) {
  // the value as of this point in the call order: committed, then finished calls', then this call's writes
  const current = (store) => (rt.call?.has(store) ? rt.call.get(store) : rt.ready.has(store) ? rt.ready.get(store) : store.el ? store.check(store.el.value) : store.value);
  return current;
};
const _ss21_0 = function _write(owner,REFHANDLE,storeOf,current) {return (function write(h, f) {
  const c = owner();
  if (!c) throw new Error(`State ${(h )[REFHANDLE]}: set/update called outside an action`);
  const store = storeOf(h);
  c.set(store, f(current(store))); // an update function that throws throws here, inside the call
});};
const _ss22_0 = function _handleOf(EventTarget,REFHANDLE,write,storeOf) {return (function handleOf(name, check = (v) => v) {
  // A handle is an Observable view: an EventTarget whose value is the committed state, which dispatches
  // input on each commit, so Observable's Generators.input(handle) is the state cell's value.
  // check: a written value's check (the shape of a type that crosses from another language)
  const h = new EventTarget();
  Object.defineProperties(h, {
    [REFHANDLE]: { value: name },
    set: { value: (v) => write(h, () => check(v)) },
    update: { value: (f) => write(h, (x) => check(f(x))) },
    value: { get: () => { const st = storeOf(h); return st.el ? st.check(st.el.value) : st.value; } },
  });
  return h;
});};
const _ss23_0 = function _setStore(stores,newStore,REFHANDLE) {return ((h, value) => stores.set(h, { ...newStore((h )[REFHANDLE], value), handle: h }));};
const _ss24_0 = function _read(storeOf,owner,current) {return (function read(handle) {
  // read(s) inside an action: the committed value plus every write made earlier in call order
  const store = storeOf(handle);
  if (!store) throw new Error("read(...) needs a State");
  if (!owner()) throw new Error(`read(${store.name}) called outside an action`);
  return current(store);
});};
const _ss25_0 = function _runs() {
  // each handle's function text and the inputs of its last run
  const runs = new WeakMap();
  return runs;
};
const _ss26_0 = function _ref(runs,rt,isStateCell,handleOf,setStore) {return (function ref(prev, name, args, fn) {
  // A state cell's handle variable: viewof <name> = ss.ref(this, name, [inputs], fn). prev is the variable's last
  // value, as the Runtime gives it: its handle, when the same function text made it, is kept, so a cell taking
  // State<T> keeps it across runs; a new store from fn(...args) unless every input is the same (Object.is) as on
  // the last run, which keeps the store and so the state. A variable with no last value (its first run, or after
  // an error) starts again.
  const id = String(fn);
  // prev is any other value (globalThis, in a sloppy-mode definition) when the variable has no last value
  const last = prev && typeof prev === "object" ? runs.get(prev) : undefined;
  let h = last?.id === id ? (prev ) : undefined;
  if (!h || !last || last.args.length !== args.length || !args.every((x, i) => Object.is(x, last.args[i]))) {
    rt.evalDepth++;
    let r;
    try { r = fn(...args); } finally { rt.evalDepth--; }
    if (!isStateCell(r)) throw new Error(`${name} did not return state(...)`);
    h ??= handleOf(name);
    setStore(h, r.initial);
    runs.set(h, { id, args });
  }
  return h;
});};
const _ss27_0 = function _commit(rt,Event,stores) {return (function commit() {
  // Commits the writes of the calls that finished since the last commit: every store takes its value, then
  // each view is told with an input event, as a user's change would tell it.
  const layer = rt.ready;
  rt.ready = new Map();
  for (const [st, v] of layer) {
    st.value = v;
    if (st.el) st.el.value = v;
  }
  for (const st of layer.keys()) {
    if (st.el) st.el.dispatchEvent(new Event("input", { bubbles: true }));
    else if (st.handle && stores.get(st.handle) === st) (st.handle ).dispatchEvent(new Event("input"));
  }
  rt.commits++;
});};
const _ss28_0 = function _views() {return (new WeakMap());};
const _ss29_0 = function _viewHandle(views,handleOf,isRefHandle,over,stores,newStore) {return (function viewHandle(el, name, check) {
  // A State<T> over the value of a viewof variable: an Observable JavaScript view, which is its own store (a read
  // is what the control holds now, so one it rounded or clamped), or an imported state cell's handle. One handle
  // per view, so a reader that takes it runs again only when the view itself is replaced.
  const known = views.get(el);
  if (known) return known;
  const handle = handleOf(name, check);
  views.set(el, handle);
  if (isRefHandle(el)) over.set(handle, el);
  else stores.set(handle, { ...newStore(name, check(el.value)), el, check });
  return handle;
});};
const _ss30_0 = function _thenable() {return ((r) => typeof (r )?.then === "function");};
const _ss31_0 = function _reportTo(nameOf) {return ((a) => (e) => console.error(`action ${nameOf(a)} threw:`, e));};
const _ss32_0 = function _entry(rt,reportTo) {return (function entry(report, f) {
  // Runs f while an event handler, or a listener delivery is calling actions: each action
  // it calls is a top-level call. report(e, action) gets the error of a call that does not throw to f's
  // caller (it was queued, or its promise rejected); null reports it on the console naming the action.
  const was = rt.entry;
  rt.entry = report ?? ((e, a) => reportTo(a)(e));
  try { return f(); } finally { rt.entry = was; }
});};
const _ss33_0 = function _finish(rt,commit,pump) {return (function finish(c, ok) {
  // the call ends: its writes commit, unless it failed; the next waiting call starts
  rt.call = null;
  if (ok && c.size) {
    // one commit per macrotask: two in one task tear a reader of two state cells (runtime.test.ts g6)
    if (!rt.ready.size) setTimeout(commit, 0);
    for (const [st, v] of c) rt.ready.set(st, v);
  }
  pump();
});};
const _ss34_0 = function _pump_cells(rt) {
  let pumping = false;
  function pump() {
    if (pumping) return;
    pumping = true;
    try { while (!rt.call && rt.waiting.length) rt.waiting.shift()(); } finally { pumping = false; }
  }
  return { pump };
};
const _ss35_0 = function _pump(pump_cells) {return (pump_cells.pump);};
const _ss36_0 = function _run(rt,inAction,finish,thenable) {return (function run(f, report, sync) {
  // A top-level call: it runs now (sync: a throw goes to the caller) or when the one before it finishes.
  // It finishes when f has returned and the promise-like it returned, if any, has settled.
  const c = new Map();
  rt.call = c;
  let r;
  try { r = inAction(f); } catch (e) {
    finish(c, false);
    if (sync) throw e;
    return report(e);
  }
  if (!thenable(r)) return finish(c, true);
  Promise.resolve(r).then(() => finish(c, true), (e) => { report(e); finish(c, false); });
});};
const _ss37_0 = function _inAction(rt) {return (function inAction(f) {
  rt.actionDepth++;
  try { return f(); } finally { rt.actionDepth--; }
});};
const _ss38_0 = function _action(rt,inAction,actionNames,actionNamer,reportTo,run,ACTION) {return (function action(f) {
  const a = (...args) => {
    if (rt.evalDepth > 0 && rt.actionDepth === 0) throw new Error("action called during a cell evaluation");
    // inside the call in flight (in its body, or after an await outside an entry): a plain function call
    if (rt.call && (rt.actionDepth > 0 || !rt.entry)) return inAction(() => f(...args));
    // named while it is still its cell's value: an edit before its error is reported does not lose the name
    if (!actionNames.has(a)) { const n = actionNamer.of?.(a); if (n) actionNames.set(a, n); }
    const via = rt.entry;
    const report = via ? (e) => via(e, a) : reportTo(a);
    if (!rt.call && !rt.waiting.length) run(() => f(...args), report, true);
    else rt.waiting.push(() => run(() => f(...args), report, false));
    return undefined;
  };
  Object.defineProperty(a, ACTION, { value: true });
  return a;
});};
const _ss39_0 = function _mut() {return ((v) => v);};
const _ss40_0 = function _freeze() {return ((v) => v);};
const _ss41_0 = function _borrow() {return ((v) => v);};
const _ss42_0 = function _snapshot(structuredClone) {return (function snapshot(v) {
  if (ArrayBuffer.isView(v) && !(v instanceof DataView)) return (v  ).slice();
  return structuredClone(v);
});};
const _ss43_0 = function _equals() {return (function equals(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (ArrayBuffer.isView(a)) {
    const x = a  , y = b  ;
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (!Object.is(x[i], y[i])) return false;
    return true;
  }
  if (a instanceof Map) {
    const m = b ;
    if (a.size !== m.size) return false;
    for (const [k, v] of a) if (!m.has(k) || !equals(v, m.get(k))) return false;
    return true;
  }
  if (a instanceof Set) {
    const s = b ;
    if (a.size !== s.size) return false;
    for (const v of a) if (!s.has(v)) return false;
    return true;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!Object.hasOwn(b, k) || !equals((a )[k], (b )[k])) return false;
  return true;
});};
const _ss44_0 = function _anonymous(md) {return (md`## Values from other languages

\`cross\` and \`checkShape\` check a value from a cell in another language against a shape and return a deep-frozen copy.`);};
const _ss45_0 = function _describe() {return ((v) => {
  if (v === null) return "null";
  if (typeof v === "string") return `string ${JSON.stringify(v.length > 40 ? v.slice(0, 40) + "…" : v)}`;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return `${typeof v} ${String(v)}`;
  if (typeof v === "function") return "a function";
  if (Array.isArray(v)) return `an array of ${v.length}`;
  if (v && typeof (v ).then === "function") return "a promise";
  if (typeof v === "object") return Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null ? "an object" : `a ${(v ).constructor?.name ?? "non-plain"} object`;
  return typeof v;
});};
const _ss46_0 = function _want() {
  const want = (s) => {
    switch (s.k) {
      case "num": return "number"; case "str": return "string"; case "bool": return "boolean";
      case "null": return "null"; case "undef": return "undefined"; case "unknown": return "data";
      case "lit": return JSON.stringify(s.v);
      case "arr": return "an array"; case "tup": return `an array of ${s.els.length}`;
      case "rec": return "an object";
      case "union": return s.ts.map(want).join(" or ");
    }
  };
  return want;
};
const _ss47_0 = function _plain() {return ((v) => { const p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; });};
const _ss48_0 = function _Mismatch() {return (class Mismatch extends Error {});};
const _ss49_0 = function _copy(Mismatch,want,describe,plain) {return (function copy(v, s, path, seen) {
  // value checked against shape, as a deep-frozen copy; throws Mismatch naming the path
  const fail = () => { throw new Mismatch(`${path}: expected ${want(s)}, found ${describe(v)}`); };
  switch (s.k) {
    case "num": return typeof v === "number" ? v : fail();
    case "str": return typeof v === "string" ? v : fail();
    case "bool": return typeof v === "boolean" ? v : fail();
    case "null": return v === null ? v : fail();
    case "undef": return v === undefined ? v : fail();
    case "lit": return Object.is(v, s.v) ? v : fail();
    case "union": {
      for (const t of s.ts) { try { return copy(v, t, path, seen); } catch (e) { if (!(e instanceof Mismatch)) throw e; } }
      return fail();
    }
    case "arr": case "tup": {
      if (!Array.isArray(v)) return fail();
      if (s.k === "tup" && v.length !== s.els.length) return fail();
      if (seen.has(v)) throw new Mismatch(`${path}: a cycle`);
      seen.add(v);
      try { return Object.freeze(v.map((x, i) => copy(x, s.k === "arr" ? s.el : s.els[i], `${path}[${i}]`, seen))); } finally { seen.delete(v); }
    }
    case "rec": {
      if (!v || typeof v !== "object" || Array.isArray(v) || !plain(v)) return fail();
      if (seen.has(v)) throw new Mismatch(`${path}: a cycle`);
      seen.add(v);
      const out = {};
      try {
        // only the properties the type declares are kept
        for (const [n, t, opt] of s.props) {
          const has = Object.hasOwn(v, n);
          const x = (v )[n];
          if (!has || x === undefined) { if (opt) continue; if (!has) throw new Mismatch(`${path}.${n}: expected ${want(t)}, found nothing`); }
          out[n] = copy(x, t, `${path}.${n}`, seen);
        }
      } finally { seen.delete(v); }
      return Object.freeze(out);
    }
    case "unknown": {
      if (v === null || typeof v !== "object") {
        if (typeof v === "function") return fail();
        return v;
      }
      if (typeof (v ).then === "function") return fail();
      if (seen.has(v)) throw new Mismatch(`${path}: a cycle`);
      if (!Array.isArray(v) && !plain(v)) return fail();
      seen.add(v);
      try {
        if (Array.isArray(v)) return Object.freeze(v.map((x, i) => copy(x, s, `${path}[${i}]`, seen)));
        const out = {};
        for (const k of Object.keys(v)) out[k] = copy((v )[k], s, `${path}.${k}`, seen);
        return Object.freeze(out);
      } finally { seen.delete(v); }
    }
  }
});};
const _ss50_0 = function _deepEqual() {
  const deepEqual = (a, b) => {
    if (Object.is(a, b)) return true;
    if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && deepEqual((a )[k], (b )[k]));
  };
  return deepEqual;
};
const _ss51_0 = function _last() {
  // per reading cell and parameter, the last copy handed out: an equal copy is that one, so the reader's
  // memo (Object.is on inputs) still applies when the other language delivers equal data again
  const last = new Map();
  return last;
};
const _ss52_0 = function _crossings() {return ({ copies: 0, reused: 0 });};
const _ss53_0 = function _cross(copy,Mismatch,crossings,last,deepEqual) {return (function cross(value, shape, path) {
  // The value of a cell in another language as the SoundScript parameter `path` (a cell and parameter
  // name, "reader.param") receives it: checked against shape, deep-frozen, copied once per delivery.
  const at = path.slice(path.indexOf(".") + 1);
  let out;
  try { out = copy(value, shape, at, new Set()); } catch (e) {
    if (e instanceof Mismatch) throw new TypeError(e.message);
    throw e;
  }
  crossings.copies++;
  if (last.has(path) && deepEqual(last.get(path), out)) { crossings.reused++; return last.get(path); }
  last.set(path, out);
  return out;
});};
const _ss54_0 = function _checkShape(copy,Mismatch) {return (function checkShape(value, shape, path) {
  // checked and copied as cross() does, without its per-parameter reuse, for a write through a view's Ref
  try { return copy(value, shape, path, new Set()); } catch (e) {
    if (e instanceof Mismatch) throw new TypeError(e.message);
    throw e;
  }
});};
const _ss55_0 = function _anonymous(md) {return (md`## Elements

\`h\` makes the element values that compiled JSX evaluates to.`);};
const _ss56_0 = function _flat() {
  const flat = (xs) =>
    xs.flatMap((x) => (Array.isArray(x) ? flat(x) : x === null || x === undefined || x === false || x === true ? [] : [x]));
  return flat;
};
const _ss57_0 = function _h(flat) {return (function h(tag, props, ...children) {
  if (tag === null) return Object.freeze({ tag: "", props: Object.freeze({}), children: Object.freeze(flat(children)) }); // a fragment
  if (typeof tag === "function") return tag(children.length ? { ...props, children } : { ...props });
  return Object.freeze({ tag, props: Object.freeze({ ...props }), children: Object.freeze(flat(children)) });
});};
const _ss58_0 = function _anonymous(md) {return (md`## Rendering

\`create\` and \`patch\` turn element values into DOM nodes, and patch a node in place when its tag is unchanged.`);};
const _ss59_0 = function _DOM_EVENTS(ptr) {return ({
  onClick: ["click", () => []],
  onInput: ["input", (_e, node) => [String(node.value)]],
  onPointerDown: ["pointerdown", (e) => [ptr(e)]],
  onPointerMove: ["pointermove", (e) => [ptr(e)]],
  onPointerUp: ["pointerup", (e) => [ptr(e)]],
  onPointerCancel: ["pointercancel", (e) => [ptr(e)]],
});};
const _ss60_0 = function _ptr() {return ((e) => Object.freeze({ x: e.offsetX ?? e.clientX ?? 0, y: e.offsetY ?? e.clientY ?? 0, t: e.timeStamp ?? 0, id: e.pointerId ?? 0, buttons: e.buttons ?? 0 }));};
const _ss61_0 = function _PROPS() {return (new Set(["value", "checked", "disabled"]));};
const _ss62_0 = function _isElem() {return ((x) => !!x && typeof x === "object" && "tag" in (x ));};
const _ss63_0 = function _create_cells(isElem,DOM_EVENTS,entry,PROPS) {
  function create(doc, x) {
    if (!isElem(x)) return doc.createTextNode(String(x));
    const node = doc.createElement(x.tag || "span") ;
    if (!x.tag) node.setAttribute("style", "display: contents"); // a fragment
    node.__handlers = {};
    node.__elem = { tag: x.tag, props: {}, children: [] };
    patch(node, x);
    return node;
  }
  function patch(node, x) {
    const old = node.__elem;
    if (old === x) return; // the same value as last time: nothing below it changed
    for (const [k, v] of Object.entries(x.props)) {
      if (k === "key" || k === "children") continue;
      const ev = DOM_EVENTS[k];
      if (ev) {
        // an event handler: each action it calls is a top-level call
        if (!(k in node.__handlers)) node.addEventListener(ev[0], (e) => { const f = node.__handlers[k]; if (f) entry(null, () => f(...ev[1](e, node))); });
        node.__handlers[k] = v;
      } else if (PROPS.has(k)) { if (node[k] !== v) node[k] = v; }
      else if (v === false || v === null || v === undefined) node.removeAttribute(k);
      else if (old.props[k] !== v) node.setAttribute(k, String(v));
    }
    for (const k of Object.keys(old.props)) if (!(k in x.props)) {
      if (DOM_EVENTS[k]) node.__handlers[k] = undefined;
      else if (PROPS.has(k)) node[k] = k === "value" ? "" : false; // removeAttribute does not reset a property
      else node.removeAttribute(k);
    }
    const doc = node.ownerDocument;
    const n = x.children.length;
    // Keyed children: match by key and tag, move nodes into place, drop the rest.
    if (n && x.children.every((c) => isElem(c) && c.props.key !== undefined)) {
      const byKey = new Map();
      const want = new Set((x.children ).map((c) => `${c.tag}:${c.props.key}`));
      for (const cur of [...node.childNodes] ) {
        const k = cur.__elem?.props.key !== undefined ? `${cur.__elem.tag}:${cur.__elem.props.key}` : null;
        if (k && want.has(k)) byKey.set(k, cur); else node.removeChild(cur); // removed first, so the rest need not move
      }
      (x.children ).forEach((c, i) => {
        const k = `${c.tag}:${c.props.key}`;
        let cur = byKey.get(k);
        if (cur) { byKey.delete(k); patch(cur, c); } else cur = create(doc, c);
        if (node.childNodes[i] !== cur) node.insertBefore(cur, node.childNodes[i] ?? null);
      });
      while (node.childNodes.length > n) node.removeChild(node.lastChild);
      node.__elem = x;
      return;
    }
    for (let i = 0; i < n; i++) {
      const c = x.children[i], cur = node.childNodes[i];
      if (cur && isElem(c) && cur.__elem && cur.__elem.tag === c.tag) patch(cur, c);
      else if (cur && !isElem(c) && cur.nodeType === 3) { if (cur.data !== String(c)) cur.data = String(c); }
      else if (cur) node.replaceChild(create(doc, c), cur);
      else node.appendChild(create(doc, c));
    }
    while (node.childNodes.length > n) node.removeChild(node.lastChild);
    node.__elem = x;
  }
  return { create, patch };
};
const _ss64_0 = function _create(create_cells) {return (create_cells.create);};
const _ss65_0 = function _patch(create_cells) {return (create_cells.patch);};
const _ss66_0 = function _anonymous(md) {return (md`## Events and listeners

Events cells' handles and generators, the listeners \`on\` makes, delivery of each value to them, and \`sweep\`, which stops what no variable holds.`);};
const _ss67_0 = function _guard(rt) {return (function guard(g) {
  const wrap = (m) => (...a) => {
    rt.evalDepth++;
    try {
      return (g[m] )(...a);
    } finally { rt.evalDepth--; }
  };
  return { next: wrap("next"), return: wrap("return"), throw: wrap("throw"), [Symbol.iterator]() { return this; } };
});};
const _ss68_0 = function _EVENTS() {return (Symbol("events"));};
const _ss69_0 = function _LISTENER() {return (Symbol("listener"));};
const _ss70_0 = function _hs() {return (new WeakMap());};
const _ss71_0 = function _ls() {return (new WeakMap());};
const _ss72_0 = function _attached() {return (new Set());};
const _ss73_0 = function _generating() {return (new Set());};
const _ss74_0 = function _scheduler() {
  // what pulls a sync generator's next value; tests replace it
  const scheduler = { frame: (f) => void requestAnimationFrame(f) };
  return scheduler;
};
const _ss75_0 = function _isEvents(hs) {return ((v) => !!v && typeof v === "object" && hs.has(v));};
const _ss76_0 = function _isListener(LISTENER) {return ((v) => !!v && typeof v === "object" && LISTENER in v);};
const _ss77_0 = function _on(LISTENER) {return ((events, act) => Object.freeze({ [LISTENER]: true, events, action: act }));};
const _ss78_0 = function _running(attached) {
  // of: count only listeners on these handles
  const running = (of) => { if (!of) return attached.size; const only = new Set(of); return [...attached].filter((l) => only.has(l.events )).length; };
  return running;
};
const _ss79_0 = function _pulling(generating,hs) {
  // events cells whose generator is being pulled: live, not finished, with a listener attached
  // of: count only these handles (other modules on the page, such as tests, pull generators of their own)
  const pulling = (of) => { const only = of ? new Set(of) : null; return [...generating].filter((h) => { const s = hs.get(h); return (!only || only.has(h)) && !!s.gen && !s.done && s.listeners.size > 0; }).length; };
  return pulling;
};
const _ss80_0 = function _same() {return ((a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i])));};
const _ss81_0 = function _stopGen(generating,hs) {return (function stopGen(s) {
  const g = s.gen;
  s.gen = null; s.args = null; s.no++; s.queue.length = 0;
  for (const h of generating) if (hs.get(h) === s) generating.delete(h);
  if (g) try { g.return(); } catch {}
});};
const _ss82_0 = function _events(isEvents,hs,EVENTS,handleOfState,same,stopGen,guard,generating,kick) {return (function events(prev, name, args, make, invalidation) {
  // An events cell's value is a handle: <name> = ss.events(this, name, [inputs], fn, invalidation). One handle per
  // variable: a re-run with other inputs replaces the generator inside it, so a listener holding the handle does
  // not run again. The generator is pulled only while a listener is attached: a sync one once per animation frame,
  // an async one as soon as each next() resolves. Each value goes to every attached listener once, in order.
  // prev: the variable's last value (`this` of its definition); args: the cell's inputs; make: the generator
  // function, called with args; each step runs as a cell evaluation (guard)
  const reuse = isEvents(prev) && !hs.get(prev).dead && hs.get(prev).name === name;
  const h = reuse ? prev : Object.freeze({ [EVENTS]: true, name }) ;
  if (!reuse) hs.set(h, { name, args: null, gen: null, no: 0, done: false, dead: false, listeners: new Set(), queue: [], draining: false, busy: false, run: null, order: null });
  const s = hs.get(h);
  handleOfState.set(s, h);
  if (!s.args || !same(s.args, args)) {
    stopGen(s);
    s.gen = guard(make(...args) ); s.args = args; s.done = false;
    generating.add(h);
    kick(s);
  }
  const run = {};
  s.run = run;
  // invalidation resolves before the next run's definition is called, so the check waits a macrotask:
  // a re-run with the same inputs keeps the generator, and one that never comes (an error upstream,
  // the variable no longer reachable) stops it
  invalidation?.then(() => setTimeout(() => { if (s.run === run) stopGen(s); }, 0));
  return h;
});};
const _ss83_0 = function _kick_cells(scheduler,fail,deliver) {
  function kick(s) {
    if (s.busy || !s.gen || s.done || !s.listeners.size) return;
    s.busy = true;
    const no = s.no;
    scheduler.frame(() => pull(s, no));
  }
  function pull(s, no) {
    s.busy = false;
    if (no !== s.no || !s.gen || s.done || !s.listeners.size) return kick(s);
    let r;
    try { r = s.gen.next(); } catch (e) { return fail(s, no, e); }
    if (r && typeof r.then === "function") {
      s.busy = true;
      r.then((x) => {
        s.busy = false;
        if (no !== s.no) return kick(s);
        if (x.done) { s.done = true; return; }
        deliver(s, x.value);
        pull(s, no);
      }, (e) => { s.busy = false; fail(s, no, e); });
      return;
    }
    if (r.done) { s.done = true; return; }
    deliver(s, r.value);
    kick(s);
  }
  return { kick };
};
const _ss84_0 = function _kick(kick_cells) {return (kick_cells.kick);};
const _ss85_0 = function _fail() {return (function fail(s, no, e) {
  if (no !== s.no) return;
  console.error(`events ${s.name} threw; it yields nothing more until it runs again:`, e);
  s.done = true;
});};
const _ss86_0 = function _setListenerOrder_cells(listenerOrderChanged,ordered) {
  let placeOf = null;
  const setListenerOrder = (f) => { placeOf = f; listenerOrderChanged(); };
  function orderOf(s, h) {
    if (s.order) return s.order;
    const list = [...s.listeners];
    if (!placeOf || list.length < 2) return list;
    const [own, ...at] = placeOf([h, ...list]);
    const key = (p) => (p ? [own && p[0] === own[0] ? 0 : 1, p[0], p[1]]  : null);
    const keyed = list.map((l, i) => ({ l, i, k: key(at[i]) }));
    keyed.sort((a, b) => {
      if (!a.k || !b.k) return a.k ? -1 : b.k ? 1 : a.i - b.i;
      return a.k[0] - b.k[0] || (a.k[1] < b.k[1] ? -1 : a.k[1] > b.k[1] ? 1 : 0) || a.k[2] - b.k[2] || a.i - b.i;
    });
    const out = keyed.map((x) => x.l);
    if (own && keyed.every((x) => x.k)) { s.order = out; ordered.add(s); }
    return out;
  }
  return { setListenerOrder, orderOf };
};
const _ss87_0 = function _setListenerOrder(setListenerOrder_cells) {return (setListenerOrder_cells.setListenerOrder);};
const _ss88_0 = function _orderOf(setListenerOrder_cells) {return (setListenerOrder_cells.orderOf);};
const _ss89_0 = function _ordered() {return (new Set());};
const _ss90_0 = function _listenerOrderChanged(ordered) {
  // cells were added, moved or deleted: the order is worked out again before the next value
  const listenerOrderChanged = () => { for (const s of ordered) s.order = null; ordered.clear(); };
  return listenerOrderChanged;
};
const _ss91_0 = function _handleOfState() {return (new WeakMap());};
const _ss92_0 = function _deliver(orderOf,handleOfState,ls,nameOf,entry) {return (function deliver(s, v) {
  // A value that arrives while actions are running waits in the queue. Each delivery is a top-level
  // action call, so one whose action is still running (async) holds the next in the runtime's queue. An
  // action that throws or rejects is logged and the next listener, and the next value, still run.
  s.queue.push(v);
  if (s.draining) return;
  s.draining = true;
  try {
    while (s.queue.length) {
      const x = s.queue.shift();
      for (const l of orderOf(s, handleOfState.get(s))) {
        if (!s.listeners.has(l)) continue;
        const report = (e) => console.error(`listener ${ls.get(l)?.cell ?? "?"}: action ${nameOf(l.action)} threw on a value of events ${s.name}:`, e);
        try { entry(report, () => l.action(x)); } catch (e) { report(e); }
      }
    }
  } finally { s.draining = false; }
});};
const _ss93_0 = function _listen(isListener,hs,ls,attached,kick,detach) {return (function listen(l, cell, invalidation) {
  // A listener cell's run attaches its value until that run's invalidation, which the runtime resolves
  // before the cell's next definition is called, so one listener variable is never attached twice.
  // A compiled listener cell is <name> = ss.listen(fn(...inputs), name, invalidation).
  if (!isListener(l)) throw new Error(`${cell} must return on(events, action)`);
  const s = hs.get(l.events );
  if (!s) throw new Error(`${cell}: on(...) needs an events handle`);
  if (typeof l.action !== "function") throw new Error(`${cell}: on(...) needs an action`);
  const rec = ls.get(l) ?? { runs: 0, cell };
  ls.set(l, rec);
  if (rec.runs++ === 0) { s.listeners.add(l); s.order = null; attached.add(l); kick(s); }
  invalidation?.then(() => { if (rec.runs > 0 && --rec.runs === 0) detach(l); });
  return l;
});};
const _ss94_0 = function _detach(ls,hs,attached) {return (function detach(l) {
  const rec = ls.get(l);
  if (rec) rec.runs = 0;
  const s = hs.get(l.events );
  if (s) { s.listeners.delete(l); s.order = null; }
  attached.delete(l);
});};
const _ss95_0 = function _release(isListener,detach,isEvents,hs,stopGen) {return (function release(v) {
  // The value of a deleted variable: the runtime does not resolve its invalidation, so the module calls this.
  // a deleted variable's value: its listener or events end
  if (isListener(v)) detach(v);
  else if (isEvents(v)) { const s = hs.get(v); stopGen(s); s.dead = true; }
});};
const _ss96_0 = function _sweep_cells(attached,generating,bornAt,release) {
  let generation = 0;
  // Detaches listeners and stops generators that no live variable holds. One made since the last
  // sweep is spared once: it may be a value the runtime has not assigned yet.
  function sweep(values) {
    generation++;
    for (const x of [...attached, ...generating]) {
      if (values.has(x)) { bornAt.delete(x); continue; }
      if (!bornAt.has(x)) { bornAt.set(x, generation); continue; }
      if (bornAt.get(x) < generation) { bornAt.delete(x); release(x); }
    }
  }
  return { sweep };
};
const _ss97_0 = function _sweep(sweep_cells) {return (sweep_cells.sweep);};
const _ss98_0 = function _bornAt() {return (new Map());};
const _ss99_0 = function _anonymous(md) {return (md`## Worker pool

The pool of web workers that runs the islands \`compile\` makes.`);};
const _ss100_0 = function _EXEC() {return (`(function () {
  const id = (v) => v;
  const refuse = (n) => () => { throw new Error(n + " cannot be used inside a compiled island"); };
  const snapshot = (v) => (ArrayBuffer.isView(v) && !(v instanceof DataView) ? v.slice() : structuredClone(v));
  const equals = (a, b) => {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    if (ArrayBuffer.isView(a)) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false; return true; }
    if (a instanceof Map) { if (a.size !== b.size) return false; for (const [k, v] of a) if (!b.has(k) || !equals(v, b.get(k))) return false; return true; }
    if (a instanceof Set) { if (a.size !== b.size) return false; for (const v of a) if (!b.has(v)) return false; return true; }
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !equals(a[k], b[k])) return false;
    return true;
  };
  const modules = new Map();
  return function run(job) {
    if (!modules.has(job.key)) {
      if (modules.size > 16) modules.clear();
      if (!job.js) throw Object.assign(new Error("island " + job.key + " was not sent"), { missing: true });
      const f = new Function("state", "action", "mut", "freeze", "borrow", "snapshot", "equals", "h",
        '"use strict";\\n' + job.js + "\\nreturn {" + job.names.join(", ") + "};");
      modules.set(job.key, f(refuse("state"), refuse("action"), id, id, id, snapshot, equals, refuse("h")));
    }
    const fns = modules.get(job.key);
    const vals = Object.assign({}, job.values);
    for (const c of job.order) vals[c.name] = fns[c.name](...c.params.map((p) => vals[p]));
    const out = {};
    for (const o of job.outputs) out[o] = vals[o];
    return out;
  };
})()`);};
const _ss101_0 = function _WORKER(EXEC) {return (`const run = ${EXEC};
self.onmessage = (e) => {
  const { id, job } = e.data;
  try {
    const out = run(job);
    const transfer = [...new Set(Object.values(out).filter((v) => ArrayBuffer.isView(v)).map((v) => v.buffer))];
    self.postMessage({ id, out }, transfer);
  } catch (err) {
    if (err && err.missing) self.postMessage({ id, missing: true });
    else self.postMessage({ id, error: String((err && err.message) || err) });
  }
};`);};
const _ss102_0 = function _superseded() {return (() => Object.assign(new Error("superseded"), { name: "SupersededError" }));};
const _ss103_0 = function _makePool(superseded) {return (function makePool(size, makeWorker) {
  // A job whose owner (a compiled function) has been replaced is dropped from the queue with a
  // SupersededError, so a slider drag does not leave stale work ahead of the current value; a job
  // already sent to a worker runs to the end and resolves. Each slot remembers which islands it sent
  // code for; a worker that has dropped one answers `missing` and the job is sent again with its code.
  // makeWorker is the injection point for tests; pagePool uses the browser's Worker on a blob URL.
  const slots = [];
  const queue = [];
  const waiting = new Map();
  let next = 0;
  const send = (s, id, q, withCode) => {
    s.worker.postMessage({ id, job: withCode ? q.job : { ...q.job, js: undefined } });
    s.has.add(q.job.key);
  };
  const pump = () => {
    for (const s of slots) {
      while (!s.busy) {
        let q;
        while ((q = queue.shift()) && q.owner.dead) q.reject(superseded());
        if (!q) return;
        const id = next++;
        s.busy = true;
        s.current = id;
        waiting.set(id, q);
        try {
          send(s, id, q, !s.has.has(q.job.key));
        } catch (err) {
          waiting.delete(id);
          s.busy = false;
          q.reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }
  };
  for (let i = 0; i < size; i++) {
    const slot = { worker: makeWorker(), busy: false, has: new Set(), current: -1, answered: 0 };
    slot.worker.onerror = (e) => {
      const q = waiting.get(slot.current);
      waiting.delete(slot.current);
      slot.busy = false;
      q?.reject(new Error(`worker failed: ${e.message ?? "no message"}`));
      pump();
    };
    slot.worker.onmessage = (e) => {
      const { id, out, error, missing } = e.data;
      const q = waiting.get(id);
      if (!q) return;
      let failure = error ? new Error(error) : null;
      if (missing) {
        slot.has.delete(q.job.key);
        failure = new Error(`island ${q.job.key} was not sent`);
        if (q.job.js && !q.resent) {
          q.resent = true;
          try { send(slot, id, q, true); return; } catch (err) { failure = err instanceof Error ? err : new Error(String(err)); }
        }
      }
      waiting.delete(id);
      slot.busy = false;
      if (failure) q.reject(failure);
      else { slot.answered++; q.resolve(out); }
      pump();
    };
    slots.push(slot);
  }
  return {
    size,
    get answered() { return slots.map((s) => s.answered); },
    run: (job, owner) => new Promise((resolve, reject) => { queue.push({ job, owner, resolve, reject }); pump(); }),
  };
});};
const _ss104_0 = function _pagePool_cells(globalThis,WORKER,makePool) {
  // One pool per page.
  let shared = null;
  function pagePool() {
    if (shared) return shared;
    const size = Math.max(1, Math.min(8, (globalThis.navigator?.hardwareConcurrency ?? 2) - 1));
    const url = URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" }));
    return (shared = makePool(size, () => new Worker(url)));
  }
  return { pagePool };
};
const _ss105_0 = function _pagePool(pagePool_cells) {return (pagePool_cells.pagePool);};
const _ss106_0 = function _anonymous(md) {return (md`## Running a compiled cell

What compiled state, events and listener cells call (\`ref\`, \`events\`, \`listen\`), with \`viewRef\`, \`mount\` and the worker pool made on first use.`);};
const _ss107_0 = function _rejected() {return (function rejected(name, why) {
  // The body of a cell the checker did not accept: it raises the checker's messages and runs nothing else.
  throw new Error(`${name} does not check: ${why.join("; ")}`);
});};
const _ss108_0 = function _viewRef(isRefHandle,viewHandle,checkShape) {return (function viewRef(el, shape, name) {
  // The value of a viewof variable as a State<T>: an Observable JavaScript view's element, whose value is
  // checked against shape on the way in, or an imported SoundScript state cell's handle; every write is
  // checked against shape (boundary.ts)
  const e = el ;
  if (isRefHandle(e)) return viewHandle(e , name, (v) => checkShape(v, shape, name));
  if (!e || typeof e !== "object" || typeof e.addEventListener !== "function" || typeof e.dispatchEvent !== "function" || !("value" in e))
    throw new TypeError(`viewof ${name}: expected a view (an element with a value), found ${e === null ? "null" : typeof e}`);
  return viewHandle(e , name, (v) => checkShape(v, shape, name));
});};
const _ss109_0 = function _joined() {
  // A module's source joined from its cells, remembering the cells: compile then checks them one by one
  // (checkCells), so a cell elsewhere in the module that does not parse does not stop an island.
  const joined = new Map();
  return joined;
};
const _ss110_0 = function _joinCells(joined) {return (function joinCells(texts) {
  const source = texts.join("\n\n");
  joined.delete(source);
  joined.set(source, [...texts]);
  if (joined.size > 16) joined.delete(joined.keys().next().value);
  return source;
});};
const _ss111_0 = function _compileFor() {return ((c, caller, refs) => {
  if (!c || typeof c.for !== "function") throw new Error(`${caller} takes compile, and this module defines no ss_compile = ss.compiler(...)`);
  return c.for(caller, refs);
});};
const _ss112_0 = function _mount(patch,create) {return (function mount(x, prev) {
  // An element value as DOM: patches the node it made last time (pass `this` from an ojs cell).
  if (prev && prev.__elem && x && typeof x === "object" && prev.__elem.tag === (x ).tag) {
    patch(prev, x );
    return prev;
  }
  return create(document, x);
});};
const _ss113_0 = function _lazyPool(pagePool) {return (function lazyPool() {
  // The page's worker pool, made on first use, so a notebook that never compiles starts no workers.
  let p = null;
  const get = () => (p ??= pagePool());
  return { get size() { return get().size; }, get answered() { return p ? p.answered : []; }, run: (job, owner) => get().run(job, owner) };
});};
const _ss114_0 = function _anonymous(md) {return (md`## Tests

These run the module's own functions: a write committed by an action, the order of queued action calls, and \`cross\` against wrong shapes and on a nested value.`);};
const _ss115_0 = async function _test_runtime_action_commits_a_write(ref,state,Generators,action,entry) {
  // a state cell's handle, as a compiled state cell gets it from ss.ref(this, name, [inputs], fn); its value, as the
  // state cell's value variable reads it, is Observable's Generators.input of it
  const count = ref(undefined, "test_count", [], () => state(0));
  const values = Generators.input(count);
  const v0 = await values.next().value;
  const increment = action(() => count.update((v) => v + 1));
  entry(null, () => increment());
  // the next value arrives with the commit
  const v1 = await values.next().value;
  if (v0 !== 0 || v1 !== 1) throw new Error(`count went ${v0} -> ${v1}, expected 0 -> 1`);
  return `${v0} -> ${v1}`;
};
const _ss116_0 = async function _test_runtime_queued_call_runs_after_the_one_in_flight(ref,state,Generators,action,entry) {
  const x = ref(undefined, "test_x", [], () => state(1));
  const values = Generators.input(x);
  await values.next().value;
  const order = [];
  let release;
  const gate = new Promise((r) => (release = r));
  const slow = action(async () => { order.push("slow"); await gate; x.set(5); order.push("slow done"); });
  const times = action(() => { order.push("times"); x.update((v) => v * 10); });
  entry(null, () => slow());
  entry(null, () => times());
  if (order.includes("times")) throw new Error(`times ran while slow was in flight: ${order.join(", ")}`);
  release();
  const v = await values.next().value;
  if (order.join() !== "slow,slow done,times" || v !== 50) throw new Error(`order ${order.join(", ")}, x ${v}; expected slow, slow done, times and x 50`);
  return `${order.join(", ")}; x ${v}`;
};
const _ss117_0 = function _test_runtime_cross_rejects_wrong_shapes(cross) {
  const shape = { k: "rec", props: [["n", { k: "num" }, false], ["tags", { k: "arr", el: { k: "str" } }, false]] };
  const wrong = [null, 1, [1], { n: "1", tags: [] }, { n: 1, tags: [2] }, { tags: [] }, { n: 1, tags: "a" }];
  const messages = wrong.map((v) => {
    try { cross(v, shape, "test_cross.p"); return `accepted ${JSON.stringify(v)}`; } catch (e) { return e instanceof TypeError ? e.message : `threw a ${e?.constructor?.name}: ${e}`; }
  });
  const bad = messages.filter((m) => !m.startsWith("p"));
  if (bad.length) throw new Error(bad.join("; "));
  return messages;
};
const _ss118_0 = function _test_runtime_crossed_value_is_a_deep_frozen_copy(cross) {
  const shape = { k: "rec", props: [["xs", { k: "arr", el: { k: "rec", props: [["a", { k: "num" }, false]] } }, false]] };
  const given = { xs: [{ a: 1 }], extra: true };
  const got = cross(given, shape, "test_freeze.p");
  const frozen = Object.isFrozen(got) && Object.isFrozen(got.xs) && Object.isFrozen(got.xs[0]);
  const copied = got !== given && got.xs !== given.xs && got.xs[0] !== given.xs[0] && !Object.isFrozen(given);
  if (!frozen || !copied || "extra" in got || got.xs[0].a !== 1) throw new Error(`frozen ${frozen}, copied ${copied}, ${JSON.stringify(got)}`);
  return JSON.stringify(got);
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const fileAttachments = new Map([].map((name) => {
    const module_name = "@tomlarkworthy/soundscript-runtime";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_ss0_0", null, ["md"], _ss0_0);
  $def("_ss1_0", "ss", ["action","actionNamer","actionQueue","borrow","compileFor","create","cross","crossings","entry","equals","events","freeze","h","idle","isEvents","joinCells","lazyPool","listen","listenerOrderChanged","mount","mut","on","pagePool","patch","pulling","read","ref","rejected","release","running","setListenerOrder","snapshot","state","sweep","viewRef"], _ss1_0);
  $def("_ss2_0", null, ["md"], _ss2_0);
  $def("_ss3_0", "STATECELL", [], _ss3_0);
  $def("_ss4_0", "ACTION", [], _ss4_0);
  $def("_ss5_0", "REFHANDLE", [], _ss5_0);
  $def("_ss6_0", "actionNames", [], _ss6_0);
  $def("_ss7_0", "actionNamer", [], _ss7_0);
  $def("_ss8_0", "nameOf", ["actionNames","actionNamer"], _ss8_0);
  $def("_ss9_0", "rt", [], _ss9_0);
  $def("_ss10_0", "idle", ["rt"], _ss10_0);
  $def("_ss11_0", "actionQueue", ["rt"], _ss11_0);
  $def("_ss12_0", "state", ["STATECELL"], _ss12_0);
  $def("_ss13_0", "isStateCell", ["STATECELL"], _ss13_0);
  $def("_ss14_0", "isRefHandle", ["REFHANDLE"], _ss14_0);
  $def("_ss15_0", "stores", [], _ss15_0);
  $def("_ss16_0", "over", [], _ss16_0);
  $def("_ss17_0", "storeOf", ["stores","over"], _ss17_0);
  $def("_ss18_0", "newStore", [], _ss18_0);
  $def("_ss19_0", "owner", ["rt"], _ss19_0);
  $def("_ss20_0", "current", ["rt"], _ss20_0);
  $def("_ss21_0", "write", ["owner","REFHANDLE","storeOf","current"], _ss21_0);
  $def("_ss22_0", "handleOf", ["EventTarget","REFHANDLE","write","storeOf"], _ss22_0);
  $def("_ss23_0", "setStore", ["stores","newStore","REFHANDLE"], _ss23_0);
  $def("_ss24_0", "read", ["storeOf","owner","current"], _ss24_0);
  $def("_ss25_0", "runs", [], _ss25_0);
  $def("_ss26_0", "ref", ["runs","rt","isStateCell","handleOf","setStore"], _ss26_0);
  $def("_ss27_0", "commit", ["rt","Event","stores"], _ss27_0);
  $def("_ss28_0", "views", [], _ss28_0);
  $def("_ss29_0", "viewHandle", ["views","handleOf","isRefHandle","over","stores","newStore"], _ss29_0);
  $def("_ss30_0", "thenable", [], _ss30_0);
  $def("_ss31_0", "reportTo", ["nameOf"], _ss31_0);
  $def("_ss32_0", "entry", ["rt","reportTo"], _ss32_0);
  $def("_ss33_0", "finish", ["rt","commit","pump"], _ss33_0);
  $def("_ss34_0", "pump_cells", ["rt"], _ss34_0);
  $def("_ss35_0", "pump", ["pump_cells"], _ss35_0);
  $def("_ss36_0", "run", ["rt","inAction","finish","thenable"], _ss36_0);
  $def("_ss37_0", "inAction", ["rt"], _ss37_0);
  $def("_ss38_0", "action", ["rt","inAction","actionNames","actionNamer","reportTo","run","ACTION"], _ss38_0);
  $def("_ss39_0", "mut", [], _ss39_0);
  $def("_ss40_0", "freeze", [], _ss40_0);
  $def("_ss41_0", "borrow", [], _ss41_0);
  $def("_ss42_0", "snapshot", ["structuredClone"], _ss42_0);
  $def("_ss43_0", "equals", [], _ss43_0);
  $def("_ss44_0", null, ["md"], _ss44_0);
  $def("_ss45_0", "describe", [], _ss45_0);
  $def("_ss46_0", "want", [], _ss46_0);
  $def("_ss47_0", "plain", [], _ss47_0);
  $def("_ss48_0", "Mismatch", [], _ss48_0);
  $def("_ss49_0", "copy", ["Mismatch","want","describe","plain"], _ss49_0);
  $def("_ss50_0", "deepEqual", [], _ss50_0);
  $def("_ss51_0", "last", [], _ss51_0);
  $def("_ss52_0", "crossings", [], _ss52_0);
  $def("_ss53_0", "cross", ["copy","Mismatch","crossings","last","deepEqual"], _ss53_0);
  $def("_ss54_0", "checkShape", ["copy","Mismatch"], _ss54_0);
  $def("_ss55_0", null, ["md"], _ss55_0);
  $def("_ss56_0", "flat", [], _ss56_0);
  $def("_ss57_0", "h", ["flat"], _ss57_0);
  $def("_ss58_0", null, ["md"], _ss58_0);
  $def("_ss59_0", "DOM_EVENTS", ["ptr"], _ss59_0);
  $def("_ss60_0", "ptr", [], _ss60_0);
  $def("_ss61_0", "PROPS", [], _ss61_0);
  $def("_ss62_0", "isElem", [], _ss62_0);
  $def("_ss63_0", "create_cells", ["isElem","DOM_EVENTS","entry","PROPS"], _ss63_0);
  $def("_ss64_0", "create", ["create_cells"], _ss64_0);
  $def("_ss65_0", "patch", ["create_cells"], _ss65_0);
  $def("_ss66_0", null, ["md"], _ss66_0);
  $def("_ss67_0", "guard", ["rt"], _ss67_0);
  $def("_ss68_0", "EVENTS", [], _ss68_0);
  $def("_ss69_0", "LISTENER", [], _ss69_0);
  $def("_ss70_0", "hs", [], _ss70_0);
  $def("_ss71_0", "ls", [], _ss71_0);
  $def("_ss72_0", "attached", [], _ss72_0);
  $def("_ss73_0", "generating", [], _ss73_0);
  $def("_ss74_0", "scheduler", [], _ss74_0);
  $def("_ss75_0", "isEvents", ["hs"], _ss75_0);
  $def("_ss76_0", "isListener", ["LISTENER"], _ss76_0);
  $def("_ss77_0", "on", ["LISTENER"], _ss77_0);
  $def("_ss78_0", "running", ["attached"], _ss78_0);
  $def("_ss79_0", "pulling", ["generating","hs"], _ss79_0);
  $def("_ss80_0", "same", [], _ss80_0);
  $def("_ss81_0", "stopGen", ["generating","hs"], _ss81_0);
  $def("_ss82_0", "events", ["isEvents","hs","EVENTS","handleOfState","same","stopGen","guard","generating","kick"], _ss82_0);
  $def("_ss83_0", "kick_cells", ["scheduler","fail","deliver"], _ss83_0);
  $def("_ss84_0", "kick", ["kick_cells"], _ss84_0);
  $def("_ss85_0", "fail", [], _ss85_0);
  $def("_ss86_0", "setListenerOrder_cells", ["listenerOrderChanged","ordered"], _ss86_0);
  $def("_ss87_0", "setListenerOrder", ["setListenerOrder_cells"], _ss87_0);
  $def("_ss88_0", "orderOf", ["setListenerOrder_cells"], _ss88_0);
  $def("_ss89_0", "ordered", [], _ss89_0);
  $def("_ss90_0", "listenerOrderChanged", ["ordered"], _ss90_0);
  $def("_ss91_0", "handleOfState", [], _ss91_0);
  $def("_ss92_0", "deliver", ["orderOf","handleOfState","ls","nameOf","entry"], _ss92_0);
  $def("_ss93_0", "listen", ["isListener","hs","ls","attached","kick","detach"], _ss93_0);
  $def("_ss94_0", "detach", ["ls","hs","attached"], _ss94_0);
  $def("_ss95_0", "release", ["isListener","detach","isEvents","hs","stopGen"], _ss95_0);
  $def("_ss96_0", "sweep_cells", ["attached","generating","bornAt","release"], _ss96_0);
  $def("_ss97_0", "sweep", ["sweep_cells"], _ss97_0);
  $def("_ss98_0", "bornAt", [], _ss98_0);
  $def("_ss99_0", null, ["md"], _ss99_0);
  $def("_ss100_0", "EXEC", [], _ss100_0);
  $def("_ss101_0", "WORKER", ["EXEC"], _ss101_0);
  $def("_ss102_0", "superseded", [], _ss102_0);
  $def("_ss103_0", "makePool", ["superseded"], _ss103_0);
  $def("_ss104_0", "pagePool_cells", ["globalThis","WORKER","makePool"], _ss104_0);
  $def("_ss105_0", "pagePool", ["pagePool_cells"], _ss105_0);
  $def("_ss106_0", null, ["md"], _ss106_0);
  $def("_ss107_0", "rejected", [], _ss107_0);
  $def("_ss108_0", "viewRef", ["isRefHandle","viewHandle","checkShape"], _ss108_0);
  $def("_ss109_0", "joined", [], _ss109_0);
  $def("_ss110_0", "joinCells", ["joined"], _ss110_0);
  $def("_ss111_0", "compileFor", [], _ss111_0);
  $def("_ss112_0", "mount", ["patch","create"], _ss112_0);
  $def("_ss113_0", "lazyPool", ["pagePool"], _ss113_0);
  $def("_ss114_0", null, ["md"], _ss114_0);
  $def("_ss115_0", "test_runtime_action_commits_a_write", ["ref","state","Generators","action","entry"], _ss115_0);
  $def("_ss116_0", "test_runtime_queued_call_runs_after_the_one_in_flight", ["ref","state","Generators","action","entry"], _ss116_0);
  $def("_ss117_0", "test_runtime_cross_rejects_wrong_shapes", ["cross"], _ss117_0);
  $def("_ss118_0", "test_runtime_crossed_value_is_a_deep_frozen_copy", ["cross"], _ss118_0);
  return main;
}
