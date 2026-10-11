# A token publishes a library notebook, served with no origin

2026-10-11, in a session with Tom. The digest writer had built `research-2026-10-11` and stopped:
publishing was the owner's own session only. Tom: "Why can't it be published automatically. I
think this should be automated too".

## Why it was the owner's session only

`brain-library.ojs` before this change:

```
// A saved notebook is served as a page that runs as whoever opens it: only the owner's own tab saves one, not a token or a turn.
// Fixed: this Worker is a writer brain-static trusts, so what reaches put is served as a page.
"com.lopecode.brain.library.put": { type: "procedure", who: "owner", allow: "caller.session", fixed: true },
```

A library notebook is a page on the Brain's own address. The session is a token in
`localStorage`, so the page's cells call the Brain as whoever opened it. A digest is written by
an agent from Hacker News, Reddit and feeds; put by a token, it would have run as Tom when he
opened it.

## What was measured before building

The built digest (4.8 MB), served from `127.0.0.1` with
`Content-Security-Policy: sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads`,
opened in the QA browser, 2026-10-11 about 10:25 CEST:

```
self.origin                "null"
localStorage               SecurityError
document.cookie            SecurityError
runtime variables          2659, none with an error
location.hash = "#view=…"  taken, and the runtime's `hash` cell followed it
fetch /static/snapshot/…   blocked by CORS: no Access-Control-Allow-Origin
```

So the page runs with no origin, and the one thing it lost that a digest needs was the read of
the snapshot's public files.

## What changed

`brain-library.ojs`:
- `library.put` is `{ who: "owner", fixed: true }`: the owner, or a token that names the method.
- A put that is not the owner in their own tab (`ownTab` of `cloudflare-iac`, as `brain-static`
  judges a writer) records `writer` on the version, keeps the file in `brain-static` as
  `text/plain`, and answers `sandboxed: true`.
- `GET /library/<name>` sends the header above for a version with a `writer`, on a 304 too.
- Such a put is refused (403) a name whose newest version is the owner's.
- A version with no `writer` is the owner's: until this change nobody else could put.

`brain-static.ojs`: a public file is sent with `Access-Control-Allow-Origin: *`.

Alternatives, and why not:
- **Let the token put, served as before.** One line. The agent's page then has the owner's session.
- **Have the owner's page publish what the agent built** (the lease, an inbox entry). The put
  is then the owner's own, so the page is vouched for without the owner having read it.
- **A second hostname for the library** (`plan/cloud-brain-backlog.md`, "A page served from
  `/library` or `/static`"). It gives such a page an origin of its own, with storage. More to
  build; this header needed no new address. It is still the way to go if a published notebook
  must keep state in the browser.

## On cb4

```
10:45:12  apply brain-x-static    c93090dafeae  verified, 12 tests, 24203 ms
          apply brain-x-library   8e56875c6ac0  verified,  9 tests, 21390 ms
          curl -H "Origin: null" /static/snapshot/2026-10-11/index.json   200, access-control-allow-origin: *
10:46     library.put research-2026-10-11 --as loop-library               200 {"sandboxed":true,"versions":1,"cards":1}
          GET /library/research-2026-10-11                                200, the sandbox header
          library.put research-2026-10-09 --as loop-library               403 "the newest version of research-2026-10-09 is the owner's, …"
          GET /library/research-2026-10-09                                200, no such header
```

`research-2026-10-11` at its library address, no session, QA browser: origin `"null"`,
`localStorage` `SecurityError`, 55 variables of the digest's module, 0 with an error, 216 items,
14 papers, 28 of 28 picks found.

Tests: library 9 and static 12 in a browser tab, 0 failed; `cloud-brain-dev/test.ts` 8 and 12 passed, 1 library
test needing a browser. New: `test_library_a_notebook_the_owner_did_not_put_is_served_with_no_origin`.

The built file opened from `file://` after the deploy, QA browser, 10:50 CEST: the same four
numbers (55, 0, 216 and 14, 28 of 28). Before it, that page could not read `/static`.

The version's `writer` on cb4 is `owner delegation:2c975079166e`: a token is the owner by a
delegation, and the id is the delegation's, not the token. `library.versions` is the owner's to
read (anonymous: `AuthRequired`); the public `library.list` does not carry `writer`.

`brain.ts curl --owner` sends a minted session, whose `via` is `session`, so `ownTab` judges
it the owner's own tab (`cloudflare-iac.ojs`, `ownTab`): the owner's put from the command line
is served as before and replaces his own notebooks. Read in the source; not run. It also
means the header rests on an agent not putting with `--owner`, which `rules.md` forbids and
nothing enforces.

## Not tried, and what this does not do

- The owner putting `research-2026-10-11` in their own tab to lift the header. In the tests only.
- A token of a sign-in link with the cap `session`. It sets `x-brain-tab`, so `ownTab` judges
  it the owner's own tab (`cloudflare-iac.ojs`, the test beside `ownTab`): its put would be
  served as the owner's, with no header. That is the meaning of the cap; no such token was
  made or tried here.
- Safari and Firefox. The measurement is Chromium's.
- Editing and saving from a sandboxed notebook, and any notebook that keeps state in
  `localStorage` or IndexedDB: both are refused there. The digest needs neither.
- The header limits what the page can reach. It does not check what the page says: a digest's
  claims are the reviewer's to check (`.claude/skills/brain-maintenance/agents/reviewer.md`, "A digest").
- A sandboxed page can still open a link in a new tab, which is an ordinary page of wherever
  it points (`allow-popups-to-escape-sandbox`, so outside links work). That is what any site
  linking to the Brain can do.
- A token that names `library.put` can fill the library with names of its own. Nothing limits
  how many.

## After the fresh reviews, 2026-10-11

`/review-notebook`, two agents. The modules: BLOCK, 6 findings. The record, the digest brief
and `rules.md`: FIX, 7 findings. Each was checked against the source and all 13 were taken.

The one that mattered: the Library panel opened an owner-only notebook by fetching it with the
session and opening the bytes as a blob. A blob takes the origin of the page that made it and
has none of the answer's headers, so a token's notebook that was not public, or was made owner
only afterwards, would have run as the owner. The reviewer's probe of the same call on a
synthetic page:

```
direct:     {"origin":"null","error":"SecurityError"}
panel blob: {"origin":"https://brain.example","session":"OWNER-TOKEN"}
```

No such notebook was on cb4: the one token put there is public, and a public one is opened
by its address. Fixed in `e60a95e9dcde` (verified, 9 tests, 22204 ms): `library.list` answers
`sandboxed`, and the panel does not fetch such a notebook; it says the notebook opens from its
address alone. Not built: opening it inside a sandboxed frame, so an owner-only notebook of an
agent cannot be read from the panel at all today.

Also in that deploy:
- `library.delete` refuses what `put` refuses. A caller with both methods could delete the
  owner's notebook and put under its name. `loop-library` has the put alone.
- The header gains `allow-forms`. `alert`, `confirm` and `prompt` stay off.
- A module card is entered from a token's notebook like any other, unmarked. Said in the
  module's prose; not changed.
- A test puts as `token:laptop`; until then every put in the tests was the owner by a delegation.

The header on cb4 after it:
`sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads`.
The measurements above were made under the header without `allow-forms`.
