# Colibri -> Slack: the reverse bridge

Design record, 2026-09-07. Nothing is built. Every claim below points at a probe run on
2026-09-07 between 11:20 and 11:45 UTC, or at a line of `vendor/slack-sync`.

Ask: replicate `social.colibri.message` / `social.colibri.reaction` records authored by humans
in the Feeling of Computing (FoC) channels back into Slack, posted by a bot identity with an
`@Name: ` byline, the way the forward bridge posts into Colibri. Loop safety comes from both
directions writing under one fixed account each, and each direction ignoring the other's account.

## What the forward path does today

`vendor/slack-sync/packages/worker/src/index.ts`, one Worker, two halves: `fetch()` HMAC-verifies
and enqueues to CF Queue `slack-events`; `queue()` writes `com.feelingofcomputing.bridge.slackRaw`
then publishes to the bot repo `did:plc:4gcxakknd6hxtnhf33miwsob` (`feelingofcomputing.bsky.social`,
PDS jellybaby). Push to `main` of github.com/tomlarkworthy/slack-sync auto-deploys.

The one self-guard in the codebase, `index.ts:555`:

```ts
if (fields.user === BOT_SLACK_USER_ID) return "skip self";   // BOT_SLACK_USER_ID = U0B7685PHGD
```

It is in `publishMessage` only. `publishReaction`, `unpublishReaction` and `unpublishMessage`
have no author check (`index.ts:628-690`). Today that is harmless because the bot never writes to
Slack; the manifest says so (`manifest/slack-app.yaml:42`: "No write scopes ... Posting back from
atproto into Slack is not in scope").

## Observations the design rests on

**1. Jetstream delivers Colibri records, including the bot's.** 7-hour cursor replay, 60 s, run
at 11:42Z:

```
commits=3 lagBehindNow=13207.7s
  1 did:plc:nvd7ndhlv4wucuvwntnolnsr social.colibri.message create    (another community)
  2 did:plc:4gcxakknd6hxtnhf33miwsob social.colibri.message create    (our bot, channel 3mn5tlwafrh2k)
```

Endpoint `wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=social.colibri.message&wantedCollections=social.colibri.reaction`.
Script: scratchpad `jetstream-probe.mjs`. This closes the "live delivery unverified" note in
`plan/foc-viewer.md:423`, for the bot repo at least.

**2. Native Colibri clients write `channel` as an at-uri; the bridge writes a bare rkey.** Two
records from the same replay:

```
native:  "channel":"at://did:plc:srrlnq2jxa6oh5v2dwpwtbyx/social.colibri.channel/3muvpt2666yoa"
bridge:  "channel":"3mn5tlwafrh2k"
```

A native message also carried `index.$type: "app.bsky.richtext.facet#byteSlice"` and a
`facet#list` feature the forward walker never emits. The reverse channel map must therefore
accept three spellings per channel: bare old rkey, at-uri on the old owner, at-uri on the new
owner. Reactions diverge further: a native reaction (Tom, 13:01Z, `3muwkv5uj2kww`) is

```
{"$type":"social.colibri.reaction","emoji":"💜","parent":"at://did:plc:…/social.colibri.message/3mtvf7mc2ecau"}
```

where the bridge writes `{emoji, targetMessage: "<bare rkey>"}` (`index.ts:661-665`). The
reverse side must read `parent` first and `targetMessage` as a fallback; the forward side is
writing a field name the current client does not use, which is a separate fix.

**3. The community migrated; native posts will use the new owner's rkeys.** From
`colibri.social` `listRecords` on `did:plc:dl3d3fftr4tk3yf3xqxouus7`, 2026-09-07:

```
new rkey        name                old rkey (migratedFrom)   Slack channel
3msvih7djjrdp   announcements       3mn5tjsyuvt2t             CGMJ7323Z
3msvih7djjqmu   present-company     3mn5tlwafrh2k             C01932BJGE8
3msvih7djjpb2   linking-together    3mn5tle5l7c2z             C5U3SEW6A
3msvih7djjo7j   administrivia       3mn5tjjdnai2t             CEXED56UR
3msvih7djjm5k   of-ai               3mn5tlntcfa2f             C050QK4917D
3msvih7djjlku   thinking-together   3mn5tmllqd72d             C5T9GPWFL
3msvih7djjklu   #test-01            3mn5tckh3ij24             C0B7BGKT8MP
3msvih7djji3e   devlog-together     3mn5tk5v4yr2s             C03RR0W5DGC
3msvih7djjha6   two-minute-week     3mn5tn53kwy2w             C0120A3L30R
3msvih7djjfxt   introduce-yourself  3mn5tkvfo2j2s             CC2JRGVLK
3msvih7djjbh2   share-your-work     3mn5tmbyexz27             CCL5VVBAN
```

The Slack column is `CHANNEL_MAP` in `index.ts:37-49` inverted. The forward bridge still writes the
old rkeys; whether it should move to the new ones is a separate question, not needed here.

**4. Jetstream replay takes seconds per hour of cursor age, and `identity`/`account` events
give a clock.** A `cursor` (µs) makes Jetstream re-send from that point forward. The probes, all
2026-09-07, measured where the replay had got to when the socket was closed:

```
cursor age   drained   position at close   firehose covered per second
72 h         150 s     28.8 h behind       ~17 min/s
7 h          60 s      3.7 h behind        ~3.3 min/s
1 h          20 s      9.3 min behind      ~2.5 min/s     (jetstream-kinds.mjs)
```

The rate varies 7x between runs; a 1-minute-old cursor catches up in about a second at the
slowest rate seen. The position is known because Jetstream sends `identity` and `account`
events regardless of `wantedCollections` (1984 of them in the 1-hour replay, 5 in 10 s live),
so a consumer can tell "caught up" by comparing an event's `time_us` with its own start time.
Contrail does exactly that (`ingestEvents`, `event.time_us >= startTimeUs`). An earlier draft
of this doc said there was no caught-up signal; that was wrong, it came from counting only
`commit` events.

**5. Slack events name the target's author, so the forward side can tell a reply-to-bot from a
reply-to-human without an API call.** From the live `slackRaw` archive (last 100 records):

```
reply keys:    ts,team,text,type,user,blocks,channel,event_ts,thread_ts,channel_type,client_msg_id,parent_user_id
reaction keys: item,type,user,event_ts,reaction,item_user
```

**6. Native posting into an FoC channel works, and Jetstream carries it within a second.**
Tom posted from his own DID at 13:04:17Z on 2026-09-07:

```
at://did:plc:j7nm3lrd5h7fm3sfhcv3lhfv/social.colibri.message/3muwl2r2ehcww
  channel   at://did:plc:dl3d3fftr4tk3yf3xqxouus7/social.colibri.channel/3msvih7djji3e   (devlog-together, new rkey)
  createdAt 2026-09-07T13:04:17.177Z     jetstream time_us 13:04:17.861Z     (+684 ms)
```

Before this, every non-bot DID in the probes belonged to another community. Whether the Colibri
appview renders a second author's post in the FoC channel is Tom's observation from the client,
not something these probes can see. The message uses the new community's channel rkey, which
confirms the three-spelling map is needed and that the old bare rkeys are bridge-only.

**7. A native reply to a bridged message resolves to Slack without any stored state, but
Colibri threads nest and Slack threads do not.** Tom replied at 13:07:40Z:

```
at://did:plc:j7nm3lrd5h7fm3sfhcv3lhfv/social.colibri.message/3muwlasrtbcww
  parent  at://did:plc:4gcxakknd6hxtnhf33miwsob/social.colibri.message/3munacbuvuz22   (bot-authored)
  channel at://did:plc:dl3d3fftr4tk3yf3xqxouus7/social.colibri.channel/3msvih7djji3e

decode 3munacbuvuz22:  micros = tid >> 10  ->  Slack ts 1788465460.899679  (clockId 0)
bot record:            createdAt 2026-09-03T19:57:40.899Z  channel 3mn5tk5v4yr2s  parent 3muc5hdq7vl22
```

The decoded ts equals the bot record's `createdAt` to the microsecond, so the "C->S, bot record"
row of the table needs no lookup. But the bot message Tom replied to is itself a reply
(`parent 3muc5hdq7vl22`, a bare rkey, which the forward bridge sets to the Slack `thread_ts`).
Slack has one level: every reply carries the root's `thread_ts`. So the reverse side walks
`parent` until it reaches a message with no parent, or a bot-authored one, whose own `parent`
(if any) is already the root; the walk ends in a Slack `thread_ts` either way. A native reply
to a native reply walks two hops through `slackMirror`. Also visible here: the bridge writes
`parent` as a bare rkey and the client writes an at-uri, the same divergence as `channel`.

**8. Unverified: the event shape of a message the bot posts to Slack.** None in the last 100
`slackRaw` records. Expected `user: U0B7685PHGD` plus `bot_id`; the archive will show it after the
first post, and the guard should match either field.

## Native record shapes against the bridge's

Every reference field differs. From Tom's three test records (13:01 to 13:07Z, 2026-09-07,
observations 2, 6, 7) against the bridge's output (`index.ts:613-623`, `661-665`):

