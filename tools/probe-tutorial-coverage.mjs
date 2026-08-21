// What does a reader actually get, per module, in a fork with everything ticked? A module can be
// "covered" three ways — a pinned note, a section of its own, or one line in the inventory — and
// only the first two read as a tutorial.
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)));
await p.goto(`file://${resolve('lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(25000);
const out = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const cat = val('catalogue'), guide = val('guide');
  const all = [...cat.optional, ...cat.mandatory];
  const ids = [...new Set([...cat.always.map((m) => m.id), ...(cat.cargo || []), ...cat.optional.map((m) => m.id)])];
  const sources = guide({ title: 'T', ids });
  const text = sources.join('\n');
  return all.map((m) => {
    const heading = new RegExp(`### ${m.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n\\n([\\s\\S]*?)(?=\\n###|\\n\`|$)`);
    const sec = text.match(heading);
    return {
      id: m.id, label: m.label, kind: cat.optional.includes(m) ? 'optional' : 'core',
      pinned: !!m.pin, near: m.near || null, hasTour: !!m.tour,
      sectionChars: sec ? sec[1].trim().length : 0,
      whyChars: (m.why || '').length,
      tourChars: (m.tour || '').length,
    };
  });
});
await b.close();
const w = (s, n) => String(s).padEnd(n);
console.log(w('module', 26), w('kind', 9), w('placed', 10), w('section', 8), 'tour');
for (const r of out) {
  const placed = r.pinned ? 'note(pin)' : r.near ? 'note(near)' : r.sectionChars > r.whyChars + 10 ? 'section' : 'one-liner';
  console.log(w(r.label, 26), w(r.kind, 9), w(placed, 10), w(r.sectionChars, 8), r.tourChars);
}
const thin = out.filter((r) => !r.pinned && !r.near && r.sectionChars <= r.whyChars + 10);
console.log(`\n${thin.length} modules get only a one-liner: ${thin.map((r) => r.label).join(', ') || 'none'}`);
