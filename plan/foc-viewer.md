# FoC viewer: a serverless, local-first reader for the Feeling of Computing community

Status: spec written 2026-09-07 from the research below; mockup built and exported the same day
(build log at the bottom). Awaiting feedback via annotate.

## Why this shape

The community decided in July 2024 not to migrate to any product but to build its own thing over
public data (Ivy Reese, `akkartik.name/archives/foc/administrivia/index.html#1722031490.277229`:
"the only way to move up from Slack is to build our own thing … Favour technical openness — open
source, public data, protocols — so that anyone can hack on top"). Since 2026-05-31 the Slack
feed is replicated to atproto by the bridge (`vendor/slack-sync`, wiki page
`wiki.feelingof.com/slack-colibri-bridge/`), so the public data now exists. The one Colibri
client renders it Discord-style; Tom's own complaint in Slack on 2026-05-23 was "the
presentation is more Discord than Slack … alternative views could be developed". This notebook
is that alternative view.

Two constraints from Tom, 2026-09-07:

- **Serverless and local-first.** No FoC-owned server. The browser reads the PDS directly, keeps
  a copy in IndexedDB, renders from the copy first, and reconciles in the background.
- **A celebration of the community's work, tying into the wiki, not replacing it.** The wiki
  (`feelingofcomputing/wiki`, published at `wiki.feelingof.com`) already has `projects.md` and
  `demos.md`. The viewer should surface people and what they share, and link out to wiki pages.

## What the data looks like (measured 2026-09-07)

Probed with `curl` against the PDSes; the paging script is in the session scratchpad and is
worth folding into `tools/` if the numbers need refreshing.

```
bot repo        did:plc:4gcxakknd6hxtnhf33miwsob   PDS https://jellybaby.us-east.host.bsky.network
                collections: social.colibri.message, social.colibri.reaction,
                             com.feelingofcomputing.bridge.slackRaw, social.colibri.membership
old owner       did:plc:j7nm3lrd5h7fm3sfhcv3lhfv   PDS https://earthstar.us-east.host.bsky.network
                community 3mn5nudqvhs2x  ->  migratedTo at://did:plc:dl3d3fftr4tk3yf3xqxouus7/social.colibri.community/self
new community   did:plc:dl3d3fftr4tk3yf3xqxouus7   PDS https://colibri.social   handle c-3msvih5zj4kuk.colibri.social
                1 category "Text Channels", 11 channels, each with migratedFrom -> old channel at-uri
```

Messages still reference the **old** channel rkeys. Example, the newest record at probe time:

```json
{"text":"@Tom Larkworthy: I forgot we concluded ...",
 "$type":"social.colibri.message",
 "facets":[{"index":{"byteEnd":15,"byteStart":0},
            "features":[{"did":"did:plc:j7nm3lrd5h7fm3sfhcv3lhfv","$type":"social.colibri.richtext.facet#mention"}]}, ...],
 "parent":"3muqmoej4b522","channel":"3mn5tlwafrh2k","createdAt":"2026-09-07T05:21:39.889Z","attachments":[]}
```

So: `channel` and `parent` are bare rkeys, not at-uris; the author is a `@Name: ` text prefix,
with a mention facet over it when the bridge knows the DID; reactions carry `targetMessage` as a
bare rkey too (`{"emoji":"❤️","targetMessage":"3muqoitkhzl22"}`). Attachments are blobs on the
bot repo, e.g. `{"blob":{"ref":{"$link":"bafkrei…"},"mimeType":"video/mp4","size":2356741},"name":"desh-demo-trimmed.mp4"}`;
Slack files over the bridge's 5 MB cap arrive as text like `[file '….mov' too large (147071526b)]`.

Corpus size, full page-through of `com.atproto.repo.listRecords` at 100 per page:

```
messages   1113   (905 are replies, 59 carry attachments, 211 edited)
reactions   594
months     2025-03: 1   2026-05: 265   2026-06: 310   2026-07: 222   2026-08: 254   2026-09: 61
authors     98 distinct byline prefixes; top: Tom Larkworthy 161, curious_reader 106, Ivy Reese 80, wtaysom 77
per channel share-your-work 297, thinking-together 249, of-ai 158, linking-together 142,
            present-company 137, devlog-together 62, administrivia 26, announcements 16,
            introduce-yourself 13, two-minute-week 8, #test-01 5
```

Twelve requests fetch everything. That is why v1 does a **full re-crawl on every open** rather
than an incremental cursor: `putRecord` edits and `deleteRecord` deletes change or remove old
records without moving them, and a cursor walk cannot see either. The boundary where this stops
being acceptable is the 78,747-message backfill of Mariano's 2017–2026 archive (790 requests);
at that point switch to `com.atproto.sync.getRepo` (one CAR file) or a jetstream cursor
persisted in IndexedDB. Not built now, stated so the next session does not rediscover it.

Other facts that shape the build:

- `listRecords` default order is newest-first by rkey; `reverse=true` gives oldest-first. Rkeys are
  TIDs derived from the Slack timestamp, so rkey order is Slack chronological order.
- CORS: `access-control-allow-origin: *` on the PDS, and `RateLimit-*` headers are exposed.
- Jetstream: `wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=social.colibri.message&wantedCollections=social.colibri.reaction&wantedDids=did:plc:4gcxakknd6hxtnhf33miwsob`
  opens from a bun `WebSocket`; a 6-hour cursor replay returned 0 events because nothing was
  posted in that window, so live delivery is **unverified** until the build observes one event.
- Profiles for mention DIDs come from `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?actors=…`
  (25 per call). Most of the 98 authors have no DID: the bridge's map has 9 entries
  (`vendor/slack-sync/packages/worker/src/slack-to-did.ts`).
- Raw wiki markdown is fetchable at `https://raw.githubusercontent.com/feelingofcomputing/wiki/main/pages/<page>.md`.
  `projects.md` and `demos.md` are `**[Name](url):** description` lines; `demos.md` entries link the
  originating archive thread on `akkartik.name`.

## Design (agreed with Tom 2026-09-07, mockup scope)

Decisions taken in conversation, in order: the site is tabs, not a single viewer; the wiki stays
on git and the site is the thinnest shim over it; GitHub handoff for edits, never an in-page
token; chat is the first tab; Demos is sourced from the YouTube channel listing; People is a
tab of its own, because it is where the Slack, atproto and GitHub correspondence gets set;
**this round is a mockup for collecting feedback, so anything needing new infrastructure is
faked with real-looking data**.

### Tabs

Lopepage's `S(...)` group is a Golden Layout stack, which renders as a tab bar
(`@tomlarkworthy/lopepage-urls`, `convertItem`: `groupType === 'S'` → `{type: 'stack', …}`), so
five modules in one `S` are five tabs with no tab code, and `open=` selects one.

```
#view=S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)
```

One shared `@tomlarkworthy/foc-data` module behind them. Each tab owns its own hash params;
cross-links between tabs are hash changes.

**Chat** (real data). Sidebar with channels and counts; Slack-shaped channel view (top-level
posts, rich text from facets, attachments, reactions, edited mark, "N replies" affordance);
thread pane; search over the local copy; permalink, "view on Colibri" and "raw record" per
message; author click opens that person in the People tab. Params `foc=<channel rkey>`,
`msg=<rkey>`. Data: full crawl of the bot repo on load (12 requests), whole payload cached in
IndexedDB so a reopen renders before the network answers. No per-record diffing and no
jetstream in the mockup; both are listed under "faked".

**Wiki** (real). An iframe of `wiki.feelingof.com` driven by `page=`. The wiki's own "Edit This
Page" link is the PR path. Above the frame, an open-PRs strip from
`api.github.com/repos/feelingofcomputing/wiki/pulls` (CORS `*`, 60/hour unauthenticated; zero
open PRs at time of writing, so the strip says so). Nothing rendered by us.

**Demos** (faked listing). Card grid: thumbnail from `i.ytimg.com`, title, date, click-to-load
player, and a link to the chat message that shared it when one exists. Two sections: "From the
Feeling of Computing channel" and "Shared in chat". Real source would be the uploads playlist
`UU_z2YnSvNaG0ljKgj-Vt2jg` through the Data API with a referrer-restricted key; the channel RSS
feed answered 500 from here and carries no CORS. The mockup ships
`tools/foc-viewer/demos-fake.json`: 52 videos found in chat links and the wiki demos page,
titled through YouTube oEmbed (CORS-capable, no key) on 2026-09-07; 5 are on the FoC channel
and they are the April–August 2026 meetup recordings.

**Projects** (real). The wiki's `projects.md` fetched raw and rendered as cards. Each card adds
chat mentions found by matching the project URL and host against the local store ("discussed
N times, last <date>", opening chat search) and links the creator to People when the byline
matches. Add or edit is the wiki edit link.

**People** (real directory, faked correspondence). Directory from the raw Slack archive:
Slack id, display name, Slack avatar, first and last seen, post and reply counts. Person page:
intro post, posts, shares, linked identities. "Claim this row" composes the row and shows a
preview of the GitHub issue it would open, without opening it. The correspondence would live
in git as `pages/people.md` in the wiki repo, a markdown table with columns Slack name, Slack
id, atproto handle, GitHub login, website; the bridge worker can read the same table to grow
its DID map from 9 entries. The mockup ships `tools/foc-viewer/people-fake.json` instead.

### How the identity key was recovered (2026-09-07)

Messages carry only a `@Name: ` byline. The raw archive (`com.feelingofcomputing.bridge.slackRaw`,
3028 records, 31 pages) carries the Slack user id on every message event, and `user_change` and
`team_join` events carry display name, real name and avatar URL for 234 users. Join: a message
rkey is `tidFromSlackTs(ts)`, so decoding the TID (s32 alphabet, `>> 10` drops the clock id)
gives the Slack microsecond timestamp, which is the raw event's `ts`.

```
joins 849 of 1113 messages; 124 people rows; 88 with a Slack id; 48 with an avatar; 17 with a DID
```

The 264 unjoined messages are the backfilled ones from before the bridge went live (no raw
event exists for them), so those authors are keyed by byline name. A join by `createdAt`
milliseconds found 0 matches and was abandoned; the TID decode is the right join.

### Faked in this round, with what the real thing needs

- YouTube listing: Data API key, or a snapshot tool run at export time.
- Attachment blobs: only the record payload is in IndexedDB; images and videos load from
  `com.atproto.sync.getBlob` URLs through the browser HTTP cache, so an offline reopen shows text
  without pictures (asked by Tom 2026-09-07). A blob store keyed by CID is the fix.
- People correspondence: `pages/people.md` in the wiki repo, plus a parser and the bridge reading it.
- Claim flow: opens a prefilled GitHub issue or the edit page; the mockup previews the payload.
- Live chat: jetstream WebSocket with reconnect; per-record cid diffing so edits and deletes
  land without a full reload. The mockup reloads the whole payload on open.
- Posting: `at-login` with `repo:social.colibri.message` scope declared in
  `lopecode.com/oauth/client.json`, a membership record, and appview acceptance of a second author.

### Out of scope, stated so it is not implied

Notifications, DMs and private channels, attachments over the bridge's 5 MB cap, Mariano's
2017–2026 history (not on atproto yet; at 78,747 messages the crawl strategy changes to
`sync.getRepo` or a persisted jetstream cursor).

### Notebook

`lopebooks/notebooks/Feeling_of_Computing.html`, based on a copy of
`lopecode/notebooks/atproto.html` (2.5 MB; carries `lopepage-2`, `atproto`, `at-read`,
`save-in-place`, `module-selection`) with `claude-code-pairing` injected. The two fake datasets
are embedded as cell literals rather than file attachments, to keep the mockup free of the
attachment loader-map and export hazards recorded in memory.

## Build log

(appended by the build session)

### 2026-09-07 — build session

Deliverable: `lopebooks/notebooks/Feeling_of_Computing.html`, 3,319,243 bytes,
62 module blocks, title `Feeling of Computing`. Not committed, not pushed to ObservableHQ.

Six new modules, cell counts from `check-deps.py` against the exported file:

```
foc-data 43 defined, 26 deps    foc-chat 47 / 35    foc-wiki 16 / 12
foc-demos 26 / 13               foc-projects 23 / 17    foc-people 31 / 23
missing=[] in all six
```

`bootconf.mains` is 13 entries — lopepage-2, the six foc modules, atproto, at-read,
save-in-place, module-selection, claude-code-pairing, annotate — and the hash is the plain
five-tab `#view=S100(...)` with no `cc=`.

#### Verification, with what was observed

**Archive.** Cold boot, headless 1400x900, no IndexedDB copy:

```
1113 messages   594 reactions   905 replies   59 with attachments   211 edited
11 channels, 1 hidden (#test-01), 10 visible, 22 keys in channelsByRkey
0 messages with an unresolvable channel
18 replies whose parent is outside the archive
```

The per-channel counts match the numbers measured on 2026-09-07 above. `channelsByRkey` is
keyed by both the new and the migrated-from rkey, which is what takes the unresolvable count
to 0: messages still carry old channel rkeys.

**IndexedDB-first render.** Timestamps written by the `archive` generator to
`window.__focTiming` on a second open:

```
archive-start  2026-09-07T07:02:37.835Z
yield-cache    2026-09-07T07:02:37.856Z  n=1113   (+21 ms)
refetch-done   2026-09-07T07:02:40.474Z  n=1113   (+2639 ms)
```

So the first paint is from the local copy 21 ms in, and the network reconciliation lands
2.6 s later. Neither number is a benchmark: one machine, one run, warm PDS.

**Screenshots**, `tools/screenshots/foc-viewer/`, all from one run of
`tools/foc-viewer/shots.mjs` (Playwright, headless, 1400x900, fresh profile, no `cc=`):

```
01-chat  02-thread  03-search  04-wiki  05-demos  06-projects
07-people  08-person  09-claim  10-annotate-chat  11-annotate-demos  12-permalink
```

The script asserts as it goes rather than only capturing. It waits for
`document.querySelectorAll('.fc-msg').length > 5` before shooting, prints the chat header
(`Feeling of Computing · 1113 messages, 594 reactions, read from the PDS just now`), the
search result count (6 results for "malleable"), the claim button label (`Claim this row`),
and for the permalink page, loaded fresh at
`#view=S100(...)&open=@tomlarkworthy/foc-chat&foc=3msvih7djjbh2&msg=3mufviaosjl22`:

```
{"found":true,"cls":"fc-msg hit","thread":true,
 "text":"IRIvy Reese12:55 AM · Sep 1, 2026(edited)I'm beyond excited ","cc":false}
```

That is the whole permalink claim: fresh document, target message highlighted, its 8-reply
thread open, and no `cc=` in the URL.

**Console.** Zero `pageerror` on both pages across the run. The only failing requests are
two, identified by a response listener in `tools/foc-viewer/probe-404.mjs`:

```
404 https://i.ytimg.com/vi/B0cmlitxne0/hqdefault.jpg
404 https://i.ytimg.com/vi/RGSQWjoC9v0/hqdefault.jpg
```

Two YouTube thumbnails no longer served. `focDemoCard` has an `img.onerror` placeholder, so
the cards render.

**Preflight**, `bun tools/lope-preflight.ts` on this notebook: 4 findings, all `unused-dep`,
none `missing-import`/`missing-main`/`missing-export`:

```
@tomlarkworthy/annotate: cellEditor declares importShim ... never uses it
@tomlarkworthy/annotate: a2Store    declares importShim ... never uses it
@tomlarkworthy/file-sync: jbApply   declares importShim ... never uses it
@tomlarkworthy/dataflow-templating: instancingCost declares dataflows ... never uses it
```

The last two are the corpus baseline for this notebook family; the two annotate ones arrived
with annotate and are upstream defects, not introduced here.

#### Annotate

Synced into the notebook from `lopebooks/notebooks/@tomlarkworthy_annotate.html`:
`@tomlarkworthy/annotate`, and to close its dependency chain `@tomlarkworthy/editable-md`,
`@tomlarkworthy/prosemirror` with its two attachments
(`prosebundle%405.js.gz`, `prosecssbundle%401.js.gz`). `@tomlarkworthy/annotate-data` was
deliberately not synced.

Exercised through the UI, not through the API: burger → **Annotate** (it is a `lp2-menu`
plugin, no chrome of its own) arms the layer — observed as `cursor: crosshair` — and a click
in a pane places a note. One on Chat and one on Demos:

```
@tomlarkworthy/foc-chat::annotation_a235mgh99h   (+ _note)
@tomlarkworthy/foc-demos::annotation_a2f33tpxo0  (+ _note)
```

Both boxes painted with a dotted leader to the anchor, labelled `focChatView · path` /
`focDemosView · path` (screenshots 10 and 11 are the same gesture repeated in the Playwright
run, so the ids there differ). All four cells were then deleted with `delete_cell` before the
final export; `list_cells @tomlarkworthy/foc-chat` afterwards shows no `annotation_*` cell.
What remains in foc-chat and foc-demos, deliberately, is the machinery annotate installs on
first use:

```
main.define("module @tomlarkworthy/editable-md", ...)
main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], ...)
main.define("module @tomlarkworthy/annotate", ...)
main.define("annotation", ["module @tomlarkworthy/annotate", "@variable"], ...)
```

so a reviewer's first annotation on those two tabs does not have to install it again. Wiki,
Projects and People do not carry it and will install it on first use.

#### Defects found and fixed during the build

Ordered by how long each took to find, not by severity.

1. **foc-chat never rendered on a cold boot** while rendering fine in the live session.
   `focChatView` sat pending with no error. The pending input was `invalidation`, which the
   channel's import path had turned into an import bridge in the exported footer:
   `main.define("invalidation", ["module @tomlarkworthy/foc-data", "@variable"], ...)`,
   plus a stray anonymous `$def("_qi9aew", null, ["invalidation"], identity)`. Deleting both
   variables reverted `invalidation` to the runtime builtin and the chat rendered 76 messages.
   `tools/foc-viewer/check-deps.py` gained a check for builtin names emitted as import
   bridges. This is the same family as
   `feedback_import_defined_after_a_reference_is_dropped_by_export`.

2. **`archive` and `focProjectCreator` were `_type === 2` placeholders in foc-projects**, so
   exporter-3 dropped them and the cold boot threw `RuntimeError: archive is not defined` —
   confirmed by the absence of `main.define("archive"...)` in the exported footer. Fixed by
   renaming to a fresh import name `focArchive` and a fresh cell name `focCreatorOf` and
   deleting the placeholders.

3. **Tab titles.** `@tomlarkworthy/modules` `moduleTitle` extracts `h1.textContent` from the
   module's first cell; the five view cells opened with `<h2>`, so `currentModules` reported
   `null` for four tabs and `Err` for foc-projects. Each view now opens with a one-word `<h1>`
   (Chat / Wiki / Demos / Projects / People) and the long line moved to `.foc-sub`. Verified
   after a cold reload: `{foc-wiki: "Wiki", foc-chat: "Chat", foc-demos: "Demos",
   foc-projects: "Projects", foc-people: "People", foc-data: null}`.

4. **`mentionsOf` matched on host**, so every project on a shared host matched every link on
   that host: 0D, Blawx, Ceptre, Glance and Lamdu all read "discussed 33 times · Aug 31"
   (all `github.com`). Fixed to match on normalised URL prefix, with host fallback only for
   hosts that are not multi-tenant. That exposed a second bug: `linkIndex.norm` stripped the
   query string, so all 31 `youtube.com/watch?v=` links normalised to the same key. `norm`
   now keeps the search. Projects now reads "no link to this page in the archive" for those
   five (screenshot 06).

5. **`focHash` called `window.Promises.observe`.** `Promises` is a stdlib builtin injected as
   a cell dependency, not a window global. Replaced with `Generators.observe`; a hash change
   driven through `eval_code` propagated (`foc: "3msvih7djjbh2"`) with no cell error. No other
   foc module references `window.Promises`.

6. **`focAvatarNode` listed itself as an input** (it recursed for the broken-image fallback),
   which the runtime rejects as circular. Rewritten with an inner `const make = ...`; inputs
   are now `["focAvatarColor", "focInitials"]`.

7. **A copied permalink carried `cc=LOPE-…`**, which makes the recipient's browser try to
   pair with a local channel server and raises a local-network prompt
   (`feedback_export_captures_pairing_token_into_bootconf_hash`). `focPermalink` now emits
   `view`, `open`, and whichever of `foc`/`msg`/`person`/`page` apply, and nothing else. The
   first fix reordered the `S100(...)` stack to select the tab, which would have made every
   shared link open with a different tab order; `open=<module>` was tested instead and does
   activate a tab inside a stack, so the canonical order is preserved.

8. **The exporter bakes the live hash (including `cc=`) into `bootconf.json` and reorders
   `mains`.** `tools/foc-viewer/fix-bootconf.py` rewrites both plus the `<title>` and must be
   run after every `export_notebook`. It takes the **first** parseable `bootconf.json` block:
   the last one in the file is a template string inside the exporter module's own source, and
   the first version of the script edited that instead.

9. **Ivy Reese appeared twice.** "Ivan Reese" is the pre-transition byline on older messages.
   `focConfig.nameAliases` (`{"Ivan Reese": "Ivy Reese"}`) applied in `parseByline`, the one
   place bylines are parsed. The People tab now shows one row: 28 posts, 75 replies, Slack id
   `UC2A2ARPT`, real DID, first seen 2026-05-06, last seen 2026-09-07.

10. **Ivy's avatar renders as initials.** Not a lookup bug — `peopleById.get("Ivy Reese").avatar`
    is set and correct. The URL
    `https://avatars.slack-edge.com/2026-06-02/11271828954308_f81c1febf731b304a29d_72.jpg` is
    dead (`ERR_BLOCKED_BY_ORB`, `error` on `new Image()`) while five other avatars in the same
    dataset load. `focAvatarNode` now records broken URLs in a `window.__focBrokenAvatars`
    Set so every instance of that person falls back to initials consistently rather than some
    showing an image. Visible in screenshot 10.

11. **Chat opened part-way up the channel** on a cold cache: `stick()` re-applied
    `scrollTop = scrollHeight` 12 times over 1.2 s, and the attachment images finish loading
    after that, shifting content out from under it. Observed in `01-chat.png` before the fix:
    the viewport sat mid-way through a Sep 1 message with two half-loaded images. That file
    has since been overwritten by the post-fix run, which shows the newest message
    (guitarvydas, Sep 7) at the bottom. `stick` now re-applies on every `load` event (capture
    phase) for 6 s, and aborts on `wheel`/`touchstart`/`keydown` rather than on a scroll
    position delta — content reflow moves `scrollTop` too, so a position delta cannot tell
    reflow from a user.

12. **Every tab rendered a stray `focChatCss = ▸ DocumentFragment {}` line** under the site.
    `@observablehq/inspector`'s `isnode` admits only `Element` and `Text`, so a returned
    `DocumentFragment` is inspected rather than mounted. `focStyle` now returns
    `document.createTextNode("")`, which mounts and shows nothing.

#### Dead ends and things not done

- The wiki is framed rather than fetched-and-lifted, because `curl -sI https://wiki.feelingof.com/`
  returns no `x-frame-options` and no `content-security-policy: frame-ancestors`. The
  fetch-and-lift fallback was never needed.
- The wiki page list is fetched from `api.github.com/repos/feelingofcomputing/wiki/contents/pages`
  (22 pages at build time); the hardcoded array is kept only as the fallback and the tab prints
  which source it used. This was a correction: the first version shipped its own copy of the
  page index, against the "the wiki stays on git, thinnest shim possible" constraint.
- The two fake datasets are embedded as cell literals in `foc-data`, not as file attachments.
  They were injected by patching the module `.js` from `tools/foc-viewer/{people-fake,demos-fake}.json`
  and pushing with `sync-module`, twice — once initially and once after the Ivy merge — rather
  than retyping 45 KB of JSON through the pairing channel.
- Defect 11's fix was applied by patching the compiled `foc-chat` block in the exported HTML
  directly (one `const stick = ...` replacement, asserted to occur exactly once) rather than
  through another live-edit/export cycle. Verified by re-running the screenshot script and
  preflight, not by re-exporting.
- Jetstream live delivery is still unverified — the mockup does a full re-crawl on open, as
  designed. No event has been observed on the wire from this repo.
- No commit, no ObservableHQ push, and no module outside the six new ones was modified.

### 2026-09-07 — at-read blob cache

Symptom: reopening the Chat tab re-downloaded the attachments it had already shown. The
by-CID IndexedDB cache the site needed already existed, but only as local variables inside
`@tomlarkworthy/at-read`'s `reader` cell, so nothing could import it.

What moved where:

- `lopecode/notebooks/atproto.html` (canonical for `@tomlarkworthy/at-read`, declared in
  `modules/canonical.json`) gains two exported cells, lifted out of `reader`'s `record.files`
  loop: `cachedBlob(pds, did, cid) -> {bytes, cached}` and
  `cachedBlobUrl(pds, did, cid, mimeType) -> Promise<string>`. `cachedBlobUrl` memoises the
  promise per CID in a `Map` held in the cell, so a re-render reuses the object URL. `reader`
  now calls `cachedBlob`; its status line ("Loaded n/N (h cached, f fetched)…") is unchanged,
  and the `records` cache stayed inline.
- `lopebooks/notebooks/Feeling_of_Computing.html`: `foc-chat`'s `focAttachmentNode` builds the
  `<img>`/`<video>` with no src and fills it from
  `cachedBlobUrl(focConfig.botPds, focConfig.botDid, cid, mime)`, imported from
  `@tomlarkworthy/at-read`. `at-read` was already in `bootconf.mains`, so no module block was
  added. `blobUrl` is kept for the anchor href, the non-media download link and the `.catch`
  fallback.
- `modules/canonical.json`: the six `foc-*` modules are now declared canonical in lopebooks
  with `"upstream": null` — they exist only in this notebook and are not published on
  Observable, so there is nothing to jumpgate down. Without the declaration
  `lope-sync checkout @tomlarkworthy/foc-chat` refuses.

Both syncs were `bun tools/channel/sync-module.ts --module … --source modules/… --target …`;
neither hit a moved-canonical refusal.

Probe, `node tools/foc-viewer/blob-cache-probe.mjs [file]` — one Chromium context, fresh
profile, share-your-work (`foc=3msvih7djjbh2`), cold load then `page.reload()` of the same
page. The `before` file is `git show HEAD:notebooks/Feeling_of_Computing.html` run through the
same script, so the arms differ only by the module change:

```
before  cold    media  0/29 blob:  remote src 29  getBlob 14  12.3 MB  idb blobs  0  pageerror 0   8s
before  reload  media  0/29 blob:  remote src 29  getBlob 26  29.7 MB  idb blobs  0  pageerror 0   5s
after   cold    media 29/29 blob:  remote src  0  getBlob 29  34.8 MB  idb blobs 29  pageerror 0  13s
after   reload  media 29/29 blob:  remote src  0  getBlob  0   0.0 MB  idb blobs 29  pageerror 0   5s
```

29 of the channel's 38 attachments render as `img`/`video`; the rest are replies not shown in
the channel list, or non-media links. The channel totals come from a full page-through of
`com.atproto.repo.listRecords` on the bot repo: share-your-work holds 38 attachments, 42.0 MB,
34 images / 34.5 MB and 4 videos / 7.5 MB — the largest of the eight channels that carry any.

Cost, recorded because this is not a strict win. The fetch is now eager per rendered
attachment, where images were `loading="lazy"` and videos `preload="none"`. Cold open of
share-your-work went 12.3 MB (what scrolled into view within the probe's 8 s) to 34.8 MB (all
of it). Every open after the first goes to 0. Not measured: what a cold open costs on a
channel a reader opens and immediately leaves.

Gates: `bun tools/lope-preflight.ts lopecode/notebooks/atproto.html
lopebooks/notebooks/Feeling_of_Computing.html --baseline tools/preflight-baseline.json` — 8
findings, all `unused-dep`, `0 NEW, 0 resolved`, exit 0; the baseline was not edited.
`bun tools/lope-sync.ts status` reports `clean` for `at-read` and `foc-chat` (the two `STALE`
lines, `compile-dataflow` and `lopepage-2`, predate this session and were not touched).

Pushed to ObservableHQ, `@tomlarkworthy/at-read`, document version 11 -> 20 via
`tools/lope-push-ws.js --cookies-file tools/.observable-cookies.json`:

- `--cells "cachedBlob,cachedBlobUrl,reader"` modified `reader` (node 9) in place and appended
  the two new cells;
- `--cells-match-body 'reader({defaultUri:' --cells-match-body 'Compose the iframe HTML'`
  modified the two anonymous md cells (nodes 7 and 8) — `--cells` cannot address them, and it
  also filters them out, so the two flags need separate invocations;
- `--remove-nodes 13,14` then a re-insert with `--insert-before 10` moved the new cells ahead
  of the import cell, so the published notebook keeps imports last.

Verified against `api.observablehq.com/@tomlarkworthy/at-read.js?v=4`: the footer lists
`main.variable(observer("cachedBlob"))` and `("cachedBlobUrl")`, and `reader`'s dep array is
`["location","idb","resolvePds","cachedBlob","composeBundle","bytesToText"]`.

Not done: `foc-chat` is not on ObservableHQ and was not pushed (`"upstream": null`). The
eager-fetch cost above has no mitigation in this change.

#### Addendum, same day — the eager fetch was a regression, fixed with an IntersectionObserver

The change above resolved every attachment at render time, which traded a bandwidth
regression for the cache: cold open of share-your-work went 12.3 MB to 34.8 MB. That is
recorded in `lopebooks@25b3c56d` and is now superseded.

`focAttachmentNode` no longer calls `cachedBlobUrl` when it builds the element. The cell holds
one `IntersectionObserver` (`rootMargin: "600px"`) and a `WeakMap` of element -> loader; on
first intersection it resolves the URL, sets `src`, and unobserves. An entry whose target is no
longer `isConnected` is dropped in the same callback, so switching channels does not accumulate
observed nodes. `<video>` keeps `preload="none"` and is resolved the same way.

`tools/foc-viewer/blob-cache-probe.mjs` now runs three arms in one context — cold (open, do not
scroll, dwell 8 s), scroll (walk the list to the top), reload (`page.reload()`, do not scroll).
Both files below were run through this same script; `before` is
`git show HEAD~1:notebooks/Feeling_of_Computing.html`:

```
before  cold    media  0/29 blob:  remote src 29  getBlob 14  12.3 MB  idb blobs  0  pageerror 0  11s
before  scroll  media  0/29 blob:  remote src 29  getBlob 12  17.0 MB  idb blobs  0  pageerror 0  10s
before  reload  media  0/29 blob:  remote src 29  getBlob 26  29.7 MB  idb blobs  0  pageerror 0   9s
after   cold    media  9/29 blob:  remote src  0  getBlob  9   8.1 MB  idb blobs  9  pageerror 0  11s
after   scroll  media 29/29 blob:  remote src  0  getBlob 20  26.8 MB  idb blobs 29  pageerror 0  10s
after   reload  media 10/29 blob:  remote src  0  getBlob  0   0.0 MB  idb blobs 29  pageerror 0   9s
```

Cold open is now 8.1 MB against the pre-cache 12.3 MB — under it, not merely level, because the
600px `rootMargin` is tighter than Chrome's own `loading="lazy"` distance threshold. The
scroll arm shows the other 20 arriving once, and `idb blobs 29` says they landed in the store.
The reload arm resolves 10 elements with zero network; the remaining 19 are below the fold and
would resolve from the same store on scroll.

`before scroll` fetching only 12 blobs is an artifact of the arm, not a finding: the pre-change
build has no `.fc-list` scroll to drive — the images had already been requested by the browser's
own lazy loader during the cold dwell, so the arm re-counts whatever was still in flight.

Gate: `bun tools/lope-preflight.ts lopebooks/notebooks/Feeling_of_Computing.html --baseline
tools/preflight-baseline.json` — 6 findings, all `unused-dep`, `0 NEW, 0 resolved`, exit 0.
`bun tools/lope-sync.ts status` clean for `foc-chat` and `at-read`.

`@tomlarkworthy/at-read` is unchanged by this addendum: `cachedBlob` and `cachedBlobUrl` are
already what ObservableHQ has at document version 20. Only foc-chat's call site moved.

### 2026-09-07 — feedback round: Videos, the login card, and a feed to tail

Six annotations, acted on live over the pairing channel and then saved in place. The demos tab
is now titled Videos (`focTabLabels` plus the h1), its channel heading is a link to
`youtube.com/@feelingofcomputing`, and a card's play button hands off to a `watch?v=` tab
wherever YouTube refuses to embed — `file:` and localhost — instead of loading a player that
cannot start. The Chat header lost its "real data" badge; Wiki, Projects and People still carry
theirs, since the note was anchored to Chat alone.

The header gained the atproto login card, which is `loginWidget()` from
`@tomlarkworthy/at-login`, already embedded and previously unused. Two cells rather than one:

- `focLoginHost` returns `{ el, slot }` rather than the node itself. A cell whose value **is** a
  DOM node has its node adopted back into its own inspector slot, which is where the first
  attempt's card went — out of the header, into the cell listing below the fold.
- `focLoginMount` fills `slot`. `focChatView` depends only on the host, so a login re-renders
  the card and not the 1138-message chat view.

The widget anchors its popovers `left:0`, and at the right edge of a `foc-root` (`overflow:hidden`)
the 340px panel fell outside the pane. First fix was a CSS rule matching `[style*='position:absolute']`,
which never fired: the browser normalises an inline style to `position: absolute` with a space,
and the rule's own text rendered in the header. It is now done in `focLoginMount`, which walks
the widget on mount and on click, since the popover is built lazily by the click. Measured after:
popover 340px wide, right edge 13px inside the pane.

`document.hidden` pauses the runtime. Eight queued updates sat unapplied while the tab was in the
background, which reads exactly like a wedged runtime — `_computing` true, `_updates.size` 8,
unchanged over 3 s. `requestAnimationFrame` does not fire in a hidden tab, so `_computeSoon` never
runs. Check `document.hidden` before diagnosing anything else.

### 2026-09-07 — live sync: one collection to tail

"how do we poll for live messages?" (annotation) and "do we need to go to everyones PDS?" (chat).
Counted from the live repos before answering:

```
bot repo   social.colibri.message      1138
bot repo   social.colibri.reaction      615
native     messages, 5 member repos       44
native     reactions, 4 member repos      18
slackMirror rows                            8
community members                          23
```

The viewer reads the bot repo, so it has the first two rows and none of the other 62. Native
Colibri posts live in the author's own repo: Ivy's three August messages are absent from all
1138 bot records. `listRecords` filters by repo and collection only — `channel` is a field
inside the record — so there is no per-channel subscription, and no single repo held both
directions.

Fixed in the bridge rather than worked around in the viewer. `com.feelingofcomputing.bridge.event`
(slack-sync `4e66389`, wiki `d3470d6`) is an append-only pointer log both halves write: `op`,
`subject` at-uri, `cid`, `channel`, `via`, `at`, and no content. rkey is a TID minted at
observation, so `listRecords` rkey order is event order and a reader stops at the last rkey it
holds. The entry is written before the Slack call, so a Slack failure cannot drop from the feed
a record that exists on atproto; the cost is a duplicate on queue retry, which a reader that
merges by uri absorbs. `slackMirror` stays as the dedupe map — keyed by source rkey and rewritten
in place, which is exactly why it cannot answer what changed.

Not done: the viewer still reads only the bot repo. It needs one union crawl over the 23 member
repos for the 62 native records, then a tail of the new collection. The feed itself starts empty
at deploy.

### 2026-09-07 — the viewer reads the feed

Backfill first, so the switch-over had something to read. Tom ran
`packages/backfill/src/events.ts` in his own terminal — the bot's app password must not enter a
session transcript — over the bot repo and the 23 member repos, minting each entry's rkey from
the subject's own TID so the log stays chronological across the join. 1785 entries written.
Audited after: 1798 events at the time of the read, rkeys ascending, every subject resolvable.

The first audit reported the rkeys "not ascending" and was wrong: `listRecords` returns newest
first unless you pass `reverse=true`. The check, not the feed, was broken.

`archive` was rewritten from a full crawl into three stages:

1. Yield the IndexedDB cache immediately, with its stored cursor.
2. If there is no fresh cursor — no cache, or one older than 24 h — crawl the bot repo for the
   two Colibri collections, read the whole feed, and fetch every native subject it names. Native
   subjects only: the bot's own records already came from the crawl.
3. Tail. One `listRecords` per tick against `com.feelingofcomputing.bridge.event`, stopping at
   the last rkey held, `create`/`update`/`delete` applied by uri, subjects fetched 8 at a time.

Measured on the live page, cold:

```
bootstrap    messages 1172  reactions 624  native applied 40   cursor 3mux7rvnf4s74
full feed    1798 events    18.4 s   18 pages
tail         0 events        0.94 s   1 request
```

Zero fetch errors, and all 31 native top-level messages resolved to a known channel. Native
authors came out as Kartik Agaram 9, Tom Larkworthy 12, Ivy Reese 8, Jasmine Otto 1,
curious-reader.bsky.social 1.

A native message that opens with an @mention was parsing as a byline — author
"tom larkworthy it works". The `@Name: ` prefix is a bridge artifact of one bot repo authoring
for everyone; a native post's author *is* the repo. `parseByline` now gates the regex on
`record.did && record.did !== botDid` and takes the name from the profile instead.

**A hidden tab freezes the whole runtime, not just rendering.** Poll interval is 5 s at 0.94 s
per quiet tick, so a foreground reader is roughly one small request every five seconds; there is
no per-poll cost that argues for anything slower. But a background tab does not poll at all, and
the reason is worth writing down because it looks like a hang:

```
hidden: true   rAF callbacks in 3000 ms: 0   setInterval(200 ms) callbacks: 3
```

`requestAnimationFrame` never fires, so the runtime's `_computeSoon` never runs, so a generator
cell is never pulled past a `yield`. The tail counter froze at 6 within 200 ms of the yield that
followed its first applied event and did not move for 104 s. Redefining `archive` while hidden
did not even start it — no `archive-start` mark and 0 polls over 22.3 s. Timers still run, and
Chrome throttles them to about 1 Hz, which is why the 15 s sleep was never the constraint.

Consequence for the loop's shape: it yields only when the feed changed, so between changes it
free-runs on `setTimeout` and outlives its own cell. The runtime's `gen.return()` cannot close a
generator parked inside an `await`; it lands at the next `yield`, which may never come. Each
redefinition was leaking a polling loop — two `tail` marks 2.2 s apart, from two generations of
the same cell, is what exposed it. `archive` now takes `invalidation`, sets a flag, and checks it
after each await.

Not done: neither the poll-rate change nor the invalidation fix has been observed running. The
tab was hidden for the whole edit, so both are staged in the runtime and uncomputed.

### 2026-09-07 — #administrivia was missing its whole live thread

Reported as "missing latest posts". The channel held 33 messages and rendered 2.
31 are replies, and 21 of those point at `3mlyairxe5d22`, which exists nowhere:

```
bot repo + 23 member repos    1187 social.colibri.message records
getRecord 3mlyairxe5d22       RecordNotFound
bridge events naming it       0
```

A Slack thread root from 2026-05-16T16:13:51Z was never mirrored while its replies were, the
newest at 2026-09-07T18:18:10Z. `focChannelList` renders top-level messages and nests replies
under them, so a reply whose parent is absent is rendered nowhere. Two threads are affected, 23
orphaned replies; the other is 2 replies in #present-company.

The first check ran `listRecords` with `limit=100` and no pagination and reported one repo
scanned. It found the same answer, by luck. Paginating properly is what made 1187 a number worth
quoting.

`orphanThreadRoots` stands the earliest orphan up as the thread root and re-homes its siblings
onto it. Put in `foc-data`, not in the view, so `topLevelByChannel` and `repliesByParent` both
carry it and neither chat cell changed. After: 3 roots in #administrivia, the stand-in carrying
20 replies through 18:18, 0 still invisible.

Not fixed: the gap on atproto. Backfilling that root needs the Slack API and the bot's
credentials, so it belongs in Tom's terminal, not here.

Channels are now ordered alphabetically rather than by message count. That also changes the
default channel when the hash carries no `foc=`, because `focChatTarget` falls back to
`visibleChannels[0]` — #administrivia instead of the busiest.