```
field                    bridge writes                         native client writes
message.channel          "3mn5tk5v4yr2s"  (old owner, bare)    "at://did:plc:dl3d3fftr4tk3yf3xqxouus7/social.colibri.channel/3msvih7djji3e"
message.parent           "3muc5hdq7vl22"  (bare, thread root)  "at://did:plc:4gcxakknd6hxtnhf33miwsob/social.colibri.message/3munacbuvuz22"  (direct parent)
message.attachments      always present, [] when none          absent
message.facets[].index   {byteStart, byteEnd}                  {$type:"app.bsky.richtext.facet#byteSlice", byteStart, byteEnd}
message.facets features  bold italic strike code link mention  also facet#list {ordered}
message.edited           true on edit                          not seen
reaction target          targetMessage: "3muc…" (bare)         parent: "at://did/social.colibri.message/rkey"
reaction.emoji           unicode or ":name:"                   unicode ("💜")
```

Rules for the reverse side that follow: parse every reference as at-uri first and bare rkey
second, and key channel lookups on all three spellings (observation 3). Rules for the forward
side, separate work: whether the Colibri client resolves the bridge's bare `parent` /
`targetMessage` is Tom's to observe in the client; if it does not, the forward bridge should
write at-uris on the bot repo and the old channel at-uri, which is a rkey-preserving change
(`putRecord` on the same rkeys).

