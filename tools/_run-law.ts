import { importNotebookModule } from './notebook-import.ts';
const m = await importNotebookModule('modules/@tomlarkworthy/svg-lens.js', {});
const laws = process.argv.slice(2).join(' ').split(/[\s,]+/).filter(Boolean);
let pass = 0, fail = 0;
for (const law of laws) {
  try { const v = await m.value(law); pass++; if (v && String(v).startsWith('❌')) { fail++; console.log('FAIL', law, String(v).slice(0,120)); } }
  catch (e) { fail++; console.log('FAIL', law, String(e).slice(0,140)); }
}
console.log(`\n${pass} ok, ${fail} failed of ${laws.length}`);
