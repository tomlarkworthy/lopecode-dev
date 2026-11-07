// Reads a Cloud Brain's public endpoints into snapshot tables. No auth; every URL answers with CORS *.
const NS = "com.lopecode.brain.";
const short = (m) => m.replace(NS, "");

export const brainUrls = (base) => ({
  kernel: `https://${base}.endpointservices.workers.dev`,
  deployer: `https://${base}-deployer.endpointservices.workers.dev`
});

// The deployer's reference has a table "| declared | binding |". Each row: `a`, `b` or `c` | text.
export const parseBindings = (reference) => {
  const lines = reference.split("\n");
  const start = lines.findIndex((l) => /^\|\s*declared\s*\|\s*binding\s*\|/.test(l));
  if (start < 0) return [];
  const out = [];
  // Stop at the table's end, or at the separator of a table that follows with no blank line.
  for (let i = start + 2; i < lines.length && lines[i].startsWith("|") && !/^\|\s*-/.test(lines[i]); i++) {
    const [, declared, binding] = lines[i].split("|").map((c) => c.trim());
    for (const d of declared.match(/`([a-z]+)`/g) || []) out.push({ declared: d.slice(1, -1), binding, doc_line: i + 1 });
  }
  return out;
};

// The deployer's reference has a table "| method | caller | what it does |". Each row: `a`, `b` | who calls them | text.
export const parseMethodTable = (reference) => {
  const lines = reference.split("\n");
  const start = lines.findIndex((l) => /^\|\s*method\s*\|\s*caller\s*\|/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith("|") && !/^\|\s*-/.test(lines[i]); i++) {
    const [, method, caller] = lines[i].split("|").map((c) => c.trim());
    for (const m of method.match(/`[a-z]+\.[A-Za-z]+`/g) || []) out.push({ method: m.slice(1, -1), caller, doc_line: i + 1 });
  }
  return out;
};

