import re, sys
p = 'tools/reactive-annotations/module.js'
s = open(p).read()
n0 = len(s)

def rep(old, new, count=1):
    global s
    c = s.count(old)
    assert c == count, f"expected {count} of {old[:70]!r}, found {c}"
    s = s.replace(old, new)

# 1. the finding field: relation -> predicate
rep('raRelation', 'raPredicate')
assert 'correlation' not in s
s = s.replace('relation', 'predicate')

# 2. annotations cell: runCheck carries a per-declaration predicate; a literal plugin skips cell resolution
rep('''      const objects = (p.subject === false ? d.names : d.names.slice(1)).map(resolve);
      const link = { plugin: p.id, subject, objects, opts: d.opts, holder: heldBy(d.node) };
      if (subject && !subject.missing) for (const o of objects) if (!o.missing) facts.add(subject.name, p.id, o.name, { by: p.id, hash: subject.hash, at });''',
'''      const objects = (p.subject === false ? d.names : d.names.slice(1)).map(p.literal ? (n) => ({ name: n }) : resolve);
      const pred = d.predicate || p.id;
      const link = { plugin: p.id, predicate: pred, subject, objects, opts: d.opts, holder: heldBy(d.node) };
      if (subject && !subject.missing) for (const o of objects) if (!o.missing) facts.add(subject.name, pred, o.name, { by: p.id, hash: subject.hash, at });''')
rep('''      const finding = {
        predicate: p.id,''', '''      const finding = {
        predicate: pred,''')
rep('''  // A declaration renders into one child of a group node. The group is the cell's value and carries the
  // plugin methods, so calls chain: A.lint("x").tested("x", "test_x") holds two links in one cell.
  const declare = (g, items, sync, pluginId, args) => {''',
'''  // A declaration renders into one child of a group node. The group is the cell's value and carries the
  // plugin methods, so calls chain: A.subject("x").lint().tested("test_x") holds two facts in one cell.
  const declare = (g, items, sync, pluginId, args, predicate = null) => {''')
rep('''      plugin: p, names: args, opts, node: g, el, at: Date.now(), finding: null, lastKey: null,
      pending: { predicate: p.id,''', '''      plugin: p, predicate, names: args, opts, node: g, el, at: Date.now(), finding: null, lastKey: null,
      pending: { predicate: predicate || p.id,''')
rep('''["link", "on", "dispose", "recompute", "toJSON", "value"]''', '''["assert", "subject", "dispose", "recompute", "toJSON", "value"]''')
rep('''  // A.on("x") binds the subject for every call on the group; plugins without a subject take their args unchanged
  const group = (subject = null) => {''',
'''  // assert states a fact no plugin computes; its object may be a literal, so it is not resolved to a cell
  byId.set("assert", { id: "assert", subject: true, literal: true, check: () => ({ ok: true, summary: "asserted" }) });
  // A.subject("x") binds the subject for every call on the group; plugins without a subject take their args unchanged
  const group = (subject = null) => {''')
rep('''    g.link = (pluginId, ...args) => {
      const p = byId.get(pluginId);
      declare(g, items, sync, pluginId, subject != null && !(p && p.subject === false) ? [subject, ...args] : args);
      return g;
    };
    for (const id of byId.keys()) g[id] = (...args) => g.link(id, ...args);
    return g;
  };
  A.link = (pluginId, ...args) => group().link(pluginId, ...args);
  A.on = (subject) => group(subject);
  for (const id of byId.keys()) A[id] = (...args) => A.link(id, ...args);''',
'''    const link = (pluginId, args, predicate) => {
      const p = byId.get(pluginId);
      declare(g, items, sync, pluginId, subject != null && !(p && p.subject === false) ? [subject, ...args] : args, predicate);
      return g;
    };
    for (const id of byId.keys()) if (id !== "assert") g[id] = (...args) => link(id, args);
    g.assert = (predicate, object, ...rest) => {
      if (subject == null) throw new Error("assert needs a subject: A.subject(name).assert(predicate, object)");
      return link("assert", [object, ...rest], String(predicate));
    };
    return g;
  };
  A.subject = (subject = null) => group(subject);
  // plugins without a subject (ratchet, summary, audit) speak about the module, so they also sit on A
  for (const [id, p] of byId) if (p.subject === false) A[id] = (...args) => group()[id](...args);''')

# 3. header cell example
rep('''x_lint = A.lint("x")                        // code: rules over the compiled source
x_links = A.on("x")                         // fluent: one cell, several links, subject bound once
  .tested("test_x")''', '''x_facts = A.subject("x")                    // one cell, several facts, subject bound once
  .lint()                                   // code: rules over the compiled source
  .tested("test_x")''')
