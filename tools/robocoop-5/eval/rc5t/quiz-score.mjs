// rc5-train eval (20260928-0055-w10): a quiz whose buttons do nothing useful.
// In run 20260928-0055-w10-before the agent built Submit / Next / Restart as three `Inputs.button`
// viewofs and one `engine` cell that depended on all three values plus the selected answer, guarding
// each branch with `if (submit !== undefined)`. An Inputs.button's value is a click count that starts
// at 0, so every branch ran on every recompute, the restart branch last: the quiz reset itself after
// every click and on every radio change. The write reported "all 24 cells compute with no runtime
// error"; the agent inspected the first question and called task_complete without clicking anything.
//
// The check is behavioural, so any correct build passes (radios + Submit, one button per option, a
// select, a text box, all questions on one page or one at a time). setup.collect keeps every cell of a
// module created during the turn reachable, answers each question it finds through the DOM (1st, 3rd
// and 5th correctly, 2nd and 4th wrongly; typed answers in lower case), presses the Submit / Next
// control, and requires five distinct European-capital questions and a final score of 3 out of 5.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) return "no module was created";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  const CAP = {
    albania: "tirana", andorra: "andorra la vella", austria: "vienna", belarus: "minsk", belgium: "brussels",
    "bosnia and herzegovina": "sarajevo", bulgaria: "sofia", croatia: "zagreb", cyprus: "nicosia",
    "czech republic": "prague", czechia: "prague", denmark: "copenhagen", estonia: "tallinn", finland: "helsinki",
    france: "paris", germany: "berlin", greece: "athens", hungary: "budapest", iceland: "reykjavik",
    ireland: "dublin", italy: "rome", kosovo: "pristina", latvia: "riga", liechtenstein: "vaduz",
    lithuania: "vilnius", luxembourg: "luxembourg", malta: "valletta", moldova: "chisinau", monaco: "monaco",
    montenegro: "podgorica", netherlands: "amsterdam", "north macedonia": "skopje", norway: "oslo",
    poland: "warsaw", portugal: "lisbon", romania: "bucharest", russia: "moscow", "san marino": "san marino",
    serbia: "belgrade", slovakia: "bratislava", slovenia: "ljubljana", spain: "madrid", sweden: "stockholm",
    switzerland: "bern", turkey: "ankara", ukraine: "kyiv", "united kingdom": "london", uk: "london",
    "great britain": "london", england: "london", scotland: "edinburgh", wales: "cardiff", "vatican city": "vatican city",
  };
  const ALT = { kyiv: ["kiev"], bern: ["berne"], "vatican city": ["vatican"], chisinau: ["kishinev"] };
  const COUNTRIES = Object.keys(CAP).sort((a, b) => b.length - a.length);
  const countriesIn = t => { t = norm(t); const out = []; for (const c of COUNTRIES) {
    if (new RegExp("(^|[^a-z])" + c + "([^a-z]|$)").test(t) && !out.some(o => o.includes(c))) out.push(c); } return out; };
  const isCap = (label, country) => { const l = norm(label).replace(/^[a-d][).:]\s*/, "").replace(/[^a-z ]/g, " ").trim();
    const c = CAP[country]; return l === c || (ALT[c] || []).includes(l); };
  const knownPlace = label => { const l = norm(label).replace(/^[a-d][).:]\s*/, "").replace(/[^a-z ]/g, " ").trim(); return l.length > 1 && l.length < 40; };

  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(1000);
    const roots = () => userVars.map(v => v._value).filter(x => x instanceof Element);
    const texts = () => userVars.map(v => { const x = v._value;
      if (x instanceof Element) return x.textContent;
      return typeof x === "string" || typeof x === "number" ? String(x) : ""; }).join(" | ");
    const hidden = el => { for (let e = el; e; e = e.parentElement) { if (e.hidden || (e.style && (e.style.display === "none" || e.style.visibility === "hidden"))) return true; } return false; };
    const all = sel => roots().flatMap(r => [...(r.matches(sel) ? [r] : []), ...r.querySelectorAll(sel)]).filter(e => !e.disabled && !hidden(e));
    const answered = [];   // countries in the order answered
    const plan = i => i % 2 === 0; // answer 1st, 3rd, 5th correctly
    // the country a control belongs to: nearest ancestor naming exactly one unanswered country, else the
    // only unanswered country named in a "capital of X" phrase anywhere in the module's output
    const countryFor = el => {
      for (let e = el, d = 0; e && d < 6; e = e.parentElement, d++) {
        const cs = countriesIn(e.textContent).filter(c => !answered.includes(c));
        if (cs.length === 1) return cs[0];
        if (cs.length > 1) break;
      }
      const qs = [...norm(texts()).matchAll(/capital (?:city )?of (?:the )?([a-z ]+?)(?:\?|$|\||\.|,)/g)].map(m => countriesIn(m[1])[0]).filter(c => c && !answered.includes(c));
      const u = [...new Set(qs)];
      return u.length === 1 ? u[0] : null;
    };
    const labelOf = inp => (inp.closest("label")?.textContent || (inp.id && inp.ownerDocument.querySelector('label[for="' + inp.id + '"]')?.textContent) || inp.nextSibling?.textContent || inp.value || "");
    const fire = (el, ...types) => types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
    const SUBMIT = /submit|check|next|answer|finish|done|result|score|continue|confirm|→|✓|start|begin/i;
    const NOT = /restart|reset|again|retry|start over|new quiz|clear/i;
    const answerOne = async () => {
      // radio groups
      const groups = new Map();
      // a group is the radios sharing a name inside one form (Inputs.radio reuses names across forms)
      const forms = new Map();
      for (const r of all("input[type=radio]")) { const f = r.form || r.closest("fieldset") || r.parentElement?.parentElement;
        if (!forms.has(f)) forms.set(f, new Map()); const byName = forms.get(f); const k = r.name || "";
        if (!byName.has(k)) byName.set(k, []); byName.get(k).push(r); }
      for (const byName of forms.values()) for (const [k, rs] of byName) groups.set(groups.size + ":" + k, rs);
      for (const rs of groups.values()) {
        if (rs.some(r => r.checked)) continue;
        const c = countryFor(rs[0]); if (!c) continue;
        const right = rs.find(r => isCap(labelOf(r), c));
        if (!right) return "radio options for " + c + " do not include " + CAP[c] + ": " + JSON.stringify(rs.map(labelOf));
        const pick = plan(answered.length) ? right : rs.find(r => r !== right);
        pick.checked = true; fire(pick, "input", "change"); pick.click?.();
        answered.push(c); return true;
      }
      // select
      for (const s of all("select")) {
        const c = countryFor(s); if (!c) continue;
        const opts = [...s.options]; const right = opts.find(o => isCap(o.textContent, c));
        if (!right) continue;
        const pick = plan(answered.length) ? right : opts.find(o => o !== right && o.value && knownPlace(o.textContent));
        s.value = pick.value; fire(s, "input", "change"); answered.push(c); return true;
      }
      // free text
      for (const t of all("input[type=text], input:not([type]), textarea")) {
        if (t.value) continue;
        const c = countryFor(t); if (!c) continue;
        t.value = plan(answered.length) ? CAP[c] : "zzz"; fire(t, "input", "change"); answered.push(c); return true;
      }
      // one button per option
      const btns = all("button");
      const byCountry = new Map();
      for (const b of btns) { if (SUBMIT.test(b.textContent) || NOT.test(b.textContent)) continue; const c = countryFor(b); if (!c) continue;
        if (!byCountry.has(c)) byCountry.set(c, []); byCountry.get(c).push(b); }
      for (const [c, bs] of byCountry) {
        const right = bs.find(b => isCap(b.textContent, c)); if (!right) continue;
        const pick = plan(answered.length) ? right : bs.find(b => b !== right && knownPlace(b.textContent));
        if (!pick) continue;
        pick.click(); answered.push(c); return true;
      }
      return false;
    };
    // after an answer prefer Submit/Check; on a round with no answer prefer Next/Finish, rotating through
    // the candidates so a still-enabled Submit cannot hide the Next button
    const lbl = b => b.textContent || b.value || "";
    const pressSubmit = (afterAnswer, turn = 0) => {
      const cs = all("button, input[type=submit]").filter(b => SUBMIT.test(lbl(b)) && !NOT.test(lbl(b)));
      if (!cs.length) return false;
      const pref = afterAnswer ? /submit|check|confirm|✓/i : /next|continue|finish|result|score|done|→|see/i;
      const ordered = [...cs.filter(b => pref.test(lbl(b))), ...cs.filter(b => !pref.test(lbl(b)))];
      ordered[turn % ordered.length].click(); return true; };
    const scoreOf = () => { const t = norm(texts()); const got = [];
      for (const m of t.matchAll(/(\d+)\s*(?:\/|out of|of)\s*5(?!\d)/g)) { const pre = t.slice(Math.max(0, m.index - 12), m.index); if (!/question\s*$|q\s*$|#\s*$/.test(pre)) got.push(+m[1]); }
      for (const m of t.matchAll(/(\d+)\s*%/g)) got.push(+m[1] / 20);
      return got; };
    const hasSubmit = () => all("button, input[type=submit]").some(b => SUBMIT.test(lbl(b)) && !NOT.test(lbl(b)));
    // the agent may have clicked through its own quiz while testing: restart once if nothing is answerable
    const first = await answerOne();
    if (typeof first === "string") return first;
    if (first === false) { const re = all("button").find(b => /restart|again|reset|start over|new quiz|retry/i.test(lbl(b)));
      if (re) { re.click(); await sleep(600); } }
    let idle = 0, pending = first === true;
    for (let round = 0; round < 40 && idle < 6; round++) {
      const r = pending ? true : await answerOne(); pending = false;
      if (typeof r === "string") return r;
      await sleep(300);
      // answer everything visible first when there is nothing to press (all-on-one-page quizzes)
      if (r === true && answered.length < 5 && !hasSubmit()) continue;
      const s = pressSubmit(r === true, idle);
      await sleep(500);
      idle = r === true ? 0 : idle + 1;
      if (answered.length >= 5 && scoreOf().includes(3)) break;
    }
    for (let i = 0; i < 4 && !(answered.length >= 5 && scoreOf().includes(3)); i++) { pressSubmit(false, i); await sleep(500); }
    if (new Set(answered).size < 5) return "only " + answered.length + " questions could be answered (" + answered.join(", ") + "); page: " + texts().replace(/\s+/g, " ").slice(0, 300);
    const s = scoreOf();
    if (!s.includes(3)) return "answered " + answered.join(", ") + " (3 right, 2 wrong) but no score of 3/5 shown; scores seen " + JSON.stringify(s) + "; page: " + texts().replace(/\s+/g, " ").slice(0, 300);
    return "ok";
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

// Button actions follow @tomlarkworthy/debugger `viewof clear` (lopecode/notebooks/@tomlarkworthy_debugger.html):
// Inputs.button("clear", { reduce: () => ($0.value = []) }), $0 being its "mutable events" input.
const SOLUTION = `const _intro = function intro(md){return( md\`# European capitals quiz\` )};
const _questions = function questions(){return( [
  { country: "France", answer: "Paris", options: ["Lyon", "Paris", "Marseille", "Nice"] },
  { country: "Spain", answer: "Madrid", options: ["Barcelona", "Seville", "Madrid", "Valencia"] },
  { country: "Poland", answer: "Warsaw", options: ["Warsaw", "Kraków", "Gdańsk", "Wrocław"] },
  { country: "Switzerland", answer: "Bern", options: ["Zürich", "Geneva", "Basel", "Bern"] },
  { country: "Portugal", answer: "Lisbon", options: ["Porto", "Lisbon", "Faro", "Braga"] }
] )};
const _initial_state = function initial_state(){return( { index: 0, score: 0 } )};
const _mutable_state = function mutable_state(Mutable, initial_state){return( new Mutable(initial_state) )};
const _state = function state(mutable_state){return( mutable_state.generator )};
const _viewof_choice = function viewof_choice(Inputs, questions, state){return(
  state.index < questions.length
    ? Inputs.radio(questions[state.index].options, { label: \`Question \${state.index + 1}: what is the capital of \${questions[state.index].country}?\` })
    : Inputs.input(null)
)};
const _choice = function choice(Generators, viewof_choice){return( Generators.input(viewof_choice) )};
const _viewof_submit = function viewof_submit(Inputs, questions, state, choice, $state){return(
  Inputs.button("Submit", {
    disabled: state.index >= questions.length || choice == null,
    reduce: () => {
      const q = questions[$state.value.index];
      const right = String(choice).trim().toLowerCase() === q.answer.toLowerCase();
      $state.value = { index: $state.value.index + 1, score: $state.value.score + (right ? 1 : 0) };
    }
  })
)};
const _submit = function submit(Generators, viewof_submit){return( Generators.input(viewof_submit) )};
const _result = function result(md, state, questions){return(
  state.index >= questions.length ? md\`**Your score: \${state.score} / \${questions.length}**\` : md\`Score so far: \${state.score}\`
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_questions", "questions", [], _questions);
  $def("_initial_state", "initial state", [], _initial_state);
  $def("_mutable_state", "mutable state", ["Mutable", "initial state"], _mutable_state);
  $def("_state", "state", ["mutable state"], _state);
  $def("_viewof_choice", "viewof choice", ["Inputs", "questions", "state"], _viewof_choice);
  $def("_choice", "choice", ["Generators", "viewof choice"], _choice);
  $def("_viewof_submit", "viewof submit", ["Inputs", "questions", "state", "choice", "mutable state"], _viewof_submit);
  $def("_submit", "submit", ["Generators", "viewof submit"], _submit);
  $def("_result", "result", ["md", "state", "questions"], _result);
  return main;
}
`;

export default {
  id: "rc5t-quiz-score",
  category: "rc5-train",
  question: "Make a 5-question quiz on European capitals that shows my score at the end.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    // the defect: answering all five through the UI (3 right, 2 wrong) must end on a score of 3/5
    { name: "collected_equals", args: { equals: "ok" }, weight: 4 },
    // if the event-handlers Inputs.button section (proposal.md, optional) is adopted, add:
    // { name: "tool_call_matches", args: { pattern: "event-handlers-in-cells.md" } },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/capitals-quiz.js", content: SOLUTION } },
  ],
};

export { SOLUTION };
