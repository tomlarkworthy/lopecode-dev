---
scope: local-development
---

# WebSockets through a Cloud Brain

A record of one experiment on cb4, 2026-10-08, 18:05 to 18:29 UTC, client in Berlin. The question: does a WebSocket
pass kernel → core → service, and what do the rule, the price, `calls` and the metrics do to it. The use was a raw
Chrome DevTools Protocol socket to a remote browser (`browser.cdp` in `brain-browser.ojs`).

Scripts are in `tools/scratch/ws-probe/`. Their JSON results are in `results/` there, which git ignores; the numbers
below are copied from those files and from the terminal.

## Result

A WebSocket passes, after two changed lines. Before the change each upgrade answered 500.

```
before   GET /xrpc/…wsprobe.ws  Upgrade: websocket   as the owner
         HTTP/1.1 500   x-brain-served-by: brain@1284a5907b09
         {"error":"InternalServerError","message":"Responses may only be constructed with status codes in the range 200 to 599, inclusive."}
after    HTTP/1.1 101 Switching Protocols   x-brain-served-by: brain-x-wsprobe@2c4d8a7794f1, brain-core@e367696229e2
```

The two lines, both the same fault: a `new Response(body, { status, headers })` made from a 101 answer without its socket.

| Where | Line | Change |
|---|---|---|
| The wrapper of each Worker, `stamp` | `cloudflare-iac.ojs:576` | `webSocket: r.webSocket` in the init. `stamp` adds `x-brain-served-by`; an answer that came from a binding has headers that cannot be changed, so it is made again. |
| The kernel, the CORS middleware of `/xrpc/*` | `brain-kernel.ojs:195` | `webSocket: c.res.webSocket` in the init. It runs for a call with an `Authorization` header. |

The wrapper is in each Worker, so the deployer was updated and each of the 16 Workers was deployed again from its
kept source (`install-deployer`, `redistil --apply`, `confirm`; 18:09:37 to 18:13:20 UTC). The core's own code did
not change.

## The path, read before the test

Each place a request is made again or an answer is wrapped, and what it did to an upgrade:

| Place | Line | Upgrade request | 101 answer |
|---|---|---|---|
| Wrapper, a call from the internet | `cloudflare-iac.ojs:596` `new Request(request, { headers })` | passes: `Upgrade` and `Sec-WebSocket-*` are copied | |
| Wrapper, `stamp` | `cloudflare-iac.ojs:567` | | **broke**; fixed |
| Kernel, CORS | `brain-kernel.ojs:190` | | **broke** for a call with `Authorization`; fixed |
| Kernel, `toCore` | `brain-kernel.ojs:410` new `Request`, headers copied, no body for a GET | passes | returned as it is |
| Core, the middleware that identifies the caller and writes the metrics | `brain-core.ojs:270`, `:285` (`waitUntil`) | passes | not touched; the row is written at the 101 |
| Core, `forward` | `brain-core.ojs:493` new `Request`, `x-brain-*` set | passes | returned as it is |
| Core, `priced` | `brain-core.ojs:581` `new Response(r.body, r)` | | passes: a `Response` given as the init carries its `webSocket` |
| Wrapper, `coreFetch` (`xrpc.fetch` in a service) | `cloudflare-iac.ojs:411` | passes with `headers: { Upgrade: "websocket" }` | `r.webSocket` is there for the calling service |

That last row of `priced` explains the first run: before any change, a Worker's call to a **priced** method through the
core answered 101 and carried frames, and the same call to a free method answered 500. The priced path makes the
answer again from the answer itself, which keeps the socket; the free path left it to `stamp`.

## Each kind of caller

`tools/scratch/ws-probe/hops.ts`, after the change. The scratch service `brain-x-wsprobe` answered an upgrade on three
methods (`who: "workers"`, `who: "anyone"`, and one with `price: "0.0001"`) and a path, echoed each frame, and sent the
`x-brain-*` headers it saw.

| Caller | Target | Answer | The service saw |
|---|---|---|---|
| owner's session (`Authorization: Bearer`) | method | 101, open in 385 ms | `x-brain-caller: owner`, `x-brain-via: session`, origin the same |
| token | method | 101, 311 ms | `token:wsprobe`, via `token` |
| no caller | method with `who: "workers"` | 401 `AuthRequired`, from the core | |
| no caller | method with `who: "anyone"` | 101, 302 ms | `anonymous` |
| no caller, with forged `x-brain-caller: owner` | method with `who: "anyone"` | 101 | `anonymous`: the kernel's wrapper removes the header |
| owner's session | priced method | 101, 480 ms; `quota.get` rose by 0.0001 | |
| owner's session | path `/wsprobe/ws` | 101, 397 ms | |
| no caller | path with `who: "workers"` | 401 | |
| Worker `brain-x-wsclient` by its own key, in a chain the owner started | method it declared in `calls` | 101 in 54 ms; 4 frames both ways | `worker:brain-x-wsclient`, `x-brain-origin: owner`, `x-brain-origin-via: session` |
| the same Worker | priced method | 101 in 161 ms | the same |
| the same Worker | method it did not declare | 403 `Forbidden`: "brain-x-wsclient did not declare a call to com.lopecode.brain.wsprobe.open" | |