## Loop analysis

Two writers, two guards. Each direction skips records whose author is the *other* direction's
writer.

```
path                                          guard                              status
M1 Slack human msg -> bot Colibri record      reverse: skip did == BOT_DID       to build
M2 Colibri human msg -> bot Slack post        forward: skip user == BOT_SLACK    exists (index.ts:555)
R1 Slack human reaction -> bot Colibri react. reverse: skip did == BOT_DID       to build
R2 Colibri human reaction -> bot Slack react. forward: skip user == BOT_SLACK    MISSING (publishReaction)
E1 bot chat.update -> message_changed         forward: message.user == BOT       exists (via publishMessage)
D1 bot chat.delete -> message_deleted         forward: previous_message.user     MISSING (unpublishMessage)
D2 bot reactions.remove -> reaction_removed   forward: user == BOT_SLACK         MISSING (unpublishReaction)
```

R2 is the one that produces visible damage rather than a no-op: without the guard, every Colibri
reaction the bot mirrors into Slack comes back as a second `social.colibri.reaction` from the bot
repo. It does not loop further (M1/R1 stop it) but it duplicates. D1 is a no-op today only because
`tidFromSlackTs(deleted_ts)` of a bot post never names a record the bot wrote, and `deleteRecord`
treats 404 as success (`index.ts:434`). Add the guard anyway; relying on a 404 is not a design.

Records the reverse side writes to the bot repo (`slackMirror`, below) are not in
`wantedCollections`, so they never re-enter the tail.

Proposed forward change: one predicate `isSelf(ev)` covering `user`, `bot_id`,
`message.user`, `previous_message.user`, applied in `queue()` before `writeSlackRaw`. Skipping
before the archive keeps `slackRaw` a record of Slack-origin events only. Cost: the bot's own posts
are not archived; they are derivable from the Colibri originals, and the `slackMirror` record keeps
the Slack ts.

## Design

Two new halves, mirroring the existing two.

```
JetstreamTail (Durable Object)  --EVENTS_ATPROTO.send-->  Queue atproto-events  --queue()-->  post to Slack
```

