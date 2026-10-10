# Cloud Brain: one record for delegated authority

A design, not built. Written 2026-10-10 for Tom to review before anything is changed; ninth draft,
after eight fresh reviews (see *Review* at the end). A statement about the present code names the
line it was read at where one line holds it, found by a search for the text on 2026-10-10. Each draft
read the tree of its own commit, the first at 09:43 CEST and this one at 10:42, and each reviewer printed every cited line. Another session edits the same seeds, so the lines will move. Nothing here was run on a Brain except five reads of
cb4 as the owner (`rule.list`, `db.tables`, `token.list`, `grant.list`, `calls.list`), marked where used.

## What was asked

Tom, 2026-10-10, on a topic subscription that pushes: "The act of creating a subscription is a
delegation of authority to a long lived thing. Do we have the primatives to express that?" The
answer was no. On whether the owner's token should become the same record: "yes, so this is now a
big peice or work so you will need to design it all before a review, this will be the blessed
architecture going forward so it needs to be engineered well."

The topics proposal is `plan/cloud-brain-topics.md`. Its step 2 is this document.

## What exists today

Thirteen ways a call gets its authority. `K` is `brain-kernel.ojs`, `C` is `brain-core.ojs`, `D` is
`brain-deployer.ojs`, `I` is `cloudflare-iac.ojs`.

| # | what | made by | held as | reaches | ends | checked at | the core sees | pays |
|---|---|---|---|---|---|---|---|---|
| 1 | session `v1.` | kernel, after atproto sign-in (K:376) | signed token, in the page | all that DID may | 30 days (K:94); `epoch` ends every one (K:382) | K:247 | `owner` or the DID, via `session` | that account |
| 2 | turn `t1.` | kernel, one for an inbox entry (K:705) | signed token, in the owner's tab | what the sender may; in a room, what all of them may (K:285-293) | 10 minutes (K:121) | K:251 | the sender, via `turn:ENTRY` | the sender |
| 3 | portal `p1.` | kernel, `portal.token` (K:637) | signed token | one member's `m.ID.*` methods, as the viewer (K:277-282) | 10 minutes (K:148) | K:254 | the viewer, via `portal:ID` | the viewer |
| 4 | PDS service JWT | the caller's PDS | the account's own key | one method, `lxm` | `exp` | K:258, signature against the DID document | the DID or `owner`, via `jwt` | that account |
| 5 | owner's token | `token.create`, owner's session (K:406) | a secret; `token/<sha256>` | its `methods`, names and prefixes (K:404) | `token.revoke` | K:261, K:274 | `token:NAME`, via `token` | `token:NAME`, $0.10 (C:583) |
| 6 | sign-in link | `token.link` (K:420) | a code; `link/<sha256>` (K:434) | nothing; one POST turns it into row 7 | 1 to 480 minutes (K:428) | | | |
| 7 | link's token | the POST of a link (K:465) | as row 5, with `until`, `deploy`, `unattended` | row 5; with `deploy` four `infra` methods, with `unattended` `infra.shell` too (K:395-398, K:667) | `until`, at most 24 h | K:261, K:274 | `token:NAME`; with `unattended`, `owner` via `session` (K:508-510) | `token:NAME`; with `unattended`, `owner` |
| 8 | grant | `grant.put`, owner's session (K:485) | `grant/<did>` | the methods named, whole names only | `grant.delete` | K:258 (a JWT is heard), K:291 (a room), K:299; C:235 for the DID's Workers | the DID | the DID |
| 9 | member | `people.put` (K:541) | `member/<did>` | the `MEMBER` list (K:199), any `m.*` method, their grant | `people.remove` | K:295-299 | the DID | the DID, $0.10 |
| 10 | a member's Worker | the member's deploy | the Worker's key; `key/<hash>` with `author` (C:132) | the `WORKER` list (C:219), any `m.*` method, the author's grant (C:235) | removal; the author stops being a member (C:232) | C:228 `asAuthor` | the author, via `worker:NAME` | the author |
| 11 | a system Worker | the owner's deploy | the Worker's key (C:133) | what its service lists in `calls` (C:259 `callsOf`); refused only when `calls/mode` is `enforce` (C:287), and the default is `report` (C:246) | removal | C:280 `asDeclared` | `worker:NAME`; origin from row 12 | the origin |
| 12 | signed context `c1.` | the core, on each call it forwards (C:155) | a header the Worker sends back (I:411) | carries the origin to the next call | 120 s (C:142) | C:159 | origin | the origin |
| 13 | recovery key | the installer | a secret outside the Brain | every `infra` method, no approval held (D:1212) | reinstall | D:1212 | not through the core | |

Where a caller is matched against a method today:

```
K:404   names()                  a token's list: a name, or a prefix ending .* or /*
K:399   never()                  infra, secret, token, grant, people: not for a token
K:398   deploys()                the infra methods of a deploy token
K:292   grant.methods.includes   a turn in a room
K:299   MEMBER / grant.methods.includes   a DID
K:279   PORTAL_OWN / the m.ID. prefix     a portal
C:235   WORKER / person.methods.includes  a member's Worker
C:247   callMatches()            a Worker's calls: * is one part, or the rest when last
C:312   allowed()                owner, any token, any DID: "the kernel has already checked"
K:307, C:314   session           "the owner's own session"
I:1663, I:1665  callerOf.session, .trusted   what a rule reads
```

Three matchers with different wildcards (K:404, C:247, and `includes`). `C:312` is the plainest
sign: the core takes a token or a DID as checked because the kernel is in front of it.

Five things the table shows:

