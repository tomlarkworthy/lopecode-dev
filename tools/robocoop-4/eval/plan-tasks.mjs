// Hard, multi-step NOTEBOOK-BUILD tasks for the "plan-in-markdown-first" experiment.
// Unlike eval/tasks.mjs (single bash edits), each task requires composing several reactive cells
// with correct dataflow wiring. Grading is PARTIAL-CREDIT: each task runs N independent structural
// checks against the resulting module source and returns {ok, passed, total, score, detail}.
//
// Grading is intentionally lenient on cell FORM (accepts both compiled `const _x = function _x(deps){...}`
// and Observable-source `x = ...`) so the metric measures whether the agent BUILT the requested
// dataflow, not whether it guessed the serialization. The same grader scores both experiment arms,
// so any form bias cancels in the control-vs-treatment delta.

import { idToPath } from '../fsmap.mjs';
import { parsesWithoutSyntaxError } from './assertions.mjs';

const MOD = '@user/mod';
const P = idToPath(MOD); // /notebook/@user/mod.js

// Run a list of {name, test(src)->bool} checks plus a parse check. Returns partial-credit result.
async function grade(fs, checkList) {
  let src = '';
  try { src = await fs.readFile(P); } catch (e) { /* missing file → all content checks fail */ }
  const parse = await parsesWithoutSyntaxError(fs, MOD);
  const results = [{ name: 'parses', ok: parse.ok }];
  for (const c of checkList) {
    let ok = false;
    try { ok = !!c.test(src); } catch (e) { ok = false; }
    results.push({ name: c.name, ok });
  }
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  const detail = results.map((r) => (r.ok ? '+' : '-') + r.name).join(' ');
  return { ok: passed === total, passed, total, score: passed / total, detail };
}

// A cell `name` is "defined" if the source declares it in either supported form.
const defines = (src, name) =>
  new RegExp('(?:const\\s+_?' + name + '\\s*=\\s*function)|(?:\\bviewof\\s+' + name + '\\b)|(?:(?:^|\\n)\\s*' + name + '\\s*=)', 'm').test(src) ||
  new RegExp('function\\s+_?' + name + '\\b').test(src);
const viewof = (src, name) => new RegExp('viewof\\s+' + name + '\\b').test(src);
const has = (src, ...needles) => needles.every((n) => (n instanceof RegExp ? n.test(src) : src.includes(n)));