**Producer: a Durable Object that drains Jetstream on a short alarm.** Jetstream does not need
to be held open. A `cursor` replays from any point (observation 4: about a second per minute of
gap), and the `identity`/`account` events say when the replay has reached the present. So the
DO's `alarm()` fires every 10 s, opens
`wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=social.colibri.message&wantedCollections=social.colibri.reaction&cursor=<stored>`,
sends each `commit` whose `channel` (or, for reactions, whose target, resolved in the consumer)
is one of the FoC spellings to `env.EVENTS_ATPROTO`, stores the last `time_us`, closes the socket once an
event's `time_us` passes the alarm's start time, and re-arms. A cron poke every minute recreates
the alarm after a deploy. Cost and latency against the alternatives are in the cost section;
this one sits at about 5 s median, the forward path's p50, for no marginal charge. The
subscription is network-wide by collection: of 9 commits seen in today's probes, 4 were other
communities' rooms. They are public records, they are dropped in the DO on the channel match,
and nothing from them reaches the queue. If a
sub-second tail is wanted later, the same DO keeps the socket open between alarms and the
alarm becomes the reconnect check; that is the only change, and it is the one option below that
can bill.

Alternative, deferred: contrail (`@atmo-dev/contrail`, running at contrail.lopecode.com for
`com.lopecode.bundle`, `lopecode.com/contrail/`). Its cron cycle already owns cursor
persistence, reconnect with a 10 s roll-back, CID dedupe and caught-up detection, and its
`config.realtime.pubsub.publish` receives `record.created` / `record.deleted` per event, so a
PubSub that calls `env.QUEUE.send` would make it the producer with no new tail code. It also
indexes every author's records into one queryable D1, which `plan/foc-viewer.md` will need once
native posting is common (today the viewer crawls one repo). The 30 s median latency is why it
is not the bridge's producer; a second contrail deployment for FoC (namespace
`com.feelingofcomputing`) is worth doing for the viewer on its own schedule. Its `runPersistent`
mode inside a DO would merge the two, but it wants a `Database` adapter and is more code than
the tail above.

**Consumer**, per event, in order:

1. `did == BOT_DID` -> ack, skip. (M1, R1.)
2. Resolve `channel` through the three-spelling map (observation 2, 3). Unmapped -> skip.
3. Dedupe against `com.feelingofcomputing.bridge.slackMirror`, rkey = the Colibri message rkey,
   on the bot repo. `getRecord` hit on a `create` -> already posted, skip. This is the reverse of
   the forward's deterministic-rkey idempotency: Slack `ts` cannot be chosen, so the mapping is
   stored instead. Queue redelivery is safe because of this step.
4. Render and post (`chat.postMessage`), then `putRecord` the mirror:

```json
{
  "$type": "com.feelingofcomputing.bridge.slackMirror",
  "source": "at://did:plc:…/social.colibri.message/3muvq2pfgecge",
  "sourceCid": "bafyrei…",
  "slackChannelId": "C01932BJGE8",
  "slackTs": "1788757264.123456",
  "postedAt": "2026-09-07T05:01:09.000Z"
}
```

`update` -> `chat.update` on the mirror's `slackTs`; `delete` -> `chat.delete` then delete the
mirror. Reactions: `reactions.add` / `reactions.remove` with the emoji name from the inverse of
`EMOJI_MAP` (`index.ts:185-190` builds name -> unicode; invert it once). Custom `:name:` strings
pass through unchanged.

**Rendering, symmetric to `publishMessage`.** Text = `@Name: ` + body. `Name` from
`app.bsky.actor.getProfile` on `public.api.bsky.app`, falling back to the DID document's handle
(Colibri users on `colibri.social` may have no Bluesky profile). `facet#mention` with a DID in the
inverse of `SLACK_USER_DID_MAP` (`slack-to-did.ts`) renders as `<@U…>`; `facet#link` as
`<url|text>`; bold, italic, strikethrough, code to mrkdwn; `&`, `<`, `>` escaped. `facet#list`
(observation 2) rendered as plain lines. Attachments as `com.atproto.sync.getBlob` links on the
author's PDS (resolved from the DID document) for v0; re-uploading through `files.uploadV2`
would be the symmetric v1 and needs `files:write`.