- **Rows 5 and 8 are the same thing with a different key.** The owner gives a holder a list of
  methods until it is taken back. A token is known by a secret, a grant by a DID.
- **Row 7 with `unattended` is not row 5.** The kernel rewrites the caller to `owner`, `session`
  (K:508-510). That is the holder acting as the owner, written as a special case in `toCore`.
  Which token made the call is in the kernel's `call.by.link` line and not in the core's
  (`spec-as-built.md`, 2026-10-10).
- **Row 10 is already a delegation to a long-lived thing.** A member's Worker runs as its author
  with a fixed scope. It is implicit in the deploy and cannot be made for any other pair.
- **"Not the person's own tab" is already a kind of caller.** Four services keep what a turn, a
  portal or a PDS call makes apart from what the person makes in their tab, each with its own copy of
  one test, `/^(turn:|portal:|jwt$)/` on the via. Browser and container apply it to any caller
  (`brain-browser.ojs:888`, `brain-container.ojs:399`); blob and static to the owner only
  (`brain-blob.ojs:188`, `brain-static.ojs:150`). The browser's reason: "a page in a person's browser
  can hold their session" (`brain-browser.ojs:887`). `brain-db.ojs:404` has a narrower test of its
  own, a turn of the owner, which this design leaves.
- **Nothing lets a system Worker act for a named account by its own start.** A Worker that answers
  a call acts for that call's origin (row 12), and a Worker by its clock is itself (C:40). A push
  for a subscriber is neither.

On cb4, read 2026-10-10: 115 rules, none set by the owner with `rule.put`; one table rule set with
`db.setRule` (`check/posts`: `resource.op == "read"`); three tokens, each from the login button with
`unattended`; no grant; `calls/mode` is `enforce`.

## The design

### Words

- A **principal** is who a call is by: `owner`, a DID, or `worker:NAME`. It is what a rule reads as
  `caller`, what an allowance belongs to, and what a store keys a file or a browser by.
- A principal's **own authority** is what it may call with nobody's leave: the owner everything; a
  member the `MEMBER` list and `m.*`; a Worker its `calls`.
- A **delegation** is a stored record: the owner or a member lets a holder call the methods in a
  scope, until a time, or until it is taken back. A Worker does not delegate.
- A **holder** is one of three: a **secret** (whoever sends it), a **Worker** (by its name), or a
  **DID** (an atproto account, through its PDS or its session).

### The record

```
delegation/<id>
  id         12 hex, public; it is in logs and in answers
  name       a-z 0-9 -, 1 to 40; one per `from` among secret and Worker holders. A DID holder's is "grant".
  from       "owner" | a member's DID
  holder     { secret: sha256 } | { worker: NAME } | { did }
  scope      [ pattern ]                          method names and prefixes
  caps       [ "session" | "deploy" | "unattended" | "delegate" ]
  until      ms | null
  daily      US dollars a UTC day this delegation may spend | null
  parent     id | null                            the delegation it was made under
  note       text; what it is for ("topic orders, push to m.0a1b.shop.receive")
  created, by   when, and the via of the call that made it
```

### The rule, in one sentence

A call made under a delegation is allowed when the method is in the delegation's scope **and** in
what `from` may call at that moment, and no later than `until`.

Both halves are read on each call. Remove a member, delete a grant, revoke a delegation or its
parent: the next call is refused. The core would read these rows through 5 s of memory in each
instance (`settings`, I:294, `ttl: 5000` at I:304), so a revocation takes up to 5 s. A read with no
memory costs one D1 read on every delegated call; 5 s is what rules and routes have now.

### Who the call is by

This is the choice that changes behaviour, so both sides are written out.

| holder | made by | `caller` in a rule | account that pays | what it makes is kept |
|---|---|---|---|---|
| a secret | the owner, a member | `from` | `from`, inside `daily` | as a token's is now, see below |
| a Worker | the owner, a member | `from` | `from`, inside `daily` | the same |
| a DID | the owner only | that DID | that DID; `daily` is not used | as that DID's |

**A delegated call is by the principal and is not the principal's own tab.** That is the class a
turn, a portal and a PDS call are in now. A secret and a Worker have no identity worth keeping: for
a rule and for an allowance they are a hand of the principal. For a store they are what a turn is:
the browsers and containers such a call makes are keyed `d:<id>`, apart from the principal's and
from every other delegation's. Its blobs are stamped `by:d:<id>` and it reads what its principal reads, and its static files are in
the principal's space with the delegation as `writer`. For the owner's that is what a token has now
(`brain-blob.ojs:186-190`, `brain-static.ojs:115`); a member's takes the member's branch
(`brain-blob.ojs:191`, `brain-static.ojs:119`) with the stamp. Neither is a wall. A page in the owner's browser holds the owner's
session, so a secret with `browser.*` must not reach it; under `d:<id>` it does not, as a token
today does not (`b/token:NAME/`, `brain-browser.ojs:131`).

A DID is a person and stays one: a rule such as `caller.kind == "did" &&
resource.key.startsWith(caller.did + "/")` (`brain-db.ojs:41`) depends on it. A delegation to a DID
is what `grant.put` is now: the owner gives another account methods, that account calls them as
itself and pays for them itself. A member does not make one, so nobody but the owner extends what
another person may do. A DID holds one, named `grant`, so there is never a choice of which applies.
Nothing about such a call says "delegation": its via is `session`, `jwt` or `turn:` as now, and the
grant is part of what that DID may do (`may`, below).

What a rule reads, for every caller:

