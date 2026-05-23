#!/usr/bin/env bun
// Backfill a day of Slack history into Colibri.
//
// Channel lookup precedence:
//   1. tools/slack-to-colibri-channel.json — manual mapping {slackChannelId: rkey}.
//      Use this when the channels already exist (created via UI / other tooling).
//      Live mode skips channel-create + category-mutation entirely.
//   2. Otherwise: rkey is a deterministic TID derived from the Slack channel's
//      `created` timestamp, and live mode lazy-creates the channel + appends to
//      the category's channelOrder (needs COLIBRI_COMMUNITY_URI + COLIBRI_CATEGORY_RKEY).
//
// Thread replies: published with `parent` set; parent rkey is the deterministic
// TID derivation applied to Slack `thread_ts`, so no lookup table needed.
//
// Idempotent: every message rkey is derived from Slack ts; uses putRecord.
//
// Dry-run by default. Pass --live to publish.
// --live always needs BSKY_HANDLE, BSKY_APP_PASSWORD.

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const PDS = "https://bsky.social";
const USERS_JSON = "vendor/feeling-of-computing/history/users.json";
const CHANNELS_JSON = "vendor/feeling-of-computing/history/channels.json";
const SLACK_TO_DID_JSON = "tools/slack-to-did.json";
const SLACK_TO_COLIBRI_CHANNEL_JSON = "tools/slack-to-colibri-channel.json";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    "src-day": { type: "string" },
    "src-dir": { type: "string", default: "vendor/feeling-of-computing/history" },
    limit: { type: "string", default: "1000" },
    live: { type: "boolean", default: false },
    "delay-ms": { type: "string", default: "200" },
  },
});

if (!values["src-day"]) {
  console.error("usage: bun tools/backfill-colibri.ts --src-day YYYY/MM/DD [--limit N] [--live]");
  process.exit(1);
}

const srcDay = values["src-day"]!;
const srcDir = values["src-dir"]!;
const limit = parseInt(values.limit!, 10);
const dryRun = !values.live;
const delayMs = parseInt(values["delay-ms"]!, 10);

// ── reference data ──────────────────────────────────────────────────────────
type SlackUser = { id: string; name?: string; real_name?: string; profile?: { display_name?: string } };
const users: SlackUser[] = JSON.parse(readFileSync(USERS_JSON, "utf-8"));
const nameOf = new Map<string, string>(
  users.map((u) => [u.id, u.profile?.display_name || u.real_name || u.name || u.id]),
);

type SlackChannel = { id: string; name: string; created: number };
const channels: SlackChannel[] = JSON.parse(readFileSync(CHANNELS_JSON, "utf-8"));
const channelOf = new Map<string, SlackChannel>(channels.map((c) => [c.id, c]));

const SLACK_TO_DID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  try {
    const raw = JSON.parse(readFileSync(SLACK_TO_DID_JSON, "utf-8"));
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith("_")) continue;
      const did = typeof v === "string" ? v : (v as any)?.did;
      if (did) map[k] = did;
    }
  } catch {}
  return map;
})();

const MANUAL_CHANNELS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  try {
    const raw = JSON.parse(readFileSync(SLACK_TO_COLIBRI_CHANNEL_JSON, "utf-8"));
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith("_")) continue;
      const rkey = typeof v === "string" ? v : (v as any)?.rkey;
      if (rkey) map[k] = rkey;
    }
  } catch {}
  return map;
})();

// ── deterministic TID derivation (53b microseconds + 10b clock id) ──────────
const TID_ALPHABET = "234567abcdefghijklmnopqrstuvwxyz";
function tidFromMicros(microseconds: bigint, clockId = 0): string {
  let n = (microseconds << 10n) | BigInt(clockId & 0x3ff);
  const chars: string[] = [];
  for (let i = 0; i < 13; i++) {
    chars.push(TID_ALPHABET[Number(n & 0x1fn)]);
    n >>= 5n;
  }
  return chars.reverse().join("");
}
function tidFromSlackTs(ts: string, clockId = 0) {
  const [sec, usecRaw = ""] = ts.split(".");
  const usec = (usecRaw + "000000").slice(0, 6);
  return tidFromMicros(BigInt(sec) * 1_000_000n + BigInt(usec), clockId);
}
function hash10(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) & 0x3ff;
}
function colibriChannelRkey(slackChannelId: string): string {
  const ch = channelOf.get(slackChannelId);
  if (!ch) throw new Error(`unknown slack channel ${slackChannelId}`);
  return tidFromMicros(BigInt(ch.created) * 1_000_000n, hash10(slackChannelId));
}

