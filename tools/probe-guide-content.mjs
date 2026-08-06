// Reads back what a first-time user actually SEES in a generated notebook: the guide prose, the
// generated module list, and every pinned note. Asserts each shipped module is named somewhere.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

const file = resolve('lopecode/notebooks/quick_start.html');
// every optional module, so no tour note goes unexercised
const EXTRAS = ['@tomlarkworthy/editable-md', '@tomlarkworthy/annotate', '@tomlarkworthy/svg-lens', '@tomlarkworthy/at-write',
  '@tomlarkworthy/local-change-history', '@tomlarkworthy/claude-code-pairing', '@tomlarkworthy/sticky',
  '@tomlarkworthy/tests', '@tomlarkworthy/debugger-2', '@tomlarkworthy/grid-container'];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);

const built = await page.evaluate(async ({ EXTRAS, tid }) => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const t = val('templates').find((x) => x.id === tid);
  const cat = val('catalogue');
  // every module the chooser offers must carry a tutorial note, core ones included
  const tours = [...cat.mandatory, ...cat.optional]
    .filter((m) => m.tour && (cat.mandatory.includes(m) || EXTRAS.includes(m.id) || t.modules.includes(m.id)))
    .map((m) => ({ id: m.id, label: m.label, tour: m.tour }));
  const untoured = [...cat.mandatory, ...cat.optional].filter((m) => !m.tour).map((m) => m.id);
  const built = await val('spawnNotebook')({ template: t, name: '@user/guide', title: 'Guide check', modules: EXTRAS, tutorial: true });
  return { ...built, tours, untoured };
}, { EXTRAS, tid: process.argv[2] || 'dataviz' });
await browser.close();

const out = resolve('scratch/guide-check.html');
writeFileSync(out, built.html);

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
await p.goto(`file://${out}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(16000);
const r = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const notes = [];
  for (const v of rt._variables)
    if (typeof v._name === 'string' && /^annotation_tut\d+_note$/.test(v._name)) {
      const n = v._observer && v._observer._node;
      notes.push((n && n.textContent ? n.textContent : '').trim());
    }
  return { text: document.body.innerText, notes, adrift: (document.body.innerText.match(/\(adrift\)/g) || []).length };
});
await p.screenshot({ path: 'tools/screenshots/guide-check.png', fullPage: true });
await b.close();

const MUST = ['⌘K', 'Save in place', 'blob:', 'theme', 'Roboco-op', 'tabs along the top',
  // the reactive model and the editor: the two things a newcomer cannot infer from the page
  'by name', 'Order on the page does not matter', 'viewof', 'Shift-Enter', '⠿', '➕',
  // borrowing a module later, from a notebook we can actually name
  'quick_start', 'Install as module',
  // the reactive model and, per minimalist-instruction research, recovery
  'declarations, not statements', 'two faces', 'mutable',
  'defined more than once', 'circular definition', 'never breaks its neighbours',
  // the builtins a newcomer has no way to discover: they are in scope without an import
  'without importing anything', 'tex', 'mermaid', 'FileAttachment', 'require', 'E = mc^2',
  'fetch themselves on first use'];
const MODULES = ['Page layout', 'Editable prose', 'Save to disk', 'AI agent', 'Annotations',
  'SVG editor', 'Publish to atproto', 'Change history', 'Claude Code pairing',
  'Sticky inputs', 'Unit tests', 'Dataflow debugger', 'Snap grid'];
// A tour is markdown; the rendered note has no ** or backticks. Normalise both and match on a
// distinctive prefix, so a note that failed to render is a failure rather than a silent gap.
// lower-cased: the prose form re-capitalises the sentence the pinned form starts mid-phrase
const norm = (s) => s.replace(/[*`\\]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const notesNorm = r.notes.map(norm);
// A tutorial reaches the reader either as a pinned note or as its paragraph in the module
// section — match against both, so moving one between the two is not a regression.
const pageNorm = norm(r.text);
const reached = (t) => {
  const key = norm(t.tour).replace(/^[^—]+ — /, '').slice(0, 60);
  return notesNorm.some((n) => n.includes(key)) || pageNorm.includes(key);
};
const noteless = built.tours.filter((t) => !reached(t));
const missing = MUST.filter((m) => !r.text.includes(m));
// robocoop-5 is not in EXTRAS, so its row is legitimately absent from the generated list
const unexplained = MODULES.filter((m) => m !== 'AI agent' && !r.text.includes(m));
console.log('--- missing concepts:', missing);
console.log('--- unexplained modules:', unexplained);
console.log('--- modules with no tutorial at all:', built.untoured);
console.log('--- tutorials that did not reach the reader:', noteless.map((t) => t.label));
console.log('--- adrift:', r.adrift);
console.log(`--- ${r.notes.length} pinned notes`);
for (const n of r.notes) console.log('   •', n.replace(/\s+/g, ' ').slice(0, 130));
process.exit(missing.length || unexplained.length || r.adrift || noteless.length || built.untoured.length ? 1 : 0);
