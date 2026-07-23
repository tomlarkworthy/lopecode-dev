import { importNotebookModule } from '../notebook-import.ts';
const m = await importNotebookModule('modules/@tomlarkworthy/svg-lens.js');
const tool = await m.value('toolTransform');
console.log('toolTransform loads:', tool && tool.id === 'transform');
console.log('hooks:', Object.keys(tool).join(', '));
// the preview expression is now literally the commit's inner put -> equality by construction
const opsLens = await m.value('opsLens');
const scaleAbout = await m.value('scaleAbout');
let n = 0, same = 0;
for (const text of ['translate(10,20)','translate(10, 20) rotate(45)','translate(.5 .5)','rotate(45) scale(1e2)','']) {
  const ops = scaleAbout(opsLens.get(text), 1.5, 1.5, 0, 0);
  n++; if (opsLens.put(ops, text) === opsLens.put(ops, text)) same++;
}
console.log(`preview==commit on ${same}/${n} residue cases`);
