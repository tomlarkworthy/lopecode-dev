---
scope: [local-development]
topics: atproto; Bluesky; PDS; DID; handle; lexicon; com.lopecode.bundle; com.lopecode.module; com.atproto.lexicon.schema; _lexicon DNS; at-write; atproto-publish.ts; atproto-publish-lexicons.ts; site.standard; Jetstream; brain-x-pds; brain-x-library; brain-x-bluesky; brain-x-feed; brain-x-delve; cloudbrain.social
triggers:
  - "^(Edit|Write|MultiEdit) .*(lopecode/lexicons/|tools/atproto-publish|at-write|at-login|atproto-login)"
---

# Publishing and reading atproto records

Collected 2026-11-07 from `specs/atproto.md`, at-write's own prose (`@tomlarkworthy/at-write` in
`lopecode/notebooks/atproto.html`), six memory entries, the Cloud Brain service guides, and a session
that published `com.lopecode.module`. Each live value below was read that day unless it carries
another date. The design and its history are `specs/atproto.md`; this page is how things are now and
what goes wrong.

## Identities

| Who | DID | Handle | PDS |
|---|---|---|---|
| The owner; lexicon authority of `lopecode.com` | `did:plc:j7nm3lrd5h7fm3sfhcv3lhfv` | `larkworthy.bsky.social` | `https://earthstar.us-east.host.bsky.network` |
| The feed curator (`app.bsky.feed.generator/lopecode`) | `did:plc:a5yddar7vebmgjithmy4skj6` | `trendingnotebooks.bsky.social` | `https://poisonpie.us-west.host.bsky.network` |
| Cloud Brain's cluster identity; will hold module records (brain-x-library) | `did:plc:4gi7shchl6byhpebkv5qt53d` | `root.cloudbrain.social` | `https://cb4.endpointservices.workers.dev` (brain-x-pds) |

Read the PDS from the DID document (`https://plc.directory/<did>`), never guess it: the owner's is
earthstar, not amanita (`project_atproto_ci_publish` memory, 2026-08-25). An older memory gave the
owner's handle as `tomlarkworthy.bsky.social`; plc.directory answers `larkworthy.bsky.social`.

## Lexicons

**Resolution.** A schema is a `com.atproto.lexicon.schema` record whose rkey is the NSID, in the repo
of the DID that the TXT record `_lexicon.<authority>` names. The authority is the NSID without its last
segment, reversed: `com.lopecode.module` → `lopecode.com`, but `com.lopecode.bundle.version` →
`bundle.lopecode.com`. A three-part name and a four-part name under one prefix need two TXT records.

```
_lexicon.lopecode.com         TXT "did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv"
_lexicon.bundle.lopecode.com  TXT "did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv"     added by the owner 2026-11-07

com.atproto.lexicon.schema/com.lopecode.bundle           bafyreihby6h3hcdbdilecpi4byzj6czp6gyfidfcxdaqvufltvy2ysf2w4
com.atproto.lexicon.schema/com.lopecode.bundle.version   bafyreialwki4cwvprrdf724ab5fpfg337avdcrhfmgtazhtmgk6wdyqqzm
com.atproto.lexicon.schema/com.lopecode.module           bafyreia7zhspr4w3clpmkeloevx3l72lwn4ju2qzwg35duwx5zcqy6awla   created 2026-11-07 21:45 UTC by CI
```

Until 2026-11-07 neither bundle schema resolved (no `_lexicon.bundle.lopecode.com`; a memory said so on
2026-05-20), so validators such as atproto-browser showed "record not validated" for records that
published and read fine.

**Not schema'd.** `com.lopecode.media` (1 record in the owner's repo) is live and has no schema record;
at-write's prose describes it ("Posters and video"). `com.lopecode.bundle.crossRef` (4 records) is
retired: at-write's `adoptLegacyCrossRefs()` moves what they hold onto the bundle and deletes them. Do
not write a schema for it.

