const _1ocuwnz = function _focConfig() {return ({
  botDid: "did:plc:4gcxakknd6hxtnhf33miwsob",
  botPds: "https://jellybaby.us-east.host.bsky.network",
  oldOwnerDid: "did:plc:j7nm3lrd5h7fm3sfhcv3lhfv",
  oldPds: "https://earthstar.us-east.host.bsky.network",
  communityDid: "did:plc:dl3d3fftr4tk3yf3xqxouus7",
  communityPds: "https://colibri.social",
  communityHandle: "c-3msvih5zj4kuk.colibri.social",
  communityRkey: "self",
  categoryRkey: "3msvih7djj3ek",
  hiddenChannels: ["#test-01"],
  shareChannels: ["share-your-work", "two-minute-week", "devlog-together"],
  introChannel: "introduce-yourself",
  nameAliases: { "Ivan Reese": "Ivy Reese" },
  wikiSite: "https://wiki.feelingof.com",
  wikiRaw: "https://raw.githubusercontent.com/feelingofcomputing/wiki/main/pages/",
  wikiRepo: "feelingofcomputing/wiki",
  wikiEdit: "https://github.com/feelingofcomputing/wiki/edit/main/pages/",
  wikiPulls: "https://api.github.com/repos/feelingofcomputing/wiki/pulls?state=open",
  colibriApp: "https://colibri.social/app/c/did:plc:dl3d3fftr4tk3yf3xqxouus7/text/",
  pdsls: "https://pdsls.dev/at://did:plc:4gcxakknd6hxtnhf33miwsob/social.colibri.message/",
  bskyProfile: "https://bsky.app/profile/",
  idbName: "foc-viewer",
  idbStore: "payload",
  idbKey: "archive-v1"
});};
const _focdataseed = function _seed(md){return(
md`# FoC shared data`
)};
const _1wbyida = async function _focIdb(focConfig) {
  const noop = { get: async () => undefined, put: async () => {}, ok: false };
  try {
    const idb = window.indexedDB;
    if (!idb) return noop;
    const db = await new Promise((res, rej) => {
      const req = idb.open(focConfig.idbName, 1);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(focConfig.idbStore)) d.createObjectStore(focConfig.idbStore);
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
      req.onblocked = () => rej(new Error("idb blocked"));
    });
    return {
      ok: true,
      get: (key) => new Promise((res, rej) => {
        const r = db.transaction(focConfig.idbStore, "readonly").objectStore(focConfig.idbStore).get(key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }),
      put: (key, value) => new Promise((res, rej) => {
        const r = db.transaction(focConfig.idbStore, "readwrite").objectStore(focConfig.idbStore).put(value, key);
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      })
    };
  } catch (e) {
    return noop;
  }
};
const _12iqz0 = function _focListRecords() {return ((pds, repo, collection, opts = {}) => {
  const out = [];
  const run = async () => {
    let cursor = null;
    for (let page = 0; page < 200; page++) {
      const u = new URL("/xrpc/com.atproto.repo.listRecords", pds);
      u.searchParams.set("repo", repo);
      u.searchParams.set("collection", collection);
      u.searchParams.set("limit", String(opts.limit || 100));
      if (opts.reverse) u.searchParams.set("reverse", "true");
      if (cursor) u.searchParams.set("cursor", cursor);
      const r = await fetch(u.toString());
      if (!r.ok) throw new Error(collection + " listRecords " + r.status);
      const j = await r.json();
      for (const rec of j.records || []) out.push({ rkey: rec.uri.split("/").pop(), cid: rec.cid, value: rec.value });
      cursor = j.cursor;
      if (!cursor || !(j.records || []).length) break;
    }
    return out;
  };
  return run();
});};
const _1ogqf1u = async function _structure(focConfig,focListRecords) {
  const cfg = focConfig;
  const [community, categories, channels] = await Promise.all([
    fetch(cfg.communityPds + "/xrpc/com.atproto.repo.getRecord?repo=" + cfg.communityDid +
          "&collection=social.colibri.community&rkey=" + cfg.communityRkey)
      .then((r) => (r.ok ? r.json() : null)).then((j) => (j ? j.value : null)).catch(() => null),
    focListRecords(cfg.communityPds, cfg.communityDid, "social.colibri.category").catch(() => []),
    focListRecords(cfg.communityPds, cfg.communityDid, "social.colibri.channel").catch(() => [])
  ]);
  const list = channels.map((c) => {
    const from = c.value.migratedFrom || "";
    return {
      rkey: c.rkey,
      oldRkey: from ? from.split("/").pop() : null,
      name: c.value.name,
      type: c.value.type,
      category: c.value.category,
      hidden: cfg.hiddenChannels.indexOf(c.value.name) >= 0
    };
  });
  return { community, categories: categories.map((c) => ({ rkey: c.rkey, ...c.value })), channels: list };
};
const _18jukin = function _channelsByRkey(structure) {
  const m = new Map();
  for (const c of structure.channels) {
    m.set(c.rkey, c);
    if (c.oldRkey) m.set(c.oldRkey, c);
  }
  return m;
};
const _lqdytk = async function* _archive(focConfig,focListRecords,focIdb) {
  const cfg = focConfig;
  const log = (window.__focTiming = window.__focTiming || []);
  const mark = (what, extra) => {
    const e = { what, t: Date.now(), iso: new Date().toISOString(), ...(extra || {}) };
    log.push(e);
    return e;
  };
  mark("archive-start");
  const fetchAll = async () => {
    const [messages, reactions] = await Promise.all([
      focListRecords(cfg.botPds, cfg.botDid, "social.colibri.message", { reverse: true }),
      focListRecords(cfg.botPds, cfg.botDid, "social.colibri.reaction", { reverse: true })
    ]);
    return { messages, reactions, fetchedAt: new Date().toISOString() };
  };
  const cached = await focIdb.get(cfg.idbKey).catch(() => undefined);
  const pending = fetchAll().then(
    (v) => ({ ok: true, v }),
    (e) => ({ ok: false, e: String(e) })
  );
  if (cached && cached.messages && cached.messages.length) {
    mark("yield-cache", { messages: cached.messages.length, reactions: (cached.reactions || []).length });
    yield { messages: cached.messages, reactions: cached.reactions || [], fetchedAt: cached.fetchedAt, source: "indexeddb", error: null };
  } else {
    mark("no-cache");
    yield { messages: [], reactions: [], fetchedAt: null, source: "loading", error: null };
  }
  const r = await pending;
  if (!r.ok) {
    mark("refetch-failed", { error: r.e });
    yield { messages: cached ? cached.messages : [], reactions: cached ? cached.reactions || [] : [], fetchedAt: cached ? cached.fetchedAt : null, source: cached ? "indexeddb" : "error", error: r.e };
    return;
  }
  await focIdb.put(cfg.idbKey, r.v).catch(() => {});
  mark("refetch-done", { messages: r.v.messages.length, reactions: r.v.reactions.length });
  yield { messages: r.v.messages, reactions: r.v.reactions, fetchedAt: r.v.fetchedAt, source: "network", error: null };
};
const _1l64rhq = function _byRkey(archive) {
  const m = new Map();
  for (const r of archive.messages) m.set(r.rkey, r);
  return m;
};
const _1yv3u9u = function _topLevelByChannel(archive,channelsByRkey) {
  const m = new Map();
  for (const r of archive.messages) {
    if (r.value.parent) continue;
    const ch = channelsByRkey.get(r.value.channel);
    const key = ch ? ch.rkey : r.value.channel;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(r);
  }
  for (const list of m.values()) list.sort((a, b) => (a.rkey < b.rkey ? -1 : a.rkey > b.rkey ? 1 : 0));
  return m;
};
const _12od4yw = function _repliesByParent(archive) {
  const m = new Map();
  for (const r of archive.messages) {
    if (!r.value.parent) continue;
    if (!m.has(r.value.parent)) m.set(r.value.parent, []);
    m.get(r.value.parent).push(r);
  }
  for (const list of m.values()) list.sort((a, b) => (a.rkey < b.rkey ? -1 : a.rkey > b.rkey ? 1 : 0));
  return m;
};
const _l3aj65 = function _reactionsByTarget(archive) {
  const m = new Map();
  for (const r of archive.reactions) {
    const t = r.value.targetMessage;
    if (!t) continue;
    if (!m.has(t)) m.set(t, new Map());
    const em = m.get(t);
    const key = r.value.emoji || "?";
    em.set(key, (em.get(key) || 0) + 1);
  }
  return m;
};
const _1242fwm = function _parseByline(focConfig) {return ((record) => {
  const v = record && record.value ? record.value : record || {};
  const text = v.text || "";
  const m = text.match(/^@([^:\n]+): ?/);
  const raw = m ? m[1] : null;
  const name = raw ? focConfig.nameAliases[raw] || raw : null;
  const bytePrefix = m ? new window.TextEncoder().encode(m[0]).length : 0;
  let did = null;
  for (const f of v.facets || []) {
    if (!f.index || f.index.byteStart !== 0) continue;
    for (const feat of f.features || []) {
      if (feat.did) did = feat.did;
    }
  }
  return { name, bylineName: raw, did, bytePrefix, raw: m ? m[0] : "" };
});};
const _13jxxtn = function _bodyText(parseByline) {return ((record) => {
  const v = record && record.value ? record.value : record || {};
  const b = parseByline(record);
  return b.raw ? (v.text || "").slice(b.raw.length) : v.text || "";
});};
const _1y8vzq9 = function _focEscape() {return ((s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;"));};
const _2ztslk = function _renderFacets(focEscape,focConfig) {return ((text, facets, offset = 0) => {
  const enc = new window.TextEncoder();
  const dec = new window.TextDecoder();
  const bytes = enc.encode(text || "");
  const cuts = [];
  for (const f of facets || []) {
    if (!f.index) continue;
    const s = f.index.byteStart - offset;
    const e = f.index.byteEnd - offset;
    if (!(e > 0) || !(s < bytes.length) || !(e > s)) continue;
    cuts.push({ s: Math.max(0, s), e: Math.min(bytes.length, e), features: f.features || [] });
  }
  cuts.sort((a, b) => a.s - b.s || b.e - a.e);
  const wrap = (inner, features) => {
    let out = inner;
    for (const feat of features) {
      const t = String(feat.$type || "");
      if (t.endsWith("#mention") && feat.did) {
        out = '<a class="foc-mention" target="_blank" rel="noopener" href="' + focEscape(focConfig.bskyProfile + feat.did) + '">' + out + "</a>";
      } else if (t.endsWith("#link") && feat.uri) {
        out = '<a class="foc-link" target="_blank" rel="noopener" href="' + focEscape(feat.uri) + '">' + out + "</a>";
      } else if (t.endsWith("#channel") && feat.channel) {
        out = '<a class="foc-chanref" data-foc-channel="' + focEscape(feat.channel) + '" href="#">' + out + "</a>";
      } else if (t.endsWith("#bold")) out = "<strong>" + out + "</strong>";
      else if (t.endsWith("#italic")) out = "<em>" + out + "</em>";
      else if (t.endsWith("#code")) out = "<code>" + out + "</code>";
      else if (t.endsWith("#strikethrough")) out = "<s>" + out + "</s>";
    }
    return out;
  };
  const plain = (a, b) => focEscape(dec.decode(bytes.slice(a, b))).replace(/\n/g, "<br>");
  let pos = 0;
  let html = "";
  for (const c of cuts) {
    if (c.s < pos) continue;
    html += plain(pos, c.s);
    html += wrap(plain(c.s, c.e), c.features);
    pos = c.e;
  }
  html += plain(pos, bytes.length);
  return html;
});};
const _aaqg0h = function _renderBody(parseByline,renderFacets,bodyText) {return ((record) => {
  const v = record && record.value ? record.value : record || {};
  const b = parseByline(record);
  return renderFacets(bodyText(record), v.facets, b.bytePrefix);
});};
const _1ogx4fw = function _blobUrl(focConfig) {return ((cid) => focConfig.botPds + "/xrpc/com.atproto.sync.getBlob?did=" + encodeURIComponent(focConfig.botDid) + "&cid=" + encodeURIComponent(cid));};
const _h49ht1 = function _profiles() {
  const cache = new Map();
  const inflight = new Map();
  return async (dids) => {
    const want = [...new Set((dids || []).filter((d) => d && !cache.has(d)))];
    for (let i = 0; i < want.length; i += 25) {
      const batch = want.slice(i, i + 25);
      const key = batch.join(",");
      if (!inflight.has(key)) {
        const u = "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?" +
          batch.map((d) => "actors=" + encodeURIComponent(d)).join("&");
        inflight.set(key, fetch(u).then((r) => (r.ok ? r.json() : { profiles: [] })).catch(() => ({ profiles: [] })));
      }
      const j = await inflight.get(key);
      for (const p of j.profiles || []) cache.set(p.did, p);
      for (const d of batch) if (!cache.has(d)) cache.set(d, null);
    }
    const out = new Map();
    for (const d of dids || []) out.set(d, cache.get(d) || null);
    return out;
  };
};
const _1c13k3g = function _focTokenize() {return ((s) => String(s || "").toLowerCase().split(/[^a-z0-9_@.\-]+/).filter((t) => t.length > 1));};
const _uf9ces = function _searchIndex(archive,parseByline,channelsByRkey,bodyText,focTokenize) {
  const idx = new Map();
  const docs = new Map();
  for (const r of archive.messages) {
    const by = parseByline(r);
    const ch = channelsByRkey.get(r.value.channel);
    const body = bodyText(r);
    const doc = { rkey: r.rkey, name: by.name || "", channel: ch ? ch.name : "", body };
    docs.set(r.rkey, doc);
    const toks = new Set([...focTokenize(body), ...focTokenize(doc.name), ...focTokenize(doc.channel)]);
    for (const t of toks) {
      if (!idx.has(t)) idx.set(t, []);
      idx.get(t).push(r.rkey);
    }
  }
  return { idx, docs, terms: idx.size };
};
const _709amv = function _search(focTokenize,searchIndex,byRkey) {return ((q, limit = 60) => {
  const terms = focTokenize(q);
  if (!terms.length) return [];
  const counts = new Map();
  for (const t of terms) {
    const exact = searchIndex.idx.get(t);
    const hits = exact || [];
    let extra = [];
    if (!exact) {
      for (const [term, list] of searchIndex.idx) {
        if (term.startsWith(t)) extra = extra.concat(list);
        if (extra.length > 4000) break;
      }
    }
    for (const rk of hits.concat(extra)) counts.set(rk, (counts.get(rk) || 0) + 1);
  }
  const scored = [...counts.entries()]
    .filter(([, c]) => c >= terms.length)
    .map(([rk]) => byRkey.get(rk))
    .filter(Boolean);
  scored.sort((a, b) => (a.rkey < b.rkey ? 1 : a.rkey > b.rkey ? -1 : 0));
  return scored.slice(0, limit);
});};
const _focpeoplefake = function _peopleFake(){return(
[{"slackId":"U02E4DAQGSZ","name":"Tom Larkworthy","avatar":"https://avatars.slack-edge.com/2021-09-13/2483463922595_27dffd0e73bd6f709927_72.gif","title":"","did":"did:plc:j7nm3lrd5h7fm3sfhcv3lhfv","github":null,"website":null,"posts":20,"replies":112,"firstSeen":"2026-05-31","lastSeen":"2026-09-07"},{"slackId":"UC2A2ARPT","name":"Ivy Reese","avatar":"https://avatars.slack-edge.com/2026-06-02/11271828954308_f81c1febf731b304a29d_72.jpg","title":"Admin / Moderator","did":"did:plc:fway37p6xwk2hu3c3t3rqs5t","github":null,"website":null,"posts":28,"replies":75,"firstSeen":"2026-05-06","lastSeen":"2026-09-07"},{"slackId":"UJFN50C00","name":"curious_reader","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":7,"replies":73,"firstSeen":"2026-06-02","lastSeen":"2026-09-04"},{"slackId":"UA14TGLTC","name":"wtaysom","avatar":"https://secure.gravatar.com/avatar/3ae6d55db9d15b79bc683a8031fc2588.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0009-72.png","title":"","did":null,"github":null,"website":null,"posts":17,"replies":43,"firstSeen":"2026-06-01","lastSeen":"2026-09-05"},{"slackId":"UGWUJUZHT","name":"guitarvydas","avatar":"https://avatars.slack-edge.com/2023-02-06/4754627914258_41a8bada781281751d07_72.jpg","title":"","did":null,"github":null,"website":null,"posts":10,"replies":28,"firstSeen":"2026-06-01","lastSeen":"2026-09-06"},{"slackId":"UBN9AFS0N","name":"Mariano Guerra","avatar":null,"title":"","did":"did:plc:34jj3u665cbmkr6aklhtqmsc","github":null,"website":null,"posts":5,"replies":28,"firstSeen":"2026-06-01","lastSeen":"2026-08-27"},{"slackId":"UJBAJNFLK","name":"Konrad Hinsen","avatar":null,"title":"","did":"did:plc:r5lx5cznmnj6fftfy4hudgmm","github":null,"website":null,"posts":4,"replies":27,"firstSeen":"2026-06-01","lastSeen":"2026-08-27"},{"slackId":"UCUSW7WVD","name":"Kartik Agaram","avatar":null,"title":"","did":"did:plc:tjjg4apdy6trfahz65f54duy","github":null,"website":null,"posts":9,"replies":21,"firstSeen":"2026-06-01","lastSeen":"2026-09-05"},{"slackId":null,"name":"Tom Larkworthy","avatar":null,"title":"","did":"did:plc:j7nm3lrd5h7fm3sfhcv3lhfv","github":null,"website":null,"posts":7,"replies":22,"firstSeen":"2025-03-07","lastSeen":"2026-05-31"},{"slackId":null,"name":"Z_Z","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":2,"replies":25,"firstSeen":"2026-05-22","lastSeen":"2026-05-29"},{"slackId":null,"name":"curious_reader","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":25,"firstSeen":"2026-05-18","lastSeen":"2026-05-24"},{"slackId":null,"name":"Konrad Hinsen","avatar":null,"title":"","did":"did:plc:r5lx5cznmnj6fftfy4hudgmm","github":null,"website":null,"posts":1,"replies":24,"firstSeen":"2026-05-10","lastSeen":"2026-05-29"},{"slackId":"U01ULEWACPP","name":"Florian Schulz","avatar":"https://avatars.slack-edge.com/2021-05-26/2104531310403_4d4f0ee36615313d19e3_72.jpg","title":"Interface Designer • Design and programming tools • Pushing boundaries, not pixels.","did":null,"github":null,"website":null,"posts":1,"replies":22,"firstSeen":"2026-06-13","lastSeen":"2026-06-25"},{"slackId":null,"name":"Kartik Agaram","avatar":null,"title":"","did":"did:plc:tjjg4apdy6trfahz65f54duy","github":null,"website":null,"posts":4,"replies":16,"firstSeen":"2026-05-10","lastSeen":"2026-05-31"},{"slackId":"U0B5U767EVB","name":"Scott Antipa","avatar":"https://avatars.slack-edge.com/2026-05-24/11229923888512_ce99ad67b6a598a897cd_72.png","title":"","did":null,"github":null,"website":null,"posts":3,"replies":15,"firstSeen":"2026-06-13","lastSeen":"2026-08-21"},{"slackId":null,"name":"wtaysom","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":17,"firstSeen":"2026-05-19","lastSeen":"2026-05-28"},{"slackId":"U06P2TM9JNM","name":"Dev Doshi","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":3,"replies":13,"firstSeen":"2026-09-01","lastSeen":"2026-09-05"},{"slackId":"U06SS0DHZD1","name":"maf","avatar":"https://avatars.slack-edge.com/2024-04-04/6922823105585_287ba5559ee1cedd6b98_72.png","title":"https://mrogalski.eu","did":null,"github":null,"website":null,"posts":4,"replies":11,"firstSeen":"2026-06-08","lastSeen":"2026-09-02"},{"slackId":"U05UK5T7LPP","name":"Jasmine Otto","avatar":"https://avatars.slack-edge.com/2023-09-30/5997119242352_87f45e326f3a692ca55c_72.png","title":"PhD Computational Media, UC Santa Cruz","did":"did:plc:zlpfp5xn43tpzre5icmeuhcu","github":null,"website":null,"posts":2,"replies":12,"firstSeen":"2026-06-02","lastSeen":"2026-09-04"},{"slackId":"U05PY5AQCA2","name":"Guyren Howe","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":3,"replies":10,"firstSeen":"2026-06-19","lastSeen":"2026-09-05"},{"slackId":null,"name":"dman-os","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":12,"firstSeen":"2026-05-06","lastSeen":"2026-05-29"},{"slackId":"U088999PF62","name":"Karl Toby Rosenberg","avatar":"https://avatars.slack-edge.com/2025-01-13/8273414548951_ee4ab31ddf7a86143d34_72.jpg","title":"","did":null,"github":null,"website":null,"posts":1,"replies":10,"firstSeen":"2026-06-06","lastSeen":"2026-06-20"},{"slackId":"U0BGDP5CYHX","name":"Arcade Wise","avatar":"https://secure.gravatar.com/avatar/3296c5e26449fdecdf12be1b92f73a65.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0023-72.png","title":"","did":null,"github":null,"website":null,"posts":3,"replies":7,"firstSeen":"2026-07-27","lastSeen":"2026-08-24"},{"slackId":"U013ZLJARC7","name":"Jack Rusher","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":10,"firstSeen":"2026-06-23","lastSeen":"2026-08-05"},{"slackId":null,"name":"Andrew F","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":10,"firstSeen":"2026-05-05","lastSeen":"2026-06-01"},{"slackId":"U02U0AS3J49","name":"Jason Morris","avatar":"https://secure.gravatar.com/avatar/5247a9c6cbb943683c9e2e2cef6eba79.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0022-72.png","title":"","did":null,"github":null,"website":null,"posts":3,"replies":6,"firstSeen":"2026-06-08","lastSeen":"2026-08-31"},{"slackId":"U0B8EJD86MA","name":"David McKee (Dragon)","avatar":"https://secure.gravatar.com/avatar/665c313804a3a6ed9c3019c714c387d1.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0003-72.png","title":"","did":null,"github":null,"website":null,"posts":0,"replies":9,"firstSeen":"2026-06-08","lastSeen":"2026-08-12"},{"slackId":"U0BEU8EQDTQ","name":"homonoidian","avatar":"https://avatars.slack-edge.com/2026-07-03/11508234240417_bc709b76b71b4af2add2_72.jpg","title":"","did":null,"github":null,"website":null,"posts":2,"replies":6,"firstSeen":"2026-07-03","lastSeen":"2026-07-18"},{"slackId":"U05BRNRAC4V","name":"Dave Liepmann","avatar":"https://avatars.slack-edge.com/2023-06-09/5405168537780_60eabb9fec2890116074_72.jpg","title":"","did":null,"github":null,"website":null,"posts":1,"replies":7,"firstSeen":"2026-06-05","lastSeen":"2026-06-29"},{"slackId":null,"name":"Nova (they/them)","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":7,"firstSeen":"2026-05-28","lastSeen":"2026-05-29"},{"slackId":"UBKNXPBAB","name":"Joshua Horowitz","avatar":"https://avatars.slack-edge.com/2024-03-28/6866700980471_7b3bc9e878d663396caf_72.jpg","title":"","did":"did:plc:l5rqatj7wcih5xh6o43wub6h","github":null,"website":null,"posts":0,"replies":7,"firstSeen":"2026-06-05","lastSeen":"2026-09-06"},{"slackId":"U08HU0GT52A","name":"Pandi Lin","avatar":"https://avatars.slack-edge.com/2025-09-08/9467835379175_221467034b8129ae2050_72.jpg","title":"","did":null,"github":null,"website":null,"posts":4,"replies":3,"firstSeen":"2026-06-01","lastSeen":"2026-08-31"},{"slackId":"UK3LH8CF5","name":"Jimmy Miller","avatar":"https://avatars.slack-edge.com/2019-12-25/886144219253_4377ee2417eb9eaacd4b_72.jpg","title":"https://jimmyhmiller.github.io ;; TODO fill this out properly","did":"did:plc:ahbeu3r5t2otkfx4fmlatzaw","github":null,"website":null,"posts":3,"replies":4,"firstSeen":"2026-06-03","lastSeen":"2026-08-31"},{"slackId":"U08294YLWJH","name":"Oleksandr Kryvonos","avatar":"https://avatars.slack-edge.com/2026-07-23/11657867950594_09e5a71de4c05845cb32_72.jpg","title":"","did":null,"github":null,"website":null,"posts":3,"replies":4,"firstSeen":"2026-07-23","lastSeen":"2026-08-13"},{"slackId":"U07HT3WR2HW","name":"NoxNode","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":7,"firstSeen":"2026-06-22","lastSeen":"2026-06-24"},{"slackId":"U0769H5BU2J","name":"Luke Stanley","avatar":"https://avatars.slack-edge.com/2024-06-04/7213591416646_eb43b41682ef7681e9fa_72.jpg","title":"Fan","did":null,"github":null,"website":null,"posts":0,"replies":7,"firstSeen":"2026-06-03","lastSeen":"2026-06-16"},{"slackId":null,"name":"guitarvydas","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":2,"replies":5,"firstSeen":"2026-05-26","lastSeen":"2026-06-01"},{"slackId":"UMQ6LR9NZ","name":"Eli","avatar":"https://secure.gravatar.com/avatar/f70d12f2630b6c2a0854e3bef118e73c.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0020-72.png","title":"aspiring Ms. Frizzle","did":null,"github":null,"website":null,"posts":2,"replies":4,"firstSeen":"2026-07-24","lastSeen":"2026-09-02"},{"slackId":"U0ATM0LSFB8","name":"dman-os","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":6,"firstSeen":"2026-08-26","lastSeen":"2026-08-27"},{"slackId":"U05GSC0B4A0","name":"Scott","avatar":"https://secure.gravatar.com/avatar/6366d8630c4e2394142efb0a9358fcc6.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0016-72.png","title":"","did":null,"github":null,"website":null,"posts":1,"replies":5,"firstSeen":"2026-06-07","lastSeen":"2026-08-12"},{"slackId":"U016VUZGUUQ","name":"Andrew F","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":5,"firstSeen":"2026-06-01","lastSeen":"2026-08-01"},{"slackId":"U0B5MJWDW04","name":"Z_Z","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":6,"firstSeen":"2026-06-02","lastSeen":"2026-07-29"},{"slackId":"U02LHNW0VLP","name":"Scott Antipa","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":5,"firstSeen":"2026-06-17","lastSeen":"2026-06-19"},{"slackId":null,"name":"Erik Stel","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":5,"firstSeen":"2026-05-22","lastSeen":"2026-05-29"},{"slackId":null,"name":"Jasmine Otto","avatar":null,"title":"","did":"did:plc:zlpfp5xn43tpzre5icmeuhcu","github":null,"website":null,"posts":3,"replies":3,"firstSeen":"2026-05-10","lastSeen":"2026-05-27"},{"slackId":"UMV4B97GT","name":"Mattia Fregola","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":2,"replies":3,"firstSeen":"2026-07-09","lastSeen":"2026-08-31"},{"slackId":"U0747312L74","name":"Kheyas","avatar":"https://avatars.slack-edge.com/2026-08-01/11720442768131_0b2f368872256d477ec0_72.png","title":"","did":null,"github":null,"website":null,"posts":0,"replies":5,"firstSeen":"2026-08-01","lastSeen":"2026-08-03"},{"slackId":"UL2SJ88Q3","name":"abeyer","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":5,"firstSeen":"2026-07-29","lastSeen":"2026-08-01"},{"slackId":"U0BGQASJ7U6","name":"Wasif Hyder","avatar":"https://avatars.slack-edge.com/2026-07-12/11555005160439_1f3463e91e5d7eb28937_72.jpg","title":"","did":null,"github":null,"website":null,"posts":0,"replies":5,"firstSeen":"2026-07-17","lastSeen":"2026-07-30"},{"slackId":"U0BFX94PV7S","name":"Eric Rawn","avatar":"https://secure.gravatar.com/avatar/678af99d5b997402cd0ccd94c479b182.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0022-72.png","title":"","did":null,"github":null,"website":null,"posts":1,"replies":4,"firstSeen":"2026-07-07","lastSeen":"2026-07-08"},{"slackId":"U0B662FB0QG","name":"Asker","avatar":"https://avatars.slack-edge.com/2026-05-21/11210083646848_ee6b7fa5be73c5f99f36_72.jpg","title":"","did":null,"github":null,"website":null,"posts":1,"replies":4,"firstSeen":"2026-06-12","lastSeen":"2026-06-20"},{"slackId":null,"name":"Marcos D","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":4,"firstSeen":"2026-05-16","lastSeen":"2026-05-28"},{"slackId":"U0617S7KH8C","name":"Joel","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":4,"replies":0,"firstSeen":"2026-07-14","lastSeen":"2026-09-03"},{"slackId":"U09E4D4SBRU","name":"Nodar","avatar":"https://avatars.slack-edge.com/2025-09-08/9480447349526_ed646a7fc01b79165d38_72.jpg","title":"","did":null,"github":null,"website":null,"posts":0,"replies":4,"firstSeen":"2026-06-24","lastSeen":"2026-09-01"},{"slackId":"U03E4LY27FS","name":"Ivan Lugo","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":4,"firstSeen":"2026-06-04","lastSeen":"2026-07-02"},{"slackId":null,"name":"Scott Antipa","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":3,"firstSeen":"2026-05-25","lastSeen":"2026-05-27"},{"slackId":"UDQBTJ211","name":"Chris Knott","avatar":"https://avatars.slack-edge.com/2019-02-14/551655871797_2624b1e78c0a9eaed529_72.jpg","title":"","did":null,"github":null,"website":null,"posts":0,"replies":3,"firstSeen":"2026-08-24","lastSeen":"2026-09-04"},{"slackId":"U0282PL61U1","name":"xyzzy","avatar":"https://avatars.slack-edge.com/2025-02-28/8529753983250_8f365fd896e9c8f573b5_72.jpg","title":"Into literate programming - checkout my literate apps https://xyzzyapps.link","did":null,"github":null,"website":null,"posts":2,"replies":1,"firstSeen":"2026-08-03","lastSeen":"2026-09-02"},{"slackId":"U0AFDJ7Q6HL","name":"Jos Yule","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":3,"firstSeen":"2026-07-29","lastSeen":"2026-08-27"},{"slackId":"U070Z6JQ50E","name":"Geert Roumen","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":2,"firstSeen":"2026-06-11","lastSeen":"2026-08-18"},{"slackId":"UE6EFEPTQ","name":"Duncan Cragg","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":3,"firstSeen":"2026-08-15","lastSeen":"2026-08-16"},{"slackId":"U09D5TTGL5P","name":"Aliqyan-21","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":2,"firstSeen":"2026-07-30","lastSeen":"2026-08-12"},{"slackId":"U0BNPB1D2N4","name":"mariano445","avatar":"https://secure.gravatar.com/avatar/81aac62d08b6df40da14b61c7c818d47.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0008-72.png","title":"","did":null,"github":null,"website":null,"posts":1,"replies":2,"firstSeen":"2026-08-04","lastSeen":"2026-08-05"},{"slackId":"U0BJSFX33UK","name":"Noel Alemayehu","avatar":"https://secure.gravatar.com/avatar/05250982403a43856d920d24d183a907.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0023-72.png","title":"","did":null,"github":null,"website":null,"posts":0,"replies":3,"firstSeen":"2026-07-29","lastSeen":"2026-07-29"},{"slackId":"U06BUK2M2RH","name":"Dennis","avatar":"https://avatars.slack-edge.com/2025-12-15/10142741017601_20b5593b82a97d4f58d6_72.jpg","title":"https://artifact.computer","did":null,"github":null,"website":null,"posts":1,"replies":2,"firstSeen":"2026-07-26","lastSeen":"2026-07-27"},{"slackId":"U0AA14LUN9X","name":"jcoyle","avatar":"https://avatars.slack-edge.com/2026-01-19/10324806232597_fd0beaa2288557c91b6c_72.png","title":"","did":null,"github":null,"website":null,"posts":0,"replies":3,"firstSeen":"2026-07-08","lastSeen":"2026-07-10"},{"slackId":"U0BEZM8BJRZ","name":"zachary.lieberman","avatar":"https://secure.gravatar.com/avatar/5d714c0036de542a4b97a10e9485f055.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0006-72.png","title":"","did":null,"github":null,"website":null,"posts":1,"replies":2,"firstSeen":"2026-07-07","lastSeen":"2026-07-10"},{"slackId":"U09LA28NZFT","name":"benrap","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":3,"firstSeen":"2026-06-17","lastSeen":"2026-06-22"},{"slackId":"U08LU2QRWB0","name":"Nova (they/them)","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":3,"firstSeen":"2026-05-31","lastSeen":"2026-06-20"},{"slackId":null,"name":"Jimmy Miller","avatar":null,"title":"","did":"did:plc:ahbeu3r5t2otkfx4fmlatzaw","github":null,"website":null,"posts":2,"replies":1,"firstSeen":"2026-05-24","lastSeen":"2026-05-29"},{"slackId":null,"name":"Oleksandr Kryvonos","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":3,"firstSeen":"2026-05-23","lastSeen":"2026-05-29"},{"slackId":null,"name":"maf","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":2,"firstSeen":"2026-05-13","lastSeen":"2026-05-23"},{"slackId":null,"name":"shali Yfrimashvilly","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":2,"firstSeen":"2026-05-22","lastSeen":"2026-05-22"},{"slackId":null,"name":"Fabian Iwand","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":3,"firstSeen":"2026-05-14","lastSeen":"2026-05-20"},{"slackId":null,"name":"Joshua Horowitz","avatar":null,"title":"","did":"did:plc:l5rqatj7wcih5xh6o43wub6h","github":null,"website":null,"posts":0,"replies":3,"firstSeen":"2026-05-10","lastSeen":"2026-05-18"},{"slackId":null,"name":"benrap","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":2,"firstSeen":"2026-05-05","lastSeen":"2026-05-06"},{"slackId":"U85HCL7JP","name":"Daniel Garcia","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":1,"firstSeen":"2026-08-27","lastSeen":"2026-09-02"},{"slackId":"U0A2XRHVBLH","name":"Marcos D","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":2,"firstSeen":"2026-08-12","lastSeen":"2026-09-01"},{"slackId":"U06FCGNJL4A","name":"Medet Ahmetson","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":1,"firstSeen":"2026-07-28","lastSeen":"2026-08-11"},{"slackId":"U03M1ETGCTW","name":"Alexey Volkov","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":2,"replies":0,"firstSeen":"2026-07-07","lastSeen":"2026-08-03"},{"slackId":"U0BCYK97FK3","name":"Simon Freedman","avatar":"https://avatars.slack-edge.com/2026-06-24/11442449166724_eaf0c9de5e20f4ea45f9_72.jpg","title":"","did":null,"github":null,"website":null,"posts":1,"replies":1,"firstSeen":"2026-07-14","lastSeen":"2026-07-17"},{"slackId":"U0AADKN5G79","name":"Dev Hayatpur","avatar":"https://avatars.slack-edge.com/2026-02-07/10477612292065_d795e1d89ccf72df80b7_72.png","title":"","did":null,"github":null,"website":null,"posts":1,"replies":1,"firstSeen":"2026-06-12","lastSeen":"2026-07-09"},{"slackId":"U013866H7LY","name":"Zach Potter","avatar":"https://avatars.slack-edge.com/2020-07-16/1246051744354_d1dd97f527eae7f5a753_72.jpg","title":"Working on Parabola.io // go with the flow~","did":null,"github":null,"website":null,"posts":0,"replies":2,"firstSeen":"2026-06-24","lastSeen":"2026-06-24"},{"slackId":"U060C7LV69E","name":"Rafał Pastuszak","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":2,"firstSeen":"2026-06-18","lastSeen":"2026-06-19"},{"slackId":"U0B8BLN7ZPB","name":"Aaditya Bhusal","avatar":"https://secure.gravatar.com/avatar/e9ce0baaa1dcda87a646e6da9907f0d9.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0011-72.png","title":"","did":null,"github":null,"website":null,"posts":1,"replies":1,"firstSeen":"2026-06-16","lastSeen":"2026-06-16"},{"slackId":null,"name":"Katherine Yang","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":1,"firstSeen":"2026-05-27","lastSeen":"2026-05-30"},{"slackId":null,"name":"Alex R","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":1,"firstSeen":"2026-05-25","lastSeen":"2026-05-27"},{"slackId":null,"name":"Mariano Guerra","avatar":null,"title":"","did":"did:plc:34jj3u665cbmkr6aklhtqmsc","github":null,"website":null,"posts":1,"replies":1,"firstSeen":"2026-05-11","lastSeen":"2026-05-24"},{"slackId":null,"name":"Nilesh Trivedi (QwikBuild)","avatar":null,"title":"","did":"did:plc:nwvtsa2zqyhpn5dvecdgec6p","github":null,"website":null,"posts":1,"replies":1,"firstSeen":"2026-05-07","lastSeen":"2026-05-07"},{"slackId":"U0BUR25AHUP","name":"mark915","avatar":"https://secure.gravatar.com/avatar/28f3fc04c0e33b2837ca0b2074b08a5e.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0009-72.png","title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-09-05","lastSeen":"2026-09-05"},{"slackId":"U08E2CT0A1Z","name":"Stephen De Gabrielle","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-08-27","lastSeen":"2026-08-27"},{"slackId":"U08RS55FRL7","name":"Seth Hinz","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-08-19","lastSeen":"2026-08-19"},{"slackId":"U04Q53X6P7W","name":"Alexander Bandukwala","avatar":"https://avatars.slack-edge.com/2023-07-05/5533188035202_402a5ff55c77365d5465_72.jpg","title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-08-03","lastSeen":"2026-08-03"},{"slackId":"U03KDJSHEN5","name":"Gang Tao","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-08-01","lastSeen":"2026-08-01"},{"slackId":"U0A9FQ7HK3L","name":"Duane McLemore","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-08-01","lastSeen":"2026-08-01"},{"slackId":"U075Q2WP3UK","name":"Jared M. Smith","avatar":"https://avatars.slack-edge.com/2024-05-29/7194211094498_6d91a808c03324f48378_72.png","title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-07-30","lastSeen":"2026-07-30"},{"slackId":"U0BBV801ARG","name":"Mateusz","avatar":"https://secure.gravatar.com/avatar/b96086d162a0bc82e65f736bc4782b26.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0019-72.png","title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-07-30","lastSeen":"2026-07-30"},{"slackId":"U093P0HKZQR","name":"Abhik Jain","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-07-29","lastSeen":"2026-07-29"},{"slackId":"U5TCAFTD3","name":"stevekrouse","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-07-21","lastSeen":"2026-07-21"},{"slackId":null,"name":"Wasif Hyder","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-07-17","lastSeen":"2026-07-17"},{"slackId":"U0123H7JRDM","name":"Maikel","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-07-12","lastSeen":"2026-07-12"},{"slackId":"U0A1BPH77CH","name":"Saujas Nandi","avatar":"https://avatars.slack-edge.com/2026-07-11/11572924851204_0d3b575ee8a8ec74c450_72.png","title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-07-11","lastSeen":"2026-07-11"},{"slackId":"U06C2A0V7H9","name":"Warren Whipple","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-07-05","lastSeen":"2026-07-05"},{"slackId":"UP00ZLX6G","name":"Tak Tran","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-06-30","lastSeen":"2026-06-30"},{"slackId":"U0AGU6Q85KK","name":"Shreyas Prakash","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-06-28","lastSeen":"2026-06-28"},{"slackId":"U06CSJB5KNX","name":"Marshall Moutenot","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-06-27","lastSeen":"2026-06-27"},{"slackId":"UML4ZEKDK","name":"J. Ryan Stinnett","avatar":"https://avatars.slack-edge.com/2023-05-22/5286358617767_edc1c9acb12dfa7d1a20_72.jpg","title":"Exploring how to make programs more malleable and computing more humane | malleable.systems | @jryans","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-06-26","lastSeen":"2026-06-26"},{"slackId":"U04717WKH5K","name":"brett g porter","avatar":"https://secure.gravatar.com/avatar/415c1650fb0f17d5a8b182fa4f4d17d7.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0015-72.png","title":"Sr SDK Engineer, PACE Anti-Piracy; Exec Board @ MIDI Association","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-06-23","lastSeen":"2026-06-23"},{"slackId":"U013GKCP1DG","name":"Jeroen van Dijk","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-06-23","lastSeen":"2026-06-23"},{"slackId":"UC21F8Q48","name":"Brian Hempel","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-06-18","lastSeen":"2026-06-18"},{"slackId":"U0B9E4D8Q8N","name":"Bimal Gyawali","avatar":"https://avatars.slack-edge.com/2026-06-09/11325836483300_eafa35051b4f32d41c91_72.jpg","title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-06-10","lastSeen":"2026-06-10"},{"slackId":"UD31LGQKB","name":"andrew blinn","avatar":"https://avatars.slack-edge.com/2019-07-19/699535022069_b7e6e0f8e031cdcf896f_72.jpg","title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-06-08","lastSeen":"2026-06-08"},{"slackId":"URKQXRCAC","name":"Erik Stel","avatar":"https://avatars.slack-edge.com/2023-11-23/6253994675665_a55b20870fb92473e7e8_72.png","title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-06-04","lastSeen":"2026-06-04"},{"slackId":"UE1JQM9HQ","name":"Tudor Girba","avatar":"https://secure.gravatar.com/avatar/f48924f215efa665f3c87affcdb14278.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2Fdf10d%2Fimg%2Favatars%2Fava_0002-72.png","title":"CEO feenk.com (@girba) - Talk with me about making systems explainable","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-06-02","lastSeen":"2026-06-02"},{"slackId":null,"name":"xyzzy","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-05-31","lastSeen":"2026-05-31"},{"slackId":null,"name":"Pandi Lin","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-05-31","lastSeen":"2026-05-31"},{"slackId":null,"name":"Scott","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-05-29","lastSeen":"2026-05-29"},{"slackId":null,"name":"Jari","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-05-29","lastSeen":"2026-05-29"},{"slackId":null,"name":"Mattia Fregola","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-05-28","lastSeen":"2026-05-28"},{"slackId":null,"name":"ender","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-05-23","lastSeen":"2026-05-23"},{"slackId":null,"name":"Jake Brownson","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-05-18","lastSeen":"2026-05-18"},{"slackId":null,"name":"Personal Dynamic Media","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":0,"replies":1,"firstSeen":"2026-05-10","lastSeen":"2026-05-10"},{"slackId":null,"name":"Medet Ahmetson","avatar":null,"title":"","did":null,"github":null,"website":null,"posts":1,"replies":0,"firstSeen":"2026-05-08","lastSeen":"2026-05-08"}]
)};
const _focdemosfake = function _demosFake(){return(
{"source":"FAKE: oEmbed over YouTube links found in chat + wiki demos page, 2026-09-07. Real source is the uploads playlist UU_z2YnSvNaG0ljKgj-Vt2jg via the Data API.","channel":{"handle":"@feelingofcomputing","id":"UC_z2YnSvNaG0ljKgj-Vt2jg"},"videos":[{"videoId":"TZI93QuvetA","sharedBy":"Ivy Reese","sharedAt":"2026-05-06","messageRkey":"3ml5g5txev522","channel":"3mn5tlwafrh2k","parent":null,"title":"April 2026","channelTitle":"Feeling of Computing","channelUrl":"https://www.youtube.com/@feelingofcomputing","thumbnail":"https://i.ytimg.com/vi/TZI93QuvetA/hqdefault.jpg"},{"videoId":"pzyrcKuR6iY","sharedBy":"Joshua Horowitz","sharedAt":"2026-05-10","messageRkey":"3mljosxmwb722","channel":"3mn5tmbyexz27","parent":"3mlhwm645gd22","title":"Sculpin: Direct-Manipulation Transformation of JSON","channelTitle":"JH","channelUrl":"https://www.youtube.com/@jhakldf","thumbnail":"https://i.ytimg.com/vi/pzyrcKuR6iY/hqdefault.jpg"},{"videoId":"fIEcXAHy6bU","sharedBy":"Joshua Horowitz","sharedAt":"2026-05-10","messageRkey":"3mljvuhzo4l22","channel":"3mn5tmbyexz27","parent":"3mlhwm645gd22","title":"PANE: Programming with visible data","channelTitle":"JH","channelUrl":"https://www.youtube.com/@jhakldf","thumbnail":"https://i.ytimg.com/vi/fIEcXAHy6bU/hqdefault.jpg"},{"videoId":"V2aIbzeQY78","sharedBy":"Mariano Guerra","sharedAt":"2026-05-11","messageRkey":"3mllkgss5il22","channel":"3mn5tmbyexz27","parent":null,"title":"The Proof is in the Universal Frontend","channelTitle":"Mariano Guerra","channelUrl":"https://www.youtube.com/@marianoguerra7015","thumbnail":"https://i.ytimg.com/vi/V2aIbzeQY78/hqdefault.jpg"},{"videoId":"nGLCmY7tdz4","sharedBy":"maf","sharedAt":"2026-05-13","messageRkey":"3mlq3ux7r6p22","channel":"3mn5tle5l7c2z","parent":null,"title":"Drawn Together","channelTitle":"William Candillon","channelUrl":"https://www.youtube.com/@wcandillon","thumbnail":"https://i.ytimg.com/vi/nGLCmY7tdz4/hqdefault.jpg"},{"videoId":"36j6ytVIL-g","sharedBy":"Marcos D","sharedAt":"2026-05-16","messageRkey":"3mlxpreg3yj22","channel":"3mn5tmbyexz27","parent":null,"title":"Stateless puzzles? I prefer Stateful, or even Spiteful!","channelTitle":"Puzzling Gamedev","channelUrl":"https://www.youtube.com/@puzzlinggamedev","thumbnail":"https://i.ytimg.com/vi/36j6ytVIL-g/hqdefault.jpg"},{"videoId":"B0cmlitxne0","sharedBy":"curious_reader","sharedAt":"2026-05-18","messageRkey":"3mm5gnpotq322","channel":"3mn5tmllqd72d","parent":null,"title":null},{"videoId":"RGSQWjoC9v0","sharedBy":"curious_reader","sharedAt":"2026-05-20","messageRkey":"3mmc3ggoxez22","channel":"3mn5tmllqd72d","parent":"3mm5gnpotq322","title":null},{"videoId":"eD9otNTu_NM","sharedBy":"Ivy Reese","sharedAt":"2026-05-23","messageRkey":"3mmipuck7yv22","channel":"3mn5tmbyexz27","parent":null,"title":"Hest Project Overview","channelTitle":"Spiral Ganglion","channelUrl":"https://www.youtube.com/@spiralganglion","thumbnail":"https://i.ytimg.com/vi/eD9otNTu_NM/hqdefault.jpg"},{"videoId":"Kyak9MuzSsc","sharedBy":"curious_reader","sharedAt":"2026-05-23","messageRkey":"3mmj2ll47np22","channel":"3mn5tlntcfa2f","parent":"3mm66lwqshh22","title":"Why Is the Medium the Message? | Andrew McLuhan | The Other Stuff #30","channelTitle":"The Other Stuff Show","channelUrl":"https://www.youtube.com/@otherstuffshow","thumbnail":"https://i.ytimg.com/vi/Kyak9MuzSsc/hqdefault.jpg"},{"videoId":"ql_958PBges","sharedBy":"Oleksandr Kryvonos","sharedAt":"2026-05-23","messageRkey":"3mmjcm3nxzl22","channel":"3mn5tmbyexz27","parent":"3mmipuck7yv22","title":"How a Petri Net Explains Espresso Machine Behaviour","channelTitle":"YAWL User Group","channelUrl":"https://www.youtube.com/@yawlusergroup","thumbnail":"https://i.ytimg.com/vi/ql_958PBges/hqdefault.jpg"},{"videoId":"81yFRBBVSQ4","sharedBy":"Ivy Reese","sharedAt":"2026-05-27","messageRkey":"3mmu7alajm722","channel":"3mn5tlwafrh2k","parent":null,"title":"May 2026","channelTitle":"Feeling of Computing","channelUrl":"https://www.youtube.com/@feelingofcomputing","thumbnail":"https://i.ytimg.com/vi/81yFRBBVSQ4/hqdefault.jpg"},{"videoId":"OqryZNwwR-U","sharedBy":"Nova (they/them)","sharedAt":"2026-05-28","messageRkey":"3mmx3h4hfg722","channel":"3mn5tmllqd72d","parent":"3mmvo5n44rj22","title":"Incremental Computation with Adapton (May 2017) by Matthew A Hammer","channelTitle":"L Zhao H","channelUrl":"https://www.youtube.com/@lzh97","thumbnail":"https://i.ytimg.com/vi/OqryZNwwR-U/hqdefault.jpg"},{"videoId":"tlQ7EoJDTQY","sharedBy":"curious_reader","sharedAt":"2026-06-02","messageRkey":"3mnct2gwuir22","channel":"3mn5tlntcfa2f","parent":"3mncsy7gzf522","title":"\"But it happened.\"","channelTitle":"Molly Rocket","channelUrl":"https://www.youtube.com/@MollyRocket","thumbnail":"https://i.ytimg.com/vi/tlQ7EoJDTQY/hqdefault.jpg"},{"videoId":"3ekzHzRMjOk","sharedBy":"curious_reader","sharedAt":"2026-06-03","messageRkey":"3mnepqdpui522","channel":"3mn5tlntcfa2f","parent":"3mncsy7gzf522","title":"Ecology of Mind: A Cybernetic Approach To Planetary Problems","channelTitle":"Essentia Foundation","channelUrl":"https://www.youtube.com/@essentiafoundation","thumbnail":"https://i.ytimg.com/vi/3ekzHzRMjOk/hqdefault.jpg"},{"videoId":"Vt05j44mMCA","sharedBy":"Mariano Guerra","sharedAt":"2026-06-04","messageRkey":"3mnhxyljnz722","channel":"3mn5tk5v4yr2s","parent":"3mng3o7d73p22","title":"Ubuntu Unity With Compiz Wobbly Windows","channelTitle":"gazdalale","channelUrl":"https://www.youtube.com/@gazdalale","thumbnail":"https://i.ytimg.com/vi/Vt05j44mMCA/hqdefault.jpg"},{"videoId":"nbCg9_YgKgM","sharedBy":"Joshua Horowitz","sharedAt":"2026-06-05","messageRkey":"3mnkq6rhexf22","channel":"3mn5tk5v4yr2s","parent":"3mng3o7d73p22","title":"Ubuntu has Wobbly Windows!","channelTitle":"Thaed","channelUrl":"https://www.youtube.com/@Thaed","thumbnail":"https://i.ytimg.com/vi/nbCg9_YgKgM/hqdefault.jpg"},{"videoId":"0HBw47b2gno","sharedBy":"Dev Hayatpur","sharedAt":"2026-06-12","messageRkey":"3mo4r72lb3j22","channel":"3mn5tmbyexz27","parent":"3mo446n2yyh22","title":"Expressive Keyboard","channelTitle":"ex)situ","channelUrl":"https://www.youtube.com/@ex-situ","thumbnail":"https://i.ytimg.com/vi/0HBw47b2gno/hqdefault.jpg"},{"videoId":"lCa-5CVSjeU","sharedBy":"Mariano Guerra","sharedAt":"2026-06-15","messageRkey":"3mod3jnlmez22","channel":"3mn5tmbyexz27","parent":null,"title":"Domain Specific Agent for Image & Document Manipulation In the Browser","channelTitle":"Mariano Guerra","channelUrl":"https://www.youtube.com/@marianoguerra7015","thumbnail":"https://i.ytimg.com/vi/lCa-5CVSjeU/hqdefault.jpg"},{"videoId":"cRjEcBACr6U","sharedBy":"Aaditya Bhusal","sharedAt":"2026-06-16","messageRkey":"3moggl2ifcn22","channel":"3mn5tmbyexz27","parent":"3mogge5kfdv22","title":"Logicflow Introduction","channelTitle":"Aaditya Bhusal","channelUrl":"https://www.youtube.com/@aadityabhusal","thumbnail":"https://i.ytimg.com/vi/cRjEcBACr6U/hqdefault.jpg"},{"videoId":"kHV6wmG35po","sharedBy":"Brian Hempel","sharedAt":"2026-06-18","messageRkey":"3mojqhsticn22","channel":"3mn5tmbyexz27","parent":"3mobjdngq2l22","title":"High-Performance Computing - Episode 1 - Introducing MPI","channelTitle":"softwarecarpentry","channelUrl":"https://www.youtube.com/@softwarecarpentry","thumbnail":"https://i.ytimg.com/vi/kHV6wmG35po/hqdefault.jpg"},{"videoId":"CAJ_iIedx_I","sharedBy":"Ivy Reese","sharedAt":"2026-06-20","messageRkey":"3moovih3bn322","channel":"3mn5tle5l7c2z","parent":null,"title":"Beyond Git: Real-Time Version Control for Godot – Lilith Duncan – GodotCon 2026","channelTitle":"Godot Engine","channelUrl":"https://www.youtube.com/@GodotEngineOfficial","thumbnail":"https://i.ytimg.com/vi/CAJ_iIedx_I/hqdefault.jpg"},{"videoId":"p9ymiSg0dpg","sharedBy":"Mariano Guerra","sharedAt":"2026-06-22","messageRkey":"3movahklrhr22","channel":"3mn5tmbyexz27","parent":null,"title":"Beyond Read Write & Bash: SQL & SPARQL as AI Agent Substrate","channelTitle":"Mariano Guerra","channelUrl":"https://www.youtube.com/@marianoguerra7015","thumbnail":"https://i.ytimg.com/vi/p9ymiSg0dpg/hqdefault.jpg"},{"videoId":"u-W2AoCFJuM","sharedBy":"Ivy Reese","sharedAt":"2026-06-25","messageRkey":"3mp3lut54gd22","channel":"3mn5tlwafrh2k","parent":null,"title":"June 2026","channelTitle":"Feeling of Computing","channelUrl":"https://www.youtube.com/@feelingofcomputing","thumbnail":"https://i.ytimg.com/vi/u-W2AoCFJuM/hqdefault.jpg"},{"videoId":"azSz7fkY7jU","sharedBy":"curious_reader","sharedAt":"2026-06-29","messageRkey":"3mpgkyq7oax22","channel":"3mn5tmllqd72d","parent":null,"title":"gt4atproto, A Programmable Environment for Social Media","channelTitle":"esugboard","channelUrl":"https://www.youtube.com/@esugboard","thumbnail":"https://i.ytimg.com/vi/azSz7fkY7jU/hqdefault.jpg"},{"videoId":"Besh6Xad5HU","sharedBy":"curious_reader","sharedAt":"2026-06-29","messageRkey":"3mphclngojr22","channel":"3mn5tlntcfa2f","parent":null,"title":"The AI future nobody is showing you","channelTitle":"Existential Hope","channelUrl":"https://www.youtube.com/@HopeExistential","thumbnail":"https://i.ytimg.com/vi/Besh6Xad5HU/hqdefault.jpg"},{"videoId":"u9-sDQ1ksdA","sharedBy":"Tak Tran","sharedAt":"2026-06-30","messageRkey":"3mpk3ucyn4p22","channel":"3mn5tmbyexz27","parent":null,"title":"Withered Technology - Feeling of Computing Meetup - London, June 2026","channelTitle":"Forest in the Tree","channelUrl":"https://www.youtube.com/@forestinthetree","thumbnail":"https://i.ytimg.com/vi/u9-sDQ1ksdA/hqdefault.jpg"},{"videoId":"NIQdnuJ7-yc","sharedBy":"Alexey Volkov","sharedAt":"2026-07-07","messageRkey":"3mpzdit6agz22","channel":"3mn5tmbyexz27","parent":null,"title":"What's new - July 6th, 2026","channelTitle":"Clickly","channelUrl":"https://www.youtube.com/@ClicklyApp","thumbnail":"https://i.ytimg.com/vi/NIQdnuJ7-yc/hqdefault.jpg"},{"videoId":"a6sYYrLTOjQ","sharedBy":"wtaysom","sharedAt":"2026-07-10","messageRkey":"3mqcu3j4w3l22","channel":"3mn5tmllqd72d","parent":"3mq2duee7r522","title":"Unfortunately, You Need to Know What the Jevons Paradox is","channelTitle":"Hank Green","channelUrl":"https://www.youtube.com/@hankschannel","thumbnail":"https://i.ytimg.com/vi/a6sYYrLTOjQ/hqdefault.jpg"},{"videoId":"10d8HxS4y_g","sharedBy":"curious_reader","sharedAt":"2026-07-11","messageRkey":"3mqesa5q7qp22","channel":"3mn5tle5l7c2z","parent":null,"title":"Local-First Software: Taking Back Control of Our Data | a mini-doc","channelTitle":"CultRepo ","channelUrl":"https://www.youtube.com/@cultrepo","thumbnail":"https://i.ytimg.com/vi/10d8HxS4y_g/hqdefault.jpg"},{"videoId":"PixPSNRDNMU","sharedBy":"curious_reader","sharedAt":"2026-07-16","messageRkey":"3mqrc3klky522","channel":"3mn5tle5l7c2z","parent":"3mqesa5q7qp22","title":"Computational Public Space","channelTitle":"Dynamicland","channelUrl":"https://www.youtube.com/@dynamicland1784","thumbnail":"https://i.ytimg.com/vi/PixPSNRDNMU/hqdefault.jpg"},{"videoId":"Nc8_OsVOLwY","sharedBy":"wtaysom","sharedAt":"2026-07-16","messageRkey":"3mqsard2oad22","channel":"3mn5tmbyexz27","parent":null,"title":"Zooming in on Tiny Stories with Word Filters","channelTitle":"William Taysom","channelUrl":"https://www.youtube.com/@wtaysom","thumbnail":"https://i.ytimg.com/vi/Nc8_OsVOLwY/hqdefault.jpg"},{"videoId":"LD6SZ8yfri4","sharedBy":"homonoidian","sharedAt":"2026-07-17","messageRkey":"3mqslalzhup22","channel":"3mn5tmbyexz27","parent":null,"title":"An improvised look at some examples in the Wirewright repo","channelTitle":"Wirewright","channelUrl":"https://www.youtube.com/@wirewright","thumbnail":"https://i.ytimg.com/vi/LD6SZ8yfri4/hqdefault.jpg"},{"videoId":"fhOHn9TClXY","sharedBy":"Oleksandr Kryvonos","sharedAt":"2026-07-24","messageRkey":"3mres4bysuz22","channel":"3mn5tle5l7c2z","parent":null,"title":"Joe Armstrong & Alan Kay - Joe Armstrong interviews Alan Kay","channelTitle":"Erlang Solutions","channelUrl":"https://www.youtube.com/@ErlangSolutions","thumbnail":"https://i.ytimg.com/vi/fhOHn9TClXY/hqdefault.jpg"},{"videoId":"0jc9OUHBVbw","sharedBy":"Geert Roumen","sharedAt":"2026-07-24","messageRkey":"3mrffhlnse522","channel":"3mn5tmbyexz27","parent":null,"title":"ESP32 Flasher with custom (wifi) config","channelTitle":"Geert Roumen","channelUrl":"https://www.youtube.com/@geertroumen7230","thumbnail":"https://i.ytimg.com/vi/0jc9OUHBVbw/hqdefault.jpg"},{"videoId":"RhcI5CiMbDQ","sharedBy":"wtaysom","sharedAt":"2026-07-28","messageRkey":"3mrqksfxnfl22","channel":"3mn5tmbyexz27","parent":null,"title":"Spec Clarity","channelTitle":"William Taysom","channelUrl":"https://www.youtube.com/@wtaysom","thumbnail":"https://i.ytimg.com/vi/RhcI5CiMbDQ/hqdefault.jpg"},{"videoId":"M_720LesVg4","sharedBy":"maf","sharedAt":"2026-07-30","messageRkey":"3mrvdncanip22","channel":"3mn5tlwafrh2k","parent":null,"title":"The LEAST Private Operating System Ever Created","channelTitle":"LaurieWired","channelUrl":"https://www.youtube.com/@lauriewired","thumbnail":"https://i.ytimg.com/vi/M_720LesVg4/hqdefault.jpg"},{"videoId":"bucKpn900Cw","sharedBy":"Alexey Volkov","sharedAt":"2026-08-03","messageRkey":"3ms7ajyq2bf22","channel":"3mn5tmbyexz27","parent":null,"title":"What's new - August 3rd, 2026","channelTitle":"Clickly","channelUrl":"https://www.youtube.com/@ClicklyApp","thumbnail":"https://i.ytimg.com/vi/bucKpn900Cw/hqdefault.jpg"},{"videoId":"ZJOE_EuyRTY","sharedBy":"mariano445","sharedAt":"2026-08-04","messageRkey":"3msalag4psl22","channel":"3mn5tmbyexz27","parent":null,"title":"Hypermedia/AOP inspired Full Stack Domain Specific Coding Agent","channelTitle":"Mariano Guerra","channelUrl":"https://www.youtube.com/@marianoguerra7015","thumbnail":"https://i.ytimg.com/vi/ZJOE_EuyRTY/hqdefault.jpg"},{"videoId":"RoYFUomDwp8","sharedBy":"Mariano Guerra","sharedAt":"2026-08-10","messageRkey":"3mspsex76gb22","channel":"3mn5tmbyexz27","parent":null,"title":"Secure Capability-Based Generative UI with Wasm Components","channelTitle":"Mariano Guerra","channelUrl":"https://www.youtube.com/@marianoguerra7015","thumbnail":"https://i.ytimg.com/vi/RoYFUomDwp8/hqdefault.jpg"},{"videoId":"xReyIF5pwRo","sharedBy":"Medet Ahmetson","sharedAt":"2026-08-11","messageRkey":"3mss3pfsjw522","channel":"3mn5tle5l7c2z","parent":null,"title":"MouthPad is now available","channelTitle":"Augmental","channelUrl":"https://www.youtube.com/@augmentaltech","thumbnail":"https://i.ytimg.com/vi/xReyIF5pwRo/hqdefault.jpg"},{"videoId":"w5PWgTBtZlg","sharedBy":"Ivy Reese","sharedAt":"2026-08-11","messageRkey":"3msthxegfah22","channel":"3mn5tlwafrh2k","parent":null,"title":"July 2026","channelTitle":"Feeling of Computing","channelUrl":"https://www.youtube.com/@feelingofcomputing","thumbnail":"https://i.ytimg.com/vi/w5PWgTBtZlg/hqdefault.jpg"},{"videoId":"bOD4hmqn8RI","sharedBy":"curious_reader","sharedAt":"2026-08-13","messageRkey":"3msx5bmupkt22","channel":"3mn5tlntcfa2f","parent":"3msguasibab22","title":"Pharo Pulsar: Spinning you into a Power User - Esteban Lorenzano","channelTitle":"esugboard","channelUrl":"https://www.youtube.com/@esugboard","thumbnail":"https://i.ytimg.com/vi/bOD4hmqn8RI/hqdefault.jpg"},{"videoId":"4bM3Gut1hIk","sharedBy":"maf","sharedAt":"2026-08-14","messageRkey":"3mt27b2kdcj22","channel":"3mn5tle5l7c2z","parent":null,"title":"4 2 1 Christopher Domas   The future of RE Dynamic Binary Visualization","channelTitle":"Adrian Crenshaw","channelUrl":"https://www.youtube.com/@irongeek","thumbnail":"https://i.ytimg.com/vi/4bM3Gut1hIk/hqdefault.jpg"},{"videoId":"dzYvfMRvc9c","sharedBy":"Mariano Guerra","sharedAt":"2026-08-26","messageRkey":"3mty6doskod22","channel":"3mn5tmbyexz27","parent":null,"title":"Just in Time Generative UI Components","channelTitle":"Mariano Guerra","channelUrl":"https://www.youtube.com/@marianoguerra7015","thumbnail":"https://i.ytimg.com/vi/dzYvfMRvc9c/hqdefault.jpg"},{"videoId":"4UxGijnuXEs","sharedBy":"Ivy Reese","sharedAt":"2026-08-31","messageRkey":"3mufviaosjl22","channel":"3mn5tmbyexz27","parent":null,"title":"Introducing Patchwork-26","channelTitle":"Ink & Switch","channelUrl":"https://www.youtube.com/@inkandswitch","thumbnail":"https://i.ytimg.com/vi/4UxGijnuXEs/hqdefault.jpg"},{"videoId":"y6JUm11l1S8","sharedBy":"Ivy Reese","sharedAt":"2026-09-03","messageRkey":"3munjja4nxj22","channel":"3mn5tlwafrh2k","parent":null,"title":"August 2026","channelTitle":"Feeling of Computing","channelUrl":"https://www.youtube.com/@feelingofcomputing","thumbnail":"https://i.ytimg.com/vi/y6JUm11l1S8/hqdefault.jpg"},{"videoId":"lW8Z98pXuSE","sharedBy":"Ivy Reese","sharedAt":"2026-09-04","messageRkey":"3mupmfwas2x22","channel":"3mn5tle5l7c2z","parent":null,"title":"Tutorial for Septabee, a free DAW I've secretly been making for over 20,000 hours","channelTitle":"Lost Robot","channelUrl":"https://www.youtube.com/@lostrobotmusic","thumbnail":"https://i.ytimg.com/vi/lW8Z98pXuSE/hqdefault.jpg"},{"videoId":"MccJdr61xnc","sharedBy":"Dev Doshi","sharedAt":"2026-09-05","messageRkey":"3muqmlt2tez22","channel":"3mn5tlwafrh2k","parent":null,"title":"Geoffrey Litt: Dynamic Documents as Personal Software","channelTitle":"Recurse Center","channelUrl":"https://www.youtube.com/@RecurseCenter","thumbnail":"https://i.ytimg.com/vi/MccJdr61xnc/hqdefault.jpg"},{"videoId":"LW_fgRFmEGI","onWiki":"demos","title":"Live Coder","channelTitle":"Fraser Greenlee","channelUrl":"https://www.youtube.com/@fraserg","thumbnail":"https://i.ytimg.com/vi/LW_fgRFmEGI/hqdefault.jpg"},{"videoId":"72y2EC5fkcE","onWiki":"demos","title":"Tomorrow Corporation Tech Demo","channelTitle":"retrogameinternals","channelUrl":"https://www.youtube.com/@retrogameinternals4707","thumbnail":"https://i.ytimg.com/vi/72y2EC5fkcE/hqdefault.jpg"},{"videoId":"R3MNcA2dpts","onWiki":"demos","title":"\"Brief\" Concatenative Programming Language Demo","channelTitle":"Ashley Feniello","channelUrl":"https://www.youtube.com/@AshLeaFen","thumbnail":"https://i.ytimg.com/vi/R3MNcA2dpts/hqdefault.jpg"}]}
)};
const _c9nrdu = function _focReadHash() {return (() => {
  const raw = String(window.location.hash || "").replace(/^#/, "");
  const out = {};
  for (const part of raw.split("&").filter(Boolean)) {
    const eq = part.indexOf("=");
    if (eq < 0) { out[part] = ""; continue; }
    out[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
  }
  return out;
});};
const _uo06kl = function _focWriteHash() {return ((patch) => {
  const raw = String(window.location.hash || "").replace(/^#/, "");
  const parts = [];
  const seen = new Set();
  const put = (k, v) => {
    if (v === null || v === undefined) return;
    parts.push(v === "" ? k : k + "=" + encodeURIComponent(v));
  };
  for (const part of raw.split("&").filter(Boolean)) {
    const eq = part.indexOf("=");
    const key = eq < 0 ? part : part.slice(0, eq);
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      seen.add(key);
      put(key, patch[key]);
    } else {
      parts.push(part);
    }
  }
  for (const k of Object.keys(patch)) if (!seen.has(k)) put(k, patch[k]);
  const next = "#" + parts.join("&");
  if (next === window.location.hash) return next;
  window.history.pushState(null, "", next);
  window.dispatchEvent(new window.HashChangeEvent("hashchange"));
  return next;
});};
const _1ign2ca = function _focHash(Generators,focReadHash) {return (Generators.observe((notify) => {
  let last = null;
  const on = () => {
    const now = focReadHash();
    const s = JSON.stringify(now);
    if (s === last) return;
    last = s;
    notify(now);
  };
  on();
  window.addEventListener("hashchange", on);
  window.addEventListener("popstate", on);
  return () => {
    window.removeEventListener("hashchange", on);
    window.removeEventListener("popstate", on);
  };
}));};
const _16l49ir = function _focGoTab(focWriteHash) {return ((moduleName, patch = {}) => focWriteHash({ open: moduleName, ...patch }));};
const _1fjygyw = function _focFmt() {return ({
  day: (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  },
  time: (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  },
  dayKey: (iso) => String(iso || "").slice(0, 10),
  rel: (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 2592000) return Math.floor(s / 86400) + "d ago";
    if (s < 31536000) return Math.floor(s / 2592000) + "mo ago";
    return Math.floor(s / 31536000) + "y ago";
  }
});};
const _v66nsu = function _focAvatarColor() {return ((name) => {
  let h = 0;
  const s = String(name || "?");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return "hsl(" + h + ",45%,42%)";
});};
const _mtje15 = function _focInitials() {return ((name) => String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(""));};
const _19eqi24 = function _people(focConfig,archive,parseByline,channelsByRkey,peopleFakeMerged) {
  const cfg = focConfig;
  const stats = new Map();
  const touch = (name) => {
    if (!stats.has(name))
      stats.set(name, { name, posts: 0, replies: 0, first: null, last: null, did: null, rkeys: [], shares: [], domains: new Map(), introRkey: null });
    return stats.get(name);
  };
  for (const r of archive.messages) {
    const by = parseByline(r);
    const name = by.name || "(no byline)";
    const s = touch(name);
    if (by.did) s.did = by.did;
    if (r.value.parent) s.replies++;
    else s.posts++;
    s.rkeys.push(r.rkey);
    const at = r.value.createdAt;
    if (at && (!s.first || at < s.first)) s.first = at;
    if (at && (!s.last || at > s.last)) s.last = at;
    const ch = channelsByRkey.get(r.value.channel);
    const cname = ch ? ch.name : "";
    if (!r.value.parent && cname === cfg.introChannel && !s.introRkey) s.introRkey = r.rkey;
    if (cfg.shareChannels.indexOf(cname) >= 0) s.shares.push(r.rkey);
    for (const f of r.value.facets || [])
      for (const feat of f.features || [])
        if (feat.uri) {
          try {
            const h = new URL(feat.uri).hostname.replace(/^www\./, "");
            s.domains.set(h, (s.domains.get(h) || 0) + 1);
          } catch (e) {}
        }
  }
  const fakeByName = new Map(peopleFakeMerged.map((p) => [p.name, p]));
  const names = new Set([...stats.keys(), ...fakeByName.keys()]);
  const out = [];
  for (const name of names) {
    const s = stats.get(name) || { name, posts: 0, replies: 0, first: null, last: null, did: null, rkeys: [], shares: [], domains: new Map(), introRkey: null };
    const f = fakeByName.get(name) || null;
    out.push({
      name,
      id: (f && f.slackId) || name,
      slackId: f ? f.slackId : null,
      avatar: f ? f.avatar : null,
      title: f ? f.title || "" : "",
      github: f ? f.github : null,
      website: f ? f.website : null,
      did: s.did || (f ? f.did : null),
      didIsReal: !!s.did,
      posts: s.posts,
      replies: s.replies,
      total: s.posts + s.replies,
      firstSeen: s.first,
      lastSeen: s.last,
      introRkey: s.introRkey,
      rkeys: s.rkeys,
      shares: s.shares,
      domains: [...s.domains.entries()].sort((a, b) => b[1] - a[1]),
      inArchive: s.posts + s.replies > 0,
      mockupFields: [f && f.slackId ? "Slack id" : null, f && f.avatar ? "avatar" : null, f && f.title ? "role" : null, f && f.github ? "GitHub" : null, f && f.website ? "website" : null, f && f.did && !s.did ? "DID" : null].filter(Boolean)
    });
  }
  out.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return out;
};
const _1e0r4w6 = function _peopleById(people) {return (new Map(people.flatMap((p) => (p.slackId ? [[p.slackId, p], [p.name, p]] : [[p.name, p]]))));};
const _1u3an2j = function _peopleFakeMerged(peopleFake,focConfig) {
  const m = new Map();
  for (const raw of peopleFake) {
    const p = { ...raw, name: focConfig.nameAliases[raw.name] || raw.name };
    const cur = m.get(p.name);
    if (!cur) { m.set(p.name, p); continue; }
    for (const k of ["slackId", "avatar", "title", "did", "github", "website"])
      if (!cur[k] && p[k]) cur[k] = p[k];
    for (const k of ["posts", "replies"]) cur[k] = (cur[k] || 0) + (p[k] || 0);
    if (p.firstSeen && (!cur.firstSeen || p.firstSeen < cur.firstSeen)) cur.firstSeen = p.firstSeen;
    if (p.lastSeen && (!cur.lastSeen || p.lastSeen > cur.lastSeen)) cur.lastSeen = p.lastSeen;
  }
  return [...m.values()];
};
const _1hn2lfb = function _focNormaliseUrl() {return ((u) => {
  let s = String(u || "").trim();
  const i = s.lastIndexOf("](");
  if (i >= 0) s = s.slice(i + 2);
  s = s.replace(/[)\s]+$/, "");
  if (s && !/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  return s;
});};
const _khwz10 = function _parseWikiList(focNormaliseUrl) {return ((text, page) => {
  const out = [];
  let section = "";
  for (const rawLine of String(text || "").split("\n")) {
    const line = rawLine.trim();
    const h = line.match(/^##\s+(.*)$/);
    if (h) { section = h[1].trim(); continue; }
    if (!line.startsWith("**[")) continue;
    const m = line.match(/^\*\*\[([^\]]+)\]\((.*?)\)(?::\*\*|\*\*:?)\s*(.*)$/);
    if (!m) continue;
    const name = m[1];
    const url = focNormaliseUrl(m[2]);
    const desc = m[3] || "";
    const links = [];
    const descRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let dm;
    while ((dm = descRe.exec(desc))) links.push({ text: dm[1], url: focNormaliseUrl(dm[2]) });
    const byMatch = desc.match(/\bby \[([^\]]+)\]/);
    let host = "";
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
    out.push({ name, url, host, desc, links, byline: byMatch ? byMatch[1] : null, section, page });
  }
  return out;
});};
const _pgqi3p = async function _wikiProjects(focConfig,parseWikiList) {
  const get = async (page) => {
    try {
      const r = await fetch(focConfig.wikiRaw + page + ".md");
      if (!r.ok) throw new Error(page + ".md " + r.status);
      return parseWikiList(await r.text(), page);
    } catch (e) {
      return { error: String(e), page };
    }
  };
  const [projects, demos] = await Promise.all([get("projects"), get("demos")]);
  return {
    projects: Array.isArray(projects) ? projects : [],
    demos: Array.isArray(demos) ? demos : [],
    errors: [projects, demos].filter((x) => !Array.isArray(x))
  };
};
const _gzq9ml = function _focStyle() {return ((id, css) => {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
  return document.createDocumentFragment();
});};
const _z1xp4k = function _focTabLabels(invalidation) {
  const labels = {
    "@tomlarkworthy/foc-chat": "Chat",
    "@tomlarkworthy/foc-wiki": "Wiki",
    "@tomlarkworthy/foc-demos": "Demos",
    "@tomlarkworthy/foc-projects": "Projects",
    "@tomlarkworthy/foc-people": "People"
  };
  let applied = 0;
  const relabel = () => {
    for (const b of document.querySelectorAll(".lp2-tabs button")) {
      const id = String(b.title || "").split(" ")[0];
      const want = labels[id];
      if (!want) continue;
      const first = b.firstChild;
      if (first && first.nodeType === 3 && first.nodeValue !== want) {
        first.nodeValue = want;
        applied++;
      }
    }
  };
  relabel();
  let mo = null;
  const attach = () => {
    const host = document.querySelector(".lp2-host");
    if (!host) return false;
    mo = new window.MutationObserver(relabel);
    mo.observe(host, { childList: true });
    relabel();
    return true;
  };
  if (!attach()) {
    let tries = 0;
    const iv = setInterval(() => {
      if (attach() || ++tries > 40) clearInterval(iv);
    }, 150);
    invalidation.then(() => clearInterval(iv));
  }
  invalidation.then(() => mo && mo.disconnect());
  return { status: "tab relabeller installed", applied: () => applied };
};
const _c52gsl = function _focBaseStyle(focStyle) {return (focStyle("foc-base-css", `
.foc-root {
  font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--theme-foreground, #222);
  background: var(--theme-background, transparent);
  height: calc(100vh - 46px);
  min-height: 420px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--theme-foreground-fainter, #ddd);
  border-radius: 6px;
  overflow: hidden;
  box-sizing: border-box;
}
.foc-root *, .foc-root *::before, .foc-root *::after { box-sizing: border-box; }
.foc-root a { color: var(--theme-foreground-focus, #0a58ca); text-decoration: none; }
.foc-root a:hover { text-decoration: underline; }
.foc-root h2, .foc-root h3, .foc-root h4 { font-family: inherit; }
.foc-root code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.92em;
  background: var(--theme-background-b, #f2f2f2); padding: 0 3px; border-radius: 3px; }
.foc-head { flex: 0 0 auto; padding: 8px 12px; border-bottom: 1px solid var(--theme-foreground-fainter, #ddd);
  display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
  background: var(--theme-background-b, #fafafa); }
.foc-head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.foc-sub { color: var(--theme-foreground-muted, #666); font-size: 12px; }
.foc-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 12px; }
.foc-mockup { display: inline-block; background: #b3801a; color: #14100a; border-radius: 3px;
  padding: 0 5px; font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  vertical-align: middle; }
.foc-mocknote { background: rgba(179,128,26,.18); border-left: 3px solid #b3801a; padding: 6px 10px;
  font-size: 12px; color: var(--theme-foreground, #222); margin: 8px 0; border-radius: 0 4px 4px 0; }
.foc-real { display: inline-block; background: var(--theme-background-a, #eee);
  color: var(--theme-foreground-muted, #666); border-radius: 3px; padding: 0 5px; font-size: 10px;
  font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  border: 1px solid var(--theme-foreground-fainter, #ccc); }
.foc-btn { font: inherit; font-size: 12px; padding: 3px 8px; border-radius: 4px; cursor: pointer;
  border: 1px solid var(--theme-foreground-fainter, #ccc); background: var(--theme-background-a, #fff);
  color: var(--theme-foreground, #222); }
.foc-btn:hover { background: var(--theme-background-b, #eee); }
.foc-input { font: inherit; font-size: 13px; padding: 4px 8px; width: 100%;
  border: 1px solid var(--theme-foreground-fainter, #ccc); border-radius: 4px;
  background: var(--theme-background-a, #fff); color: var(--theme-foreground, #222); }
.foc-avatar { width: 32px; height: 32px; border-radius: 5px; flex: 0 0 auto; object-fit: cover;
  display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px;
  font-weight: 600; overflow: hidden; }
.foc-empty { padding: 24px 12px; color: var(--theme-foreground-muted, #666); font-style: italic; }
.foc-cards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.foc-card { border: 1px solid var(--theme-foreground-fainter, #ddd); border-radius: 6px; padding: 10px;
  background: var(--theme-background-a, #fff); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.foc-card h4 { margin: 0; font-size: 14px; }
.foc-card p { margin: 0; font-size: 13px; color: var(--theme-foreground-muted, #555); }
.foc-cardfoot { margin-top: auto; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
  font-size: 12px; padding-top: 4px; }
`));};
const _p7o8ew = function _focAvatarNode(focAvatarColor,focInitials) {
  const broken = (window.__focBrokenAvatars = window.__focBrokenAvatars || new Set());
  const make = (person, name) => {
    const label = (person && person.name) || name || "?";
    const src = person && person.avatar;
    if (src && !broken.has(src)) {
      const img = document.createElement("img");
      img.className = "foc-avatar";
      img.src = src;
      img.alt = label;
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.title = label + " — avatar is mockup data";
      img.onerror = () => {
        broken.add(src);
        img.replaceWith(make(null, label));
      };
      return img;
    }
    const d = document.createElement("div");
    d.className = "foc-avatar";
    d.style.background = focAvatarColor(label);
    d.textContent = focInitials(label);
    d.title = label + (src ? " — mockup avatar URL is dead, showing initials" : "");
    return d;
  };
  return make;
};
const _u31p2n = function _visibleChannels(archive,channelsByRkey,structure) {
  const counts = new Map();
  for (const r of archive.messages) {
    const ch = channelsByRkey.get(r.value.channel);
    if (!ch) continue;
    if (!counts.has(ch.rkey)) counts.set(ch.rkey, { top: 0, all: 0, last: null });
    const c = counts.get(ch.rkey);
    c.all++;
    if (!r.value.parent) c.top++;
    if (r.value.createdAt && (!c.last || r.value.createdAt > c.last)) c.last = r.value.createdAt;
  }
  return structure.channels
    .filter((c) => !c.hidden)
    .map((c) => ({ ...c, ...(counts.get(c.rkey) || { top: 0, all: 0, last: null }) }))
    .sort((a, b) => b.all - a.all);
};
const _12k4q70 = function _focFitPane() {return ((root, narrowAt = 780) => {
  const fit = () => {
    if (!root.isConnected) return;
    root.classList.toggle("narrow", root.getBoundingClientRect().width < narrowAt);
    const pane = root.closest(".lp2-pane");
    if (!pane) return;
    const offsetTop = root.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
    const h = Math.max(320, Math.round(pane.clientHeight - offsetTop - 10));
    if (root.style.height !== h + "px") root.style.height = h + "px";
  };
  const ro = new window.ResizeObserver(fit);
  ro.observe(root);
  let n = 0;
  const attach = () => {
    const pane = root.closest(".lp2-pane");
    if (pane) { ro.observe(pane); fit(); return; }
    if (n++ < 20) setTimeout(attach, 100);
  };
  setTimeout(attach, 0);
  setTimeout(fit, 300);
  return ro;
});};
const _1wtqfrz = function _linkIndex(archive,parseByline) {
  const byHost = new Map();
  const byUrl = new Map();
  const norm = (u) => {
    try {
      const x = new URL(String(u));
      const host = x.hostname.replace(/^www\./, "").toLowerCase();
      const path = x.pathname.replace(/\/+$/, "");
      return (host + path + (x.search || "")).toLowerCase();
    } catch (e) {
      return String(u || "").replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();
    }
  };
  for (const r of archive.messages) {
    for (const f of r.value.facets || [])
      for (const feat of f.features || []) {
        if (!feat.uri) continue;
        let host = "";
        try { host = new URL(feat.uri).hostname.replace(/^www\./, "").toLowerCase(); } catch (e) { continue; }
        const entry = { rkey: r.rkey, uri: feat.uri, host, createdAt: r.value.createdAt, channel: r.value.channel, name: parseByline(r).name };
        if (!byHost.has(host)) byHost.set(host, []);
        byHost.get(host).push(entry);
        const nu = norm(feat.uri);
        if (!byUrl.has(nu)) byUrl.set(nu, []);
        byUrl.get(nu).push(entry);
      }
  }
  return { byHost, byUrl, norm };
};
const _1jgfnkl = function _mentionsOf(linkIndex) {return ((url) => {
  const multiTenant = new Set(["github.com", "gitlab.com", "observablehq.com", "youtube.com", "youtu.be",
    "codepen.io", "itch.io", "substack.com", "twitter.com", "x.com", "medium.com", "glitch.me",
    "replit.com", "figma.com", "docs.google.com", "news.ycombinator.com", "reddit.com", "bsky.app",
    "akkartik.name/archives", "vimeo.com", "gist.github.com"]);
  let u = null;
  try { u = new URL(url); } catch (e) { return { host: "", count: 0, last: null, entries: [], mode: "unparseable", label: "" }; }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const path = u.pathname.replace(/\/+$/, "");
  const pool = linkIndex.byHost.get(host) || [];
  const prefix = linkIndex.norm(url);
  const hasPath = path.length > 0 && path !== "/";
  const dedupe = (list) => {
    const seen = new Set();
    const out = [];
    for (const e of list) {
      if (seen.has(e.rkey)) continue;
      seen.add(e.rkey);
      out.push(e);
    }
    out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return out;
  };
  const byPrefix = hasPath
    ? dedupe(pool.filter((e) => {
        const n = linkIndex.norm(e.uri);
        return n === prefix || n.startsWith(prefix + "/") || n.startsWith(prefix + "?") || n.startsWith(prefix + "#");
      }))
    : [];
  if (byPrefix.length)
    return { host, count: byPrefix.length, last: byPrefix[0].createdAt, entries: byPrefix, mode: "url", label: "this link", query: prefix };
  if (!hasPath || !multiTenant.has(host)) {
    const byHost = dedupe(pool);
    if (byHost.length)
      return { host, count: byHost.length, last: byHost[0].createdAt, entries: byHost, mode: "host", label: host, query: host };
  }
  return { host, count: 0, last: null, entries: [], mode: hasPath && multiTenant.has(host) ? "url" : "host", label: hasPath && multiTenant.has(host) ? "this link" : host, query: hasPath ? prefix : host };
});};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1ocuwnz", "focConfig", [], _1ocuwnz);  
  $def("_focdataseed", null, ["md"], _focdataseed);  
  $def("_1wbyida", "focIdb", ["focConfig"], _1wbyida);  
  $def("_12iqz0", "focListRecords", [], _12iqz0);  
  $def("_1ogqf1u", "structure", ["focConfig","focListRecords"], _1ogqf1u);  
  $def("_18jukin", "channelsByRkey", ["structure"], _18jukin);  
  $def("_lqdytk", "archive", ["focConfig","focListRecords","focIdb"], _lqdytk);  
  $def("_1l64rhq", "byRkey", ["archive"], _1l64rhq);  
  $def("_1yv3u9u", "topLevelByChannel", ["archive","channelsByRkey"], _1yv3u9u);  
  $def("_12od4yw", "repliesByParent", ["archive"], _12od4yw);  
  $def("_l3aj65", "reactionsByTarget", ["archive"], _l3aj65);  
  $def("_1242fwm", "parseByline", ["focConfig"], _1242fwm);  
  $def("_13jxxtn", "bodyText", ["parseByline"], _13jxxtn);  
  $def("_1y8vzq9", "focEscape", [], _1y8vzq9);  
  $def("_2ztslk", "renderFacets", ["focEscape","focConfig"], _2ztslk);  
  $def("_aaqg0h", "renderBody", ["parseByline","renderFacets","bodyText"], _aaqg0h);  
  $def("_1ogx4fw", "blobUrl", ["focConfig"], _1ogx4fw);  
  $def("_h49ht1", "profiles", [], _h49ht1);  
  $def("_1c13k3g", "focTokenize", [], _1c13k3g);  
  $def("_uf9ces", "searchIndex", ["archive","parseByline","channelsByRkey","bodyText","focTokenize"], _uf9ces);  
  $def("_709amv", "search", ["focTokenize","searchIndex","byRkey"], _709amv);  
  $def("_focpeoplefake", "peopleFake", [], _focpeoplefake);  
  $def("_focdemosfake", "demosFake", [], _focdemosfake);  
  $def("_c9nrdu", "focReadHash", [], _c9nrdu);  
  $def("_uo06kl", "focWriteHash", [], _uo06kl);  
  $def("_1ign2ca", "focHash", ["Generators","focReadHash"], _1ign2ca);  
  $def("_16l49ir", "focGoTab", ["focWriteHash"], _16l49ir);  
  $def("_1fjygyw", "focFmt", [], _1fjygyw);  
  $def("_v66nsu", "focAvatarColor", [], _v66nsu);  
  $def("_mtje15", "focInitials", [], _mtje15);  
  $def("_19eqi24", "people", ["focConfig","archive","parseByline","channelsByRkey","peopleFakeMerged"], _19eqi24);  
  $def("_1e0r4w6", "peopleById", ["people"], _1e0r4w6);  
  $def("_1u3an2j", "peopleFakeMerged", ["peopleFake","focConfig"], _1u3an2j);  
  $def("_1hn2lfb", "focNormaliseUrl", [], _1hn2lfb);  
  $def("_khwz10", "parseWikiList", ["focNormaliseUrl"], _khwz10);  
  $def("_pgqi3p", "wikiProjects", ["focConfig","parseWikiList"], _pgqi3p);  
  $def("_gzq9ml", "focStyle", [], _gzq9ml);  
  $def("_z1xp4k", "focTabLabels", ["invalidation"], _z1xp4k);  
  $def("_c52gsl", "focBaseStyle", ["focStyle"], _c52gsl);  
  $def("_p7o8ew", "focAvatarNode", ["focAvatarColor","focInitials"], _p7o8ew);  
  $def("_u31p2n", "visibleChannels", ["archive","channelsByRkey","structure"], _u31p2n);  
  $def("_12k4q70", "focFitPane", [], _12k4q70);  
  $def("_1wtqfrz", "linkIndex", ["archive","parseByline"], _1wtqfrz);  
  $def("_1jgfnkl", "mentionsOf", ["linkIndex"], _1jgfnkl);
  return main;
}
