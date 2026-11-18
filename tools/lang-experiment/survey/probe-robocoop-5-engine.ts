// Hand-check of classify.ts on @tomlarkworthy/robocoop-5-engine (predicted 64% Y by lines). Same harness
// as probe-lopepage-urls.ts. Outside names are cells that stay Observable JavaScript in a mixed module.
import { checkSources, type Sources } from "../lite/core.ts";
const nb = (cells: string, outside: { name: string; view?: boolean }[] = []): Sources => ({ cells, tsx: true, outside });
const report = (id: string, note: string, src: Sources) => {
  const r = checkSources(src);
  const mod = r.module.map((e: any) => `module [${e.rule}] ${e.msg}`);
  const cells = r.cells.map((x: any) => `${x.name}: ${x.status}${x.errors?.length ? " " + x.errors.map((e: any) => `[${e.rule}] L${e.line} ${e.msg}`).join("; ") : ""}`);
  console.log(`${id} ${note}\n   ${[...mod, ...cells].join("\n   ")}`);
};

// R1 predicted Y: a rule record with a check function, and its test
report("R1", "hook_prompt, rule_prompt_role, test_rule_role_fires (Y)", nb(`
type Rule = { readonly id: string; readonly hook: string; readonly order: number; readonly always?: boolean; readonly evidence: { readonly run: string | null; readonly what: string }; readonly check: (ctx: {}) => string };
const hook_prompt = () => ({ name: 'prompt', compose: 'join', sep: '\\n\\n', onThrow: 'skip' });
const rule_prompt_role = (): Rule => ({
  id: 'role', hook: 'prompt', order: 10, always: true,
  evidence: { run: null, what: 'a section of the prompt as it stood on 2026-10-04; the text is unchanged' },
  check: () => \`You are a coding agent that builds and edits Observable notebook modules.\`
});
const test_rule_role_fires = (rule_prompt_role) => {
  const t = rule_prompt_role.check({});
  if (typeof t !== 'string' || !t.startsWith("You are a coding agent")) throw new Error('got ' + String(t).slice(0, 60));
  return t.length + ' chars';
};`));

// R2 predicted Y: openrouter_orderModels over the catalog; openrouter_catalog stays OJS (N: DOM) and holds a Set
report("R2", "openrouter_orderModels (Y) and openrouter_models taking the OJS catalog {ids, vision: Set}", nb(`
type Catalog = { readonly ids: readonly string[]; readonly vision: ReadonlySet<string> };
const openrouter_orderModels = () => (catalog: Catalog, demoMode: boolean): readonly string[] => {
  const ids = catalog.ids;
  const sees = (id: string) => ids.includes(id) && catalog.vision.has(id);
  const DEMO_DEFAULT = ['xiaomi/mimo-v2.5', 'xiaomi/mimo-v2.6-flash'].find(sees) || ids.find(sees) || ['xiaomi/mimo-v2.5-pro', 'xiaomi/mimo-v2.6-flash'].find((id) => ids.includes(id));
  if (!demoMode || !DEMO_DEFAULT) return ids;
  return [DEMO_DEFAULT, ...ids.filter((id) => id !== DEMO_DEFAULT)];
};
const demoMode = () => false;
const openrouter_models = (demoMode, openrouter_catalog: Catalog, openrouter_orderModels) => openrouter_orderModels(openrouter_catalog, demoMode);`,
  [{ name: "openrouter_catalog" }]));
report("R2b", "same, the catalog passed as {ids, vision: string[]} by an OJS helper cell", nb(`
type CatalogData = { readonly ids: readonly string[]; readonly vision: readonly string[] };
const openrouter_orderModels = () => (catalog: CatalogData, demoMode: boolean): readonly string[] => {
  const ids = catalog.ids;
  const sees = (id: string) => ids.includes(id) && catalog.vision.includes(id);
  const DEMO_DEFAULT = ids.find(sees);
  if (!demoMode || !DEMO_DEFAULT) return ids;
  return [DEMO_DEFAULT, ...ids.filter((id) => id !== DEMO_DEFAULT)];
};
const demoMode = () => false;
const openrouter_models = (demoMode, catalog_data: CatalogData, openrouter_orderModels) => openrouter_orderModels(catalog_data, demoMode);`,
  [{ name: "catalog_data" }]));

// R3 predicted Y: the rule clears a Map its caller owns, and its test asserts the clear
report("R3", "rule_turnEnd_unwritten: u.clear() on sessionState.unwritten (caller's Map)", nb(`
type Ctx = { readonly kind: string; readonly sessionState?: { readonly unwritten?: Map<string, string> } };
const rule_turnEnd_unwritten = () => ({
  id: 'unwritten', hook: 'turnEnd', order: 20,
  check: (ctx: Ctx) => {
    const u = ctx.sessionState?.unwritten;
    if (ctx.kind !== 'complete' || !u || !u.size) return null;
    const miss = [...u].map(([p, why]) => p + ' (' + why + ')');
    u.clear();
    return { continue: 'REJECTED: your last write to ' + miss.join(', ') + ' did not land' };
  }
});`));

// R4 predicted Y: keyView = viewof OPENROUTER_API_KEY re-exported for another module to embed
report("R4", "keyView re-exports the OJS viewof element", nb(`
const keyView = (OPENROUTER_API_KEY: State<string>) => OPENROUTER_API_KEY;`, [{ name: "OPENROUTER_API_KEY", view: true }]));

// R5 predicted Y: demoMode and endpointBase over OJS values (a viewof string, an N cell's record)
report("R5", "demoMode, endpointBase over OJS values", nb(`
const endpointBase = (rc5_endpoint: string, pairedEndpoint: { readonly baseUrl: string } | null) =>
  String(rc5_endpoint || '').trim().replace(/\\/+$/, '') || (pairedEndpoint ? pairedEndpoint.baseUrl : '');
const demoMode = (OPENROUTER_API_KEY: string, endpointBase) => !endpointBase && !String(OPENROUTER_API_KEY || '').trim();`,
  [{ name: "rc5_endpoint" }, { name: "pairedEndpoint" }, { name: "OPENROUTER_API_KEY" }]));

// R6 predicted N (FN): a rule that calls an imported gate function
report("R6", "rule_turnEnd_zero_tool_calls captures zeroToolCallGate from another module", nb(`
const rule_turnEnd_zero_tool_calls = (zeroToolCallGate: (ctx: { kind: string }) => string | null) => ({
  id: 'zero_tool_calls', check: (ctx: { kind: string }) => { if (ctx.kind !== 'complete') return null; const why = zeroToolCallGate(ctx); return why ? { continue: why } : null; }
});`, [{ name: "zeroToolCallGate" }]));