**Publishing a schema.** The files are `lopecode/lexicons/<nsid>.json`, the lexicon document without
`$type`. A push to lopecode `main` that changes one runs the last step of
`.github/workflows/atproto-publish.yml`, which runs `tools/atproto-publish-lexicons.ts` with the repo's
`ATPROTO_IDENTIFIER` / `ATPROTO_APP_PASSWORD` (the owner's app password). To publish a file no push
changed (one skipped before its `_lexicon` TXT record existed, or a push the workflow skipped: a
first push, or over 300 changed files), dispatch the workflow by hand with
`notebooks: lexicons/<nsid>.json`. There is no other way here that has his credentials: before this, a session concluded that the schema needed his login and that no
tool existed, while the workflow and the secrets were already in the repo. Dry run, no credentials:

```
bun tools/atproto-publish-lexicons.ts --publisher lopecode/notebooks/atproto.html --dry-run lopecode/lexicons/*.json
```

It refuses a session whose DID is not the one DNS names, prints `no-change` for an equal record, writes
a changed one under `swapRecord`, and skips with `::warning::` a file whose `_lexicon` record is missing.
The workflow checks out lopecode-dev `main` for its tools, so a tool change lands there first.

**Designing a published schema.** The owner, 2026-11-07: "schema are hard to change". Published:
`com.lopecode.module` without `by` (the repo's DID already says who wrote a record) and with
`fileEntry.encoding` a plain string, not an enum. A lexicon object takes undeclared fields and a plain
string takes any value, so brain-x-pds's stricter copy (requires `by`, enum `text`/`base64`) writes
records that validate against the published one. Publish the looser schema; validate tighter at the
writer.

## Publishing a notebook

at-write is the publisher; its prose, "What one publish writes", is the reference. In short (read
2026-11-07):

| record | rkey |
|---|---|
| `com.lopecode.media` | the poster blob's CID |
| `site.standard.publication` | TID, once per author |
| `site.standard.document` | TID; `putRecord` at the bundle's `stdDocUri` on republish |
| `app.bsky.feed.post` | TID, only when Share to Bluesky is ticked |
| `com.lopecode.bundle` | `slugifyTitle(title)`, written last |
| `com.lopecode.bundle.version` | `{bundleRkey}--{TID}`, a snapshot of the bundle about to be overwritten |

- **TID where the lexicon says `key: tid`.** `app.bsky.feed.post` refused a slug (`400 InvalidRequest:
  Invalid TID string`, 2026-05-05). `site.standard.*` were slug/`self` until 2026-06-02, when a
  comparison with a working standard.site publisher showed a validating appview ignores them; both are
  TID since, and the bundle keeps their URIs (`stdDocUri`, `bskyPostUri`).
- **From CI.** A notebook's sidecar `.json` declares `publish.atproto: { did, rkey, title?, auto }`;
  `tools/atproto-publish.ts`, run by the same workflow in both content repos, republishes it on a push.
  The rkey is declared, never derived from the title: deriving it from the titles of 2026-08-25 would
  have orphaned 9 of 10 live bundles. The tool runs at-write's cells headlessly (`notebook-import.ts`)
  and adds only CI policy. CI writes no `app.bsky.feed.post`.
- **Blobs** are CID v1 raw + sha-256 and dedupe per repo, across bundles: a republish uploaded 0 of 84
  blocks because another notebook's run had uploaded the 2 changed ones (lopebooks run 32820057761).

## Cloud Brain's atproto services

From each service's guide as cb4 ran it on 2026-11-07
(`<brain>/xrpc/com.lopecode.brain.getSource?worker=brain-x-NAME&part=docs`, or
`cloud-brain-dev/deploy/@tomlarkworthy/brain-NAME/docs/usage.md` after `bun sync.ts`):

| Worker | What |
|---|---|
| `brain-x-pds` | A PDS: mints `did:plc` identities for the owner, members and their Workers with no password; keeps their signed repos; validates `com.lopecode.module` and 18 `app.bsky`/`chat.bsky` collections before a write (`InvalidRecord`). |
| `brain-x-library` | Notebooks at `<brain>/library/<name>`; publishes `com.lopecode.module` records in `root.cloudbrain.social`'s repo (none yet on 2026-11-07). |
| `brain-x-bluesky` | The Brain's Bluesky account: chat DMs to and from the inbox, group chats. |
| `brain-x-feed` | Feed generators served by the Brain; a caller fills a feed with post URIs. |
| `brain-x-delve` | The Brain's account in Delvetown (atproto): mentions in, replies out, a record of the bots it meets. |

- **Handles on `cloudbrain.social`** (2026-11-07): a wildcard AAAA and a Workers route
  `*.cloudbrain.social/.well-known/atproto-did` made by hand, outside the deployer. After a kernel
  deploy, check `https://root.cloudbrain.social/.well-known/atproto-did` still answers the DID; it did
  after the deploy of 21:19 UTC that day.
- **`repo` must be a DID on brain-x-pds.** `describeRepo?repo=root.cloudbrain.social` answers 404
  `RepoNotFound`; the DID answers 200. atproto allows either; tracker task
  `pds-repo-param-accepts-handle` (opened 2026-11-07).

## Things that went wrong, and what they were

- **Comparing records by `JSON.stringify` showed 269 changed, 28 were.** `getRecord` returns the record
  CBOR-decoded, keys in canonical order (`$type` after `did`, `byteEnd` before `byteStart`). Compare
  with keys sorted recursively (`sameDoc` in `tools/atproto-publish-lexicons.ts`). 2026-09.
- **A write on the PDS with no reaction downstream is usually relay lag.** 2026-09-07: Jetstream emitted
  a commit 254.5 s after the PDS took it, while another the same evening took under 2 s; three other DIDs
  were 41 to 123 s late in that window. The rkey is a TID, so it is the clock that tells "not federated
  yet" from "not draining".
- **The PDS ignores `rkeyStart`/`rkeyEnd` on `listRecords`.** at-write's version lookup returned
  another bundle's snapshot until it paged and filtered by the `${rkey}--` prefix itself (2026-08-25).
- **OAuth from `file://` cannot bridge the popup** (COOP severs the opener; storage partitioning breaks
  BroadcastChannel). App passwords for anything headless; the memory `feedback_oauth_popup_bridging`
  has the attempts.
- **No DNS in this sandbox.** `dig` times out; use DNS-over-HTTPS:
  `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=_lexicon.lopecode.com&type=TXT'`.

## Not covered here

`com.lopecode.module` records in bundles and the corpus resolving canonical from records are a later
Cloud Brain project: §9 "Later, not this project" of the round-3 spec of the tracker project
`module-lexicon` on cb4 (not a file of this repository). The lopecode.com Workers (render, apex, feed,
Contrail) are in `specs/atproto.md`, "v1 plan". Colibri's lexicons: memory
`reference_colibri_lexicon_live_source`.