With `chat:write.customize` the post can also carry `username: "Name (Colibri)"` and the author's
avatar as `icon_url`, on top of the text prefix. The prefix stays either way: it is what survives
into notifications, search and the archiver.

Each post carries Slack message metadata `{event_type: "colibri_mirror", event_payload: {uri, cid}}`.
Diagnostic, and it lets a human inspecting Slack find the origin; the loop guard does not depend on
it.

**Threads and reactions have to cross the identity mapping.** Four cases:

```
direction  target author   how the target's other-side id is found
S->C       Slack human     tidFromSlackTs(ts)                       (existing)
S->C       bot post        parent_user_id / item_user == bot -> read the post's metadata
                           via conversations.replies (1 call)     -> Colibri rkey
C->S       bot record      decode TID >> 10 -> Slack ts; channel from the record
C->S       Colibri human   slackMirror lookup by rkey             -> slackTs
```

For replies, the C->S rows apply to the thread root, found by walking `parent` (observation 7).
For reactions they apply to the target itself.

The second row is the forward-side change that is easy to miss: today a Slack reply under a
mirrored Colibri message computes `parent = tidFromSlackTs(thread_ts)` (`index.ts:610`), which
names nothing on the Colibri side, so the thread breaks. Observation 5 is what makes the check
free; the API call happens only when the parent is the bot.

**Slack app.** Extend the existing "FoC Bridge" app rather than create a second one: add
`chat:write`, `chat:write.customize`, `reactions:write` to `manifest/slack-app.yaml`, reinstall,
`wrangler secret put SLACK_BOT_TOKEN` with the new token. One app means the existing
`BOT_SLACK_USER_ID` guard already covers the reverse writer. A second app would need a set of
bot ids in the forward guard and a second signing secret; it buys nothing the `username`
customisation does not.

**wrangler.toml deltas**, all in the bridge worker: `[[durable_objects.bindings]]` +
`[[migrations]]` for `JetstreamTail`; `[triggers] crons = ["* * * * *"]` to poke it;
`[[queues.producers]]` / `[[queues.consumers]]` for `atproto-events` (+ `atproto-events-dlq`);
`queue()` dispatches on `batch.queue`. Provision with `wrangler queues create` for both queues.
No new secrets beyond the Slack token check below.

**Not chosen.** D1 for the mirror index (was pencilled in `wrangler.toml:24-31`): the atproto
record is public, replayable, and readable from the foc-viewer notebook with the same
`listRecords` it already uses; D1 would be a second store to keep consistent. Slack `search.messages`
for the reverse lookup: needs a user token.

## Open before building

Settled 2026-09-07 13:3xZ: a **native reaction on a bridged message renders** in the client. Tom
reacted 💜 on `at://did:plc:4gcxakknd6hxtnhf33miwsob/social.colibri.message/3munacbuvuz22` and
saw it; the record is `{emoji:"💜", parent:"at://…/3munacbuvuz22"}` (rkey `3muwngfk6fcww`). That
is the input side of path R2.

Settled 2026-09-07 ~13:50Z: **the bridge's reactions do not render.** Tom saw no reactions on
`…/3muc5hdq7vl22` (his own 2026-08-30 message), which has two bridged records (`3muc5hdq7vlof` ❤️,
`3muc5hdq7vlgq` 😍) derived from four Slack `reaction_added` events in `slackRaw`. Cause, from
Colibri's generated lexicon on `main`
(`apps/website/src/utils/atproto/lexicons/generated/social.colibri.reaction.json`):

```
social.colibri.reaction   key: tid   required: ["emoji","parent"]
  parent  { format: "at-uri", description: "The AT-URI of the message this reaction belongs to." }
```

