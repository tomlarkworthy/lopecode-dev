# The Single File Revolution — build plan

> **Brief for Claude Code:** Build `single-file-revolution.html` exactly as specified below. One self-contained HTML file, no build step, no external requests. Read the whole plan before starting; the "Acceptance checks" section at the end is the definition of done.

---

## 1. What it is

A very minimalist page: a title — **The Single File Revolution** — and a list of hyperlinks to people and projects building single-file HTML documents/tools (e.g. Bento).

It is not a manifesto and nobody "signs" anything. It's a directory, like an address book or an old web ring.

The trick: **the page forks itself.** A reader can add their name, and the browser downloads a new copy of the page with them in it. They then host/share that copy. The page spreads by being copied, which is the argument for the format, made by the format.

## 2. Hard constraints

- **One file.** All HTML, CSS, JS, fonts (if any) and data inline. Works from `file://`, any static host, or an attachment.
- **Zero network requests** at runtime. No CDNs, no analytics, no fonts from Google.
- **No server, no accounts, no publish button.** Saving = downloading a file.
- **Small.** Target < 60 KB total. Loads instantly; that speed is part of the flex.
- **Readable source.** Someone doing View Source should understand it in a minute. No minification. Comment the key parts.
- Evergreen browsers only (Chrome, Firefox, Safari, Edge — last 2 versions).

## 3. Look and feel

Audience: the specific kind of developer who shares Bento, Linear, Val Town, local-first stuff. It must look sharp and current — something people *want* to be listed on. Not corporate, not 90s parody.

- **Dark by default**, near-black background (not pure `#000`), off-white text.
- **One accent colour**, used sparingly — for the newest entry, the hover state, and the add UI. Suggest an electric acid green or hot orange; make it a single CSS variable `--accent` so it's trivial to change.
- **Type:** a strong display treatment for the title (very large, tight tracking, flush left). Names in **monospace**, set as a dense grid/flow rather than a bulleted list. Use a good system stack (`ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace` and `ui-sans-serif, system-ui, "Inter", sans-serif`). Only embed a font if it's a small subset and genuinely improves it.
- **Layout:** generous whitespace, strict alignment, lots of breathing room. Title top-left, list below, tiny footer.
- **Motion:** minimal and purposeful — only the newest-entry animation (section 5) and the hover reveal. Respect `prefers-reduced-motion` (no typing animation, no flashing; just show the accent colour).
- Optional light mode via `prefers-color-scheme: light`, but dark is the hero.
- Must look right at phone width (360px) through wide desktop.

## 4. Content

- **Title:** The Single File Revolution
- **List:** each entry is a name linked to a URL. Seed entries:
  - Bento — https://bento.page
  - `[OWNER: your notebook tool — name + URL]`
  - `[OWNER: any others]`
- **Footer:** one quiet line that hints at the mechanic without explaining it, e.g. *"This page is the whole thing. View source."* plus a tiny count ("14 names") computed at runtime.

No other copy. No explanation paragraph. Restraint is the design.

## 5. Behaviour

### 5.1 Data

Entries live in one JSON block so the page can rewrite itself cleanly:

```html
<script type="application/json" id="entries">
[
  { "name": "Bento", "url": "https://bento.page", "added": "2026-09-29" },
  ...
]
</script>
```

The **last item in the array is the newest entry.**

### 5.2 Rendering

- On load, shuffle all entries **except the newest** (Fisher–Yates, fresh order every load — no ranking, nobody "on top").
- Render the shuffled entries, then the newest pinned at the end, outside the shuffle.
- Links open in a new tab with `rel="noopener"`.

### 5.3 The newest entry

- It **types itself in** on load (character by character, ~40ms/char), then settles.
- After settling it keeps a slow, subtle pulse/flash in `--accent` — alive, not annoying (think a slow blink, ~1.5s cycle).
- A tiny faint tag next to it: "added today" / "added 3 days ago" (computed from `added`).

