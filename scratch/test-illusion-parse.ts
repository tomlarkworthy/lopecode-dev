import { importNotebookModule } from '../tools/notebook-import.ts';
import fs from 'fs';
const body = fs.readFileSync('scratch/new-drawing-body.txt','utf8');
const svg = body.slice(body.indexOf('<svg'), body.indexOf('</svg>')+6);
const m = await importNotebookModule('modules/@tomlarkworthy/svg-lens.js', {});
const parseDoc = await m.value('parseDoc');
const childrenLens = await m.value('childrenLens');
parseDoc(svg);
console.log('parse OK, top-level els:', childrenLens([0]).get(svg).length);
