// Print each template's generated cell source, so escaping mistakes surface as text, not at runtime.
import { importNotebookModule } from './notebook-import.ts';
const m = await importNotebookModule('modules/@tomlarkworthy/blank-notebook.js', {
  overrides: { md: () => (s: any) => String(s), html: () => () => null, aside: () => () => '' },
});
const templates: any[] = await m.value('templates');
for (const t of templates) {
  console.log('='.repeat(20), t.id, JSON.stringify(t.modules), JSON.stringify(t.suggest));
  for (const src of t.cells({ title: 'My notebook' })) console.log('---\n' + src);
}