rep('''  .evidence({kind: "reference", hash: "_1ab2c3"})   // recorded against a hash
''', '''  .evidence({kind: "reference", hash: "_1ab2c3"})   // recorded against a hash
  .assert("owner", "tom")                   // a plain fact, no plugin computes it
''')
rep('Declared links are cells that add facts.', 'Facts are declared by cells: `A.subject(name)` binds a subject and each chained call adds one fact, checked by the plugin of the same name.')

# 4. demo cells
rep('''const _jf2xy8 = function _total_links(A,total_null_check) {return (A.on("total")''', '''const _jf2xy8 = function _total_links(A,total_null_check) {return (A.subject("total")''')
rep('''  .evidence({ kind: "null", evidence: "total_null_check", hash: "_1wvll3p", rows: total_null_check }));};''',
'''  .evidence({ kind: "null", evidence: "total_null_check", hash: "_1wvll3p", rows: total_null_check })
  .assert("owner", "tom"));};''')
rep('''const _11eblwq = function _others(A) {return (A.lint("messy").lint("broken").contract("broken", "isPositive"));};''',
'''const _11eblwq = function _messy_lint(A) {return (A.subject("messy").lint());};
const _1b7k3nq = function _broken_facts(A) {return (A.subject("broken").lint().contract("isPositive"));};''')
rep('''  $def("_11eblwq", "others", ["A"], _11eblwq);  ''', '''  $def("_11eblwq", "messy_lint", ["A"], _11eblwq);  
  $def("_1b7k3nq", "broken_facts", ["A"], _1b7k3nq);  ''')

# 5. tests
rep('''  expect(one.findings.map((f) => f.predicate).sort()).toEqual(["contract", "crossing", "documentedBy", "evidence", "lint", "tested"]);''',
'''  expect(one.findings.map((f) => f.predicate).sort()).toEqual(["contract", "crossing", "documentedBy", "evidence", "lint", "owner", "tested"]);''')
rep('''const _100jj6m = function _test_fluent_chain_holds_several_links(graph,expect,total_links,others,core_ratchet) {
  graph;
  expect(total_links.querySelectorAll(".ra").length).toBe(6);
  expect(total_links.value.map((f) => f.predicate)).toEqual(["lint", "tested", "documentedBy", "contract", "crossing", "evidence"]);
  expect(total_links.value.every((f) => f.subject === "total")).toBe(true);
  expect(others.value.map((f) => f.subject)).toEqual(["messy", "broken", "broken"]);
  // a single link is still one finding, not an array
  expect(Array.isArray(core_ratchet.value)).toBe(false);
  return total_links.value.length;
};''',
'''const _100jj6m = function _test_subject_chain_holds_several_facts(graph,expect,total_links,messy_lint,broken_facts,core_ratchet) {
  graph;
  expect(total_links.querySelectorAll(".ra").length).toBe(7);
  expect(total_links.value.map((f) => f.predicate)).toEqual(["lint", "tested", "documentedBy", "contract", "crossing", "evidence", "owner"]);
  expect(total_links.value.every((f) => f.subject === "total")).toBe(true);
  expect(broken_facts.value.map((f) => f.subject)).toEqual(["broken", "broken"]);
  // a single fact is still one finding, not an array
  expect(Array.isArray(core_ratchet.value)).toBe(false);
  expect(messy_lint.value.subject).toBe("messy");
  // assert: a plain fact with a literal object, attributed to the assert pseudo-plugin
  const owner = graph.facts.find((x) => x.s === "total" && x.p === "owner");
  expect(owner.o).toBe("tom");
  expect(owner.by).toBe("assert");
  expect(total_links.value[6]).toMatchObject({ predicate: "owner", subject: "total", objects: ["tom"], ok: true });
  return total_links.value.length;
};''')
rep('''  $def("_100jj6m", "test_fluent_chain_holds_several_links", ["graph","expect","total_links","others","core_ratchet"], _100jj6m);''',
'''  $def("_100jj6m", "test_subject_chain_holds_several_facts", ["graph","expect","total_links","messy_lint","broken_facts","core_ratchet"], _100jj6m);''')

open(p, 'w').write(s)
print("module.js", n0, "->", len(s))

# 6. write the block back into the notebook
h = 'lopebooks/notebooks/@tomlarkworthy_reactive-annotations.html'
html = open(h).read()
tag = 'id="@tomlarkworthy/reactive-annotations"'
i = html.find(tag); assert i > 0 and html.find(tag, i + 1) < 0
start = html.find('>', i) + 1
end = html.find('</script>', start)
old = html[start:end]
assert 'const _zjhgwl' in old and 'A.on = ' in old and 'const _11eblwq' in old
html = html[:start] + '\n' + s + html[end:]
open(h, 'w').write(html)
print("block", len(old), "->", len(s))