`targetMessage` has zero hits in the Colibri repo. The bridge writes an off-lexicon field, so the
appview has nothing to index. Same file for `social.colibri.message`: `channel` is `format: at-uri`
(the bridge's bare rkey is tolerated, since messages render) and `parent` is `format: record-key`
(bare, as the bridge writes; the client's at-uri `parent` is the one off-lexicon there).
Fixed for new reactions in slack-sync `d757ec5` (2026-09-07; verified live at 14:47Z: Tom's 🫡 in
administrivia arrived as `3muwq7yoogl36` with `parent: at://…/3muwq7yoogl22`; the two reactions
just before it, `3muwpsje5sb7h` and `…hs`, still came through the old code). Worker + backfill write
`parent: at://<bot did>/social.colibri.message/<target rkey>` and keep `targetMessage` for the
foc-viewer, which reads it). Still to do: a one-off `putRecord` over the 598 existing reaction
records on the same rkeys. The reverse side reads `parent` first, `targetMessage` as fallback.


- Do the two forward rkey conventions need reconciling with native at-uri channels
  (observation 2) before more native traffic exists?
- Bot-post event shape (observation 8): confirm from `slackRaw` after the first post, then tighten
  `isSelf`.
- Whether the public Jetstream instance tolerates a reconnect every 10 s from one client.
  Unknown; the forward probes reconnected a handful of times without a refusal. Back off to
  30 s if it rate-limits, at a cost of ~15 s median latency.

## Cost on Cloudflare

Prices from developers.cloudflare.com pricing pages, read 2026-09-07. The account is on Workers
Paid ($5/month) already: the forward bridge's `slack-events` queue requires it. No deployed
worker of Tom's binds a Durable Object today (`grep durable_objects` over every `wrangler.*` in
this checkout hits only vendor examples), so the DO allowance is unused.

```
Workers Paid includes/month   requests 10M (+$0.30/M)   CPU 30M ms (+$0.02/M)   no charge for time waiting on I/O
Durable Objects               requests 1M (+$0.15/M)    duration 400,000 GB-s (+$12.50/M GB-s) at 128 MB per active object
Queues                        1M operations (+$0.40/M), one operation per 64 KB written, read or deleted
```

Duration is the only line that moves. A DO is billed while it is in memory, and an outgoing
WebSocket keeps it there; the Hibernation API that stops the meter applies to sockets the DO
*accepts*, not ones it opens.

```
producer                          active time / month            DO duration      marginal $/month   median latency
persistent socket in a DO         always                         ~329,000 GB-s    $0 (82% of the allowance);
                                                                                   $4.11 if the allowance is used elsewhere
alarm drain every 10 s in a DO    ~263k drains x ~2 s            ~66,000 GB-s     $0 (16%)            ~5 s   (expected, not measured)
cron drain every 60 s (contrail)  43,800 invocations, ms of CPU  none             $0                  ~30 s
```

Queue operations are the same for all three: three per event (write, read, delete), against
Colibri volumes of tens of events a day. The 10 s alarm is 263k DO requests a month, inside the
1M. The `~2 s` per drain is an estimate from the probes (connect plus sub-second replay plus up
to a second to see a clock event); the first deploy should log it.

## Slack side, manual steps for a workspace admin

The bridge is read-only on Slack today by manifest. Each step is UI or one CLI command; none of
it is deployed by the push-to-main pipeline.

1. **Scopes.** api.slack.com/apps -> FoC Bridge -> App Manifest. Under `oauth_config.scopes.bot`
   add `chat:write`, `chat:write.customize`, `reactions:write`. Leave `files:write` out until
   attachments are re-uploaded (v1). Save. Mirror the same lines into
   `manifest/slack-app.yaml` in the repo and drop its "No write scopes" comment.
2. **Reinstall.** Install App -> Reinstall to Workspace, approve the new scopes. A scope change
   is not live until this is done. If the workspace requires admin approval for app installs,
   that prompt appears here.
3. **Token check.** After reinstall, compare the Bot User OAuth Token (`xoxb-…`) with the one
   the worker holds. Reinstalling usually keeps it; if it changed, from `packages/worker`:

   ```
   wrangler secret put SLACK_BOT_TOKEN
   ```

4. **Channel membership.** Nothing new for the 11 mapped channels: `message.channels` events
   already require the bot to be a member, and `chat.postMessage` needs the same membership.
   A channel added later needs `/invite @focbridge` before either direction sees it.