// ── text helpers ────────────────────────────────────────────────────────────
const slackify = (s: string) =>
  s
    .replace(/<([^>|]+)\|([^>]+)>/g, "$2")
    .replace(/<(https?:\/\/[^>]+)>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const enc = new TextEncoder();
const utf8Len = (s: string) => enc.encode(s).length;

function buildFacets(text: string, prefixLen: number, claimedDid?: string) {
  const facets: any[] = [];
  if (claimedDid) {
    facets.push({
      $type: "social.colibri.richtext.facet",
      index: { byteStart: 0, byteEnd: prefixLen },
      features: [{ $type: "social.colibri.richtext.facet#mention", did: claimedDid }],
    });
  }
  const urlRe = /https?:\/\/[^\s<>"']+/g;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    const byteStart = utf8Len(text.slice(0, m.index));
    const byteEnd = byteStart + utf8Len(m[0]);
    facets.push({
      $type: "social.colibri.richtext.facet",
      index: { byteStart, byteEnd },
      features: [{ $type: "social.colibri.richtext.facet#link", uri: m[0] }],
    });
  }
  return facets;
}

function buildMessage(m: any, channelRkey: string, parentRkey?: string) {
  const author = nameOf.get(m.user || "") || m.user || "unknown";
  const claimedDid = SLACK_TO_DID[m.user || ""];
  const text = (`@${author}: ` + slackify(m.text || "")).slice(0, 2048);
  const facets = buildFacets(text, utf8Len(`@${author}`), claimedDid);
  return {
    rkey: tidFromSlackTs(m.ts),
    record: {
      $type: "social.colibri.message",
      text,
      channel: channelRkey,
      createdAt: new Date(parseFloat(m.ts) * 1000).toISOString(),
      facets,
      attachments: [],
      ...(parentRkey ? { parent: parentRkey } : {}),
    },
    claimedDid: !!claimedDid,
    linkCount: facets.filter((f) => f.features[0].$type.endsWith("#link")).length,
  };
}

// ── load day's data ─────────────────────────────────────────────────────────
const dayPath = `${srcDir}/${srcDay}`;
let topLevelRaw: any[] = [];
let repliesRaw: any[] = [];
try {
  topLevelRaw = JSON.parse(readFileSync(`${dayPath}.json`, "utf-8"));
} catch {}
try {
  repliesRaw = JSON.parse(readFileSync(`${dayPath}.replies.json`, "utf-8"));
} catch {}

const tops = topLevelRaw
  .filter(
    (m) =>
      m.type === "message" &&
      !m.subtype &&
      m.text &&
      (!m.thread_ts || m.thread_ts === m.ts),
  )
  .sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
  .slice(0, limit);

const replies = repliesRaw
  .filter(
    (m) =>
      m.type === "message" &&
      !m.subtype &&
      m.text &&
      m.thread_ts &&
      m.thread_ts !== m.ts,
  )
  .sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
  .slice(0, limit);

const slackChannelsTouched = new Set<string>(
  [...tops, ...replies].map((m) => m.channel_id).filter(Boolean),
);

const channelMap: Record<string, string> = {};
const channelSrc: Record<string, "manual" | "derived"> = {};
for (const cid of slackChannelsTouched) {
  if (MANUAL_CHANNELS[cid]) {
    channelMap[cid] = MANUAL_CHANNELS[cid];
    channelSrc[cid] = "manual";
  } else {
    channelMap[cid] = colibriChannelRkey(cid);
    channelSrc[cid] = "derived";
  }
}
const allManual = [...slackChannelsTouched].every((cid) => channelSrc[cid] === "manual");

// ── preview ─────────────────────────────────────────────────────────────────
console.log(`=== ${srcDay} ===`);
console.log(`top-level: ${tops.length}  replies: ${replies.length}  channels: ${slackChannelsTouched.size}`);
console.log("");
console.log(`CHANNELS (${allManual ? "manual mapping" : "deterministic / lazy-create"}):`);
for (const cid of slackChannelsTouched) {
  const ch = channelOf.get(cid)!;
  console.log(`  ${cid.padEnd(13)}  ${ch.name.padEnd(22)}  → ${channelMap[cid]}  [${channelSrc[cid]}]`);
}

const fmtRow = (m: any, built: ReturnType<typeof buildMessage>, parent?: string) => {
  const tags = `${built.claimedDid ? "@" : " "}${built.linkCount ? "+" + built.linkCount : "  "}`;
  const parentCol = parent ? `parent=${parent}` : "                  ";
  return `  ${m.ts}  ${(m.channel_name || "?").padEnd(20)}  ${built.rkey}  ${parentCol}  ${tags}  '${built.record.text.slice(0, 70).replace(/\n/g, " ")}…'`;
};

console.log("");
console.log("TOP-LEVEL:");
for (const m of tops) console.log(fmtRow(m, buildMessage(m, channelMap[m.channel_id])));

console.log("");
console.log("REPLIES:");
for (const m of replies) {
  const parent = tidFromSlackTs(m.thread_ts!);
  console.log(fmtRow(m, buildMessage(m, channelMap[m.channel_id], parent), parent));
}

if (dryRun) {
  console.log("");
  console.log("(dry-run; pass --live to publish)");
  process.exit(0);
}

// ── live mode ───────────────────────────────────────────────────────────────
const HANDLE = process.env.BSKY_HANDLE;
const PASSWORD = process.env.BSKY_APP_PASSWORD;
if (!HANDLE || !PASSWORD) {
  console.error("set BSKY_HANDLE, BSKY_APP_PASSWORD");
  process.exit(1);
}
const COMMUNITY_URI = process.env.COLIBRI_COMMUNITY_URI;
const CATEGORY_RKEY = process.env.COLIBRI_CATEGORY_RKEY;
if (!allManual && (!COMMUNITY_URI || !CATEGORY_RKEY)) {
  console.error("some channels need lazy-create; set COLIBRI_COMMUNITY_URI + COLIBRI_CATEGORY_RKEY,");
  console.error(`or add them to ${SLACK_TO_COLIBRI_CHANNEL_JSON}`);
  process.exit(1);
}
const COMMUNITY_RKEY = COMMUNITY_URI?.split("/").pop();

const sessRes = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identifier: HANDLE, password: PASSWORD }),
});
if (!sessRes.ok) throw new Error(`login: ${await sessRes.text()}`);
const sess = await sessRes.json();
const did = sess.did;
const auth = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${sess.accessJwt}`,
};
console.error(`logged in as @${sess.handle} (${did})`);

async function put(collection: string, rkey: string, record: any) {
  const r = await fetch(`${PDS}/xrpc/com.atproto.repo.putRecord`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ repo: did, collection, rkey, record }),
  });
  if (!r.ok) throw new Error(`putRecord ${collection}/${rkey}: ${r.status} ${await r.text()}`);
  return await r.json();
}
async function get(repo: string, collection: string, rkey: string) {
  const r = await fetch(
    `${PDS}/xrpc/com.atproto.repo.getRecord?repo=${repo}&collection=${collection}&rkey=${rkey}`,
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getRecord ${collection}/${rkey}: ${r.status}`);
  return await r.json();
}

