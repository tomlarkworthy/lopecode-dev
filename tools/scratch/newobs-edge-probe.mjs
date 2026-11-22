import { loadNextCookies, connectNext, fetchNextNotebook, fetchNextNotebookPage } from '../observable-next.js';
const id = '3ec6cd9f87b28862';
const c = loadNextCookies('tools/.observable-next-cookies.json');
const cases = [
  { mode: 'js', pinned: false, value: 'tag = html`<script>1<\/script></script >`' },
  { mode: 'md', pinned: false, value: '$x$ is maths\n\n    indented code\n\nend' },
  { mode: 'ts', pinned: true, value: 'const n: number = 1;\n\n  display(n);' },
  { mode: 'js', pinned: false, value: 'multi = {\n\n      return   1;\n}' },
];
let nb = await fetchNextNotebook(`https://observablehq.com/d/${id}`, c);
let v = nb.version;
const conn = await connectNext(id, c, v);
const ids = [];
for (const k of cases) {
  const nv = v + 1;
  const done = new Promise((res, rej) => conn.ws.once('message', (d) => { const m = JSON.parse(d); m.type === 'saveconfirm' ? res(m.version) : rej(new Error(m.message + ' ' + m.status)); }));
  conn.send({ type: 'save', version: v, events: [{ version: nv, type: 'insert_node', node_id: nv, new_next_node_id: null, new_node_value: k.value, new_node_pinned: k.pinned, new_node_mode: k.mode, new_node_data: null, new_node_name: null }] });
  v = await done; ids.push(nv);
}
const a = await fetchNextNotebook(id, c);
const b = await fetchNextNotebookPage(id, c);
console.log('versions', v, a.version, b.version);
cases.forEach((k, i) => {
  const x = a.nodes.find((n) => n.id === ids[i]), y = b.nodes.find((n) => n.id === ids[i]);
  console.log(ids[i], 'sent', k.mode, '| export', x?.mode, x?.value === k.value, x?.pinned, '| page', y?.mode, y?.value === k.value, y?.pinned);
  if (x?.value !== k.value) console.log('  export got', JSON.stringify(x?.value));
  if (y?.value !== k.value) console.log('  page got  ', JSON.stringify(y?.value));
});
