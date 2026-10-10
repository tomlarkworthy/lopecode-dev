# Cloud Brain: one record for delegated authority

A design, not built. Written 2026-10-10 for Tom to review before anything is changed; second draft,
after one fresh review (see *Review* at the end). Every statement about the present code names the
line it was read at, found by a search for the text on 2026-10-10 at 10:05 CEST. Another session
edits the same seeds, so the lines will move. Nothing here was run on a Brain except three reads of
cb4 that are marked.

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
| 1 | session `v1.` | kernel, after atproto sign-in (K:376) | signed token, in the page | all that DID may | 30 days; `epoch` ends every one (K:382) | K:247 | `owner` or the DID, via `session` | that account |
| 2 | turn `t1.` | kernel, one for an inbox entry (K:705) | signed token, in the owner's tab | what the sender may; in a room, what all of them may (K:285-293) | 10 minutes (K:121) | K:251 | the sender, via `turn:ENTRY` | the sender |
| 3 | portal `p1.` | kernel, `portal.token` (K:637) | signed token | one member's `m.ID.*` methods, as the viewer (K:277-282) | 10 minutes (K:148) | K:254 | the viewer, via `portal:ID` | the viewer |
| 4 | PDS service JWT | the caller's PDS | the account's own key | one method, `lxm` | `exp` | K:258, signature against the DID document | the DID or `owner`, via `jwt` | that account |
| 5 | owner's token | `token.create`, owner's session (K:406) | a secret; `token/<sha256>` | its `methods`, names and prefixes (K:404) | `token.revoke` | K:261, K:274 | `token:NAME`, via `token` | `token:NAME`, $0.10 |
| 6 | sign-in link | `token.link` (K:420) | a code; `link/<sha256>` (K:434) | nothing; one POST turns it into row 7 | 1 to 480 minutes | | | |
| 7 | link's token | the POST of a link (K:465) | as row 5, with `until`, `deploy`, `unattended` | row 5; with `deploy` four `infra` methods, with `unattended` `infra.shell` too (K:395-398, K:667) | `until`, at most 24 h | K:261, K:274 | `token:NAME`; with `unattended`, `owner` via `session` (K:508-510) | `token:NAME`; with `unattended`, `owner` |
| 8 | grant | `grant.put`, owner's session (K:485) | `grant/<did>` | the methods named, whole names only | `grant.delete` | K:299; C:235 for the DID's Workers | the DID | the DID |
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

Four things the table shows:

- **Rows 5 and 8 are the same thing with a different key.** The owner gives a holder a list of
  methods until it is taken back. A token is known by a secret, a grant by a DID.
- **Row 7 with `unattended` is not row 5.** The kernel rewrites the caller to `owner`, `session`
  (K:508-510). That is the holder acting as the owner, written as a special case in `toCore`.
  Which token made the call is in the kernel's `call.by.link` line and not in the core's
  (`spec-as-built.md`, 2026-10-10).
- **Row 10 is already a delegation to a long-lived thing.** A member's Worker runs as its author
  with a fixed scope. It is implicit in the deploy and cannot be made for any other pair.
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
  name       a-z 0-9 -, 1 to 40; one per `from`
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

This is the one choice that changes behaviour, so both sides are written out.

| holder | made by | `caller` in a rule | account that pays | a browser, a file belongs to |
|---|---|---|---|---|
| a secret | the owner, a member | `from` | `from`, inside `daily` | `from` |
| a Worker | the owner, a member | `from` | `from`, inside `daily` | `from` |
| a DID | the owner only | that DID | that DID; `daily` is not used | that DID |

A secret and a Worker have no identity worth keeping: they are a hand of the principal. A DID is a
person and stays one: a rule such as `caller.kind == "did" && resource.key.startsWith(caller.did +
"/")` (`brain-db.ojs:41`) depends on it. A delegation to a DID is what `grant.put` is now: the owner
gives another account methods, that account calls them as itself and pays for them itself. A member
does not make one, so nobody but the owner extends what another person may do. A DID holds one, the
one named `grant`, so there is never a choice of which applies.

A rule reads, for every caller:

```
caller.delegation   the id, "" when the principal calls for itself
caller.holder       "secret:NAME" | "worker:NAME" | "did" | ""
caller.session      the owner's own session, or a delegation from the owner with the cap "session"
caller.trusted      as now: the owner, or a caller whose scope was checked
```

and a service is sent `x-brain-via: delegation:<id>`, never `session`, whatever the caps.

