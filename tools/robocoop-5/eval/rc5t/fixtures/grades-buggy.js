const _intro = function intro(md){return( md`# Class grades

Scores for the autumn test. Grading scale: **A** 90 and above, **B** 80–89, **C** 70–79, **D** 60–69, **F** below 60. A student passes with a score at or above the pass mark.` )};
const _scores = function scores(){return( [
  { name: "Ada", score: 72 }, { name: "Ben", score: 85 }, { name: "Cleo", score: 90 }, { name: "Dev", score: 64 },
  { name: "Eli", score: 58 }, { name: "Fay", score: 98 }, { name: "Gus", score: 77 }, { name: "Hana", score: 81 },
  { name: "Ivo", score: 69 }, { name: "Jin", score: 93 }, { name: "Kai", score: 45 }, { name: "Lea", score: 88 },
  { name: "Max", score: 70 }, { name: "Noor", score: 9 }, { name: "Otto", score: 79 }, { name: "Pia", score: 80 },
  { name: "Quin", score: 60 }, { name: "Rui", score: 96 }, { name: "Sam", score: 53 }, { name: "Tia", score: 74 }
] )};
const _mean = function mean(scores){return( scores.reduce((a, d) => a + d.score, 0) / scores.length )};
const _median = function median(scores){
  const s = scores.map(d => d.score).sort();
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const _letterGrade = function letterGrade(){return( (score) =>
  score > 90 ? "A" : score > 80 ? "B" : score > 70 ? "C" : score > 60 ? "D" : "F"
)};
const _graded = function graded(scores, letterGrade){return( scores.map(d => ({ ...d, grade: letterGrade(d.score) })) )};
const _histogram = function histogram(Plot, graded){return( Plot.plot({
  x: { domain: ["A", "B", "C", "D", "F"], label: "Grade" },
  y: { grid: true, label: "Students" },
  marks: [Plot.barY(graded, Plot.groupX({ y: "count" }, { x: "grade", fill: "steelblue" })), Plot.ruleY([0])]
}) )};
const _viewof_passMark = function viewof_passMark(Inputs){return( Inputs.range([0, 100], { step: 1, value: 60, label: "Pass mark" }) )};
const _passMark = function passMark(Generators, viewof_passMark){return( Generators.input(viewof_passMark) )};
const _passCount = function passCount(scores, viewof_passMark){return( scores.filter(d => d.score >= viewof_passMark.value).length )};
const _summary = function summary(md, mean, median, passCount, scores){return( md`**Mean:** ${mean.toFixed(1)} · **Median:** ${median} · **Passed:** ${passCount} of ${scores.length}` )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_scores", "scores", [], _scores);
  $def("_mean", "mean", ["scores"], _mean);
  $def("_median", "median", ["scores"], _median);
  $def("_letterGrade", "letterGrade", [], _letterGrade);
  $def("_graded", "graded", ["scores", "letterGrade"], _graded);
  $def("_histogram", "histogram", ["Plot", "graded"], _histogram);
  $def("_viewof_passMark", "viewof passMark", ["Inputs"], _viewof_passMark);
  $def("_passMark", "passMark", ["Generators", "viewof passMark"], _passMark);
  $def("_passCount", "passCount", ["scores", "viewof passMark"], _passCount);
  $def("_summary", "summary", ["md", "mean", "median", "passCount", "scores"], _summary);
  return main;
}
