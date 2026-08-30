# Paseo Security Audit

**Target:** `vendor/paseo` — [getpaseo/paseo](https://github.com/getpaseo/paseo) @ `v0.1.89` (commit `0d98df4`)
**Date:** 2026-06-03
**Method:** Source review of the daemon (`packages/server`), relay (`packages/relay`), E2EE protocol, and CLI/client. Five parallel focused passes (crypto, daemon auth/network, file service, agent spawning, relay/protocol), with key findings re-verified against source.
**Scope note:** This is a code audit, not a deployed-system pentest. No code was modified. The repo is vendored as a git submodule.

---

## What paseo is (for threat-modeling)

Paseo is a self-hosted **daemon** that spawns and drives coding-agent CLIs (Claude Code, Codex, Copilot, OpenCode, Pi) on your machine. Clients — phone app, desktop, web, CLI — connect over WebSocket, either **directly** (loopback / LAN) or via an **untrusted relay** (Cloudflare Durable Object) using an end-to-end-encrypted channel (Curve25519 ECDH + NaCl `box` / XSalsa20-Poly1305).

Paseo's **documented trust model** (`SECURITY.md`) is Docker-like: *a connected/paired client is a fully trusted operator of the daemon user.* The trust anchor is the **pairing link/QR** (carries the daemon's public key + session id), and the relay is assumed hostile but unable to read or forge traffic.

The audit's central question is therefore not "can a client run code?" (that is the product's purpose) but **"how strong, leaky, revocable, and defended is the boundary that decides who counts as a trusted client?"** The answer is: weaker than the capability behind it warrants.

---

## Executive summary

The cryptographic core is implemented **correctly** — NaCl `box` is used properly, the relay genuinely cannot read or forge payloads, channel-takeover/re-key and plaintext-downgrade attempts are explicitly rejected, bcrypt is used correctly with constant-time compare, and DNS-rebinding `Host` validation is real and applied on both HTTP and WS. Credit where due: this is better than most local-daemon projects.

The weaknesses cluster in **how the trust boundary is established and bounded**, not in the crypto primitives:

1. **The pairing anchor is a leaky, permanent, un-revocable, un-authenticated capability.** `serverId` is generated once and persists forever per `$PASEO_HOME`; the daemon authenticates **no specific client** (it accepts any `e2ee_hello` public key); there is no device pinning, no fingerprint/SAS confirmation, and no revocation. Anyone who *ever* observes a pairing link (chat screenshot, shoulder-surf, relay metadata) obtains **permanent full control** of the machine, with no way to revoke short of rotating `$PASEO_HOME`.
2. **Zero defense-in-depth behind the boundary.** Once a client completes the handshake, every message is dispatched with no per-action authorization, and several inputs let a client bypass even the agent's own permission system to get **direct, unprompted code execution** (`loop/run` verify-checks → `sh -lc`; `config.extra.claude` overriding the Claude binary path / `permissionMode` / hooks; client-defined stdio MCP `command`; arbitrary `env` and `cwd`).
3. **No within-session replay protection** (acknowledged in `SECURITY.md`) — a malicious relay can re-inject captured (still-encrypted) command frames.
4. **The relay has no client auth, no rate limiting, and no connection caps**, giving anyone who knows a `serverId` a session-kill / DoS / metadata-correlation primitive against the daemon.

None of items 2's "RCE" vectors are violations of the *documented* model in isolation (a trusted operator may run code). They matter because items 1+3+4 make the boundary that grants that trust cheap to cross and impossible to take back, and because item 2 means there is no second layer to catch a boundary failure.

---