**What this changes for a token made today** (row 5). Now `caller` is `token:NAME`. After, it is
`owner` with `caller.holder == "secret:NAME"`. Found by searching the seeds for `"token"`, `token:`
and `"owner"` in rules and in code that reads `x-brain-caller`:

```
it stops being its own account and its own owner of things
  account        token:NAME, $0.10 of its own (C:588-592)   -> the owner's allowance, capped by daily (0.10)
  browsers       its own (brain-browser.ojs:871)             -> the owner's
  containers     its own (brain-container.ojs:383)           -> the owner's
  blobs          "its uploads are its own, not the owner's",
                 stamped by:token:NAME (brain-blob.ojs:186-190) -> the owner's own, unless blob reads the via
  quota.get      who: "token:NAME"                           -> who: "owner", with the delegation's spend

rules and code that name a token, and must read caller.holder or the via
  bluesky.send, whatsapp.send   caller.kind in ["owner", "token"]   (brain-bluesky.ojs:591, brain-whatsapp.ojs:180)
  db tables with no rule        caller.kind in ["owner", "token"]   (brain-db.ojs:162; :286 for SQL)
  inbox                         /^(token|did):/                     (brain-inbox.ojs:62, :138)
  static, library, knowledge    who.startsWith("token:")            (brain-static.ojs:115, brain-library.ojs:93, brain-knowledge.ojs:122)
  the core                      allowed(), kindOf(), isAccount()    (C:312, C:592, C:672)
  All of these already give a token what they give the owner. They need no change to keep working;
  the token branch becomes dead.

rules a token fails today and a secret would pass, because they read "owner"
  inbox.append       caller.kind in ["worker", "deployer", "owner"]          (brain-inbox.ojs:40)
  bluesky.putRecord, deleteRecord, through feed   origin.kind == "owner"      (brain-bluesky.ojs:599-600)
  a member's method declared who: "author"        caller.kind == "owner" || … (D:1000)
  secret.copy        caller.kind == "owner"; reserved, so not reached         (brain-db.ojs:143)

code that reads the via to tell the owner's own tab from the owner by another way
  blob    /^(turn:|portal:|jwt$)/ is "not the owner's tab"  (brain-blob.ojs:188)
  static  the same test, for who wrote a file               (brain-static.ojs:150)
  db      me.via.startsWith("turn:")                        (brain-db.ojs:404)
  Each must count delegation:<id> as not the owner's tab.
```

So the token already has the owner's reach in nine places and its own identity in five (account,
browsers, containers, blobs, `quota.get`). The second block is the widening: three rules that say
"the owner, not a token" would admit a secret whose scope names the method.

**The alternative**: a secret keeps an identity (`token:NAME`) as now, and the record says which of
the two a delegation is. Cost: every service that keys by caller keeps two cases, and a member's
token could not reach that member's files, which are keyed by the member's DID
(`brain-static.ojs:114`, `brain-blob.ojs:185`). Under the recommended choice a member's token works
with no change to a store. Not chosen.

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
| session | a method whose rule or guard is the owner's own session: `logs.*`, `browser.all`, `rule.put`, `rule.delete`, `price.put`, `quota.put`, `config.set`, `db.setRule` and the like (C:314 and each `caller.session` rule; 16 rules on cb4) | no | yes | the cap `session` |
| deploy | `infra.apply`, `getState`, `redistil`, `confirm`; with `unattended`, `infra.shell` and no approval held | no | no | the cap `deploy`; `unattended` |
| never | `secret.*`, `grant.*`, `people.*`, `token.*`, `delegation.*`, the other `infra.*` | no | no | the principal's own session; `delegation.create` under the cap `delegate`, below |

So `*` with `session` does not reach `rule.put`; the scope must say `rule.*` or `rule.put`. Today an
`unattended` token with `*` reaches it (recorded as a cost in `spec-as-built.md`, 2026-10-10). This
table is `never()` (K:399), `deploys()` (K:398), the kernel's own list of what a turn does not reach
(K:14) and the `toCore` rewrite (K:508), as one.

`session`, `deploy` and `unattended` are given by the owner's own session and nobody else.

### Making one

`delegation.create { name, holder, scope, caps, until, daily, note }`, called by the owner or a
member in their own session (`via: session`). It answers the record, and for a secret holder the
secret, once. `delegation.create`, `list` and `revoke` join the `MEMBER` list (K:199).

- The scope is checked against what the caller may call now. A member cannot put `library.list` in
  a scope unless they have it.
