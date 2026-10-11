---
scope: [local-development]
topics: Cloud Brain; pairing with the Brain page; brain.ts page up; a browser of the cluster; the CDP bridge
triggers:
  - "(^Bash |^|[;&|] )bun +tools/cloud-brain/brain\.ts +page( |$)"
  - "(^Bash |^|[;&|] )BRAIN_BASE=[a-z0-9]+ +bun +tools/cloud-brain/brain\.ts +page( |$)"
---

# Pairing with the Cloud Brain page

Moved here on 2026-10-11 from `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, which was written 2026-10-08 from the session that
built the cluster pairing. Measured that day against `cb4`. The text is as it was there; a line carries its own date where it is later.
The other pages are listed in that file, which is read first.

The page pairs like any lopecode notebook: `cc=LOPE-<port>-XXXX` in the hash makes it dial
`ws://127.0.0.1:<port>`, where this session's channel server listens.

**On this machine.** Open the kernel's address in a QA tab:

```
qa_open_notebook  session brain-live, headless
https://cb4.endpointservices.workers.dev/#view=C100(S70(@tomlarkworthy/cloud-brain,@tomlarkworthy/brain-shell),S30(@tomlarkworthy/claude-code-pairing))&cc=<token>&o=30
```

`&o=30` is on the address this tab has used since it was first opened. What it does is not recorded;
leave it out and nothing here depends on it (the cluster page runs without it).

**In a browser of the cluster.**

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts page up --minutes 30 --token <LOPE token>
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts page up --minutes 5 --token <LOPE token> --url "https://host/notebook.html#view=…"
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts page state|down [--browser NAME]
```

`--url` opens any hosted notebook (an https address the cluster can fetch, not `file://`) in browser
`test`, with no session; `page down --browser test` ends it. `--keep` (not run) buys time again when under 2
minutes are left. The public quick start paired this way on 2026-10-08.

`page up` with no `--url` buys browser time, opens the page in the owner's browser `brain`, signs it in, and stays in the
foreground as the bridge. `connected` then arrives on the channel for the `cb4…` URL and every
pairing tool works against it. `page down` closes the browser. With several notebooks connected,
pass the cb4 URL as `notebook_id`.

How the dial to `127.0.0.1` is carried, with no change to the page, the pairing module or the
channel server:

1. `browser.cdp` gives this machine Cloudflare's own CDP socket for that browser.
2. Over it, a script is installed to run before the page's code. It stands in for `WebSocket` on
   loopback addresses only.
3. Each frame leaves the page through a CDP binding. The bridge opens a real socket to the local
   channel server and copies frames both ways.

Measured 2026-10-08: the page reported Linux, HeadlessChrome 128, time zone UTC, 4 cores, signed in,
and held the lease after the local tab was closed. Heap 534 to 632 MB.

Limits:

- The bridge runs on this machine. If it stops, pairing drops; the page on the cluster goes on
  holding the lease until its bought time ends.
- The pairing module dials once, at load. Each time the bridge connects it loads the page again: 10 to
  11 s from `bridge up` to the local socket (three runs), and the lease is free for about a minute.
- No cut of the CDP socket was seen: two sockets ran 11 min each, the second closing 22 s after the
  bought time ended, when the bridge exits. The reconnect was run only by stopping and starting it.
- $0.09 an hour. Tom, 2026-10-08: "we don't need it all day, only when doing stuff". Do not leave
  one running; check `browser.all` when done.
- One Brain page per browser. Two killed a browser at about 500 MB each.
- The owner's session is placed in that browser's storage. Only the owner's own session reaches
  it, because a browser belongs to its caller. Rule overrides for this were set and removed the
  same day; they were not needed.
- When the cluster page goes down, nothing holds the lease. Reopen the local `brain-live` tab.
- A QA session that was closed comes back as a new browser: signed out, and its dial to `127.0.0.1`
  fails with `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` (seen 2026-10-08 23:10 CEST). Open it with
  `chromium_args: ["--disable-features=LocalNetworkAccessChecks"]`, then put the session in
  `localStorage.brain_session` without printing it (a one-shot loopback server that the page fetches
  from) and reload. Do not `qa_close` with no session name: it closes every session.

Rejected: a relay service on a Durable Object, with both ends dialling a room. Tom: "no because you
have modified the protocol". The bridge needed no new infrastructure.
