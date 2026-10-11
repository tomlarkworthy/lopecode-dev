# A put-back for failed tests opens an issue

Written 2026-10-11 09:12 CEST. Deployed on cb4 the same morning.

## Why

At 08:23 to 08:37 on 2026-10-11 the deployer put `brain-x-container` back three times on one test and
`brain-x-snapshot` twice. Each time it kept one line: the test's name and the error's message. Nothing
was filed, and the orchestrating session wrote both off as "timing failures in the cluster's browser".
For the container that was wrong. Tom: "it was trivial for you to figure that out, why didn;t we do
that automatically?", then: "its enough that test-failed rollbacks open a fix tests issue
automatically filed by the deployer, it probably doesn;t need a lot of flavour text, jsut all the
metadata so a ticket reader can find the context itself."

## The container's cause

Read in the deployer's browser with `browser.run` (60 s bought, $0.0015):

```
ua: Chrome/128   hasDuplex: false
copyGet: ok
copyWithBody: Failed to construct 'Request': The `duplex` member must be specified for a request with a streaming body
```

`brain-container.ojs` copied the caller's request with `new Request("http://box" + path, r)`. With a
body that throws in Chrome 128. The service takes a throw as nothing listening, tries for
`listenGrace` (15 s) and answers 502, so the test's POST recorded nothing and the next line read
`seen[1].method` of undefined: the put-back's message. A local tab is Chrome 151, which has
`Request.prototype.duplex`; 8 of 8 passed there, also on the deployer's own run address.
Dead end: deleting the property in the local tab made the same construction throw, but the test then
failed at a later line, so it showed the kind of fault and not this one. The probe in the cluster did.

Fix: `new Request(url, { method, headers, ...(body ? { body, duplex: "half" } : {}) })`.
Deployed 09:09: `brain-x-container f91ec2ab9060 verified, 8 tests`, in that Chrome 128.
The snapshot's test was already fixed in its seed by another session (`await redrawn`) and deployed as a20b957dc536.

## What was built

- `brain-deployer`: after `deploy.failed`, one `issue.open` through the core. Kind `bug`, id
  `fix-tests-WORKER-HASH8`, key `deployer/tests/WORKER/HASH` (the same version applied again writes
  nothing new). The body is JSON and nothing else. `deploy.issue.none` is logged when the tracker
  refuses; the put-back does not wait on it.
- `brain-issues`: `caller.kind` `deployer` may call the tracker's methods.
- `brain-shell` (`verifyModule`): the verdict has `agent` and a `stack` (600 characters) for each failed test.

## Seen on cb4, 09:10 to 09:11

A scratch Worker `brain-x-verifycheck` was deployed, then a version whose test throws. The deployer
opened `fix-tests-brain-x-verifycheck-319604f7` (opener `deployer`):

```
"putBackTo": "e01a425102e0…", "state": "put-back", "at": "2026-10-11T07:11:04.635Z",
"run": "https://cb4.endpointservices.workers.dev/#view=C100(S100(@tomlarkworthy/brain-verifycheck,@tomlarkworthy/brain-shell))&verify=brain-x-verifycheck",
"browser": "Mozilla/5.0 (X11; Linux x86_64) … HeadlessChrome/128.0.0.0 Safari/537.36",
"failed": [{ "name": "test_verifycheck", "message": "version 2 is broken on purpose",
  "stack": "Error: version 2 is broken on purpose\n    at _test_verifycheck (file://@tomlarkworthy/brain-verifycheck:7:80) …" }]
```

The issue was rejected as test data (event 382) and the Worker removed. `redistil`: 20 same.
Deployer 74e7e27c911d, `brain-x-issues` 83469aa9f545 (verified, 20 tests).

No browser before the deploy: brain-deployer 53 passed, brain-issues 12 passed and 8 need a browser,
brain-container 7 passed and 1 needs a browser, 0 failed.

## Not done

- No fresh review of this change (`/review-notebook`) has been run.
- A Worker left `failing` with nothing to go back to also gets an issue, by the same lines; only the put-back was seen on cb4.
- An issue is opened per failed hash. A flaky test that fails on five versions opens five.