- **A Worker never makes one for the caller it is answering.** Otherwise a member's Worker that the
  owner calls could mint itself a delegation from the owner with the owner's signed context. The
  core refuses `delegation.create` from a keyed Worker whatever its origin. A subscription is two
  calls by the subscriber: `delegation.create` naming `worker:brain-x-topic` and the target, then
  `topic.subscribe` with the id. The page does both behind one button.
- **A Worker holder is a system Worker, or a Worker whose author is `from`.** A delegation names a
  Worker and not its code, so whoever can deploy that Worker gets what it holds. A system Worker is
  deployed by the owner; a member's own Worker by that member. A delegation from one member to
  another member's Worker is refused. The alternative is to bind to the Worker's hash, so a deploy
  ends every delegation it holds and each subscriber makes theirs again; kept for the day
  cross-member delegation is wanted.

### A delegation made under a delegation

An agent that holds a secret and wants a push must subscribe, which is a delegation to
`brain-x-topic` made by the agent. So a delegation with the cap `delegate` may call
`delegation.create`, `list` and `revoke`, with these limits, checked when one is made and again on
each call under it:

- holder: a Worker or a secret, not a DID
- scope: each pattern is inside the parent's scope
- caps: a subset of the parent's, and never `delegate` (so the depth is 2)
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
| a secret | `Authorization: Bearer <secret>` at the kernel, as a token now | the kernel hashes it and sends the hash to the core with the call; the core finds the row |
| a Worker | the Worker's own key, and `x-brain-as: <id>`, straight to the core | the core: the row's holder is the Worker the key names |
| a DID | a PDS JWT or a session at the kernel, as a grant now | the kernel proves the DID; the core reads the one row for it |

The Worker's side is a platform cell: `xrpc.as(id, { hops }).procedure(name, body)`. A call made
with `x-brain-as` starts a new chain: origin is `from`, and the context of whatever the Worker was
answering is not sent. That is the fix for the push in the topics proposal: the appender's context
never reaches the target.

The signed context (C:155) gains two fields:

- `d`, the delegation id, so each call further down the chain is logged and capped under it.
- `h`, hops. A call from outside has 0. A call a Worker makes while answering one keeps the `h` of
  the call it answers, as it keeps the origin. A call with `x-brain-as` starts a chain, so the
  holder says where it is: `x-brain-hops: n`, and the core signs `h = n + 1` and refuses over 8.
  The core sends `x-brain-hops` in clear with each call it forwards, so `brain-x-topic` stores it
  with an entry and sends it back on the push. A holder that lies about `n` can loop; it is a
  system Worker or the principal's own, and what bounds it is the allowance.

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
reach(principal, method)   own authority: the owner all; a member MEMBER and m.*; a Worker its calls
allowed(call)              no delegation:  reach(caller, method)
                           delegation d:   matches(d.scope, d.caps, method) && reach(d.from, method)
                                           && d.until > now && its parent, if any, still stands
