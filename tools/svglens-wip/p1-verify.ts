import { importNotebookModule } from '../notebook-import.ts';
const m = await importNotebookModule('modules/@tomlarkworthy/svg-lens.js');
const D = await m.value('gestureDelta');
const preview = await m.value('previewDelta');
const commit  = await m.value('commitDelta');
const opsLens = await m.value('opsLens');
const ok = (c: boolean, s: string) => console.log((c ? 'ok   ' : 'FAIL ') + s);

// text(): the one expression both sinks read
const scaleAbout = await m.value('scaleAbout');
const base = 'translate(10,20)';
const ops  = scaleAbout(opsLens.get(base), 2, 2, 0, 0);   // full op list, as the tool builds it
const t    = D.text(D.attr(1,'transform',ops,{lens:opsLens,base}));
ok(t === opsLens.put(ops, base) && t.startsWith('translate(10,20)'),
   'text() with a lens == the commit put, residue kept: ' + JSON.stringify(t));
ok(D.text(D.attr(1,'points','0,0 1,1')) === '0,0 1,1', 'text() without a lens is the value');

// previewDelta paints exactly text(), for one delta and for a list
const els: any[] = [ {}, {a:{}, setAttribute(n,v){this.a[n]=v;}}, {a:{}, setAttribute(n,v){this.a[n]=v;}} ];
for (const e of els.slice(1)) e.a = {};
const ctx: any = { elems: () => els, writer: {
  commit: async (...a: any[]) => ({ kind:'commit', a }),
  runCommand: async (n: string, f: any, o: any) => ({ kind:'command', n, rebase: o.rebase })
}, focus: { set(){}, setAll(){} } };
preview(ctx, D.attr(1,'points','0,0 1,1'));
ok((els[1] as any).a.points === '0,0 1,1', 'previewDelta writes one attr');
preview(ctx, [D.attr(1,'x','5'), D.attr(2,'x','7')]);
ok((els[1] as any).a.x === '5' && (els[2] as any).a.x === '7', 'previewDelta handles a list');
preview(ctx, D.command('noop', (d:any)=>d));
ok(true, 'previewDelta ignores commands');

// commitDelta dispatches by kind
const r1 = await commit(ctx, D.attr(1,'points','0,0'));
ok(r1[0].kind === 'commit', 'commitDelta routes attr -> writer.commit');
const r2 = await commit(ctx, D.command('insertElement', (d:any)=>d, {rebase:(p:any)=>p}));
ok(r2[0].kind === 'command' && typeof r2[0].rebase === 'function', 'commitDelta routes command + rebase');
const r3 = await commit(ctx, D.select([[0,1]], 'points'));
ok(r3[0] === null, 'commitDelta: select is not a source edit');
try { await commit(ctx, {kind:'bogus'}); ok(false,'unknown kind throws'); }
catch { ok(true, 'unknown kind throws'); }
