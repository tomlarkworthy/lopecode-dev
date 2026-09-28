// Evals written by rc5-train workers (.claude/skills/rc5-train), category "rc5-train". Each one encodes a
// defect a worker found in a real run: the goal prompt, criteria that fail on the defect, and an
// `oracle` reference solution that scores 1.00 under --oracle. Criteria score the outcome, not whether
// a wiki page was read: an agent that gets it right without the page loses nothing.
// Evals too long to inline (behavioural checks in setup.collect, a module-length oracle) live in rc5t/.
import pomodoroButton from "./rc5t/pomodoro-button.mjs";
import forecastWindow from "./rc5t/forecast-window.mjs";
import libraryApiFromDocs from "./rc5t/library-api-from-docs.mjs";
import explainSelfSave from "./rc5t/explain-self-save.mjs";
import stateSurvivesSave from "./rc5t/state-survives-save.mjs";
import importSurvivesExport from "./rc5t/import-survives-export.mjs";
import citiesTable from "./rc5t/cities-table.mjs";
import analogClock from "./rc5t/analog-clock.mjs";
import quizScore from "./rc5t/quiz-score.mjs";
import diceSums from "./rc5t/dice-sums.mjs";
import isbn13UnitTests from "./rc5t/isbn13-unit-tests.mjs";
import tocLinksLopepage from "./rc5t/toc-links-lopepage.mjs";
import chatFollowsTheme from "./rc5t/chat-follows-theme.mjs";
import selfEditRefused from "./rc5t/self-edit-refused.mjs";
import snakeKeyboard from "./rc5t/snake-keyboard.mjs";
import worldMapOffline from "./rc5t/world-map-offline.mjs";
import typedExpressionPlot from "./rc5t/typed-expression-plot.mjs";
import colourPalette from "./rc5t/colour-palette.mjs";
import mortgageSliders from "./rc5t/mortgage-sliders.mjs";
import summariseWithChatModel from "./rc5t/summarise-with-chat-model.mjs";
import kanbanDragPersist from "./rc5t/kanban-drag-persist.mjs";
import drawingPad from "./rc5t/drawing-pad.mjs";
import gradesDebug from "./rc5t/grades-debug.mjs";
import temperatureTwoWay from "./rc5t/temperature-two-way.mjs";
import expensesMonthly from "./rc5t/expenses-monthly.mjs";
import stackedScreenTime from "./rc5t/stacked-screen-time.mjs";
import githubDashboard from "./rc5t/github-dashboard.mjs";
import recipeBook from "./rc5t/recipe-book.mjs";
import notesApp from "./rc5t/notes-app.mjs";
import binarySearchStepper from "./rc5t/binary-search-stepper.mjs";
import ordersTable from "./rc5t/orders-table.mjs";
import habitTracker from "./rc5t/habit-tracker.mjs";
import pendulum from "./rc5t/pendulum.mjs";
import editableGuideToc from "./rc5t/editable-guide-toc.mjs";
import sketchPngDownload from "./rc5t/sketch-png-download.mjs";
import billSpreadsheet from "./rc5t/bill-spreadsheet.mjs";
import hiringFlowchartText from "./rc5t/hiring-flowchart-text.mjs";
import slidesStepThrough from "./rc5t/slides-step-through.mjs";
import budgetCsv from "./rc5t/budget-csv.mjs";
import invoicePdf from "./rc5t/invoice-pdf.mjs";
import meetingNotesPersist from "./rc5t/meeting-notes-persist.mjs";
import timelineAddTask from "./rc5t/timeline-add-task.mjs";

export const RC5_TRAIN_EVALS = [
pomodoroButton,
forecastWindow,
libraryApiFromDocs,
explainSelfSave,
stateSurvivesSave,
importSurvivesExport,
citiesTable,
analogClock,
quizScore,
diceSums,
isbn13UnitTests,
tocLinksLopepage,
chatFollowsTheme,
selfEditRefused,
snakeKeyboard,
worldMapOffline,
typedExpressionPlot,
colourPalette,
mortgageSliders,
summariseWithChatModel,
kanbanDragPersist,
drawingPad,
gradesDebug,
temperatureTwoWay,
expensesMonthly,
stackedScreenTime,
githubDashboard,
recipeBook,
notesApp,
binarySearchStepper,
ordersTable,
habitTracker,
pendulum,
editableGuideToc,
sketchPngDownload,
billSpreadsheet,
hiringFlowchartText,
slidesStepThrough,
budgetCsv,
invoicePdf,
meetingNotesPersist,
timelineAddTask,
// rc5t-stale-inspect-after-drive: an agent that drives a viewof and then checks a dependent cell with
// inspect_value must see the dependent's new value. Before the fix, readVar served the `_value` a
// cell kept from its last read once nothing observed it, so inspect_value theme_name said
// "ocean-floor" after the switch to cotton, four times (run 20260927-2332-w3-before, 18s-102s); the
// agent spent 15 of its 27 steps disproving a switch that had worked.
// The prompt names the theme so the end state is one value: no criterion can say "any of the five light
// themes" (variable_equals is exact; theme_assets' preview is cut at 600 chars, before the -light.css URL).
{
  id: "rc5t-stale-inspect-after-drive",
  category: "rc5-train",
  // The defect needs a read BEFORE the drive (that read caches the value) and one after; the GOAL prompt
  // alone reached it in the trace but not in a mimo eval run (the agent skipped the first read), so
  // the question asks for both.
  question: "Which theme is this notebook using? Check theme_name with inspect_value, then switch the notebook to cotton, a light theme, and confirm with inspect_value that theme_name changed.",
  criteria: [
    { name: "variable_equals", args: { module: "@tomlarkworthy/themes", name: "theme_name", equals: "cotton" }, weight: 3 },
    // THE defect: theme_name reads "ocean-floor" once, before the switch; any later bare "ocean-floor"
    // is a stale read. Counts in the recorded runs: base 5, 3, 4; fixed 1, 1; oracle 1. A drive with
    // a bad value (the string "cotton") reads "unknown" on the fixed copy and "ocean-floor" on base.
    { name: "tool_result_count_at_most", args: { pattern: "^ocean-floor$", max: 1 }, weight: 3 },
    { name: "tool_call_matches", args: { name: "inspect_value", pattern: "theme_name", minTimes: 2 }, weight: 1 },
    { name: "variable_no_error", args: { module: "@tomlarkworthy/themes" }, weight: 1 },
    // the defect's cost: a stale read after a drive that worked sends the agent round a verify loop.
    // Measured with mimo-v2.5-pro: 27 steps (GOAL trace), 13 (this question, base copy, worked around
    // with watch_variable); 9 and 7 on the fixed copy; the oracle takes 3.
    { name: "max_steps", args: { n: 11 }, weight: 1 },
  ],
  // Copied from the Theme control itself: @tomlarkworthy/themes `viewof theme_assets` is
  // Inputs.select(themes, …), so its value is a themes.get(name) array; driven as the eval_js tool
  // description says (`viewof_x.value = …; viewof_x.dispatchEvent(new Event("input"))`).
  oracle: [
    { tool: "inspect_value", args: { module: "@tomlarkworthy/themes", name: "theme_name" } },
    { tool: "eval_js", args: { module: "@tomlarkworthy/themes", code: 'viewof_theme_assets.value = themes.get("cotton"); viewof_theme_assets.dispatchEvent(new Event("input")); return "cotton"' }, settleMs: 1500 },
    { tool: "inspect_value", args: { module: "@tomlarkworthy/themes", name: "theme_name" } },
  ],
},
];
