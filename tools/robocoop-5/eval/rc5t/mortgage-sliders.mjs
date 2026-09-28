// rc5-train eval (20260928-0350-w21): mortgage calculator, three sliders -> monthly payment + balance chart.
// Behavioural, so any correct build passes whatever the module id or cell names. setup.collect keeps every
// cell of a module created during the turn reachable, finds the three range inputs (amount / rate / term,
// by label, then by range), drives each one (set value + dispatch "input") and reads back the payment as a
// cell value or as rendered text. Expected values come from the values the sliders actually hold after
// driving, so any slider range passes.
//   sliders  — three range inputs, classified as amount, rate and term.
//   known    — 300000 @ 5% over 30 years pays 1610.46/month (catches rate not /12, % not /100, n in years).
//   eachReacts — moving only the amount, only the rate, only the term each gives the formula's payment
//              (a value cell that read `.value` once, or a slider that is not a viewof, fails).
//   zeroRate — at 0% the payment is P/n and no NaN/Infinity is rendered (skipped as pass when the rate
//              slider cannot reach 0).
//   balance  — some series starts near P, ends within 0.5% of P of zero, never increases, and follows the
//              sliders (its length is n or n+1 months, or term or term+1 years).
//   chart    — the module renders an svg or canvas.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const out = { module: false, sliders: false, known: false, eachReacts: false, zeroRate: false, balance: false, chart: false, detail: "" };
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) { out.detail = "no module was created"; return out; }
  out.module = true;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const log = [];
  try {
    await sleep(800);
    const els = () => userVars.map(v => v._value).filter(x => x instanceof Element);
    // range inputs, deduplicated, with the label text around each
    const ranges = [];
    for (const e of els()) for (const r of (e.matches("input[type=range]") ? [e] : [...e.querySelectorAll("input[type=range]")]))
      if (!ranges.some(x => x.el === r)) {
        const host = r.closest("form, label, div") || r.parentElement;
        const lab = ((r.labels && [...r.labels].map(l => l.textContent).join(" ")) || "") + " " + (host ? host.textContent : "") + " " + (r.getAttribute("aria-label") || "") + " " + (r.name || "");
        const top = userVars.find(v => v._value instanceof Element && (v._value === r || v._value.contains(r)));
        ranges.push({ el: r, lab: lab.toLowerCase(), min: +r.min, max: +r.max, top: top ? top._value : r });
      }
    const pickBy = (re, used) => ranges.find(x => !used.includes(x) && re.test(x.lab));
    const used = [];
    let rate = pickBy(/interest|rate|apr|%/, used); if (rate) used.push(rate);
    let term = pickBy(/term|year|month|duration|period|length/, used); if (term) used.push(term);
    let amount = pickBy(/amount|loan|principal|price|borrow|\$|£|€/, used); if (amount) used.push(amount);
    const rest = ranges.filter(x => !used.includes(x));
    if (!amount) amount = rest.filter(x => x.max >= 10000).sort((a, b) => b.max - a.max)[0];
    if (!rate) rate = rest.filter(x => x !== amount && x.max <= 30).sort((a, b) => a.max - b.max)[0];
    if (!term) term = rest.find(x => x !== amount && x !== rate);
    if (!(amount && rate && term)) { out.detail = "range inputs: " + ranges.length + " " + JSON.stringify(ranges.map(r => [r.lab.slice(0, 40), r.min, r.max])); return out; }
    out.sliders = true;
    const rateIsFraction = rate.max <= 1;
    const termInMonths = /month/.test(term.lab) && !/year/.test(term.lab) || term.max > 100;
    const set = (s, x) => {
      s.el.value = String(rateIsFraction && s === rate ? x / 100 : (termInMonths && s === term ? x * 12 : x));
      s.el.dispatchEvent(new Event("input", { bubbles: true }));
      if (s.top !== s.el) s.top.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const held = () => ({
      P: +amount.el.value,
      pct: rateIsFraction ? +rate.el.value * 100 : +rate.el.value,
      years: termInMonths ? +term.el.value / 12 : +term.el.value,
    });
    const pay = ({ P, pct, years }) => { const n = Math.round(years * 12), r = pct / 1200; return r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n)); };
    const nums = () => {
      const res = [];
      for (const v of userVars) {
        const x = v._value;
        if (typeof x === "number") res.push(x);
        else if (x && typeof x === "object" && !(x instanceof Node) && !Array.isArray(x)) for (const k of Object.keys(x).slice(0, 30)) if (typeof x[k] === "number") res.push(x[k]);
      }
      return res;
    };
    const text = () => els().map(e => e.textContent).join(" ");
    const shows = want => {
      if (nums().some(x => Math.abs(x - want) < 0.01)) return true;
      const t = text().replace(/[,  ]/g, "");
      const cents = want.toFixed(2), whole = String(Math.round(want));
      return t.includes(cents) || new RegExp("(^|[^0-9.])" + whole + "(?![0-9]|\\.[0-9])").test(t);
    };
    const settle = async (pred, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await sleep(150); if (pred()) return true; } return false; };
    const trial = async (tag, vals) => {
      for (const [s, x] of vals) set(s, x);
      const h = held(), want = pay(h);
      const ok = await settle(() => shows(want));
      await sleep(200);
      log.push(tag + " " + JSON.stringify(h) + " want=" + want.toFixed(2) + (ok ? " ok" : " MISSING"));
      return { ok, h, want };
    };
    // balance series: arrays of numbers, or arrays of objects with a numeric field that looks like a balance
    const seriesOf = val => {
      const res = [];
      if (Array.isArray(val) && val.length >= 2) {
        if (val.every(x => typeof x === "number")) res.push(val);
        else if (val.every(r => r && typeof r === "object" && !Array.isArray(r))) {
          for (const k of Object.keys(val[0])) if (val.every(r => typeof r[k] === "number" && Number.isFinite(r[k]))) res.push(val.map(r => r[k]));
        }
      }
      return res;
    };
    const balanceOk = h => {
      const n = Math.round(h.years * 12), yrs = Math.round(h.years);
      for (const v of userVars) for (const s of seriesOf(v._value)) {
        if (![n, n + 1, yrs, yrs + 1].includes(s.length)) continue;
        const tol = 0.005 * h.P;
        const startOk = Math.abs(s[0] - h.P) <= Math.max(tol, pay(h) * 12 + 1);
        const endOk = Math.abs(s[s.length - 1]) <= tol;
        const mono = s.every((x, i) => i === 0 || x <= s[i - 1] + 1e-6);
        if (startOk && endOk && mono && s.every(Number.isFinite)) return v._name;
      }
      return null;
    };
    const A = await trial("A 300000/5/30", [[amount, 300000], [rate, 5], [term, 30]]);
    const hA = A.h;
    out.known = A.ok && hA.P === 300000 && hA.pct === 5 && hA.years === 30 && shows(1610.46);
    const balA = balanceOk(hA);
    // each slider alone
    const pAlt = Math.max(amount.min || 0, Math.min(amount.max, hA.P === 200000 ? 250000 : 200000));
    const B = await trial("amount-only", [[amount, pAlt]]);
    const C = await trial("rate-only", [[rate, hA.pct === 3.5 ? 4 : 3.5]]);
    const D = await trial("term-only", [[term, hA.years === 15 ? 20 : 15]]);
    const moved = [B.h.P !== hA.P, C.h.pct !== B.h.pct, D.h.years !== C.h.years];
    out.eachReacts = B.ok && C.ok && D.ok && moved.every(Boolean);
    const balD = balanceOk(D.h);
    // 0%
    const canZero = (rate.min || 0) <= 0;
    if (canZero) {
      const Z = await trial("zero", [[amount, pAlt], [rate, 0], [term, D.h.years]]);
      const bad = /NaN|Infinity|∞/.test(text()) || nums().some(x => !Number.isFinite(x));
      out.zeroRate = Z.ok && Z.h.pct === 0 && !bad;
      if (bad) log.push("zero: NaN/Infinity rendered or held");
    } else { out.zeroRate = true; log.push("rate slider min " + rate.min + " > 0, zero case not reachable"); }
    out.balance = !!(balA && balD);
    out.chart = !!els().find(e => e.matches("svg,canvas") || e.querySelector("svg:not(input svg),canvas"));
    out.detail = "amount[" + amount.min + "," + amount.max + "] rate[" + rate.min + "," + rate.max + "] term[" + term.min + "," + term.max + "] " +
      log.join("; ") + " balance=" + balA + "/" + balD;
    return out;
  } catch (e) { out.detail = "collect threw " + e + " " + log.join("; "); return out; }
  finally { for (const k of keepers) { try { k.delete(); } catch {} } }
})()`;

// Idiom: viewof as two $def lines, value cell (G, v) => G.input(v)
// (knowledge/writing-cells-in-module-source.md; dice-sums eval SOLUTION), Plot.lineY for the chart.
const SOLUTION = `const _intro = function intro(md){return( md\`# Mortgage calculator\` )};
const _viewof_amount = function viewof_amount(Inputs){return( Inputs.range([10000, 1000000], {value: 300000, step: 1000, label: "Loan amount ($)"}) )};
const _amount = function amount(G, v){return( G.input(v) )};
const _viewof_rate = function viewof_rate(Inputs){return( Inputs.range([0, 15], {value: 5, step: 0.05, label: "Interest rate (% per year)"}) )};
const _rate = function rate(G, v){return( G.input(v) )};
const _viewof_years = function viewof_years(Inputs){return( Inputs.range([1, 40], {value: 30, step: 1, label: "Term (years)"}) )};
const _years = function years(G, v){return( G.input(v) )};
const _payment = function payment(amount, rate, years){
  const n = years * 12, r = rate / 100 / 12;
  return r === 0 ? amount / n : amount * r / (1 - Math.pow(1 + r, -n));
};
const _balances = function balances(amount, rate, years, payment){
  const n = years * 12, r = rate / 100 / 12, out = [{ month: 0, balance: amount }];
  let b = amount;
  for (let m = 1; m <= n; m++) { b = Math.max(0, b * (1 + r) - payment); out.push({ month: m, balance: m === n ? 0 : b }); }
  return out;
};
const _summary = function summary(md, payment){return( md\`**Monthly payment:** \${payment.toLocaleString("en-US", {style: "currency", currency: "USD"})}\` )};
const _chart = function chart(Plot, balances){return(
  Plot.plot({ y: { label: "Balance ($)", grid: true }, x: { label: "Month" }, marks: [Plot.lineY(balances, { x: "month", y: "balance" })] })
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_viewof_amount", "viewof amount", ["Inputs"], _viewof_amount);
  $def("_amount", "amount", ["Generators", "viewof amount"], _amount);
  $def("_viewof_rate", "viewof rate", ["Inputs"], _viewof_rate);
  $def("_rate", "rate", ["Generators", "viewof rate"], _rate);
  $def("_viewof_years", "viewof years", ["Inputs"], _viewof_years);
  $def("_years", "years", ["Generators", "viewof years"], _years);
  $def("_payment", "payment", ["amount", "rate", "years"], _payment);
  $def("_balances", "balances", ["amount", "rate", "years", "payment"], _balances);
  $def("_summary", "summary", ["md", "payment"], _summary);
  $def("_chart", "chart", ["Plot", "balances"], _chart);
  return main;
}
`;

export const SOLUTION_SRC = SOLUTION;

export default {
  id: "rc5t-mortgage-sliders",
  category: "rc5-train",
  question: "Make a mortgage calculator with sliders for the loan amount, interest rate and term, showing the monthly payment and a chart of how the balance goes down.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "sliders", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "known", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "eachReacts", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "zeroRate", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "balance", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "chart", equals: true }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/mortgage.js", content: SOLUTION }, settleMs: 2000 },
  ],
};
