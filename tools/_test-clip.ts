import { importNotebookModule } from './notebook-import.ts';
const m = await importNotebookModule('modules/@tomlarkworthy/svg-lens.js', {});
const cmdClipMask = await m.value('cmdClipMask');
const parseDoc = await m.value('parseDoc');
const src = `<svg xmlns="http://www.w3.org/2000/svg"><rect id="a" x="0" y="0" width="10" height="10" fill="red"/><rect id="b" x="5" y="5" width="10" height="10" fill="blue"/></svg>`;
const env = { src, paths: [[0,0],[0,1]] };
for (const kind of ['clip','mask']) {
  const cmd = cmdClipMask(kind);
  const plan = cmd.plan(env);
  if (!plan) { console.log(kind, 'PLAN NULL'); continue; }
  const out = plan.apply(src);
  console.log(`\n=== ${kind} ===\n` + out);
  // assertions
  const attr = kind === 'clip' ? 'clip-path' : 'mask';
  const wrap = kind === 'clip' ? 'clipPath' : 'mask';
  const ok = out.includes(`${attr}="url(#${kind}1)"`) && out.includes(`<${wrap} id="${kind}1">`) && !/rect id="b"[^>]*\/>\s*<\/svg>/.test(out);
  // parse-check
  let parses = true; try { parseDoc(out); } catch(e){ parses=false; }
  console.log(kind, ok ? 'STRUCT OK' : 'STRUCT FAIL', parses ? 'PARSES' : 'PARSE FAIL',
    'rectB-deleted-from-body:', !out.match(/<rect id="b"[^>]*\/><\/svg>/));
}
