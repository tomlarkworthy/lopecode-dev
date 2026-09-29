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
import orgChartEdit from "./rc5t/org-chart-edit.mjs";
import letterDocx from "./rc5t/letter-docx.mjs";
import chartPngDownload from "./rc5t/chart-png-download.mjs";
import expenseXlsx from "./rc5t/expense-xlsx.mjs";
import signupSlotsPersist from "./rc5t/signup-slots-persist.mjs";
import proposalPdf from "./rc5t/proposal-pdf.mjs";
import signalUtilsTests from "./rc5t/signal-utils-tests.mjs";
import d3V5Upgrade from "./rc5t/d3-v5-upgrade.mjs";
import qaControls from "./rc5t/qa-controls.mjs";
import sliderLag from "./rc5t/slider-lag.mjs";
import refactorRetroTitle from "./rc5t/refactor-retro-title.mjs";
import codeMetricsSearch from "./rc5t/code-metrics-search.mjs";
import documentRetroTitle from "./rc5t/document-retro-title.mjs";
import reviewModule from "./rc5t/review-module.mjs";
import explainAqiDataflow from "./rc5t/explain-aqi-dataflow.mjs";
import hnFavouritesTotals from "./rc5t/hn-favourites-totals.mjs";
import renameRegression from "./rc5t/rename-regression.mjs";
import quizSubmitScore from "./rc5t/quiz-submit-score.mjs";
import renameCell from "./rc5t/rename-cell.mjs";
import fsmOffline from "./rc5t/fsm-offline.mjs";
import penguinsCategoryFilter from "./rc5t/penguins-category-filter.mjs";
import refetchOnControl from "./rc5t/refetch-on-control.mjs";
import narrowLayout from "./rc5t/narrow-layout.mjs";
import addTwiceListenerLeak from "./rc5t/add-twice-listener-leak.mjs";
import extractHelpers from "./rc5t/extract-helpers.mjs";
import chartLabelOverlap from "./rc5t/chart-label-overlap.mjs";
import tidyUnusedCells from "./rc5t/tidy-unused-cells.mjs";
import datesDayEarly from "./rc5t/dates-day-early.mjs";
import translateSpanish from "./rc5t/translate-spanish.mjs";
import paramsToSliders from "./rc5t/params-to-sliders.mjs";
import badInput from "./rc5t/bad-input.mjs";
import dataFileSwap from "./rc5t/data-file-swap.mjs";
import animationLoopLeak from "./rc5t/animation-loop-leak.mjs";
import upstreamLibUpdate from "./rc5t/upstream-lib-update.mjs";
import consoleNoise from "./rc5t/console-noise.mjs";
import reopenShowsModule from "./rc5t/reopen-shows-module.mjs";
import a11yKeyboard from "./rc5t/a11y-keyboard-screenreader.mjs";
import loadingFailure from "./rc5t/loading-and-failure-message.mjs";
import restoreUnbooted from "./rc5t/restore-unbooted-module.mjs";
import reviewTweetExplorer from "./rc5t/review-tweet-explorer.mjs";
import testsOrCode from "./rc5t/tests-or-code.mjs";
import splitDataModule from "./rc5t/split-data-module.mjs";
import solarizedTheme from "./rc5t/solarized-theme.mjs";
import registerDictionaryTool from "./rc5t/register-dictionary-tool.mjs";
import yamlTaggedTemplate from "./rc5t/yaml-tagged-template.mjs";

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
orgChartEdit,
letterDocx,
chartPngDownload,
expenseXlsx,
signupSlotsPersist,
proposalPdf,
signalUtilsTests,
d3V5Upgrade,
qaControls,
sliderLag,
refactorRetroTitle,
codeMetricsSearch,
documentRetroTitle,
reviewModule,
explainAqiDataflow,
hnFavouritesTotals,
renameRegression,
quizSubmitScore[0],
renameCell,
fsmOffline,
penguinsCategoryFilter,
refetchOnControl,
narrowLayout,
addTwiceListenerLeak,
extractHelpers,
chartLabelOverlap,
tidyUnusedCells,
datesDayEarly,
translateSpanish,
paramsToSliders,
badInput,
dataFileSwap,
animationLoopLeak,
upstreamLibUpdate,
consoleNoise,
reopenShowsModule,
a11yKeyboard,
loadingFailure,
restoreUnbooted,
reviewTweetExplorer,
testsOrCode,
splitDataModule,
solarizedTheme[0],
registerDictionaryTool,
yamlTaggedTemplate,
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