// What a binding row says the Worker gets, as a short product name.
export const productOf = (binding) => {
  const rules = [[/one D1 database of the Brain/, "D1 (shared)"], [/D1 database of the Worker's own/, "D1 (own)"], [/Vectorize/, "Vectorize"],
    [/Analytics Engine/, "Analytics Engine"], [/R2 bucket/, "R2"], [/^`CORE`/, "brain-core"], [/^`DEPLOYER`/, "brain-deployer"],
    [/^`ASSETS`/, "page assets"], [/BROWSER/, "Browser Rendering"]];
  for (const [re, name] of rules) if (re.test(binding)) return name;
  return null;
};

export const loadBrain = async (base, fetchImpl = fetch, { tests: withTests = true } = {}) => {
  const u = brainUrls(base);
  const json = async (url) => { const r = await fetchImpl(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); };
  // part=reference answers text/plain; the whole source answers JSON.
  const text = async (url) => { const r = await fetchImpl(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.text(); };
  const { services } = await json(`${u.kernel}/xrpc/${NS}service.list`);
  const infos = await Promise.all(services.map((s) => json(`${u.kernel}/xrpc/${NS}getInfo?worker=${s.worker}`)));
  const depInfo = await json(`${u.deployer}/xrpc/${NS}getInfo`);
  const depRef = await text(`${u.deployer}/xrpc/${NS}getSource?part=reference`);
  // Each Worker's lexicons give its methods' parameters and bodies. A Worker that does not answer has none.
  const lexicons = Object.fromEntries(await Promise.all(services.map(async (s) => [s.worker,
    await json(`${u.kernel}/xrpc/${NS}getSource?worker=${s.worker}&part=lexicons`).then((r) => r.lexicons || [], () => [])])));
  const tests = withTests ? await loadTestNames(base, services.map((s) => s.worker), fetchImpl) : undefined;
  return { base, fetchedAt: new Date().toISOString(), services, infos, depInfo, depRef, lexicons, tests };
};

// The names of each Worker's test cells, from its whole source. No part answers less: 31 sources, 6.4 MB (2026-11-04).
export const testNamesOf = (text) => [...new Set([...text.matchAll(/const _[a-z0-9]+_(test_[A-Za-z0-9_]+) = (?:async )?function/g)].map((m) => m[1]))];
export const loadTestNames = async (base, workers, fetchImpl = fetch) => {
  const u = brainUrls(base);
  const urls = [...workers.map((w) => [w, `${u.kernel}/xrpc/${NS}getSource?worker=${w}`]), ["brain-deployer", `${u.deployer}/xrpc/${NS}getSource`]];
  return Object.fromEntries(await Promise.all(urls.map(async ([w, url]) => [w, await fetchImpl(url).then((r) => r.json()).then((j) => testNamesOf(j.text || ""), () => [])])));
};

// A test whose name names a stranger. The bodies are not read.
export const STRANGER = /stranger|anonymous|anyone|outsider|public/;

const WHO = ["anyone", "workers", "owner"];

// A method's signature from its lexicon: name(query params) {JSON body fields}, or the body's encoding.
// An optional field ends in "?".
export const signatureOf = (lex) => {
  const m = lex.defs?.main || {};
  const fields = (o) => { const req = new Set(o?.required || []); return Object.keys(o?.properties || {}).map((k) => (req.has(k) ? k : k + "?")); };
  const body = fields(m.input?.schema);
  const tail = body.length ? ` {${body.join(", ")}}` : m.input?.encoding ? ` ${m.input.encoding}` : "";
  return `${short(lex.id)}(${fields(m.parameters).join(", ")})${tail}`;
};

// Raw answers to tables. Pure, so a saved answer gives the same tables.
export const tablesOf = ({ base, fetchedAt, services, infos, depInfo, depRef, lexicons = {}, tests: testNames = {} }) => {
  const u = brainUrls(base);
  const ref = (w) => `${u.kernel}/xrpc/${NS}getSource?worker=${w}&part=reference`;
  const info = new Map(infos.map((i) => [i.name, i]));
  const workers = services.map((s) => {
    const i = info.get(s.worker) || {};
    const methods = Object.values(s.methods || {});
    const widest = methods.length ? Math.min(...methods.map((m) => WHO.indexOf(m.who)).filter((k) => k >= 0)) : null;
    return {
      id: s.worker, name: s.worker.replace("brain-x-", ""), role: s.role, module: s.module, hash: (s.hash || "").slice(0, 12),
      verified: s.verified ? (s.verified.ok ? "passed" : "failed") : "none", tests: s.verified?.tests ?? null,
      deployed_at: i.deployedAt || null, deployed_day: (i.deployedAt || "").slice(0, 10) || null,
      methods_n: methods.length, secrets_n: (i.secrets || []).length,
      exposure: Number.isFinite(widest) ? widest : null, exposure_name: Number.isFinite(widest) ? WHO[widest] : null,
      test_cells: testNames[s.worker]?.length ?? null, tests_said: testNames[s.worker] ? `${testNames[s.worker].length} test cells` : null, holds: [...(i.cloudflare || []), ...(i.secrets?.length ? [`${i.secrets.length} secret${i.secrets.length > 1 ? "s" : ""}`] : [])].join(" · ") || null,
      href: ref(s.worker)
    };
  });
  workers.push({
    id: "brain-deployer", name: "brain-deployer", role: depInfo.role || "deployer", module: depInfo.module || null, hash: (depInfo.hash || "").slice(0, 12),
    verified: "none", tests: null, deployed_at: depInfo.deployedAt || null, deployed_day: (depInfo.deployedAt || "").slice(0, 10) || null,
    methods_n: null, secrets_n: (depInfo.secrets || []).length, exposure: null, exposure_name: null,
    test_cells: testNames["brain-deployer"]?.length ?? null, tests_said: testNames["brain-deployer"] ? `${testNames["brain-deployer"].length} test cells` : null, holds: (depInfo.secrets || []).length ? `${depInfo.secrets.length} secrets` : null,
    href: `${u.deployer}/xrpc/${NS}getSource?part=reference`
  });
  const sig = new Map(Object.values(lexicons).flat().map((l) => [short(l.id), signatureOf(l)]));
  // params is the signature after the method's name; who_rank orders who: anyone, workers, owner.
  const methods = services.flatMap((s) => Object.entries(s.methods || {}).map(([name, m]) => {
    const id = short(name), signature = sig.get(id) || id + "(…)";
    return { id, name: id.slice(id.indexOf(".") + 1), worker: s.worker, type: m.type, who: m.who, who_rank: WHO.includes(m.who) ? WHO.indexOf(m.who) : null, signature, params: signature.slice(id.length) };
  }));
  const all = [...infos, { ...depInfo, name: "brain-deployer" }];
  const calls = all.flatMap((i) => (i.calls || []).map((m) => ({ worker: i.name, method: short(m) })));
  const resources = all.flatMap((i) => (i.resources || []).map((r) => ({ worker: i.name, declared: r })));
  const permissions = infos.flatMap((i) => (i.cloudflare || []).map((g) => ({ worker: i.name, grp: g })));
  // Names of the secret bindings each Worker declares, as getInfo publishes them. No values.
  const secrets = all.flatMap((i) => (i.secrets || []).map((name) => ({ worker: i.name, name })));
  const bindings = parseBindings(depRef).map((b) => ({ ...b, product: productOf(b.binding), href: `${u.deployer}/xrpc/${NS}getSource?part=reference` }));
  // The two deploy facts the docs state, each only with the sentence it rests on.
  const sentences = depRef.split(/\n|\|/).flatMap((l) => l.match(/[^.]+\./g) || []).map((x) => x.trim());
  const saysDeploys = sentences.find((x) => /\bdeploys\b/.test(x) && /Worker/.test(x) && !x.startsWith("The installer"));
  const saysInstaller = sentences.find((x) => x.startsWith("The installer deploys"));
  const deploys = [
    ...(saysDeploys ? workers.filter((w) => w.id !== "brain-deployer").map((w) => ({ deployer: "brain-deployer", worker: w.id, said: saysDeploys })) : []),
    ...(saysInstaller ? [{ deployer: "installer", worker: "brain-deployer", said: saysInstaller }] : [])
  ];
  // The installer is not a Worker; it is the one actor the docs name.
  const actors = saysInstaller ? [{ id: "installer", name: "installer" }] : [];
  // A product is a value of bindings.product that is not itself a Worker.
  const workerIds = new Set(workers.map((w) => w.id));
  const products = [...new Set(bindings.filter((b) => b.product && !workerIds.has(b.product)).map((b) => b.product))].sort().map((id) => ({ id, name: id }));
  // The deployer's methods as its reference lists them, and the calls it says a Worker makes to them.
  // Only a caller that names a Worker's role is a claim the published calls can be checked against.
  const table = parseMethodTable(depRef);
  const doc_methods = [...new Set(table.map((r) => r.method))].sort().map((id) => ({ id, name: id.slice(id.indexOf(".") + 1), worker: "brain-deployer", href: `${u.deployer}/xrpc/${NS}getSource?part=reference` }));
  // A role names a Worker only when one Worker holds it (the kernel, the core); 26 Workers are "recipe".
  const holders = Object.groupBy(services, (s) => s.role);
  const byRole = new Map(Object.entries(holders).filter(([, ws]) => ws.length === 1).map(([role, [s]]) => [role, s.worker]));
  const said_calls = table.flatMap((r) => [...byRole].filter(([role]) => new RegExp(`\\bthe ${role}\\b`).test(r.caller)).map(([, w]) => ({ worker: w, method: r.method, said: r.caller })));
  // The doors a stranger may use: a method or a path whose who is anyone.
  const paths = all.flatMap((i) => (i.paths || []).map((p) => ({ id: `${i.name}${p.path}`, worker: i.name, path: p.path, who: p.who })));
  const doors = [...methods, ...paths].filter((d) => d.who === "anyone").map((d) => ({ actor: "stranger", door: d.id }));
  // What a stranger's request reaches: the Workers behind its doors, then what each reached Worker binds, until nothing new.
  const product = new Map(bindings.map((b) => [b.declared, b.product]));
  const holds = Map.groupBy(resources, (r) => r.worker);
  const ownerOf = new Map([...methods, ...paths].map((d) => [d.id, d.worker]));
  const reach = doors.map((d) => ({ from: "stranger", to: d.door }));
  const seen = new Set(), todo = [...new Set(doors.map((d) => ownerOf.get(d.door)))];
  while (todo.length) {
    const w = todo.shift();
    if (seen.has(w)) continue;
    seen.add(w);
    for (const { declared } of holds.get(w) || []) {
      if (!product.get(declared)) continue;
      reach.push({ from: w, to: declared });
      if (workerIds.has(product.get(declared))) todo.push(product.get(declared));
    }
  }
  const tests = Object.entries(testNames).flatMap(([worker, names]) => names.map((name) => ({ id: `${worker}/${name}`, worker, name })));
  const stranger_tests = tests.filter((t) => STRANGER.test(t.name)).map((t) => ({ actor: "stranger", test: t.id }));
  actors.push({ id: "stranger", name: "a stranger" });
  return { meta: [{ base, fetchedAt }], workers, methods, calls, resources, permissions, secrets, bindings, products, actors, deploys, doc_methods, said_calls, paths, doors, reach, tests, stranger_tests };
};


// cb4's tables with their keys. A binding's product is a Worker (brain-core, brain-deployer) or a product row;
// a deployer is a Worker or the installer.
export const brainSchema = {
  tables: {
    workers: { key: "id", label: "name", href: "href" },
    methods: { key: "id", label: "name", refs: { worker: "workers" } },
    calls: { link: ["worker", "method"], refs: { worker: "workers", method: ["methods", "doc_methods"] } },
    doc_methods: { key: "id", label: "name", href: "href", refs: { worker: "workers" }, prov: "docs" },
    said_calls: { link: ["worker", "method"], refs: { worker: "workers", method: ["methods", "doc_methods"] }, prov: "docs" },
    secrets: { key: ["worker", "name"], label: "name", refs: { worker: "workers" } },
    resources: { link: ["worker", "declared"], refs: { worker: "workers", declared: "bindings" } },
    bindings: { key: "declared", label: "declared", href: "href", refs: { product: ["workers", "products"] }, prov: "docs" },
    products: { key: "id", label: "name" },
    actors: { key: "id", label: "name" },
    deploys: { link: ["deployer", "worker"], refs: { deployer: ["workers", "actors"], worker: "workers" }, prov: "docs" },
    permissions: { key: ["worker", "grp"], label: "grp", refs: { worker: "workers" } },
    paths: { key: "id", label: "path", refs: { worker: "workers" } },
    doors: { link: ["actor", "door"], refs: { actor: "actors", door: ["methods", "paths"] } },
    reach: { link: ["from", "to"], refs: { from: ["actors", "workers"], to: ["methods", "paths", "bindings"] } },
    tests: { key: "id", label: "name", refs: { worker: "workers" } },
    stranger_tests: { link: ["actor", "test"], refs: { actor: "actors", test: "tests" } }
  }
};

