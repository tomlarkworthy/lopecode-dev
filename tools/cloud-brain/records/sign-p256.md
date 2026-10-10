# sign-p256: the tracker signs with ECDSA P-256

2026-10-10. Not a tracker issue: asked for by the owner in the session.

Tom: "the issue DB is tiny and a day old, jsut resign everything and move on, we don;t need a key
migration stratergy".

## Why

The browser of the cluster is Chrome 128.0.6613.137 (measured on cb4 2026-10-08; the same in
`cloudflare/playwright` issue 232, 2026-10-07). Ed25519 in WebCrypto is on by default from
Chrome 137. `issueKeys` in `brain-issues.ojs` was the one use of Ed25519 in `tools/cloud-brain/`,
so the tracker's tests could not pass in that browser, and a page there reported them failed.
Cloudflare documents no way to choose the browser's version.

## What changed

- `issueKeys`: `{ name: "ECDSA", namedCurve: "P-256" }`, signed with SHA-256. The public JWK has `y`.
- `issue.key` answers `alg: "ES256"`.
- `issue.resign`, the owner present: every event's `hash` signed by the key held now. `sig` is
  not in the hash (`issueCheck` takes `hash` and `sig` out before hashing), so no hash or `prev` changes.
- No code reads an Ed25519 key any more.

## On cb4, 22:04 CEST

```
verify?guards=true   ok, seq 339, head f8f0e7aa…, checked 339      before
secret.put ISSUES_SIGNING_KEY                                      200
apply                brain-x-issues 15d722ba45e4, deployed
issue.resign         {"seq":339,"signed":339}
verify?guards=true   ok, seq 339, head f8f0e7aa…, checked 339      after, the same head
issue.key            {"alg":"ES256","key":{"kty":"EC","crv":"P-256",…}}
```

The new key was made in a script and sent with the owner's session; it was in a file of mode 600
in the session's scratch directory for the one call and then deleted. The Ed25519 key is gone:
`secret.put` replaced it.

Tests: 19 of 19 in headless Chromium and 19 of 19 with `lope-tests.ts` (18 before;
`test_issues_resign_signs_the_record_with_the_key_held` is new).

## Not tried

- The tests in Chrome 128. `brain.ts page up` is not run until the put-back is redesigned.
- Writes between `secret.put` and `apply` (about 13 s): an isolate started then would have failed
  to import the P-256 key as Ed25519. No write was made in that time by this session.
- Anyone holding the old public key can no longer check the record. Nothing did.