// 1. ensure each Slack channel has a Colibri channel record + is in the category's channelOrder
//    (skipped when all channels come from the manual mapping)
if (!allManual) {
  const catRes = await get(did, "social.colibri.category", CATEGORY_RKEY!);
  if (!catRes) {
    console.error(`category ${CATEGORY_RKEY} not found on ${did}; create it first`);
    process.exit(1);
  }
  const categoryRecord = catRes.value;
  const existingOrder: string[] = categoryRecord.channelOrder || [];
  const newRkeys: string[] = [];

  for (const cid of slackChannelsTouched) {
    if (channelSrc[cid] === "manual") continue;
    const rkey = channelMap[cid];
    const ch = channelOf.get(cid)!;
    const existing = await get(did, "social.colibri.channel", rkey);
    if (!existing) {
      await put("social.colibri.channel", rkey, {
        $type: "social.colibri.channel",
        name: ch.name,
        type: "text",
        category: CATEGORY_RKEY,
        community: COMMUNITY_RKEY,
        ownerOnly: false,
      });
      console.error(`  created #${ch.name} (${rkey})`);
    }
    if (!existingOrder.includes(rkey)) newRkeys.push(rkey);
    await new Promise((r) => setTimeout(r, delayMs));
  }

  if (newRkeys.length > 0) {
    categoryRecord.channelOrder = [...existingOrder, ...newRkeys];
    await put("social.colibri.category", CATEGORY_RKEY!, categoryRecord);
    console.error(`  category.channelOrder +${newRkeys.length}`);
  }
}

// 2. publish top-level
console.error("");
console.error("top-level…");
let okT = 0, failT = 0;
for (const m of tops) {
  const built = buildMessage(m, channelMap[m.channel_id]);
  try {
    await put("social.colibri.message", built.rkey, built.record);
    okT++;
  } catch (e) {
    failT++;
    console.error(`  fail ${m.ts}: ${e}`);
  }
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
}

// 3. publish replies
console.error("");
console.error("replies…");
let okR = 0, failR = 0;
for (const m of replies) {
  const parent = tidFromSlackTs(m.thread_ts!);
  const built = buildMessage(m, channelMap[m.channel_id], parent);
  try {
    await put("social.colibri.message", built.rkey, built.record);
    okR++;
  } catch (e) {
    failR++;
    console.error(`  fail ${m.ts}: ${e}`);
  }
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
}

console.error("");
console.error(`done: ${okT} top-level, ${okR} replies, ${failT + failR} failed`);