## Severity table

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| A1 | **High** (model-coarseness) | Pairing anchor is permanent, un-revocable, leaky; daemon authenticates no specific client (any `e2ee_hello` key accepted); no fingerprint/SAS | `server-id.ts:23-27`, `encrypted-channel.ts:214-235` |
| A2 | **High** | No within-session replay/reorder protection → malicious relay can replay encrypted command frames | `crypto.ts:131-161`, `encrypted-channel.ts` decrypt path; admitted in `SECURITY.md` |
| A3 | **High** | Relay: no client auth + no rate limit + no connection caps → unauthenticated daemon work-amplification & control resets by anyone knowing `serverId` | `cloudflare-adapter.ts:336-441, 217-248` |
| A4 | **High** | Relay v1 path (selectable via `v=1`) has no session isolation — all clients on a `serverId` share one broadcast channel | `cloudflare-adapter.ts:311-334, 454-467` |
| A5 | Medium | Client-supplied `connectionId` (v2) lets an attacker join a victim's routing group → ciphertext copy + targeted session-kill via decrypt-fail close | `cloudflare-adapter.ts:345-369, 479-503` |
| A6 | Medium | Download TOCTOU: HTTP download streams a path canonicalized up to 60s earlier, no re-validation; only final-component `O_NOFOLLOW` | `bootstrap.ts:455-485`, `service.ts:287-295` |
| A7 | Medium | Relay frame buffer bounded by count (200) but not by bytes; per-`connectionId`, no global cap → memory amplification | `cloudflare-adapter.ts:250-258` |
| A8 | Low | WS upgrade skips `Host` validation when the `Host` header is absent (HTTP fails closed; WS does not) | `websocket-server.ts:577-586` |
| A9 | Low | WS password check uses **synchronous** bcrypt (cost 12) on the event loop → DoS amplifier + unthrottled brute-force | `websocket-server.ts:610`, `auth.ts:36-45` |
| A10 | Low | No rate limiting / lockout on the daemon password | `auth.ts`, `websocket-server.ts` |
| A11 | Low | Download token rides in URL query string → leaks via logs / history / Referer | `bootstrap.ts:444-448` |
| A12 | Low | Partial forward secrecy vs. `SECURITY.md` wording: daemon static key compromise retroactively decrypts all recorded sessions | `SECURITY.md:37`, `daemon-keypair.ts` |
| A13 | Low | CORS reflects origin with `Allow-Credentials: true` **if** operator sets origins to `*` (not default) | `bootstrap.ts:402-415` |
| A14 | Low | Key file mode `0600` is best-effort and re-applied (not verified) on load; no zeroization; bcrypt 72-byte truncation; relay `serverId`/`connectionId` log injection (unvalidated) | various |

The "behind-the-boundary RCE" vectors (`loop/run` verify-checks, `extra.claude` passthrough, client stdio MCP `command`, `env`/`cwd` injection) are catalogued in detail in the **Capability-boundary findings** section. They are **by-design for a trusted operator** but are listed because (a) they bypass the agent's *own* permission prompts, and (b) they are what an A1/A3 boundary failure converts directly into RCE.

---

## Top findings in detail

### A1 — The pairing boundary is permanent, un-revocable, and authenticates no one (High)

- `serverId = "srv_" + randomBytes(9)` is generated **once** and persisted to `$PASEO_HOME/server-id`, reused forever (`server-id.ts:23-27, getOrCreateServerId`). It is **not** a secret in the model — it ships inside every pairing offer fragment and travels in the relay WebSocket URL query string, so the relay and anyone who sees a pairing link learns a *long-lived* identifier.
- The daemon's E2EE channel accepts **any** well-formed `e2ee_hello` public key and derives a working shared key from it (`encrypted-channel.ts:214-235`). There is **no allowlist of paired devices, no pinning of the first client, and no revocation.** The daemon authenticates the *channel* (via its own static key) but not the *client*.
- There is **no fingerprint / safety-number / SAS** step anywhere (verified by grep across app/server/relay). The user has no out-of-band way to confirm the key, and no way to detect or eject an extra paired device.

**Consequence:** possession of the pairing link ⇒ permanent, full, unrevocable control of the machine (see capability section). The `SECURITY.md` "treat the QR like a password" guidance is the *only* mitigation, but unlike a password it cannot be rotated without rotating `$PASEO_HOME`, and unlike a password the daemon will accept *additional* unknown devices silently.

**Fix:** Pin the first paired client key (or maintain an explicit device allowlist) and reject unknown keys; add a short authentication-string confirmation on both ends; support pairing-link rotation/expiry and device revocation independent of `$PASEO_HOME`.