```
caller.delegation   the id under a secret or a Worker holder; "" otherwise
caller.holder       "secret:NAME" | "worker:NAME" | ""
caller.token        NAME when the holder is a secret, as now; "" otherwise
caller.session      the owner's own tab: the owner's session, or a delegation from the owner with the cap
                    "session". Never a member, as now (I:1663).
caller.trusted      as now: the owner, or a caller whose scope was checked
```

Two things are kept apart, because a store and a rule ask different questions:

- **`caller.session`**, for a rule: is this the owner's own tab. Sixteen rules are exactly this.
- **`x-brain-tab`**, for a store: is this call from the principal's own tab, whoever the principal
  is. The core sends it with every call it forwards: `1` for a session of the owner or of a member
  and for a delegation with the cap `session`; `0` for everything else.

A service is sent, about the caller: `x-brain-caller` (the principal), `x-brain-via`
(`delegation:<id>` under one), `x-brain-tab`, and `x-brain-holder` (`secret:NAME` or `worker:NAME`).
About the origin it is sent the same four as `x-brain-origin`, `-via`, `-tab`, `-holder`: a rule
reads `origin.session` (`brain-db.ojs:675`, C:1276), and the origin's tab must come with it down a
chain, so the signed context carries it too (below). Platform cells read them, so no service parses
a header for this:

```
callerFrom(request), originFrom(request)   what callerOf takes: { caller, via, tab, holder }
ownTab(request)    x-brain-tab is "1". When the header is absent (a core from before step 2):
                   the via is none of turn:, portal:, jwt, delegation:
keeperOf(request)  "d:<id>"        the via is delegation:<id> and it is not ownTab
                   "via:<caller>"  the via is turn:, portal: or jwt
                   the caller      everything else
```

`brain-db` builds a caller and an origin from headers by hand (`brain-db.ojs:158`, `:160`) and
decides every table rule with them (`:168`); it takes the two cells. `caller.token` and
`caller.holder` come from `x-brain-holder`.

`keeperOf` is today's test with one case added, so nothing that exists is keyed anew: a Worker
calling for itself is `worker:NAME`, a member's Worker is its author, a token made before step 3 is
`token:NAME`, each as now (`brain-browser.ojs:131`, `:888`).

`keeperOf` takes the place of the test in browser and container, and `ownTab` of the test in blob and
static and of the two guards in `brain-db` that read `via !== "session"` (`brain-db.ojs:230`,
`:334`). Blob, static and db each keep the `=== "owner"` beside it, so a member's turn is treated as
now.

The core holds one fact about a call, `tab`, and everything that asks "is this the owner's own tab"
reads it:

```
tab                     the via is session, or the call is under a delegation with the cap "session"
x-brain-tab             tab, sent with every forwarded call
callerOf(who).session   who.caller is "owner" and who.tab. A service that builds a caller from headers
                        (brain-db.ojs:357, :405) passes x-brain-tab. With no tab given: via == "session", as now.
the core's session guard (C:314)    the caller is "owner" and tab. So a delegation with the cap passes it.
the guard of delegation.create      the via is "session" itself, for the owner or a member; or the call is
                                    under a delegation with the cap "delegate". The cap "session" does not pass.
the kernel's own tests of the via   unchanged: its session guard (K:308), epoch (K:382), portal.token (K:639)
                                    and the minting of turns at inbox.poll (K:680) stay on via == "session".
                                    A delegation with the cap "session" is not handed turns.
```

So the cap `session` means one thing everywhere: this holder is the
owner's own tab. It is what `unattended` is now, and the page should say it in those words.

**What this changes for a token made today** (row 5). Now `caller` is `token:NAME`. After, it is
`owner`, `caller.holder == "secret:NAME"`, not the owner's tab.

```
unchanged   what it makes is its own: browsers, containers, blobs (under d:<id>, where it was token:NAME)
changed     its account: token:NAME with $0.10 of its own (C:583-592) -> the owner's allowance, capped by daily (0.10)
changed     quota.get answers who: "owner", with the delegation's own spend beside it
```

**It is admitted where the owner through a turn or a PDS is admitted, when its scope names the
method.** That is the rule, and it is wider than now: a guard that says "the owner" and means "not a
token" will pass a secret. Found by searching the seeds for `"owner"` in rules and in code that
reads the caller; a second reviewer found five the first search missed, so this list is the ones
known and not a count:

```
inbox.append        caller.kind in ["worker", "deployer", "owner"]     brain-inbox.ojs:40
bluesky.putRecord, deleteRecord, through feed   origin.kind == "owner"  brain-bluesky.ojs:599-600
a member's method   who: "author"   caller.kind == "owner" || …        D:1000
                    who: "members"  caller.kind in ["owner", "did"]    D:1000
db.tables, db.sqlTables   who(c).caller === "owner"                    brain-db.ojs:214
member.services     who !== "owner" && !who.startsWith("did:")         C:398
quota.get?who=      who.caller !== "owner"                             C:707
secret.copy         caller.kind == "owner"; a never method, so not reached   brain-db.ojs:143
```

Each of these admits the owner's turn today. None is a session method.

Code that names a token and gives it what it gives the owner; the token branch becomes dead, and
each keeps working because the caller is `owner`:

```
bluesky.send, whatsapp.send   caller.kind in ["owner", "token"]   brain-bluesky.ojs:591, brain-whatsapp.ojs:180
db tables with no rule        caller.kind in ["owner", "token"]   brain-db.ojs:162; :286 for SQL
inbox                         /^(token|did):/ ; /^(token|did|worker):/   brain-inbox.ojs:62 ; :138
library                       who.startsWith("token:")            brain-library.ojs:109
knowledge                     /^token:/.test(who)                 brain-knowledge.ojs:125
static                        who.startsWith("token:")            brain-static.ojs:115
blob                          who.startsWith("token:"), stamped by:token:NAME   brain-blob.ojs:190; after, by d:<id>
the core                      allowed(), kindOf(), isAccount()    C:312, C:592, C:672
what a rule reads             kind "token"; trusted               I:1655, I:1665. caller.token stays (I:1661).
```

