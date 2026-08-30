import { importNotebookModule } from '../tools/notebook-import.ts';
import fs from 'fs';

// extract the <svg>...</svg> from the standalone html
const html = fs.readFileSync('scratch/neon-disk.html', 'utf8');
const svg = html.slice(html.indexOf('<svg'), html.indexOf('</svg>') + 6);

const m = await importNotebookModule('modules/@tomlarkworthy/svg-lens.js', {});
const parseDoc = await m.value('parseDoc');
const nodeAt = await m.value('nodeAt');
const childrenLens = await m.value('childrenLens');

const doc = parseDoc(svg);
console.log('parseDoc OK. root tag:', doc.tag, 'children:', doc.children.length);
// walk: list top-level element tags
const kids = childrenLens([0]).get(svg);
console.log('top-level element count via childrenLens:', kids.length);
// find the text nodes deep — verify nodeAt reaches something
function walk(n, path, depth) {
  if (depth > 30) return;
  for (let i = 0; i < n.children.length; i++) {
    const c = n.children[i];
    if (c.tag === 'text') console.log('found <text> at path', JSON.stringify([...path, i]), 'run=', svg.slice(c.innerStart, c.innerEnd).trim().slice(0,20));
    walk(c, [...path, i], depth + 1);
  }
}
walk(doc, [0], 0);
console.log('ALL GOOD — lens parsed the neon disk with filters/clipPath/text');