### 5.4 The hover moat (the hidden affordance)

- Around the newest entry is an invisible **moat**: an enlarged hover zone (≈40–60px beyond the text on all sides).
- When the pointer enters the moat:
  - the newest entry flashes a **different colour** (e.g. inverts to accent background / dark text), and
  - a hidden **"+ add new"** control fades in just below/after it: a negative, semi-transparent style — outlined or inverted, low opacity background, clearly secondary but clickable.
- Leaving the moat hides it again (small delay, ~300ms, so it doesn't flicker).
- **Touch devices** (no hover): tapping the newest entry's moat (not the link text itself) reveals the control. Detect with `@media (hover: none)`.
- **Keyboard:** the add control is reachable via Tab after the newest link and becomes visible on `:focus-visible`.

### 5.5 Adding yourself

1. Click "+ add new" → the control turns into an inline input in the same monospace style, with a blinking cursor, placeholder `your name`.
2. Enter → input switches to `https://your.site` for the URL (validate it's a URL; allow Esc to cancel at any point).
3. Enter again → the page:
   - appends `{ name, url, added: <today ISO date> }` to the entries,
   - builds a new copy of **this exact file** with the updated JSON,
   - triggers a download named `single-file-revolution.html`.
4. Show a brief, quiet confirmation in place: *"Downloaded. You're in your copy now — put it somewhere."*

The new person becomes the newest entry in *their* copy; the previous newest drops into the shuffled pool automatically (because only the last array item is pinned).

### 5.6 Self-replication (implementation notes)

- **Capture pristine source at startup**, before any rendering touches the DOM: the very first script in `<head>` stores `"<!doctype html>\n" + document.documentElement.outerHTML` in a variable. Rendering happens into a separate container afterwards, so the captured source never includes rendered/animated state.
- On save: parse the pristine source with `DOMParser`, replace the contents of `#entries` with the new pretty-printed JSON (2-space indent), serialize back to a string, and download via `Blob` + `URL.createObjectURL` + a temporary `<a download>`.
- The output must be byte-for-byte the same as the input except the JSON block. Test this by adding a name, opening the downloaded file, adding another, and diffing.
- Escape user input properly: it only ever goes into JSON (via `JSON.stringify`) and is rendered with `textContent`, never `innerHTML`. Ensure a name containing `</script>` can't break the file (escape `<` as `\u003c` in the serialized JSON).
- Reject empty names, trim whitespace, cap name length (~60 chars).

## 6. Out of scope

- No server sync, merging of forks, or de-duplication across copies. Forks that keep more names are simply more useful and win on their own.
- No editing/removing existing entries through the UI (people can edit the JSON by hand — that's the point).
- No analytics, no social meta tracking. (A plain `<meta property="og:title">` and description are fine for nice link previews.)

## 7. Acceptance checks

- [ ] Opens from `file://` and a static host with zero network requests (check DevTools Network tab).
- [ ] Total file size < 60 KB.
- [ ] Order of non-newest entries changes on every reload; newest is always last.
- [ ] Newest entry types in, then pulses; with `prefers-reduced-motion` it just appears in accent colour.
- [ ] Hovering near (not only on) the newest entry reveals "+ add new"; leaving hides it without flicker.
- [ ] Works on touch (tap moat) and keyboard (Tab reaches the add control).
- [ ] Name → URL → Enter downloads `single-file-revolution.html`.
- [ ] Downloaded file opens, shows the new person as newest (typing in, pulsing), previous newest now in the shuffle.
- [ ] Fork-of-a-fork works: add a second name in the downloaded copy; diff the three files — only the JSON block differs.
- [ ] A name like `</script><b>x` renders as literal text and doesn't break the downloaded file.
- [ ] Looks good at 360px wide and at 1440px wide.
- [ ] View Source is readable and commented.

## 8. Open questions for the owner

- Accent colour: acid green vs hot orange vs something else?
- Should the URL be required, or can someone be listed as a plain name?
- Final seed list of names and links.
