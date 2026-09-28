// rc5-train eval (20260928-0120-w11): robocoop-5's chat panel paints fixed GitHub-dark hex colours
// (rc5_palette, plus literal #010409 inputs) and ignores the notebook theme. The agent edits the UI
// module it is running inside. setup.collect (chat-follows-theme.collect.js) acts as the user after the
// turn: switches the theme to the other brightness through viewof theme_assets and requires the panel,
// its message box and its text colour to change with it, on the side (light/dark) of the page, with
// readable contrast; requires the chat to still be there; then exports the notebook, reopens the file in
// a sandboxed blob: iframe and repeats the switch there.
// Any mechanism passes (CSS variables, a palette cell that depends on the theme, a stylesheet).
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const M = "/src/@tomlarkworthy/robocoop-5.js";

// @tomlarkworthy/themes.apply_theme styles its own status line with the theme's custom properties:
// `color:var(--theme-foreground-muted);…border:1px solid var(--theme-foreground-faintest)` (themes
// module, embedded in @tomlarkworthy_robocoop-5.html). The fallbacks keep the old colours when no theme is loaded.
const PALETTE_OLD = `{
  bg: '#0d1117',
  fg: '#c9d1d9',
  muted: '#8b949e',
  border: '#30363d',
  user: '#1f6feb',
  asst: '#161b22',
  tool: '#21262d',
  accent: '#7ee787',
  err: '#ff7b72'
}`;
const PALETTE_NEW = `{
  bg: 'var(--theme-background, #0d1117)',
  fg: 'var(--theme-foreground, #c9d1d9)',
  muted: 'var(--theme-foreground-muted, #8b949e)',
  border: 'var(--theme-foreground-faintest, #30363d)',
  user: 'var(--theme-foreground-focus, #1f6feb)',
  asst: 'var(--theme-background-alt, #161b22)',
  tool: 'color-mix(in srgb, var(--theme-foreground, #c9d1d9) 8%, var(--theme-background, #0d1117))',
  input: 'var(--theme-background-alt, #010409)',
  accent: '#7ee787',
  err: 'var(--theme-error, #ff7b72)'
}`;

export default {
  id: "rc5t-chat-follows-theme",
  category: "rc5-train",
  question: "Your chat panel ignores the notebook theme — make it follow the theme colours.",
  // the driver runs the session through guardTools, as the chat panel does (driver.mjs prepareSession)
  setup: { collect: readFileSync(resolve(here, "chat-follows-theme.collect.js"), "utf8") },
  criteria: [
    // the goal, live: panel bg, message-box bg and text colour change with the theme, on the page's side
    { name: "collected_equals", args: { key: "liveFollows", equals: true }, weight: 3 },
    // self-modification: the chat the agent runs in must still be there after its own edit
    { name: "collected_equals", args: { key: "alive", equals: true }, weight: 1 },
    // the change survives saving: the reopened file's chat follows a theme switch too
    { name: "collected_equals", args: { key: "savedFollows", equals: true }, weight: 2 },
    { name: "variable_no_error", args: { module: "@tomlarkworthy/robocoop-5" }, weight: 1 },
  ],
  oracle: [
    { tool: "edit_file", args: { file_path: M, old_string: PALETTE_OLD, new_string: PALETTE_NEW } },
    { tool: "edit_file", args: { file_path: M, old_string: "background:#010409;", new_string: "background:${ C.input };", replace_all: true } },
    { tool: "edit_file", args: { file_path: M, old_string: "background:#010409 !important;", new_string: "background:${ C.input } !important;" }, settleMs: 1500 },
  ],
};