The metrics have one row for each upgrade, with status 101 and the time to the 101 (`"method":"wsprobe.paid","caller":"owner","status":101,"n":2,"ms":607`). Nothing records how long a socket was open or how many frames it carried.

Not explained: `x-brain-served-by` of a 101 from the internet names the service and the core and not the kernel.

## Size, life and deploys

| Check | Seen |
|---|---|
| Frame size, each way, text | 1 KB, 100 KB, 1 MB, 4 MB, 16 MB and 33 MB all passed; 33 MB took 118 ms up and 177 ms down. Nothing above 33 MB was tried. |
| A socket with a ping each 30 s and a server frame each 60 s | open 600 s, closed by the client: 19 of 19 pings echoed, 10 ticks |
| A socket with no frame at all | open 240 s, closed by the client. Longer was not tried. |
| A deploy of the service while a socket is open | `brain-x-wsprobe` was deployed again at 18:25:49 UTC with a socket 8 s old. The socket went on for 172 s more, with each ping echoed, until the client closed it. Cloudflare's limits page says an in-flight request gets 30 s at a runtime update; this was more. |
| A deploy of the core or the kernel while a socket is open | not tried |

The kernel and the core do not relay: each returns the answer of the next Worker, and Cloudflare carries the frames.
`brain-x-wsprobe` held its socket in a plain Worker with `setInterval`; no Durable Object.

## Cost

From Cloudflare's pages, read on 2026-10-08:

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): "WebSocket connections made to a Worker are charged as a request, representing the initial `Upgrade` connection made to establish the WebSocket." "WebSocket messages routed through a Worker do not count as requests." "No charge or limit for duration".
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/): "There is no hard limit on duration for HTTP-triggered Workers. As long as the client remains connected, the Worker can continue processing."

So an open socket through kernel, core and service is three requests, billed one time, and CPU time only while a
Worker runs code for a frame. The kernel and the core run none after the 101. The Brain's own price is charged one
time, at the upgrade. A price for the time a socket is open is not possible in the core; `brain-x-browser` does not
need one, because browser time is bought by `browser.extend`.

## Who can open one

A server-side client can send `Authorization` on the upgrade (bun, node `ws`, a Worker's `fetch`). A page in a web
browser cannot set a header on `new WebSocket(...)`, and since 2026-10-07 the kernel reads no cookie. So the Brain's
own page cannot open a socket as its owner today. The usual ways are the token in `Sec-WebSocket-Protocol` or in the
query string; neither was built, and the second puts a token in logs.

## The use: `browser.cdp`

`browser.cdp` asks Browser Run for the upgrade and returns its answer (`brain-browser.ojs:722`, `:892`). The first
plan was a relay in the service: accept the client, connect to the browser, copy frames, and close both at
`paidUntil` with a reason. It was not built. The pass-through has no code that can be wrong about a frame, the tick
already ends a browser whose time has passed, and that closes the socket. The costs: the close has no reason (code
1005), and it comes up to 60 s after `paidUntil`, as for each other use of a browser.

`tools/scratch/ws-probe/cdp-raw.ts`, `cdp-playwright.ts`, and the scratch Worker `brain-x-wscdp` (`mk-probe.ts`):

```
no upgrade                 426 UpgradeRequired
upgrade, no time bought    refused (409 NoTime before the upgrade); no browser started
raw socket                 connect 768 ms after extend started the browser; Browser.getVersion "Chrome/128.0.6613.137"
                           Page.navigate example.com -> Page.loadEventFired, 8 Network.* event kinds, title "Example Domain"
                           Runtime.evaluate p50 60.7 ms (n=40); a second run 49.8 ms
browser.eval, same browser p50 427 ms (n=12); a second run 319.5 ms. A tab that open made was in Target.getTargets.
playwright-core 1.52.0     connectOverCDP 1020 ms; goto 196 ms; click + waitForURL(iana.org) 1629 ms
                           keyboard.type("lope") -> value "lope", 4 keydown events, each isTrusted
                           request events: example.com/, example.com/s.js, iana.org/…; screenshot 5137 bytes
brain-x-wscdp by its key   extend 20 s -> 101 through the core, connect 1602 ms with the browser start
                           events Target.targetCreated, Target.targetInfoChanged; status.owner "worker:brain-x-wscdp"
bought 20 s, extend +30 s at +5 s while connected -> socket closed 13.3 s after the new paidUntil, code 1005
```

Dead end: `bun install puppeteer-core` in the scratch directory failed in the sandbox (`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`).
`playwright-core` was already a dev dependency of the repo and is the standard client that was used.

Browser time bought in the experiment: 190 s, $0.00475. Priced probe upgrades: $0.0007. The owner's day went from
$0.0475 to $0.05295.

## After the experiment

The scratch Workers `brain-x-wsprobe`, `brain-x-wsclient`, `brain-x-wscdp` and the token `wsprobe` are removed.
14 Workers report `same`, the lease is held, no browser is up.

## Not measured

- A socket open longer than 10 minutes, and a silent one longer than 4.
- A deploy of the core or the kernel under an open socket.
- Binary frames. CDP is text.
- More than one socket at a time through the core, and the limit of 6 connections that wait for headers.
- A member, or a member's Worker, as the caller of an upgrade.
- `browser.cdp` and a per-call method on one tab at the same moment. They were used one after the other on one browser.