export const planTasks = [
  {
    id: 'temp-converter',
    files: { [P]: '// temperature converter\nconst _title = function _title(md){return( md`# Converter` )};\n' },
    prompt:
      `In ${P}, build a reactive temperature converter with these cells:\n` +
      `- viewof celsius: an Inputs.range from -50 to 50 (default 20)\n` +
      `- fahrenheit: celsius converted to Fahrenheit (celsius * 9/5 + 32)\n` +
      `- kelvin: celsius converted to Kelvin (celsius + 273.15)\n` +
      `- summary: a markdown (md) cell that displays celsius, fahrenheit and kelvin.\n` +
      `Keep the file parsing. Match the existing compiled cell format (const _name = function _name(deps){return( ... )};).`,
    assert: (fs) =>
      grade(fs, [
        { name: 'celsius_cell', test: (s) => defines(s, 'celsius') || viewof(s, 'celsius') },
        { name: 'celsius_range', test: (s) => has(s, /Inputs\.range/) },
        { name: 'fahrenheit_cell', test: (s) => defines(s, 'fahrenheit') },
        { name: 'fahrenheit_formula', test: (s) => has(s, /fahrenheit/) && has(s, /9\s*\/\s*5/) && has(s, '32') },
        { name: 'kelvin_cell', test: (s) => defines(s, 'kelvin') },
        { name: 'kelvin_formula', test: (s) => has(s, '273.15') },
        { name: 'summary_md', test: (s) => defines(s, 'summary') && has(s, /md`/) },
      ]),
  },

  {
    id: 'data-pipeline',
    files: {
      [P]:
        '// data pipeline\n' +
        'const _raw = function _raw(){return( [5, -3, 8, -1, 2, 10, -7, 4] )};\n',
    },
    prompt:
      `In ${P} there is an existing cell \`raw\` (an array of numbers, some negative). Add a pipeline:\n` +
      `- cleaned: raw with all negative numbers removed\n` +
      `- scaled: each value of cleaned multiplied by 2\n` +
      `- stats: an object { min, max, mean } computed over scaled\n` +
      `- report: a markdown (md) cell summarising stats (min, max, mean)\n` +
      `Keep the file parsing. Match the existing compiled cell format.`,
    assert: (fs) =>
      grade(fs, [
        { name: 'cleaned_cell', test: (s) => defines(s, 'cleaned') },
        { name: 'cleaned_filters', test: (s) => has(s, /cleaned/) && has(s, /filter/) && has(s, /[<>]=?\s*0|>\s*-1|>=\s*0/) },
        { name: 'scaled_cell', test: (s) => defines(s, 'scaled') && has(s, /map/) && has(s, /\*\s*2/) },
        { name: 'stats_cell', test: (s) => defines(s, 'stats') && has(s, /min/) && has(s, /max/) && has(s, /mean|reduce|\/\s*\w+\.length/) },
        { name: 'report_md', test: (s) => defines(s, 'report') && has(s, /md`/) && has(s, /stats/) },
      ]),
  },

  {
    id: 'gcd-formula',
    files: { [P]: '// math module\nconst _title = function _title(md){return( md`# GCD` )};\n' },
    prompt:
      `In ${P}, build a GCD calculator with these cells:\n` +
      `- viewof a: Inputs.range from 1 to 100 (default 48)\n` +
      `- viewof b: Inputs.range from 1 to 100 (default 36)\n` +
      `- gcd: a function cell that returns the greatest common divisor of two integers (implement it, e.g. Euclid)\n` +
      `- result: gcd applied to a and b, i.e. gcd(a, b)\n` +
      `- doc: a markdown (md) cell showing a, b and result.\n` +
      `Keep the file parsing. Match the existing compiled cell format.`,
    assert: (fs) =>
      grade(fs, [
        { name: 'a_cell', test: (s) => defines(s, 'a') || viewof(s, 'a') },
        { name: 'b_cell', test: (s) => defines(s, 'b') || viewof(s, 'b') },
        { name: 'gcd_cell', test: (s) => defines(s, 'gcd') },
        { name: 'gcd_impl', test: (s) => has(s, /gcd/) && has(s, /%|modulo/) }, // Euclid uses %
        { name: 'result_wires', test: (s) => has(s, /result/) && has(s, /gcd\s*\(\s*a\s*,\s*b\s*\)/) },
        { name: 'doc_md', test: (s) => defines(s, 'doc') && has(s, /md`/) && has(s, /result/) },
      ]),
  },

  {
    id: 'people-table',
    files: {
      [P]:
        '// people\n' +
        "const _people = function _people(){return( [\n" +
        "  {name:'Ada', age:36},{name:'Bo', age:12},{name:'Cy', age:54},{name:'Di', age:17},{name:'Ed', age:29}\n" +
        "] )};\n",
    },
    prompt:
      `In ${P} there is an existing cell \`people\` (array of {name, age}). Add:\n` +
      `- adults: people whose age is >= 18\n` +
      `- byAge: people sorted by age ascending\n` +
      `- avgAge: the mean age over people\n` +
      `- peopleTable: Inputs.table(people)\n` +
      `- summary: a markdown (md) cell with the number of people and the average age.\n` +
      `Keep the file parsing. Match the existing compiled cell format.`,
    assert: (fs) =>
      grade(fs, [
        { name: 'adults_cell', test: (s) => defines(s, 'adults') && has(s, /filter/) && has(s, /age/) && has(s, /18/) },
        { name: 'byAge_cell', test: (s) => defines(s, 'byAge') && has(s, /sort/) },
        { name: 'avgAge_cell', test: (s) => defines(s, 'avgAge') && has(s, /age/) && has(s, /reduce|mean|\/\s*\w+\.length/) },
        { name: 'table_cell', test: (s) => defines(s, 'peopleTable') && has(s, /Inputs\.table/) },
        { name: 'summary_md', test: (s) => defines(s, 'summary') && has(s, /md`/) && has(s, /avgAge|average/) },
      ]),
  },
];
