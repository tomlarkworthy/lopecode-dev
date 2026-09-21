import { readFileSync } from 'fs';
import * as acorn from 'acorn';
const src = readFileSync('modules/@tomlarkworthy/exporter-3.js', 'utf8');
try {
  acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  console.log('parse OK  bytes=' + src.length);
} catch (e) { console.log('PARSE FAIL: ' + e.message); process.exit(1); }
const i = src.indexOf('const _rh1 = function _resolveHeadless(){return(');
const j = src.indexOf('\nconst _rh2 ', i);
const m = src.slice(i, j).match(/^const \w+ = (function [\s\S]*)$/);
const f = (0, eval)('(' + m[1].replace(/;\s*$/, '') + ')')();
const eq = (l, got, want) => console.log((got === want ? 'PASS' : 'FAIL') + '  ' + l + '  got=' + JSON.stringify(got));
eq('explicit false beats bootconf true  (the regression)', f(false, true), false);
eq('explicit false, bootconf false', f(false, false), false);
eq('absent falls back to bootconf true', f(undefined, true), true);
eq('null falls back to bootconf true', f(null, true), true);
eq('absent, bootconf false', f(undefined, false), false);
eq('no bootconf at all (observablehq.com)', f(undefined, undefined), false);
eq('explicit true beats bootconf false', f(true, false), true);
eq('explicit true, no bootconf', f(true, undefined), true);
