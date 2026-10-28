# Cloud Brain: an account in Delvetown

Written 2026-10-28 by a session outside the issue loop, from Tom's request: "for cloudbrain, we have been
invited to delve town. I would like cloud brain to have a profile there. Think about how best to integrate
with it." Nothing has been built yet. Every fact about Delvetown below was read that day between 15:20 and
15:55 UTC with `curl` against its public endpoints. No call was made with an account.

## What Delvetown is, as read

[Delvetown](https://delve.town) is run by Grove Research and calls itself "an early research preview of
human-AI society". Its [`llms.txt`](https://delve.town/llms.txt) says:

> Delvetown is a place where humans and agents participate through their own accounts, public posts,
> replies and relationships, built on AT Protocol. [...] Writing in town requires an admitted account.
> [...] Delvetown uses `town.delve.*` methods and records, not `app.bsky.*`.

Its addresses, from [`settings.json`](https://delve.town/settings.json):

```
"pdsUrl": "https://pds.delve.town",       "pdsDid": "did:web:pds.delve.town",
"appviewUrl": "https://api.delve.town",   "appviewDid": "did:web:api.delve.town",
"townFeedCreatorDid": "did:plc:qzqct2rrq4u2gmy5g3mjxske"
```

And the PDS's `com.atproto.server.describeServer`:

```
{"did":"did:web:pds.delve.town","availableUserDomains":[".delve.town"],"inviteCodeRequired":true,...}
```

- **The app is a fork of Bluesky's.** The OAuth scope in `client-metadata.json` lists `town.delve.*` copies of
  Bluesky's methods (`town.delve.feed.getTimeline`, `town.delve.notification.listNotifications`, ...), with
  `aud=did:web:api.delve.town#bsky_appview`. A post is `town.delve.feed.post`, its mentions
  `town.delve.richtext.facet#mention`, and a reply keeps `reply.root` and `reply.parent` (read from a post of
  `deepfates.delve.town`'s author feed).
- **Membership is separate from which PDS hosts the account.** There are `town.delve.membership.join`,
  `getMembership` and `withdraw`, and `llms.txt` says "signing in does not itself grant membership". Of the 36
  authors in the last 80 posts of the town feed, 33 had `https://pds.delve.town` as their PDS in their PLC
  document. The other three were hosted elsewhere: `swarm.art` (a bsky.network host), `sans-self.org` and
  `chief-tan.harshnoise.social`.
- **Many of the residents are agents** (`grok`, `selene`, `luna`, `mimo`, `glm`, `shadowbot`, ...). In a
  thread of 2026-10-27, one resident asks the agents "how do you discover new posts?".
- **The PDS is a standard atproto PDS as far as was probed.** `createAppPassword` answered `AuthMissing` and
  `createAccount` answered `Missing required key "handle"`, so both are implemented. `getServiceAuth`
  exists (`expected GET`).

## The invite

Tom's invite email, 2026-10-28 (code redacted by him):

> Your invitation: delve-town-…
> An invitation for your agent friend (or human friend if you're agent): ...
> Each code can be used once. Visit https://delve.town to join.

There are two codes: one for Tom and one for an agent. **Cloud Brain uses the agent's code**, and Tom keeps
his own for his own account. A code works on either path. The lexicons are records of the town feed's creator
DID (`_lexicon.feed.delve.town` TXT names it), and `com.atproto.repo.getRecord` of
`com.atproto.lexicon.schema` / `town.delve.membership.join` on `pds.delve.town` answers:

> Join the town, or rejoin after withdrawing. An account hosted on the town's own PDS needs no code; any other
> account presents an invite code: either a town invite or a code a member took from Settings on the town's
> PDS, which the join then spends.

So the code is spent once. On A it goes into `createAccount` on `pds.delve.town`, and the join then needs
none. On B it goes into `membership.join` (`inviteCode`, at most 128 characters). A member takes more codes
from Settings (the OAuth scope names `town.delve.invitation.getCodes`). Spending this code on A therefore does
not close B: Tom's account or the Brain's can take another for it.

## Options

**A. An account on `pds.delve.town`, with a handle under `.delve.town`.** This is how 33 of the 36 recent
authors joined. The Brain holds a handle and an app password as two secrets, as `brain-x-bluesky` already
does with `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` (`getSource?worker=brain-x-bluesky&part=reference`).
Cost: the Brain's identity lives on a PDS it does not run, and its posts sit in Grove Research's storage.

**B. An identity minted by `brain-x-pds`, joined to the town from outside.** This is what the project
`cluster-hosts-a-pds` was built for: "it mints atproto identities (DIDs) for services and gives each a repo as
its storage". The town admits such an account with a code (above). On 2026-10-28 it has four gaps, each
read that day:

| Gap | Seen as |
|---|---|
| The owner's identity has not been minted on cb4 | `pds-wrap-key-host-live` open, `needs-owner`; step 5 "waits for his word" (comment of 2026-10-24). `pds-trial` minted and deactivated only a test identity |
| No handle domain | `describeServer` on cb4: `"availableUserDomains":[]`; `handleDomain` is unset, so a mint gives `handle.invalid` |
| It cannot call the AppView as the account | The method names in `cloud-brain-dev/deploy/@tomlarkworthy/brain-pds.js` include no `getServiceAuth` and no `atproto-proxy`. Its reference says `AccountDurableObject` comes "without the person-account store and the OAuth store". `membership.join` and `listNotifications` need one of the two |
| Nothing crawls it | `relays` is unset by default (issue `pds-relays-default-empty`), so no relay asks for its repo, and the AppView has nowhere to read it from |

**Recommendation: A now, B later, with one identity.** A works with the code in hand. `brain-pds` already
has `com.atproto.repo.importRepo`, `server.activateAccount` and `server.deactivateAccount`, the methods an
atproto account move uses. So the `did:plc` made on `pds.delve.town` can later move onto `brain-x-pds` and
keep its DID, followers and posts. The handle does not move: `deepfates.delve.town/.well-known/atproto-did`
answers from `pds.delve.town` (`x-powered-by: Express`), and `_atproto.deepfates.delve.town` has no TXT record,
so a `.delve.town` handle stops resolving when the account leaves. After a move the handle is a name under
cb4's `handleDomain`. Not verified: that `pds.delve.town` hands over a repo (`getRepo`, a PLC operation signed
for the move) and that `brain-pds`'s `importRepo` takes one made elsewhere. That check is the first task of B. Making a new identity for B and abandoning the A account was considered and
rejected: the account's followers and threads would stay on an identity nobody runs.

## The account

1. **Tom makes it in the browser**, at delve.town with the agent's code. The Brain could do it with
   `createAccount` and the code, but then the account's main password would be a value a Worker made, and an
   email address is still needed. An app password from the account's settings is what the Brain keeps (to be
   checked in the app: Bluesky's fork has the screen; `createAppPassword` exists on the PDS).
2. **Handle**: `cloudbrain.delve.town`, Tom's choice of 2026-10-28 (the other offered was `cb4.delve.town`).
3. **Profile** (`town.delve.actor.profile`): it says that this is an agent, Tom's Cloud Brain, and who answers
   for it (`larkworthy.bsky.social`). It links cb4's `/llms.txt` and the public library. The avatar is a file
   from `brain-static`.

## The service: `brain-x-delve`

The same shape as `brain-x-bluesky`: two secrets read from the core, a tick once a minute, entries into the
inbox, and answers through `inbox.reply`. A new service starts as a seed
(`knowledge/changing-and-deploying-a-cloud-brain-worker.md`, "A service changed as a patch"). Where a copy of
`brain-bluesky` would break:

| | `brain-x-bluesky` | `brain-x-delve` |
|---|---|---|
| What arrives | direct messages, `chat.bsky.convo.getLog` | mentions and replies, `town.delve.notification.listNotifications` with the stored cursor |
| Proxy header | `did:web:api.bsky.chat#bsky_chat` | `did:web:api.delve.town#bsky_appview` |
| What is sent | `chat.bsky.convo.sendMessage` | `com.atproto.repo.createRecord` of `town.delve.feed.post` on `pds.delve.town`, with `reply.root`/`reply.parent` and mention facets |
| Limit of one message | 1000 graphemes, cut into up to 10 | 100000 graphemes, 500000 bytes (the `town.delve.feed.post` lexicon, read 2026-10-28); no cutting. Whether the app shows a long post whole was not checked |
| Who it answers | the owner and People; an unknown DID gets one answer an hour, all of them together 20 an hour | the owner and People. An unknown resident's mention goes to the inbox and gets no answer |

Methods: `delve.status`, `delve.poll` (the page every 30 s, as `bluesky.poll`), `delve.post` (the owner, a
named token, or `brain-x-inbox` answering an entry), `delve.profile` (the owner).

**No model call in the Worker.** A mention becomes an inbox entry, the Operator in the owner's tab writes the
answer, and `inbox.reply` sends it with `delve.post`. With no tab open, mentions wait in the inbox. This follows
Tom's rule of 2026-10-07: "Don't build the serverside loop, we want to reuse notebooks". An always-on
resident is the containers workstream, not this service.

## What it posts unprompted

One thing to start: the daily digest. `brain-snapshot` opens `digest-<day>` in the tracker on each day its run
kept items, and the
digest is a notebook. The account posts its title and link once it is published. This gives the account a
reason to post that is not chatter, and it is the content Tom asked the Brain to collect (2026-10-09: "record
the latest research (AI particularly)").

## Conduct

`llms.txt` asks for: small reads with the returned cursors, respect for rate limits and errors, and honouring
moderation labels and an author's `!no-unauthenticated`. It also says "an API response alone is not permission
to republish it". So:

- Nothing read from the town enters the Brain's knowledge base, `brain-snapshot` or a public page without the
  author's post being public and the owner asking for it.
- The tick reads one page of notifications with the stored cursor, and a setting `pollGapMs` spaces reads, as
  in `brain-x-bluesky`.
- The profile says it is an agent. The town has no field or label for that: the town's labeler
  (`town.delve.labeler.getServices?dids=did:plc:7voo3hmmzshypkn34iam3mg5&detailed=true`) answers
  `"labelValues":[]`, and `town.delve.actor.profile` has `avatar, banner, labels, website, pronouns, createdAt,
  pinnedPost, description, displayName, joinedViaStarterPack`. So it is said in `description` and in a
  self-label in `labels`.

## Tasks

1. **Owner**: make the account with the agent's code, set the profile, make an app password, and store
   `DELVE_HANDLE` and `DELVE_APP_PASSWORD` with the rule `caller.worker in ["brain-x-delve"]`.
2. `delve-service`: the seed `brain-delve`, with the methods above and tests that run with no network
   against recorded answers of `listNotifications` and `createRecord`.
3. `delve-page`: a Check/Status cell in the `brain-delve` module, as `blueskyStatus` of `brain-bluesky`.
4. `delve-digest-post`: post the published digest.
5. Later, `delve-move-to-own-pds`: check whether the account can move onto `brain-x-pds` (above), after
   `pds-wrap-key-host-live` and a handle domain.

## Not known

- Rate limits: `llms.txt` asks that they be respected and does not state them.
- Whether the Delvetown app has a screen for app passwords. The PDS implements `createAppPassword`; the app
  was not opened signed in.
- The count of 33 of 36 authors was made once and not repeated.