5. **First post, by hand, into `#test-01` (C0B7BGKT8MP)**, before any reverse code ships:

   ```
   curl -s -X POST https://slack.com/api/chat.postMessage \
     -H "Authorization: Bearer $SLACK_BOT_TOKEN" -H 'Content-Type: application/json' \
     -d '{"channel":"C0B7BGKT8MP","text":"@focbridge: scope test","metadata":{"event_type":"colibri_mirror","event_payload":{"uri":"test"}}}'
   ```

   Then read the newest `slackRaw` record on the bot repo. That event is observation 8: it
   shows the `user` / `bot_id` fields a bot post carries, and it is the fixture for the `isSelf`
   guard in build step 1. Expect one `social.colibri.message` from the bot repo for it today,
   because only `publishMessage` has the guard; delete that record by hand.
6. **Event subscriptions.** No change. The existing `message.channels` subscription delivers
   the bot's own posts, which is what the forward guard filters on.

## Build order

Status 2026-09-07 15:30Z: steps 1 to 4 shipped in slack-sync `a5e808d` (consumer + guards, hand-fed
through `POST /atproto/inject`, no Jetstream producer). First live results, all in
`#devlog-together` (C03RR0W5DGC), tail watched by Tom:

```
inject 15:23:45Z  -> FAILED chat.postMessage: missing_scope   (app not yet reinstalled; retried to DLQ)
inject 15:25:18Z  -> posted 3muwl2r2ehcww -> 1788794724.510389              6 s after inject
reply  3muwlasrtbcww -> 1788794755.113299 in thread 1788084452.267889     two-hop parent walk to the Slack root
💜     3muwngfk6fcww -> reactions.add purple_heart on 1788465460.899679   target = bridged message, TID-decoded
👍     3muwl6wr4esww -> reactions.add +1 on 1788794724.510389             target = native message, via slackMirror
loop   no social.colibri.message at tidFromSlackTs(1788794724.510389); no bot reaction records at the
       two reaction rkeys -> forward guard held for the post and both reactions
```

`chat:write.customize` was kept after review: Tom preferred the post carrying his own name and
avatar over the bot's.

Echo audit and producer, 2026-09-07 (slack-sync commit after `a5e808d`): `test/echo.test.ts` pins
both guards. Forward: bot user id, `bot_id`, `subtype bot_message` and `colibri_mirror` metadata
each drop a message alone; `message_changed` and `message_deleted` are judged on the nested
message; both reaction events on `user`; human replies and reactions on a bot post still flow.
Reverse: every collection and operation on the bot repo returns before any network call, as does
a message in an unmapped room. `JetstreamTail` (`src/tail.ts`) drops the same set before the
queue. Replaying the firehose from 13:04Z with the tail's filter (`scripts/tail-smoke.ts`) took 76 s
to catch up over 6544 events and passed exactly the four native records injected by hand earlier.
A drain from now-30 s saw 19 events and closed in 1.2 s.

Tail started 15:40:03Z (`POST /tail/start`, slack-sync `aadfe9c`). Status samples over the next
50 s: drains every 10 s, 334 / 1425 / 3265 / 1066 ms each, 5 to 10 events seen, caught up every
time, cursor advancing with the clock. Nothing enqueued yet: no native activity in a mapped room.

Forward-side row shipped next (`mirrorSourceFor` in `index.ts`): a threaded reply whose
`parent_user_id` is the bot, or a reaction whose `item_user` is the bot, triggers one
`conversations.replies` call with `include_all_metadata`; a `colibri_mirror` payload makes the
Colibri record's `parent` the native at-uri. Absent metadata (a bridged root) keeps the rkey
parent. Cached per isolate; a failed call is not cached. The byline was also dropped from the
text: the customize post already names the author.

Remaining: the 598-record reaction sweep. `#test-01`-only gating was skipped since the channel map is shared
and the first live post was already agreed.


1. Forward guards: `isSelf` in `queue()` covering R2, D1, D2. Ship alone; safe today.
2. Manifest scopes + reinstall + secret rotate. Verify the bot can `chat.postMessage` into `#test-01`.
3. Channel map with three spellings, shared by both directions.
4. `JetstreamTail` DO + `atproto-events` queue + consumer with `slackMirror` dedupe; messages
   only, `#test-01` only, then widen the channel map.
5. Threads (both rows of the four-case table that are new), then reactions, then edits/deletes.
6. Byline resolution (`getProfile` + handle fallback), mention/link facets, `chat:write.customize`.
