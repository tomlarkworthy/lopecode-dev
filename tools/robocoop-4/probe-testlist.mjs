import { loadNotebook } from '../../tools/lope-runtime.js';
const ex = await loadNotebook('lopebooks/notebooks/@tomlarkworthy_robocoop-4.html', { settleTimeout: 30000 });
const r = await ex.runTests(30000, 'test_rc4_');
for (const t of r.tests.filter(t=>t.name.startsWith('test_rc4_'))) console.log(t.state.padEnd(8), t.name, t.error?('— '+t.error):'');
ex.dispose(); process.exit(0);
