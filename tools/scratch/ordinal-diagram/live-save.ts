// Saves cb4's public answers as the fixture the tests and the offline page use.
import { loadBrain } from "./live.js";
const raw = await loadBrain("cb4");
// Keep only the parts of the deployer reference tablesOf reads, and the methods' type and who.
const keep = raw.depRef.split("\n").filter((l) => l.startsWith("|") || l.includes("The installer deploys")).join("\n");
const services = raw.services.map((s) => ({ worker: s.worker, role: s.role, module: s.module, hash: s.hash, verified: s.verified && { ok: s.verified.ok, tests: s.verified.tests }, methods: Object.fromEntries(Object.entries(s.methods || {}).map(([k, m]) => [k, { type: m.type, who: m.who }])) }));
// Lexicons: only what signatureOf reads.
const slim = (o) => o && { required: o.required, properties: Object.fromEntries(Object.keys(o.properties || {}).map((k) => [k, {}])) };
const lexicons = Object.fromEntries(Object.entries(raw.lexicons).map(([w, ls]) => [w, ls.map((l) => {
  const m = l.defs?.main || {};
  return { id: l.id, defs: { main: { type: m.type, parameters: slim(m.parameters), input: m.input && { encoding: m.input.encoding, schema: slim(m.input.schema) } } } };
})]));
await Bun.write(new URL("./cb4-public.json", import.meta.url), JSON.stringify({ ...raw, services, depRef: keep, lexicons }));
console.log(raw.fetchedAt, raw.services.length, "services", raw.depRef.length, "chars of deployer reference");