Code that changes in step 1, before any delegation can be made, because it tells a person's tab by
the via and a delegation is a new via:

```
brain-browser.ojs:888, brain-container.ojs:399   keeperOf: whose browser, whose container
brain-blob.ojs:188                               ownTab: whose upload is vouched for
brain-static.ojs:150                             ownTab: who wrote a file. KEPT (:148) keeps shell/ for the owner's
                                                 tab; without the change a secret writes the page served at /.
brain-db.ojs:230, :334                           ownTab: setRule and sqlGrant, the owner's own tab
```

**The alternative**: a secret keeps an identity (`token:NAME`) as now, and the record says which of
the two a delegation is. Cost: the token branches above stay for ever, and a member's token could
not reach that member's files, which are keyed by the member's DID (`brain-static.ojs:119`,
`brain-blob.ojs:191`). Under the recommended choice a member's token is that member, not in their
tab. Not chosen.

### Scope

One matcher, in the kernel and the core, in place of `names()`, the `includes` and, for
delegations, `callMatches()`:

- a whole name: `browser.open`, `ai.v1/chat/completions`
- a prefix: `browser.*`, `ai.v1/*`
- `*`: every ordinary method

A partial name (`brow*`) is refused, as now. atproto's permission strings have `*` for all and no
partial wildcard (`atproto.com/specs/permission`, read 2026-10-10 through a summary, not quoted);
this design keeps the prefix because tokens made since 2026-10-10 use it.

Methods are of four kinds, and a pattern reaches less of each:

| kind | which | `*` | a prefix or a name | also needs |
|---|---|---|---|---|
| ordinary | the rest | yes | yes | |
| session | a method whose rule or guard is the owner's own session: `logs.*`, `browser.all`, `rule.put`, `rule.delete`, `price.put`, `quota.put`, `config.set`, `db.setRule` and the like (C:314 and each `caller.session` rule; 16 rules on cb4, of which the three `secret` ones are of the never kind) | no | yes | the cap `session` |
| deploy | `infra.apply`, `getState`, `redistil`, `confirm`; with `unattended`, `infra.shell` and no approval held | no | no | the cap `deploy`; `unattended` |
| never | `secret.*`, `grant.*`, `people.*`, `token.*`, `delegation.*`, the other `infra.*` | no | no | the principal's own session; `delegation.create`, `list` and `revoke` under the cap `delegate`, below |

So `*` with `session` does not reach `rule.put`; the scope must say `rule.*` or `rule.put`. Today an
`unattended` token with `*` reaches it (recorded as a cost in `spec-as-built.md`, 2026-10-10). This
table is `never()` (K:399), `deploys()` (K:398), the kernel's own list of what a turn does not reach
(K:14) and the `toCore` rewrite (K:508), as one.

`session`, `deploy` and `unattended` are given by the owner's own session and nobody else.
`delegate` is given by the owner or a member in their own session, to a secret holder only. A
delegation made under a delegation has no caps.

The narrowing of `*` binds a holder that has `session` and has neither `browser.*` nor `deploy` with
`unattended`. A holder with `session` and `browser.*` opens the owner's browsers, where a page holds
the owner's session; a holder that deploys with no approval can deploy a kernel. Either can do what
the owner can, whatever its scope says. The login button's token is both, so for it this table
bounds nothing, as nothing bounds it now.

### Making one

`delegation.create { name, holder, scope, caps, until, daily, note }`, called by the owner or a
member in their own session: the via the kernel sends is `session`. The core's guard for it is new,
"a session of the owner or of a member, or a delegation with the cap `delegate`", by the via and not
by `tab`; a delegation with the cap `session` does not pass this new guard. (Such a holder can still open the owner's
browser and call from the page there, as said under *Scope*.) It answers the record, and for a secret holder the
secret, once. `delegation.create`, `list` and `revoke` join the `MEMBER` list (K:199).

- The scope is checked against what the caller may call now. A member cannot put `library.list` in
  a scope unless they have it.
- **A Worker never makes one for the caller it is answering.** Otherwise a member's Worker that the
  owner calls could mint itself a delegation from the owner with the owner's signed context. The
  core refuses `delegation.create` from a keyed Worker whatever its origin. A subscription is two
  calls by the subscriber: `delegation.create` naming `worker:brain-x-topic` and the target, then
  `topic.subscribe` with the id. The page does both behind one button.
- **A Worker holder is a system Worker.** A delegation names a Worker and not its code, so whoever
  can deploy that Worker gets what it holds, and a system Worker is deployed by the owner. A member's
  Worker is not a holder: for its own author it has no need, since it already runs as its author
  (row 10), and three stores read its name from the via to give it its table prefix and its stamp
  (`brain-db.ojs:508`, `brain-blob.ojs:194`, `brain-static.ojs:122`), which a delegation's via would
  take away. For another member it would hand that member's authority to whoever deploys it. The
  alternative is to bind a delegation to the Worker's hash and carry the holder in a header of its
  own; kept for the day a member's Worker must act for someone else.

### A delegation made under a delegation

An agent that holds a secret and wants a push must subscribe, which is a delegation to
`brain-x-topic` made by the agent. So a delegation with the cap `delegate` may call
`delegation.create`, `list` and `revoke`, with these limits, checked when one is made and again on
each call under it:

