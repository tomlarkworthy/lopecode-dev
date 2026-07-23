import { importNotebookModule } from '../notebook-import.ts';
const m = await importNotebookModule('modules/@tomlarkworthy/svg-lens.js');
const opsLens   = await m.value('opsLens');
const printOp   = await m.value('printOp');
const scaleAbout= await m.value('scaleAbout');
const rotateAbout=await m.value('rotateAbout');

const cases = [
  'translate(10,20)',
  'translate(10, 20) rotate(45)',
  'matrix(0.707 0.707 -0.707 0.707 0 0)',
  'translate(.5 .5)',
  'rotate(45) scale(1e2)',
  ''
];
let diverged = 0;
for (const text of cases) {
  const base = opsLens.get(text);
  for (const [label, ops] of [
    ['scale', scaleAbout(base, 1.5, 1.5, 0, 0)],
    ['rot',   rotateAbout(base, 30, 0, 0)]
  ] as [string, any][]) {
    const preview = ops.map(printOp).join(' ');       // what toolTransform paints today
    const commit  = opsLens.put(ops, text);           // what toolTransform commits
    const same = preview === commit;
    if (!same) diverged++;
    console.log(`${same ? 'ok  ' : 'DIFF'} ${label.padEnd(5)} src=${JSON.stringify(text)}`);
    if (!same) {
      console.log(`       preview: ${JSON.stringify(preview)}`);
      console.log(`       commit : ${JSON.stringify(commit)}`);
    }
  }
}
console.log(`\n${diverged} of ${cases.length*2} diverge`);