### A2 — No within-session replay protection (High)

`decrypt()` opens any frame that authenticates under the shared key; there is no nonce-seen set, message counter, or sequence check (`crypto.ts:131-161`). `SECURITY.md` admits this. Because the relay is explicitly in-scope as an attacker, it can capture a (still-encrypted, unreadable) command frame — e.g. one that triggers a shell action or agent step — and **re-inject it arbitrarily**; the daemon decrypts and re-executes. Reordering/drop are likewise undetectable.
**Fix:** per-direction monotonic counter inside the authenticated plaintext; reject counter ≤ highest accepted.

### A3 / A4 / A5 — Relay session-disruption without authentication (High / High / Medium)

The relay performs **no client authentication** — possession of `serverId` is sufficient to connect as `role=client` (`cloudflare-adapter.ts:415-441`). Each connect broadcasts `connected`, forces the daemon to open a new per-connection data socket and run a full ECDH handshake **before any auth**, and schedules un-cancelled nudge/reset timers that can `close(1011)` the daemon's control socket after 15s. There are **no connection caps and no rate limiting** anywhere, so this is an unbounded work-amplification / control-reset DoS against the daemon, plus a Cloudflare-DO economic-DoS against the operator.

The **v1 path remains reachable** (omitting `v` defaults to v1; `v=1` is accepted) and broadcasts every frame to all clients on a `serverId` with **no `connectionId` partitioning** — an attacker-selectable downgrade that enables cross-talk and handshake desync. In v2, a client may **supply an arbitrary `connectionId`**; supplying a victim's value joins the victim's routing group, yielding a real-time copy of their ciphertext stream (traffic analysis) and a precise, repeatable **session-kill** by injecting a frame that fails the victim daemon's authenticated decryption (forcing `close(1011)`).

**Fix:** require a daemon-signed join token (signed with the key already in the offer) before the relay spends handshake work; per-session/per-IP connection caps + rate limiting; disable v1 / forbid protocol downgrade; relay-assign `connectionId` and bind it to the handshake; cancel timers on close.

### A6 — Download TOCTOU (Medium)

`getDownloadableFileInfo` `realpath`s and stores `absolutePath` in a token; up to 60s later the HTTP handler `open()`s that exact path and streams it with **no re-validation** and only final-component `O_NOFOLLOW` (`bootstrap.ts:455-485`). An intermediate directory component swapped to a symlink within the window serves bytes other than those validated/displayed — a confused-deputy integrity gap on a distinct HTTP channel.
**Fix:** capture `dev`+`ino` at issue time and `fstat`-compare at serve time, or re-run realpath+boundary check before streaming; shorten TTL.

### Daemon auth nits (A8–A11, A13)

The auth design is mostly sound (bcrypt constant-time compare, no password in logs, health/OPTIONS exemptions are exact-path and cannot reach protected routes, `Host`+CORS applied to HTTP and WS). Residual: WS skips `Host` validation when the header is absent (HTTP fails closed — `websocket-server.ts:577-586`); the WS path uses **synchronous** bcrypt cost-12 on the event loop (`websocket-server.ts:610`), a DoS amplifier and unthrottled brute-force channel; no rate-limit/lockout exists; download token rides in the URL query string; CORS `*` + credentials reflection is possible only if the operator opts into `*`.

---

## Capability-boundary findings (by-design for a trusted client, listed for completeness)

These are reachable by any client that completes the handshake. Under paseo's model that client is a trusted operator, so these are **not** model violations on their own — but each grants **direct code execution that bypasses the agent's own permission prompts**, which is what an A1/A3 boundary failure turns into RCE. Verified against source:

- **`loop/run` verify-checks → `sh -lc <client string>`** — `verifyChecks: z.array(z.string().trim().min(1))` (`loop/rpc-schemas.ts:101`) passed verbatim to `execCommand(shell.command, [...shell.flag, options.command])` where `shell = sh -lc` (`loop-service.ts:262-266`). Literal arbitrary-shell-command execution, no agent, no approval. `cwd` is unconstrained.
- **`config.extra.claude` SDK-option passthrough** — `claude: z.record(z.unknown())` (`messages.ts:305`) spread into Claude SDK launch options at `agent.ts:2607`, **after** `pathToClaudeCodeExecutable: claudeBinary` (2587) and `allowDangerouslySkipPermissions: true` (2584), so the client can override the executed binary, `permissionMode`, and `hooks`. `extra.codex` is the analogous vector.
- **Client-defined stdio MCP server** — `mcpServers` (`messages.ts:310`) accepts `{type:"stdio", command, args, env}` passed unmodified to the SDK, which spawns it as a child process at session start (`agent.ts:805-813`).
- **Arbitrary `env` injection** — `create_agent_request.env: z.record(z.string())` overlaid last onto the spawned agent env; only 5 runtime-control keys are stripped, so `PATH` / `NODE_OPTIONS` / `LD_PRELOAD` / `DYLD_INSERT_LIBRARIES` pass through. The daemon's full `process.env` (incl. any provider keys/secrets) is also handed to every agent and client-defined MCP server.
- **Arbitrary `cwd`** — the session create-agent route honors `config.cwd` verbatim (`session.ts:3107-3130`) with no workspace containment (the MCP child-agent route *does* have a `lockedCwd` guard; the phone route does not).
- **No spawn/concurrency cap** — `createAgent` and `loop/run` have no per-session limit (resource-exhaustion DoS).

**Hardening recommendation (defense-in-depth):** introduce a capability split so that launch-shaping inputs (binary path, hooks, stdio MCP `command`, env keys, shell verify-checks, arbitrary `cwd`) are operator-local-only or pass a strict allowlist — so that a future pairing-boundary failure does not equal instant unprompted RCE.

---

## Things done well (not findings)

- NaCl `box` AEAD used correctly; no unauthenticated or plaintext-fallback path leaks app data; an unencrypted frame on an open channel is a fatal error.
- Relay genuinely cannot MITM: the daemon public key is delivered out-of-band in the offer fragment (never via the relay/web server) and pinned client-side; a relay key-swap fails authenticated decryption.
- Channel-takeover hardened: a mismatched re-`hello` on an open channel closes `1008` instead of re-keying.
- Nonces are per-message CSPRNG (`nacl.randomBytes(24)`, PRNG presence asserted); 24-byte random nonces are collision-safe for per-session ephemeral keys.
- bcrypt used in the correct direction with constant-time compare; password never logged; health endpoint leaks only status+timestamp.
- `Host` allowlist (Vite-style) + CORS applied to both HTTP and WS for present-Host requests — real DNS-rebinding defense.
- The file service is **read-only** (no upload/write/delete/move/extract endpoints) and, contrary to the relaxed prose, enforces a workspace boundary in code with realpath+symlink checks.
- The core process-spawn primitives use argv arrays (`execFile`/`spawn`, no POSIX `shell:true`); the Claude SDK spawn forces `shell:false`. Classic metacharacter/argument injection of prompt/model text is **not** present — the issues are about *what structured input is allowed to be*, not shell quoting.

---

## Priority recommendations

1. **Pin/allowlist paired client keys + add device revocation + key-fingerprint confirmation** (A1). This is the single highest-leverage change; it turns "anyone who saw the link, forever" into "explicitly trusted devices."
2. **Add a per-direction replay counter** (A2) and **a daemon-signed relay join token + connection caps/rate limits** (A3–A5).
3. **Gate launch-shaping inputs** (`loop/run` verify-checks, `extra.claude`/`extra.codex`, client stdio MCP `command`, `env`, `cwd`) behind an operator-local capability or strict allowlist (capability section) — defense-in-depth so a boundary slip isn't instant RCE.
4. **Fix the download TOCTOU** (A6) and the **WS sync-bcrypt / missing-Host / no-rate-limit** auth nits (A8–A10).
5. **Reconcile `SECURITY.md`** with reality on forward secrecy (A12) and the within-session replay gap (already noted).

---

*Per-area raw reports (crypto, daemon auth, file service, agent spawning, relay) were produced during this audit and can be regenerated from `vendor/paseo` at the commit above.*