- the parent's holder is a secret. `delegate` is refused when a delegation to a Worker or a DID is
  made: a Worker never calls `delegation.create`, and a DID has its own session.
- holder: a Worker or a secret, not a DID
- scope: each pattern is inside the parent's scope
- caps: none (so the depth is 2, and a child never deploys or counts as the owner's tab)
- `until`: no later than the parent's; `daily`: no more than the parent's
- `from` is the parent's `from`; `parent` is the parent's id
- it lists and revokes its own children and nothing else

Revoking the parent ends the child at the next call, because the parent is read with it. This is the
attenuation rule of UCAN ("Every unique delegated capability MUST have equal or narrower
capabilities from their delegator", `ucan-wg/spec` 1.0.0, read 2026-10-10). UCAN itself is not used:
it carries the chain in signed tokens so that no server need be asked, and here one core is always
asked. A row is simpler to list and to revoke.

### Using one

| holder | how the call arrives | who checks |
|---|---|---|
| a secret | `Authorization: Bearer <secret>` at the kernel, as a token now | the kernel asks the core `delegation.resolve { sha256 }` and holds the answer 5 s; it needs `from` for its member gate (K:295-299) and the caps for `infra.*`. It forwards the call as `x-brain-caller: from` with `x-brain-delegation: <id>`, a header only the kernel's key may send. The core reads the row by that id, decides, and sends services the via `delegation:<id>` itself |
| a Worker | the Worker's own key, and `x-brain-as: <id>`, straight to the core | the core: the row's holder is the Worker the key names |
| a DID | a PDS JWT or a session at the kernel, as a grant now | the kernel proves the DID; the core reads the one row for it |

A call with `x-brain-as` is not checked against the holder's own `calls` (`asDeclared`, C:280): the
delegation's scope is what bounds it, and `brain-x-topic` could not list every subscriber's target
when it is deployed.

The Worker's side is a platform cell: `xrpc.as(id, { hops }).procedure(name, body)`. A call made
with `x-brain-as` starts a new chain: origin is `from`, and the context of whatever the Worker was
answering is not sent. That is the fix for the push in the topics proposal: the appender's context
never reaches the target.

The signed context (C:155) gains three fields: `t`, the origin's tab, sent on as
`x-brain-origin-tab`; and:

- `d`, the delegation id, so each call further down the chain is logged and capped under it.
- `h`, hops. A call from outside has 0. A call a Worker makes while answering one keeps the `h` of
  the call it answers, as it keeps the origin. A call with `x-brain-as` starts a chain, so the
  holder says where it is: `x-brain-hops: n`, and the core signs `h = n + 1` and refuses over 8.
  The core sends `x-brain-hops` in clear with each call it forwards, so `brain-x-topic` stores it
  with an entry and sends it back on the push. A holder that lies about `n` can loop; it is a
  system Worker, and what bounds it is the allowance.

A Worker answering a delegated call does not get the delegation's scope. What it may call is its own
`calls`. That holds where `calls/mode` is `enforce`, as on cb4; the constant in the seed is `report`
(C:246), under which an undeclared call is counted and allowed. This design does not change the
mode. It assumes `enforce`, and a Brain in `report` has that one bound less.

### Where the rows are, and who decides

Rows are in the core: `delegation/<id>`, and `holder/secret/<sha256>`, `holder/did/<did>` giving an
id. The core is where a Worker's call arrives with no kernel in front (C:118-135), and a Worker
cannot ask the kernel (C:214), so the core must be able to decide alone. `people.sync` (K:478) stays:
the kernel tells the core who is a member.

One decision, in the core, for every method it routes:

```
own(principal, method)     the owner all; a member MEMBER and m.*; a Worker its calls
may(principal, method)     own(principal, method), or for a DID: matches(its grant's scope, method)
allowed(call)              the principal for itself, or a DID:   may(caller, method)
                           under delegation d (secret, Worker):  matches(d.scope, d.caps, method) && may(d.from, method)
                                                                 && d.until > now && its parent, if any, still stands
```

A DID's grant is part of what that DID may do, as now (K:299 is `MEMBER`, `m.*` or the grant), so a
member's delegation may name a method the member has by grant. `may` and `matches` are one cell,
emitted into the kernel and the core. The kernel needs them for
the routes it answers itself and never forwards to the core: `infra.*` to the deployer (K:667),
`token.*`, `grant.*`, `people.*`, `auth`, `portal.*`, and `member.deploy`, `member.remove`,
`member.modules` (K:653). `delegation.resolve { sha256 | did }` is the core's, and only the kernel's
key may call it; the kernel calls it for every secret it is sent, as said under *Using one*.

The kernel writes no delegation row. Its `token.create`, `token.revoke` and `token.list` become
forwards to the core's `delegation.*`, carrying the caller and the via as `toCore` does and changing
the shape of the body and the answer. `token.revoke` first deletes the kernel's unused link of that
name, as it does now (K:471-472). A link stays a row of the kernel; when it is redeemed the
kernel calls `delegation.create` as `owner`, `session`, which is who made the link (K:420 is behind
the kernel's `session` guard). The core takes the kernel's word for the caller there as it does on
every call.

Then `C:312` stops trusting the kernel: the core checks a delegated call itself. The `MEMBER` list
moves from the kernel (K:199) into the shared cell, since the core needs it to answer for a member's
delegation.

### The deployer

It is not changed. The kernel goes on sending `x-brain-caller: owner` and, for a delegation with
`unattended`, `x-brain-unattended: token:NAME` with the delegation's name, which is the shape the
deployer accepts (D:1216) and writes in its log as who deployed. This matters for the order of work:
the deployer is installed apart from the kernel and the core and is outside their probation.

### Money

A priced call under a delegation held by a secret or a Worker is charged to `from`, as any call by
`from`. The core also adds it to `spend/<day>/delegation/<id>` and refuses a call that would pass
`daily`, with the list of charges an account's day uses (`charge`, C:619), so two calls at once
cannot pass it. `daily: null` is no cap but the principal's own. A call under a delegation held by
a DID is that DID's call and is charged to that DID.

A member's delegation cannot spend past the member's allowance, nor the owner's past the owner's.
That is the bound on a loop of pushes: the allowance of whoever subscribed.

### The log

The core's line (C:208) gains `delegation` and `holder`. `caller` is the principal. The kernel's
`call.by.link` and `infra.by.link` lines go: the one line says both.

## What becomes of each row of the table

| # | today | after |
|---|---|---|
| 1 session | | unchanged. It is the principal. |
| 2 turn | | unchanged in mechanism: signed, 10 minutes, no row. Described as a delegation from the sender to the owner's tab; its room cap stays in the kernel. |
| 3 portal | | unchanged. |
| 4 PDS JWT | | unchanged. It is the principal. |
| 5 owner's token | `token/<sha>` | a delegation from `owner`, holder a secret, `daily` the allowance a token has when it is made (`quota/defaults`, $0.10 unless the owner set it; C:583, C:587) |
| 6 link | `link/<sha>` | unchanged: a code that makes a delegation once |
| 7 link's token | flags `deploy`, `unattended` | a delegation with `until` and `daily` as row 5; `deploy` is the cap; `unattended` is the caps `deploy`, `unattended`, `session`, and `daily: null` |
| 8 grant | `grant/<did>` | a delegation from `owner`, holder that DID, named `grant` |
| 9 member | `member/<did>` | unchanged. Being a member is own authority, not a delegation. |
| 10 member's Worker | implicit in `key/<hash>` | unchanged in mechanism. Described as a delegation from the author to the Worker. |
| 11 system Worker | `calls` | unchanged. Own authority. |
| 12 context | `c1.` | gains `t`, `d` and `h` |
| 13 recovery key | | unchanged |

Rows 2, 3 and 10 could be rows in the same table. They are left because a turn is made for every
inbox entry and read on every call of a turn: a row for each is a write and a read where a signature
costs neither. The words of this document describe them; the code does not move.

### Methods that keep their names

`token.create`, `token.link`, `token.revoke`, `token.list`, `grant.put`, `grant.delete`,
`grant.list` stay, with the bodies and answers they have, as short forms of `delegation.*`. The page
(`cloud-brain.ojs`), `/llms.txt` and the briefing the login button copies use the `token` ones, and
`cloud-brain-specs.ojs` cites their tests by name, which the build checks.

## Threats

| threat | what holds it |
|---|---|
| A writer to a topic makes the subscriber's calls | The push reaches one method, the one in the delegation's scope, and the appender's context is not sent. The body is the appender's: a `receive` method reads `entry.sender` and trusts nothing else in it. |
| A secret is stolen | Only its hash is kept. Scope, `until`, `daily`. Every call it makes is logged under its id. `delegation.revoke` ends it within 5 s. |
| A Worker is redeployed with other code | A Worker holder is a system Worker. Who can deploy one is the owner, or a delegation with `deploy`. |
| A deploy delegation redeploys `brain-x-topic` and so holds every subscriber's delegation | True, and no worse than now: it can redeploy the core. `deploy` is the owner's authority over the Brain's code and is given as that. |
| A Worker mints itself a delegation with a caller's context | `delegation.create` is refused from any keyed Worker. |
| A delegation outlives the right it was made from | The principal's authority is read on each call. |
| A secret with `browser.*` runs script in the owner's signed-in page, and so has the owner's session | What a delegated call makes is kept under `d:<id>`; it never opens the owner's browsers. With the cap `session` it does, and has: that cap is the owner's tab. |
| A guard that says "the owner" passes a secret it was written to refuse | It passes one whose scope names the method, as it passes the owner's turn. The owner writes the scope. Session and never methods are outside it. |
| A wildcard reaches more than was meant | `*` reaches ordinary methods only; a session method needs its own prefix and the cap. |
| A member's delegation is used to spend the owner's money | It is charged to the member. |
| A member extends what another person may do | Only the owner makes a delegation to a DID. |
| Pushes that cause pushes | An accident and not an attack: `h` over 8 is refused, and the subscriber's allowance and `daily` bound the rest. |
| A Worker answering a delegated call calls what it should not | Its `calls`, where the mode is `enforce`. In `report` nothing. |

Not held by this design: a holder that is honest today and is compromised later keeps its scope until
someone revokes it. `until` is the answer, and the page should make it hard to leave empty.

## Order of work

Each step is deployed and confirmed alone, and each works with the other of kernel and core one step
behind, because the two are deployed one at a time and a bad one is put back. The deployer is not
touched in any step.

1. **The shared cells, and the stores.** `matches` and `may` in `cloudflare-iac`, with the `MEMBER`
   list; `ownTab`, `keeperOf`, `callerFrom`, `originFrom`; `callerOf` reads `tab` and `holder` when
   they are given. The kernel's `names()` and `includes` and the core's
   `person.methods.includes` call the first two. Browser, container, blob, static and db are
   deployed with the second two, which already count a via of `delegation:` as not the person's tab.
   The kernel adds `delegation` to `never()` (K:399). Nothing a caller sees changes; the tests that
   exist pass as they are. **Step 2 is not deployed until each of the kernel, the core, browser,
   container, blob, static and db runs the hash this step's build emitted for it** (`brain.ts state`
   beside the hashes `apply` printed; `redistil` cannot show it, since it compares a Worker with the
   source the deployer kept, and says `same` of one never redeployed), **and a test in each store
   sends it a via of `delegation:x` and reads the keeper**: a core that hands out `delegation:<id>`
   to a browser service that still has the old test would key a Worker-held delegation's browser as
   the owner's.
2. **The record, in the core, then the kernel.** The core first: `delegation.create`, `list`,
   `revoke`, `resolve`, with the guard for an owner's or a member's session. Then the kernel, with
   `delegation.create`, `list`, `revoke` in the `MEMBER` list; until it is deployed a member is
   refused at the kernel, which is safe. In the core also: `x-brain-as` and `x-brain-hops` for a Worker holder; `d` and `h` in the context;
   `t` too; `x-brain-tab` and `x-brain-holder`, for the caller and for the origin; `tab` computed from
   the via or from the cap `session` from this step on; `delegation` and `holder` in the log line;
   `daily`. Only Worker holders are used
   yet. This is what topics step 2 needs.
3. **New tokens are delegations.** `token.create` and the POST of a link write a delegation, with
   the caps: `deploy` for a link made with `deploy`; `deploy`, `unattended`, `session` for one made
   with `unattended`. The kernel reads `token/` first and asks the core for a hash it does not know,
   and from the caps it sets the `who.deploy` and `who.unattended` it reads now (K:274, K:508,
   K:667), so a link from the login button deploys as before. Tokens made before keep working as
   they did. From here a new token is the owner, not in the owner's tab unless it has `session`.
4. **The kinds of method.** A change of the kernel alone: the `toCore` rewrite (K:508) and
   `deploys()` go. The core has computed `tab` from the cap since step 2, and its own `session` guard
   and every `caller.session` rule have read it since then, so a link from the login button keeps
   its eleven routes and thirteen rules (the sixteen less `secret.put`, `secret.delete` and
   `secret.setRule`, which are never a holder's, now as then: K:399). The kernel reads `deploy` from the caps. The kernel's `call.by.link` and
   `infra.by.link` lines go with the rewrite, and the two assertions on them in
   `test_tokens_reach_only_their_methods` (`brain-kernel.ojs:899`, `:930`) become assertions on the
   core's line. The four kinds in
   *Scope* are enforced, so `*` stops reaching a session method.
5. **Move the old rows.** Each `token/` row becomes a delegation; the kernel's `token/` read goes.
   On cb4 that is three rows today, each ending within 8 hours of when it was made. What a moved token
   made as `token:NAME` is left behind: its browsers and containers end when their time does, and its
   blobs keep the old stamp and stay readable by the owner. A moved token starts again under
   `d:<id>`.
6. **Grants.** `grant.put` writes a delegation with a DID holder; `people.sync` carries members
   only. Last, because the kernel reads `grant/` in six places and deletes it in one, and the core
   reads the copy `people.sync` gives it: hearing a JWT from a DID that is not a member (K:258), the
   room cap (K:291), the gate (K:298), `grant.list` (K:475), `people.sync` (K:480), `people.list`
   (K:537), the delete in `people.remove` (K:564), and `asAuthor` (C:235). After it each read is
   `delegation.resolve { did }` or `delegation.list`, and `people.remove` revokes that DID's
   delegation, or a removed person would keep the methods a grant gave. cb4 has no grant.
7. **`delegate`.** A delegation made under a delegation. The core's guard of `delegation.create`
   takes the cap, and the kernel's `never()` lets `delegation.create`, `list` and `revoke` through
   for a holder that has it.

Steps 1 and 2 change nothing a caller sees. Topics can be built on 2.

## Not verified

- No cost was measured: the call from the kernel to the core that a secret's first call in 5 s adds
  (`delegation.resolve`), the D1 read a delegated call adds in the core, or the 5 s of memory under
  load. Today a token is one read of the kernel's own rows.
- `settings` says of itself "A write goes to rows and drops this instance's copy; another instance
  sees it within ttl" (I:292-293). Not run for `delegation/` rows.
- The lists in *What this changes* come from two searches of the seeds on 2026-10-10 for `"token"`,
  `token:`, `"owner"` and the via test, the second by a reviewer who found five guards the first
  missed. They are not known to be whole. Step 3 should begin with a test that calls every method
  as a secret with `*` and compares what answers with what answers the owner's turn. The 115 rules on cb4 were read by
  their text and none is set by the owner; a Brain other than cb4 was not read.
- Which methods are "session" is not a list anywhere: it is each rule that is `caller.session` and
  each route behind the `session` guard. Step 4 has to make that a list. The seeds outside
  tests have 16 rules that are exactly `caller.session` (browser 4, container 3, db 3, library 1,
  logs 3, snapshot 2), 3 that are compound (`brain-bluesky.ojs:599-600`, `brain-db.ojs:138`), and 11 routes of the core
  behind its `session` guard (C:333 to C:731). cb4's `rule.list` shows the same 16.
- The UCAN sentence is quoted from its README as a fetch gave it, and the third reviewer fetched it
  again and found it verbatim. atproto permissions were read from one page through a summary.
  Macaroons, biscuits and cloud role assumption were not read and are not cited.

## For Tom to decide

1. **A secret acts as its principal, and is not the principal's tab** (recommended). A token made
   after step 3 is `owner` for rules and for money (the owner's allowance, capped by `daily`). What
   it makes stays its own, as now. It is admitted where the owner's turn is admitted, when its scope
   names the method: eight such guards are known, and the list is not known to be whole. Or it keeps its own identity and every store keeps
   a token case.
2. **Grants become delegations** (step 6), or stay as they are and only share the matcher.
   Recommended: become, last.
3. **Turns, portals and a member's Worker stay signed and implicit** (recommended), described in
   these words. Or become rows.
4. **A delegation made under a delegation** (step 7): wanted, or only a principal's own session
   makes one. Recommended: wanted, with `delegate` given by hand, since an agent cannot subscribe
   without it.
5. **A Worker holder is a system Worker** (recommended). Or bind to the hash, carry the holder in
   its own header, and allow a member's.
6. **`session` as a cap that means "the owner's own tab", and `*` not reaching a session method.**
   The first is what `unattended` does now, with its name said plainly: such a holder opens the
   owner's browsers and so has the owner's session. The second is narrower than now for a holder with `session` that has no
   `browser.*` and does not deploy unattended. It does not bound the login button's token, which has
   both and is the owner in effect, as now. Recommended: both.
7. **`calls/mode`**: the seed's default is `report`. Recommended: make `enforce` the default, apart
   from this work.

## Review

2026-10-10, nine drafts, eight fresh reviewers: BLOCK, BLOCK, BLOCK, FIX, FIX, BLOCK, FIX, FIX.

The first found 13 things and the author six more: who pays was said two ways for a DID holder; the
rules that name a token were undercounted and the rules that would open were not looked for;
`brain.ts` was cited as a user of methods it does not call; `token.*` and the rule and price methods
were missing from the reserved table; ten line numbers were wrong; `hops` and the deployer were
left out; a DID with two delegations was not decided.

The second found nine, and one changed the design. The second draft gave a secret the owner's
browsers, and a page in the owner's browser holds the owner's session, so a plain token with
`browser.*` would have had everything. The answer was already in four services as "not the person's
own tab", and the third draft made that the rule for every delegated call. The other eight: five
more guards that read "the owner"; `db.setRule` refusing a delegation with `session`; step 2 needing
kernel and core at once; a member's grant missing from the decision; who gives caps said two ways;
a time in the header that had not happened yet; static's `shell/`; and "every statement names its
line" where three did not.

The third found twelve, two of them in what the third draft had just added. `caller.session` was
written as "the principal's own tab", which read literally opens sixteen owner-only rules to a
member; and one header was asked to answer both "is this the owner's tab" for a rule and "is this
the person's tab" for a store. They are two fields now. It also found the stores were to change in
step 3 while the core began sending the new via in step 2, which reopened the browser hole for a
Worker holder; the stores now change in step 1. The rest: a new link's token had no stated caps
between steps 3 and 4; every grant shared one name; two line numbers; four dead token branches not
listed; a count; a comment that answered a "not tried"; a number that could be counted; and
`delegate` on a Worker that could never be used.

The fourth: FIX, eight findings, every cited line right. `keeperOf` as written would have keyed a
Worker's and an old token's browsers anew once the core sent the header, so it is now today's test
with one case added and the header is sent on every call. Decision 6 offered leaving `rule.*` off the
login button as a control, and that token is the owner in effect; the text says so now. The kernel
was to "write a delegation" with no call named for it. The rest: three `member` methods that the
core answers; a count; a stale header; "kept apart" said of blobs and static files, which are
stamped and not walled; and who gives `delegate`.

The fifth: FIX, seven findings, every cited line right. One was a gap: nothing said how a delegation
with the cap `session` passes the core's own `session` guard once the kernel stops rewriting the
via, so the login button's token would have lost eleven routes at step 4. The core now holds one
fact, `tab`, that its guard, the header and `caller.session` all read. The rest: a DID holder's call
was given a delegation via in one place and none in another (it has none); "reads every blob" was
written of a member's secret too; blob and static keeping their owner test; a seven that followed a
list of five; two tests on log lines that go; two citations.

The sixth: BLOCK, eight findings, every cited line right. The block was a sentence left on a closing
code fence, which made everything below it one code block when rendered. In the design: the guard of
`delegation.create` was stated without the cap `delegate` that step 7 needs; step 1's gate named
`redistil`, which cannot show that a store was redeployed; a member's own Worker as a holder would
have lost the table prefix three stores give it by the via, and it never needed to be one, so a
Worker holder is now a system Worker only; the kernel's own tests of the via were not said to stay;
and a plain link's token had no `daily`.

The seventh: FIX, nine findings, two citations a line off. `tab` reached a service for the caller
and not for the origin, though rules read `origin.session`, and `brain-db` decides its table rules
from headers it parses by hand: the context carries `t` now, and platform cells build the caller and
the origin. The holder's name had no header. How a secret's call reaches the core was said two ways;
it is one now, with its cost. `token.revoke` as a forward would have left an unused link alive.
Step 6 missed two reads of `grant/`. A time in the header had not happened, again.

The eighth: FIX, seven findings, every cited line right at HEAD. None touched the model. Step 6
missed three more reads of `grant/` and the delete in `people.remove`, which would have left a
removed person their granted methods. The id of a delegation reached the core in two spellings.
Whether a holder's `x-brain-as` call is held to its own `calls` was not said (it is not). A token
moved in step 5 would silently lose what it had made. Three of the sixteen `caller.session` rules
are `secret` ones a holder never reaches. Two counts.

The model has not changed since the fifth draft; what the last three reviews found is what a call
carries and which line reads it. Building begins at step 1 with this draft, and each step is
reviewed as it is built.
