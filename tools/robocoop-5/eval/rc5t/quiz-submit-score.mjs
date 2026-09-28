// rc5-train eval (20260928-0847-w17): a quiz whose score must be right for a known set of answers,
// and whose Submit must not break when pressed before any question is answered.
// Run 20260928-0847-w17-before built this correctly on the first attempt (radio form + htl Submit
// button + mutable submitted + score cell); this eval is a regression guard with no defect behind it.
//
// Topic-independent: the questions are pinned to arithmetic only so the collector can compute the answer
// key itself (it parses "a op b" in each question). Any layout passes: all on one page or one at a time,
// radios, a select, one button per option, typed answers.
// setup.collect: (1) if a Submit control is enabled before anything is answered, press it; the page must
// show no NaN / undefined / [object …] / cell error, and any score shown must be 0; then press a
// restart control if there is one. (2) Answer every question through the DOM, 1st/3rd/5th right,
// 2nd/4th wrong, press Submit/Next, and require a score of 3 out of 5 (or 60%).

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const newVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!newVars.length) return "no module was created";
  let userVars = newVars;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => String(s).replace(/\s+/g, " ").trim();
  // "a op b" inside a question; a leading "question"/"score"/"q" marks a counter like "Question 1/5"
  const OP = { "+": (a, b) => a + b, "-": (a, b) => a - b, "−": (a, b) => a - b, "–": (a, b) => a - b,
    "×": (a, b) => a * b, "x": (a, b) => a * b, "X": (a, b) => a * b, "*": (a, b) => a * b, "·": (a, b) => a * b,
    "÷": (a, b) => a / b, "/": (a, b) => a / b };
  const exprsIn = t => { t = norm(t); const out = [];
    for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*([-+−–×xX*·÷/])\s*(\d+(?:\.\d+)?)(?![\d.])/g)) {
      const pre = t.slice(Math.max(0, m.index - 14), m.index).toLowerCase();
      if (/(question|score|q|of|#|correct|got)\s*:?\s*$/.test(pre)) continue;
      const k = m[1] + m[2] + m[3]; if (!out.includes(k)) out.push(k); }
    return out; };
  const valueOf = k => { const m = k.match(/^(\d+(?:\.\d+)?)([-+−–×xX*·÷/])(\d+(?:\.\d+)?)$/); return OP[m[2]](+m[1], +m[3]); };
  const numOf = label => { const m = norm(label).replace(/^[a-dA-D][).:]\s*/, "").match(/^-?\d+(?:\.\d+)?/); return m ? +m[0] : null; };
  const isRight = (label, k) => { const n = numOf(label); return n != null && Math.abs(n - valueOf(k)) < 0.01; };

  const keepers = [];
  for (const v of newVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(1000);
    // only modules that render the quiz: other modules can load during the turn (code-metrics shows "100%")
    const textOfVar = v => v._value instanceof Element ? v._value.textContent : typeof v._value === "string" ? v._value : "";
    const quizMods = new Set([...new Set(newVars.map(v => v._module))].filter(m => exprsIn(newVars.filter(v => v._module === m).map(textOfVar).join(" | ")).length >= 3));
    if (!quizMods.size) return "no module renders three or more arithmetic questions";
    userVars = newVars.filter(v => quizMods.has(v._module));
    const roots = () => userVars.map(v => v._value).filter(x => x instanceof Element);
    const texts = () => userVars.map(v => { const x = v._value;
      if (x instanceof Element) return x.textContent;
      return typeof x === "string" || typeof x === "number" ? String(x) : ""; }).join(" | ");
    const errors = () => userVars.filter(v => v._error != null).map(v => v._name + ": " + String(v._error?.message ?? v._error).slice(0, 80));
    const hidden = el => { for (let e = el; e; e = e.parentElement) { if (e.hidden || (e.style && (e.style.display === "none" || e.style.visibility === "hidden"))) return true; } return false; };
    const all = sel => roots().flatMap(r => [...(r.matches(sel) ? [r] : []), ...r.querySelectorAll(sel)]).filter(e => !e.disabled && !hidden(e));
    const answered = [];
    const plan = i => i % 2 === 0;
    const exprFor = el => {
      for (let e = el, d = 0; e && d < 6; e = e.parentElement, d++) {
        const es = exprsIn(e.textContent).filter(k => !answered.includes(k));
        if (es.length === 1) return es[0];
        if (es.length > 1) break;
      }
      const u = exprsIn(texts()).filter(k => !answered.includes(k));
      return u.length === 1 ? u[0] : null;
    };
    const labelOf = inp => (inp.closest("label")?.textContent || (inp.id && inp.ownerDocument.querySelector('label[for="' + inp.id + '"]')?.textContent) || inp.nextSibling?.textContent || inp.value || "");
    const fire = (el, ...types) => types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
    const SUBMIT = /submit|check|next|answer|finish|done|result|score|continue|confirm|→|✓/i;
    const NOT = /restart|reset|again|retry|start over|new quiz|clear|retake/i;
    const lbl = b => b.textContent || b.value || "";
    const answerOne = async () => {
      const forms = new Map();
      for (const r of all("input[type=radio]")) { const f = r.form || r.closest("fieldset") || r.parentElement?.parentElement;
        if (!forms.has(f)) forms.set(f, new Map()); const byName = forms.get(f); const k = r.name || "";
        if (!byName.has(k)) byName.set(k, []); byName.get(k).push(r); }
      for (const byName of forms.values()) for (const rs of byName.values()) {
        if (rs.some(r => r.checked)) continue;
        const k = exprFor(rs[0]); if (!k) continue;
        const right = rs.find(r => isRight(labelOf(r), k));
        if (!right) return "radio options for " + k + " do not include " + valueOf(k) + ": " + JSON.stringify(rs.map(labelOf));
        const pick = plan(answered.length) ? right : rs.find(r => r !== right);
        pick.checked = true; fire(pick, "input", "change"); pick.click?.();
        answered.push(k); return true;
      }
      for (const s of all("select")) {
        const k = exprFor(s); if (!k) continue;
        const opts = [...s.options]; const right = opts.find(o => isRight(o.textContent, k));
        if (!right) continue;
        const pick = plan(answered.length) ? right : opts.find(o => o !== right && numOf(o.textContent) != null);
        s.value = pick.value; fire(s, "input", "change"); answered.push(k); return true;
      }
      for (const t of all("input[type=text], input[type=number], input:not([type]), textarea")) {
        if (t.value) continue;
        const k = exprFor(t); if (!k) continue;
        t.value = String(plan(answered.length) ? valueOf(k) : valueOf(k) + 1000); fire(t, "input", "change"); answered.push(k); return true;
      }
      const byExpr = new Map();
      for (const b of all("button")) { if (SUBMIT.test(lbl(b)) || NOT.test(lbl(b)) || numOf(lbl(b)) == null) continue; const k = exprFor(b); if (!k) continue;
        if (!byExpr.has(k)) byExpr.set(k, []); byExpr.get(k).push(b); }
      for (const [k, bs] of byExpr) {
        const right = bs.find(b => isRight(lbl(b), k)); if (!right) continue;
        const pick = plan(answered.length) ? right : bs.find(b => b !== right);
        if (!pick) continue;
        pick.click(); answered.push(k); return true;
      }
      return false;
    };
    const submits = () => all("button, input[type=submit]").filter(b => SUBMIT.test(lbl(b)) && !NOT.test(lbl(b)));
    const pressSubmit = (afterAnswer, turn = 0) => {
      const cs = submits(); if (!cs.length) return false;
      const pref = afterAnswer ? /submit|check|confirm|✓/i : /next|continue|finish|result|score|done|→|see/i;
      const ordered = [...cs.filter(b => pref.test(lbl(b))), ...cs.filter(b => !pref.test(lbl(b)))];
      ordered[turn % ordered.length].click(); return true; };
    const scoreOf = () => { const t = norm(texts()).toLowerCase(); const got = [];
      for (const m of t.matchAll(/(\d+)\s*(?:\/|out of|of)\s*5(?!\d)/g)) { const pre = t.slice(Math.max(0, m.index - 12), m.index); if (!/question\s*$|q\s*$|#\s*$/.test(pre)) got.push(+m[1]); }
      for (const m of t.matchAll(/(\d+)\s*%/g)) got.push(+m[1] / 20);
      return got; };
    const restart = async () => { const re = all("button").find(b => NOT.test(lbl(b))); if (re) { re.click(); await sleep(600); return true; } return false; };

    // (1) Submit before answering anything
    let early = "no enabled Submit before answering";
    if (submits().length) {
      pressSubmit(true); await sleep(700);
      const t = texts();
      const errs = errors();
      if (errs.length) return "Submit with nothing answered raised cell errors: " + errs.join("; ");
      const bad = t.match(/NaN|undefined|\[object \w+\]/);
      if (bad) return "Submit with nothing answered shows " + JSON.stringify(bad[0]) + ": " + norm(t).slice(0, 300);
      const s = scoreOf().filter(x => x > 0);
      if (s.length) return "Submit with nothing answered shows a non-zero score " + JSON.stringify(s) + ": " + norm(t).slice(0, 300);
      early = (await restart()) ? "restarted" : "no restart";
    }

    // (2) answer everything, 3 right 2 wrong
    const first = await answerOne();
    if (typeof first === "string") return first;
    if (first === false) await restart();
    let idle = 0, pending = first === true;
    for (let round = 0; round < 40 && idle < 6; round++) {
      const r = pending ? true : await answerOne(); pending = false;
      if (typeof r === "string") return r;
      await sleep(300);
      if (r === true && answered.length < 5 && !submits().length) continue;
      pressSubmit(r === true, idle);
      await sleep(500);
      idle = r === true ? 0 : idle + 1;
      if (answered.length >= 5 && scoreOf().includes(3)) break;
    }
    for (let i = 0; i < 4 && !(answered.length >= 5 && scoreOf().includes(3)); i++) { pressSubmit(false, i); await sleep(500); }
    if (new Set(answered).size < 5) return "only " + answered.length + " questions could be answered (" + answered.join(", ") + "; early submit: " + early + "); page: " + norm(texts()).slice(0, 300);
    const s = scoreOf();
    if (!s.includes(3)) return "answered " + answered.join(", ") + " (3 right, 2 wrong) but no score of 3/5 shown; scores seen " + JSON.stringify(s) + "; page: " + norm(texts()).slice(0, 300);
    return "ok";
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

// Oracle: the shape of @tomlarkworthy/quiz from run 20260928-0847-w17-before (radio form viewof, htl
// Submit button writing a mutable per event-handlers-in-cells.md, score cell), questions made arithmetic.
const trace = (scoreLine, pctExpr) => `const _intro = function intro(md){return( md\`# Arithmetic quiz\` )};
const _questions = function questions(){return([
  { q: "What is 7 + 5?", options: ["11", "12", "13", "14"], answer: 1 },
  { q: "What is 9 - 4?", options: ["5", "4", "6", "3"], answer: 0 },
  { q: "What is 6 × 7?", options: ["36", "48", "42", "40"], answer: 2 },
  { q: "What is 20 ÷ 4?", options: ["4", "6", "8", "5"], answer: 3 },
  { q: "What is 8 + 9?", options: ["17", "16", "18", "15"], answer: 0 }
])};
const _viewof_answers = function viewof_answers(htl, questions){
  const form = htl.html\`<form>\${questions.map((q, i) => htl.html\`<div><p>\${i + 1}. \${q.q}</p>\${q.options.map((opt, j) => htl.html\`<label><input type="radio" name="q\${i}" value="\${j}" onchange=\${() => form.dispatchEvent(new Event("input", {bubbles: true}))}> \${opt}</label>\`)}</div>\`)}</form>\`;
  form.addEventListener("submit", e => e.preventDefault());
  Object.defineProperty(form, "value", { get() { return questions.map((_, i) => { const el = form.querySelector('input[name="q' + i + '"]:checked'); return el ? +el.value : null; }); } });
  return form;
};
const _answers = function answers(Generators, viewof_answers){return( Generators.input(viewof_answers) )};
const _initial_submitted = function initial_submitted(){return( false )};
const _mutable_submitted = function mutable_submitted(Mutable, initial_submitted){return( new Mutable(initial_submitted) )};
const _submitted = function submitted(mutable_submitted){return( mutable_submitted.generator )};
const _submitBtn = function submitBtn(htl, mutable_submitted, submitted){
  return submitted
    ? htl.html\`<button onclick=\${() => { mutable_submitted.value = false; }}>Try Again</button>\`
    : htl.html\`<button onclick=\${() => { mutable_submitted.value = true; }}>Submit</button>\`;
};
const _score = function score(questions, answers, submitted){
  if (!submitted) return null;
  let correct = 0, answeredCount = 0;
  for (let i = 0; i < questions.length; i++) { if (answers[i] !== null) answeredCount++; ${scoreLine} }
  return { correct, total: questions.length, pct: ${pctExpr} };
};
const _display = function display(score, htl){
  if (!score) return htl.html\`<p>Select your answers and click Submit.</p>\`;
  return htl.html\`<h2>\${score.correct} / \${score.total} Correct — \${score.pct}%</h2>\`;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_questions", "questions", [], _questions);
  $def("_viewof_answers", "viewof answers", ["htl", "questions"], _viewof_answers);
  $def("_answers", "answers", ["Generators", "viewof answers"], _answers);
  $def("_initial_submitted", "initial submitted", [], _initial_submitted);
  $def("_mutable_submitted", "mutable submitted", ["Mutable", "initial submitted"], _mutable_submitted);
  $def("_submitted", "submitted", ["mutable submitted"], _submitted);
  $def("_submitBtn", "submitBtn", ["htl", "mutable submitted", "submitted"], _submitBtn);
  $def("_score", "score", ["questions", "answers", "submitted"], _score);
  $def("_display", "display", ["score", "htl"], _display);
  return main;
}
`;
const RIGHT = "if (answers[i] === questions[i].answer) correct++;";
const SOLUTION = trace(RIGHT, "Math.round(correct / questions.length * 100)");
// negative controls: an answered question counts as right (5/5); a % over answered questions (NaN% on empty submit)
const MUTANT_SCORE = trace("if (answers[i] !== null) correct++;", "Math.round(correct / questions.length * 100)");
const MUTANT_EMPTY = trace(RIGHT, "Math.round(correct / answeredCount * 100)");

const base = {
  category: "rc5-train",
  question: "Make a quiz with five multiple-choice arithmetic questions (like 7 + 5), a submit button, and a score shown at the end.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    // 3 right + 2 wrong through the UI must show 3/5; Submit before answering must not show NaN, an error or a non-zero score
    { name: "collected_equals", args: { equals: "ok" }, weight: 4 },
  ],
};
const oracle = content => [
  { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md" } },
  { tool: "write_file", args: { file_path: "/src/@user/quiz.js", content } },
];

export default [
  { ...base, id: "rc5t-quiz-submit-score", oracle: oracle(SOLUTION) },
  // controls for the collector; not part of the proposal
  { ...base, id: "rc5t-quiz-submit-score-neg-score", category: "rc5-train-control", oracle: oracle(MUTANT_SCORE) },
  { ...base, id: "rc5t-quiz-submit-score-neg-empty", category: "rc5-train-control", oracle: oracle(MUTANT_EMPTY) },
];
