// Offline sanity for the new outcome criteria: feed REPRESENTATIVE agent output (the canonical Observable
// cell format the system prompt teaches) and assert the criteria score it correctly. No browser/network.
import { runCriterion } from "./criteria.mjs";

let pass = 0, fail = 0;
const check = (label, cond) => { if (cond) { pass++; } else { fail++; console.log("  FAIL:", label); } };

// a function-valued cell (nthPrime) the way the agent should write it
const primesFile =
  "const _nthPrime = function nthPrime(){ return (n) => { const ps=[]; let c=2; while(ps.length<n){ if(ps.every(p=>c%p)) ps.push(c); c++; } return ps[n-1]; }; };\n" +
  "export default function define(runtime, observer){ const main=runtime.module(); main.variable(observer('nthPrime')).define('nthPrime',[],_nthPrime); return main; }\n";
const snapPrimes = { files: { "/notebook/@user/primes.js": primesFile }, modules: {} };
check("cell_fn_evaluates nthPrime good", runCriterion("cell_fn_evaluates", snapPrimes, { file: "/notebook/@user/primes.js", name: "nthPrime", cases: [{ args: [1], equals: 2 }, { args: [6], equals: 13 }, { args: [25], equals: 97 }] }).pass);
check("cell_fn_evaluates nthPrime bad-case fails", !runCriterion("cell_fn_evaluates", snapPrimes, { file: "/notebook/@user/primes.js", name: "nthPrime", cases: [{ args: [1], equals: 999 }] }).pass);

// hardcoded cheat (returns 2 always) must FAIL the multi-case check
const cheatFile = "const _nthPrime = function nthPrime(){ return (n) => 2; };\nexport default function define(r,o){const m=r.module();m.variable(o('nthPrime')).define('nthPrime',[],_nthPrime);return m;}\n";
check("cell_fn_evaluates rejects hardcode", !runCriterion("cell_fn_evaluates", { files: { "/notebook/x.js": cheatFile } }, { file: "/notebook/x.js", name: "nthPrime", cases: [{ args: [1], equals: 2 }, { args: [6], equals: 13 }] }).pass);

// value cell (topThree) + block body
const examFile = "const _topThree = function topThree(){ const s=[54,91,73,88,67,99,81,45,95]; return [...s].sort((a,b)=>b-a).slice(0,3); };\nexport default function define(r,o){const m=r.module();m.variable(o('topThree')).define('topThree',[],_topThree);return m;}\n";
check("cell_evaluates topThree", runCriterion("cell_evaluates", { files: { "/notebook/@user/exam.js": examFile } }, { file: "/notebook/@user/exam.js", name: "topThree", equals: [99, 95, 91] }).pass);

// dataflow: fahrenheit depends on celsius, tested with hidden inputs
const tempFile = "const _celsius=function celsius(){return( 25 )};\nconst _fahrenheit=function fahrenheit(celsius){return( celsius*9/5+32 )};\nexport default function define(r,o){const m=r.module();const $=(p,n,d,f)=>m.variable(o(n)).define(n,d,f);$('a','celsius',[],_celsius);$('b','fahrenheit',['celsius'],_fahrenheit);return m;}\n";
check("cell_evaluates fahrenheit(25)=77", runCriterion("cell_evaluates", { files: { "/notebook/@user/temp.js": tempFile } }, { file: "/notebook/@user/temp.js", name: "fahrenheit", inputs: { celsius: 25 }, equals: 77 }).pass);
check("cell_evaluates fahrenheit(100)=212", runCriterion("cell_evaluates", { files: { "/notebook/@user/temp.js": tempFile } }, { file: "/notebook/@user/temp.js", name: "fahrenheit", inputs: { celsius: 100 }, equals: 212 }).pass);
check("uses_identifier celsius", runCriterion("uses_identifier", { files: { "/notebook/@user/temp.js": tempFile } }, { file: "/notebook/@user/temp.js", ident: "celsius" }).pass);

// CSV parser (object array)
const csvFile = "const _parseCSV=function parseCSV(){ return (text)=>{ const [h,...rows]=text.split('\\n'); const cols=h.split(','); return rows.map(r=>{const v=r.split(','); const o={}; cols.forEach((c,i)=>o[c]=v[i]); return o;}); }; };\nexport default function define(r,o){const m=r.module();m.variable(o('parseCSV')).define('parseCSV',[],_parseCSV);return m;}\n";
check("cell_fn_evaluates parseCSV", runCriterion("cell_fn_evaluates", { files: { "/notebook/@user/csv.js": csvFile } }, { file: "/notebook/@user/csv.js", name: "parseCSV", cases: [{ args: ["name,age\nAda,36\nAlan,41"], equals: [{ name: "Ada", age: "36" }, { name: "Alan", age: "41" }] }] }).pass);

// d3 via LIB_STUBS (extent)
const d3File = "const _span=function span(d3){return( d3.extent([3,1,4,1,5,9,2,6]) )};\nexport default function define(r,o){const m=r.module();m.variable(o('span')).define('span',['d3'],_span);return m;}\n";
check("cell_evaluates d3.extent", runCriterion("cell_evaluates", { files: { "/notebook/@user/dataviz.js": d3File } }, { file: "/notebook/@user/dataviz.js", name: "span", equals: [1, 9] }).pass);

// module_source_contains + module_renders_contains (live)
const liveSnap = { modules: { "@tomlarkworthy/exporter-3": { variables: [{ name: null, source: "function _1(md){return( md`# Lopecode Exporter` )}", valuePreview: "<h1>Lopecode Exporter</h1>", hasError: false }] } } };
check("module_source_contains live edit", runCriterion("module_source_contains", liveSnap, { module: "@tomlarkworthy/exporter-3", needle: "Lopecode Exporter" }).pass);
check("module_renders_contains live edit", runCriterion("module_renders_contains", liveSnap, { module: "@tomlarkworthy/exporter-3", needle: "Lopecode Exporter" }).pass);
check("module_source_contains catches NON-applied edit", !runCriterion("module_source_contains", { modules: { "@tomlarkworthy/exporter-3": { variables: [{ name: null, source: "function _1(md){return( md`# Exporter 3` )}", valuePreview: "", hasError: false }] } } }, { module: "@tomlarkworthy/exporter-3", needle: "Lopecode Exporter" }).pass);

// decomposed reactive design: topThree depends on a sibling `scores` cell — resolver must handle it
const decomposed =
  "const _scores=function scores(){return( [54,91,73,88,67,99,81,45,95] )};\n" +
  "const _topThree=function topThree(scores){return( [...scores].sort((a,b)=>b-a).slice(0,3) )};\n" +
  "export default function define(r,o){const m=r.module();const $=(p,n,d,f)=>m.variable(o(n)).define(n,d,f);$('a','scores',[],_scores);$('b','topThree',['scores'],_topThree);return m;}\n";
check("cell_evaluates resolves sibling dep (topThree<-scores)", runCriterion("cell_evaluates", { files: { "/notebook/@user/exam.js": decomposed } }, { file: "/notebook/@user/exam.js", name: "topThree", equals: [99, 95, 91] }).pass);

console.log(`\ncriteria selftest: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