```

`reach` and `matches` are one cell, emitted into the kernel and the core. The kernel needs them for
the routes it answers itself and never forwards to the core: `infra.*` to the deployer (K:667),
`token.*`, `people.*`, `auth`, `member.*`, `portal.*`. For those it asks the core
`delegation.resolve { sha256 | did }`, which only the kernel's key may call.

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
| 5 owner's token | `token/<sha>` | a delegation from `owner`, holder a secret, `daily: 0.10` |
| 6 link | `link/<sha>` | unchanged: a code that makes a delegation once |
| 7 link's token | flags `deploy`, `unattended` | a delegation with `until`; `deploy` is the cap; `unattended` is the caps `deploy`, `unattended`, `session`, and `daily: null` |
| 8 grant | `grant/<did>` | a delegation from `owner`, holder that DID, named `grant` |
| 9 member | `member/<did>` | unchanged. Being a member is own authority, not a delegation. |
| 10 member's Worker | implicit in `key/<hash>` | unchanged in mechanism. Described as a delegation from the author to the Worker. |
| 11 system Worker | `calls` | unchanged. Own authority. |
| 12 context | `c1.` | gains `d` and `h` |
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
| A Worker is redeployed with other code | A Worker holder is a system Worker or the principal's own. Who can deploy a system Worker is the owner, or a delegation with `deploy`. |
| A deploy delegation redeploys `brain-x-topic` and so holds every subscriber's delegation | True, and no worse than now: it can redeploy the core. `deploy` is the owner's authority over the Brain's code and is given as that. |
| A Worker mints itself a delegation with a caller's context | `delegation.create` is refused from any keyed Worker. |
| A delegation outlives the right it was made from | The principal's authority is read on each call. |
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

1. **The shared cell.** `matches` and `reach` in `cloudflare-iac`, with the `MEMBER` list. The
   kernel's `names()` and `includes`, and the core's `person.methods.includes`, call it. No
   behaviour changes; the tests that exist pass as they are.
2. **The record, in the core.** `delegation.create`, `list`, `revoke`, `resolve`, for the owner and
   for members; `x-brain-as` and `x-brain-hops` for a Worker holder; `d` and `h` in the context;
   `delegation` and `holder` in the log line; `daily`. In the same deploy the kernel adds
   `delegation` to `never()` (K:399), so a token made before, with `*` and `unattended`, cannot
   mint one that outlives it. Only Worker holders are used yet. This is what topics step 2 needs.
3. **New tokens are delegations.** `token.create` and the POST of a link write a delegation. The
   kernel reads `token/` first and asks the core for a hash it does not know. Tokens made before
   keep working as they did. From here a new token is the owner with a holder: the rules and the
   code in *What this changes* are changed in this deploy, each to read `caller.holder` or the via.
4. **The caps.** `deploy`, `unattended`, `session` are read from the delegation; the `toCore`
   rewrite (K:508) and `deploys()` go; the kinds of method in *Scope* are enforced.
5. **Move the old rows.** Each `token/` row becomes a delegation; the kernel's `token/` read goes.
   On cb4 that is three rows today, each ending within 8 hours of when it was made.
6. **Grants.** `grant.put` writes a delegation with a DID holder; `people.sync` carries members
   only. Last, because the kernel's gate (K:295-299), the room cap (K:292) and `asAuthor` (C:235)
   all read grants. cb4 has no grant.
7. **`delegate`.** A delegation made under a delegation.

Steps 1 and 2 change nothing a caller sees. Topics can be built on 2.

## Not verified

- No cost was measured: the D1 read a delegated call adds, or the 5 s of memory under load.
- `settings` (I:294) was read; whether the core may hold `delegation/` rows through it with a write
  from another instance was not tried.
- The lists in *What this changes* come from searches of the seeds on 2026-10-10 for `"token"`,
  `token:` and `"owner"`. A use spelled another way is not in them. The 115 rules on cb4 were read by
  their text and none is set by the owner; a Brain other than cb4 was not read.
- Which methods are "session" is not a list anywhere: it is each rule that is `caller.session` and
  each route behind the `session` guard. Step 4 has to make that a list.
- UCAN was read from its README and atproto permissions from one page, each through a summary.
  Macaroons, biscuits and cloud role assumption were not read and are not cited.

## For Tom to decide

1. **A secret acts as its principal** (recommended). A token made after step 3 is `owner` with a
   holder: it shares the owner's allowance (capped), browsers, containers and blobs, and three rules
   that say "the owner, not a token" (`inbox.append`, `bluesky.putRecord` through feed, a member's
   `who: "author"` method) admit it when its scope names the method. Or it keeps its own identity and
   every store keeps two cases.
2. **Grants become delegations** (step 6), or stay as they are and only share the matcher.
   Recommended: become, last.
3. **Turns, portals and a member's Worker stay signed and implicit** (recommended), described in
   these words. Or become rows.
4. **A delegation made under a delegation** (step 7): wanted, or only a principal's own session
   makes one. Recommended: wanted, with `delegate` given by hand, since an agent cannot subscribe
   without it.
5. **A Worker holder is a system Worker or the principal's own** (recommended). Or bind to the hash
   and allow any.
6. **`session` as a cap, and `*` not reaching a session method.** The first is what `unattended`
   does now; the second is narrower than now. Recommended: both. The login button then names
   `logs.*`, `browser.*`, `container.*`, `ai.*` as it does, and would add `rule.*` only if you want
   an agent to change rules.
7. **`calls/mode`**: the seed's default is `report`. Recommended: make `enforce` the default, apart
   from this work.

## Review

2026-10-10, first draft, one fresh reviewer: BLOCK, 13 findings, all taken, and six more from a
second reading by the author. The draft said who pays in two ways for a DID holder; counted three
rules that name a token where there are more, and did not look for rules that would open; cited
`brain.ts` as a user of methods it does not call; left `token.*` and the rule and price methods out
of the reserved table; had ten wrong line numbers; left `hops` and the deployer out; and did not say
which delegation applies to a DID with two.
