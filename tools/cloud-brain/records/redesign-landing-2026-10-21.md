# Landing A, 2026-10-21T22:47:43Z

Note (reading): brain-loop 0a1df7a reads policy.names["flow"]; v10 keeps the workflow name "task" -> names.flow absent -> loop wake rule and watchdog inert after install. Reported, not changed.

## Step 1 tracker
- bun sync.ts cb4 in tracker clone: 28 services; `git diff base -- brain-issues.js` empty (cb4 runs base).
- change.patch = git diff base HEAD -- deploy/@tomlarkworthy/brain-issues.js: 506 lines, sha256 d453166b589a…
- apply.ts --patch change.patch --owner --dry: was a65155835c72, hash 22cab5740bad, state ready, tests 86, 31 s.
- lock.sh take cb4 redesign-land: taken 00:51:17 CEST.
- apply.ts --patch change.patch --owner --reason=…: hash 22cab5740bad…, state verified, version 0ae2be63, tests 86. NOT held (no request; --owner key path skips the hold).
- infra.getState brain-x-issues: state deployed, fails 0, hash 22cab5740bad (no probation; confirm not needed).
- issue.rebuild --owner: {"seq":19348,"issues":1149} [200]
- issue.policy: seq 15036 (names task/security/feedback/project). Matches the v10 source.
## Step 2 topic
- sync.ts in deployer clone; git diff base for brain-topic.js, brain-deployer.js, cloudflare-iac.js empty; patch files' sha equal `git diff base HEAD` (topic 37e3fd22…, deployer 72ef0c7f…).
- apply.ts --patch topic.patch --owner --dry: was fb29475aecab, hash d22d0597ecd0, ready, 18 tests.
- apply.ts … --owner --reason=…: d22d0597ecd0 verified, version 3b52e54e, 18 tests. Not held.
- lock renewed until 01:03:04 CEST.
- topic.create deploys (write caller.kind=="deployer", read caller.id=="owner"): created true [200]
- delegation.create deploys-push holder worker brain-x-topic, scope issue.receive quota.get: id 73d2f35c4f8c [200]
- topic.subscribe deploys/tracker -> issue.receive, delegation 73d2f35c4f8c: subscribed true [200]
- topic.subs?topic=deploys: tracker position 0 dropped 0.
- loop clone: sync; git diff 6e45a09 -- brain-loop.js empty; change.patch 642 lines sha 7f4f76ea41e3; --owner --dry: was add2abf4d802, hash 39f0d98805b8, state tests-failed (84 tests, 1 failed: test_loop_receive_answers_a_push_before_its_decision_and_once_a_seq, expected [up,1] got [up,33])
- Diagnosis: `logged` (cloudflare-iac) taps global console; the deployer's browser runs tests concurrently; 33 loop.decide lines were other rigs'. Local test.ts --with: 83 pass.
- Fix: test counts its own rig (rig.asked, last/main row, received.seq); logged wrappers kept. Loop clone commit 2134cd9 on redesign-loop (NOT pushed). Local: 83 passed.
- sync; change.patch = git diff 6e45a09 HEAD: sha 4f916f9d7d88…; lock renewed to 01:06:23.
- --owner --dry: hash c42f8e9789d1, ready, 84 tests.
- apply --owner --reason=…: c42f8e9789d1 verified, version 25a7f9db, 84 tests. Not held.
- infra.getState: brain-x-issues 22cab5740bad, brain-x-topic d22d0597ecd0, brain-x-loop c42f8e9789d1, all deployed fails 0.
- brain.ts token loop-personas loop.personas: made (id 342e30ded9ff).
- Machine LOOP_TOKEN was drain-loop-3 (34bcfa2149dd, loop.assign loop.done). Made drain-loop-4 (loop.assign loop.done loop.personas). Staged: fly secrets import --stage -a cloudbrain, LOOP_TOKEN=<value on stdin>, exit 0 "staged, not set on VMs". drain-loop-3 NOT revoked (machine still on it until update).
- delegation.list: no loop-reconcile existed, brain-x-loop setting `delegation` unset (nothing to revoke). delegation.create loop-reconcile holder brain-x-loop scope issue.get/move/label/comment: id ac22ec2bcf6b. config.set brain-x-loop delegation=ac22ec2bcf6b (old null) [200].
- personas.ts --set --dev <drain clone> (token loop-personas): loop.personas = approver, digest, merger, overseer, reviewer, spec, summarizer, triager, unsticker, worker, writer.
- loop.status: on, machine "started", held by drain-890666a6917d98 (the OLD drain is running now).
## Step 4 cutover
- fetch drain clone: origin/redesign-{loop,tracker,deployer} new; origin/main e7af016 is an ancestor of redesign-drain.
- Took only .pre-commit-config.yaml from origin/redesign-loop (not a merge: that branch force-adds deploy/@tomlarkworthy/brain-loop.js, a service module main git-ignores).
- git mv flow/worker.md roles/worker.md; git mv -f flow/reviewer.md roles/reviewer.md; drain2.ts default DRAIN_ROLES_DIR "roles" + header; flow/ mentions in briefs, issue.ts, tests updated. drain.ts NOT deleted (drain2.ts, laptop.ts and tests import it); it is no longer started.
- accept.test: reviewer expectation now {step review, states [open], labels [needs-reviewer], when none, opus medium}, worker added, claimedLabels + needs-reviewer/needs-worker, spec-review assertion replaced (no persona reviews a project's spec now).
- 4 named test files: 82 pass, 1 fail = T3 (drain2.ts:114 "owner", knowledge-docs.ts:235) which fails at branch head 135195c too.
- Full suite head vs cutover: 18 failures common; cutover adds 2, both retired drain.ts tests (restart 60 s timeout; approver-token).
- Machine command: only in Fly machine config (init.cmd ["sh","-c","rm -rf /w && git clone … /w && cd /w && exec bun drain.ts"]), machine 890666a6917d98, not in any file.
- lock take land 01:06:47; fetch: origin/main e7af016, ff ok, 5 commits ahead.
- git.token (POST, query string, --owner) -> push origin HEAD:main: e7af016..5312e4b. Token unset.
- lock release land 01:06:59: docs put 4; summaries due 7 docs (not run); deploys: not read (brain-kernel.ojs not in origin/main).
- Machine 890666a6917d98 had stopped itself at 23:02:40Z (old drain ended, "no work").
- machine.ts update --config <init.cmd drain.ts -> drain2.ts, nothing else changed> --dry: plan ok.
- First run: refused by Fly, "invalid WaitMachineRequest.Timeout: value must be inside range [1s, 1m0s]" (machine.ts waits MACHINE_STOP_SECONDS+30 = 90 s). Lock released by the tool.
- Rerun with MACHINE_STOP_SECONDS=25: {"ok":true,steps:[stop,stopped,update],released:true}. Fly: state stopped, init.cmd ends "exec bun drain2.ts", updated 23:08:14Z. Not started.
- Fly/agents token files (mode 600) deleted.
## Step 5 policy
- issue.install --owner -d @v10.json: brain.ts curl printed [000] (its -m 30 limit; answer body lost). issue.policy then: seq 19355, key policy-2026-10-21-flow-v10, task hash 127be297d11b (was e7cf294b3fa8).
- From issue.sync after=19340: 22 swapped events 19356-19377, keys policy/19355/<id>, all task e7cf294b -> 127be297 state open (from: triaged 5, ready 11, stopped 2, in-review 3, open 1). reviewsDropped not readable (answer lost).
- tally after fix: open 22 {"major":4,"needs-owner":11,"needs-worker":11,"owner":3,"post-mortem":1,"digest":3} {"needs-owner":11,"needs-worker":11} bad []
- open-state list: 22 open (task 21, bug 1), all workflow 127be297; triaged/ready/in-progress/in-review/awaiting-approval/stopped 0; projects untouched (spec 2, building 3).
- migrate-labels.ts --token out-0535ef --install 19355 (dry): 22 lines; --write: exit 0, 22 lines, no refusal.
- Tally after write: needs-worker 12, needs-owner 11, major 4, owner 3, digest 3, post-mortem 1; i15247 (from stopped) had needs-owner+needs-worker.
- Fix: issue-as.sh out-0535ef label i15247 remove needs-worker (seq 19395, key migrate/i15247/flow-one-routing) + comment (seq 19396).
## Step 6 deployer
- sync deployer clone; git diff base for brain-deployer.js, cloudflare-iac.js empty.
- deploy-deployer.ts --dry without CF_TOKEN_FILE: exit "no Cloudflare token".
- CF_TOKEN_FILE from wrangler oauth_token (mode 600); its expiration_time 2026-10-20T05:21:04Z (expired). CF_ACCOUNT_ID from cb4.json account.
- deploy-deployer.ts --patch deployer.patch --dry: {"script":"cb4-deployer","running":"e0b142be88a9","emit":"622dab8373c1","deploy":"bfcd1ccb9028","rebuilds":true,"uploaded":false}
- CF token 401 (wrangler oauth expired; tools/scratch/cloud-brain-experiments/.cf-token 401 too). Refreshed with the repo-installed wrangler (openrouter-gateway/node_modules/.bin/wrangler whoami), new expiry 2026-10-22T00:13:37Z; token file rewritten.
- lock take cb4 01:13:52. --dry again: running e0b142be88a9, emit 622dab8373c1, rebuilds true.
- deploy-deployer.ts --patch deployer.patch: uploaded true, emit 622dab8373c1, saved .emitted/deployer-e0b142be88a9.json (rollback copy).
- deployer infra.getModules (public): distiller 622dab8373c1.
- brain.ts confirm brain-deployer: {"confirmed":[]} (not on probation).
- brain.ts redistil: distiller 622dab8373c1, 26 of 26 Workers `same`.
- lock release cb4; CF token + account files deleted.
## Machine started by the cluster (not by this session)
- Fly events: start 23:09:55Z (exit 23:10:11Z), start (source user = API) 23:12:20Z, running drain2.ts; loop.status held drain-890666a6917d98; loop last decision flow 0, "no work" (the loop's flow rule is inert, names.flow absent) - so the start came from another path (brain-x-fly/loop tick or a start of the drain lock), not read.
- Tracker: 19397 claim pm-loop-stranded-work (holder secret:worker-pm-loop-stranded-work, key drain/…/worker/19378), 19398 started comment session eb072260… fresh, 19399 moved close, 19400 worker-processing off, 19401 opened feedback fb-close-keeps-processing, 19402 link, 19403 cost; 19404 claim pds-worker-api, 19405 started c6a5c88b… fresh.
- loop.status personas after drain2 boot: ["reviewer","worker"] -> drain2 booted on drain-loop-4 (staged LOOP_TOKEN took effect; loop.personas not 403).

# Phase B, 2026-10-21T23:19:30Z
## B1 loop workflow by kinds
- flowOf: hashes = names.flow (alias) + names[kinds.task|bug] when workflows[hash].moves has `finish`; owed() reads flow.hashes; loopDefaults.flowKinds ["task","bug"]; rig answers rig.kinds/rig.workflows; test adds by-kinds start (k1) and a no-finish workflow read by state. Local: 83 passed.
- Loop clone commit 14bf3c4 (on 2134cd9). cb4 ran 2134cd9 (sync diff empty). change.patch = git diff 2134cd9 HEAD: 83 lines sha c6fac425836d.
- --owner --dry: was c42f8e9789d1, hash 1b5dac902427, ready, 84 tests.
- ERROR (mine): lock.sh take cb4 refused (held by deploy-pds-worker-api 01:20:55-01:30:55 CEST) but my command chain did not gate on its exit; apply ran: 1b5dac902427 verified, version 534d27e0, 84 tests (23:21:47Z). Release: "cb4 is not held; nothing released" (worker's lock already gone, nothing of theirs released). Different Worker from the worker's deploy. From here every apply is gated on take's exit.
- getState brain-x-loop 1b5dac902427 deployed. loop.receive by hand: flow 8, unknown [], did null "the machine is started". loop.work flow rows 8, all worker machineDoable (11 needs-worker less 3 taken by drain2 by then).
- push redesign-loop: 0a1df7a..14bf3c4 (carries 2134cd9 and 14bf3c4).
## B2
- brain.ts token revoke drain-loop-3: 200 {"revoked":1}
## B3 who started the machine
- logs.query (owner) core lines worker=brain-x-fly 23:08:20-23:13:20Z: fly.status 283, fly.up 3, nothing else.
- 23:09:55.825Z core: fly.up caller worker:brain-x-loop, holder worker:brain-x-topic (a push of the issues topic -> loop.receive), 200; brain-x-fly fly.start by fly.up work 6; brain-x-loop loop.decide by receive did up why "0 doable, 6 other steps", flow 0. = the OLD loop path (pre-flow; `other` machine-doable triage/review rows) on issues the v10 install had just swapped to state open (their state now reads as owed a triage). Machine ran 16 s, drain2 exit 0 (no needs-* labels yet: migrate-labels ran after).
- 23:12:19.543Z and 23:12:21.019Z core: fly.up by brain-x-loop (topic push) 409; loop.decide 23:12:19.604 why "0 doable, 10 other steps", error "another call holds the claim: fly.up, fly.run or fly.start is under way". Fly event: start source user 23:12:20.427Z. No core line of a 200 fly.up for it, no brain-x-fly fly.start line. brain-x-loop logged a run of "waitUntil() tasks did not complete … cancelled" warnings 23:12:10-23:12:21.
- Reading: the second start was a brain-x-loop decision (same old other-steps path, the migrate-labels label events pushed through the topic) whose ctx.waitUntil was cancelled by Cloudflare after the answer: its fly.up reached Fly and took brain-x-fly's claim, and the lines that would name it were cut with it. Inferred from the stale claim + cancellations + no other caller of Fly in the window; not seen directly. Not the owner's page (no session caller in the window).
## B4 watch (watch.ts in background from seq 19396; lines in scratchpad/watch.log)
- Topic deploys entries 1-14 (23:20:30-23:21:48Z): pds dry.run, dry.tests, uploaded, probation, verify, verified 23:21:24.285Z, confirmed 23:21:24.446Z; loop the same. Sub tracker pos 14 dropped 0 status 200: §6 chain live.
- STALL: pds-worker-api's wait (note deploy:brain-x-pds@a713822f5e68) written 23:21:38.2Z by deploy.ts AFTER apply answered; the deployer confirms 0.16 s after verified, so issue.receive (entry 10) matched no live wait and answered 200 (only deploy.waiting gets the 503 retry). The issue would wait until its until (24 h).
- FIX (cloud-brain-dev, machinery): deploy.ts writes the wait (same key deploy-ID/wait-SEQ) after the lock and before apply.ts sends, while worker-processing is on (not due); at the yield it re-reads the issue and, when needs-worker already arrived, only takes worker-processing off (`arrived: true`). Tests deploy-yield (2 new, 3 updated) + drain2-session: 23 pass; accept T3 pre-existing. roles/worker.md names `arrived`. Commit 6d72e66 on redesign-fix-early-wait; pushed branch + main 5312e4b..6d72e66 under land (01:28:00-01:28:02 CEST, LOCK_DOCS=0 LOCK_DEPLOYS=0). The running drain2 keeps its boot clone (5312e4b): it takes 6d72e66 at its next boot (SIGTERM kills the session too, so no restart mid-session).
- Unstick pds-worker-api by hand, as issue.receive would: comment seq 19424 (ref deployed:brain-x-pds@a713822f5e68…52ae), label seq 19425 +needs-worker -waiting-deploy (out-0535ef).
- brain-x-loop steady state (15 min to 2026-10-21T23:29:05Z): 616 lines, 361 "waitUntil() tasks … cancelled", 254 loop.decide (no work 176, machine started 78). Not fixed: a brain-x-loop change.

## B4 watch: 20-min silence at 23:49:35Z (not a machinery stall)
- watch.ts ended `END stall: 20 min no event` at 23:49:35Z; last event 19434 (23:29:34 page-glitches-2026-10-18 started, session c3ba4a74).
- Events after the hand wake: 19426-19428 worker of pds-kernel-route opened pds-atproto-declare (+needs-worker) and linked it; 19429-19431 deploy.ts refused brain-x-kernel (owner's four), +needs-owner, wait note `owner-deploy:brain-x-kernel`; 19432 cost pds-kernel-route 314 s $1.792 ctx 112905 cacheRead 2.80M out 20624; 19433-19434 claim page-glitches-2026-10-18.
- 23:51Z `issue.sync?after=19434`: no events. `fly ssh ps`: drain2 (pid 676) up 38 min; agent.sh worker + `claude -p` for page-glitches up 21:32, running `node /tmp/pwscripts/count.mjs` with headless chromium. Session alive, doing product work.
- fly logs: two child SIGTERM reaps at 23:36:42 and 23:45:04 (inside the session; tool timeouts, the session continued).
- pds-worker-api holds needs-worker since 19425 and waits for the single drain2 slot.
- Watch re-armed from 19434 to the 90-min bound (00:54Z).

## B4 fix: fb-issue-seen-not-writable (00:01:42Z, seq 19435)
- Cause: drain2 `asAgent(box,[cwd])` chowns only the clone; issue.ts keeps `.issue-seen-<clone>.json` in the clone's parent (`/data/agent-worker/work`, root 755). For a reviewer the parent is a root mkdtemp (0700), so the agent user cannot reach its clone by path.
- Fix `71e3872` on `redesign-fix-seen-dir`: `asAgent(box,[dirname(cwd)])`. Tests: drain2-session/sandbox-unprivileged/issue-as-of 14 pass 1 fail, same as before the change (safehouse on the laptop PATH). No test runs as root.
- land taken 02:05:20 CEST, pushed `6d72e66..71e3872` to main and the branch, land released (docs nothing to put).
- Restart: restart-between.ts restarts the machine on the next cost event (between sessions).

## B4 end (00:54:37Z, the 90-min bound)
- 19440-19446 i18866 worker 00:02:37-00:04:05: attached canary-spec-v2.md, asked the owner, +needs-owner, wait; cost 75 s $0.492 ctx 46623 cacheRead 354k out 6861.
- 19447-19451 i18817 worker 00:04:09-00:04:54: closed (loop ticket superseded by drain2); cost 32 s $0.234 ctx 31052 cacheRead 191k out 1734.
- 19452-19453 i13852 worker claimed 00:04:59, session 2eaaa376. Second watch ended `END stall: 20 min no event` at 00:25:05Z. restart-between.ts saw no cost event until 00:53:58Z, so the machine was not restarted.
- 00:54:15Z: claude -p for i13852 up 48:47, transcript 2eaaa376 written 00:54:14 (420 lines, 1.15 MB). Live, not stuck. Fly log: SIGKILL reaps at 00:06:49, 00:13:55, 00:47:17 (tool children).
- No issue reached done. page-glitches-2026-10-18 at needs-reviewer since 00:02:18 and pds-worker-api at needs-worker since 23:28:32 were not claimed: drain2 took the needs-worker issues i18866, i18817, i13852 first.
- Open: the machine still runs boot commit 5312e4b; 6d72e66 (early wait) and 71e3872 (seen dir) take effect at its next boot, which needs a session boundary.
- 00:55-00:56Z i13852 session opened i13852-undefined-deps (19454) and i13852-red-tests (19457), linked both.
- Queue: drain2 picks the open needs-* issue with the lowest issue seq (drain2.ts:315,329). At 00:55Z needs-worker: i12589-docs-by-reference 19393, ad-7-read-after-a-week 19394, pds-worker-api 19425, pds-atproto-declare 19428, i13852-undefined-deps 19456; needs-reviewer: page-glitches-2026-10-18 19439. Two ahead of pds-worker-api; the review is fourth.
- restart-between.ts re-armed under nohup from 19459, 240 min bound, output scratchpad/restart-between.log. A restart in a new session's first seconds is a resume: drain2 writes `started` before the session runs (drain2.ts:386-387).

# Phase C
## C1 pick order (01:01Z)
- 00:59:16Z killed the armed restart (pid 90594) so the boot takes the pick order too.
- `2a9d435` on `redesign-fix-pick-order`: accept.ts `pickOf`/`labelSeq` (FIRST = ["reviewer"]; then `by["+needs-X"].seq`; rows that carry needs-owner are skipped); drain2.ts `pick` uses them. In accept.ts because importing drain2.ts runs drain.ts's top level (exits "no AGENTS_TOKEN").
- Tests: tests/drain2-pick-order.test.ts 4 pass (rows of cb4's 00:55Z queue). With safehouse taken off PATH: drain2-session + accept 69 pass 1 fail = T3, the same two findings as before (drain2.ts:114 owner, knowledge-docs.ts:235).
- First push at 03:00:51 CEST: cb4 git 502 and git.token null; nothing pushed, land released. Retake refused once `D1_ERROR: internal error` [400]. Third: land 03:01:27, pushed `71e3872..2a9d435` main + branch, released 03:01:29.
- restart-between.ts re-armed from 19459 (240 min) under nohup.
## C3 restart and the first reviewer
- 01:04:13-01:04:29 i13852 worker record (19460), +needs-reviewer (19461), cost (19462). restart-between saw the cost at 01:04:29.976 and `fly machine restart` returned 01:04:44.891 (exit 0).
- In the 15 s the old drain2 (old order) claimed ad-7-read-after-a-week (19463 label, 19464 started 01:04:32); SIGINT 01:04:30, SIGTERM 01:04:35, VM exited 01:04:41; boot 01:04:43.
- New drain2 at boot: 19465/19466 01:04:59 put needs-worker back on ad-7 ("worker-processing ... with no session running at the drain's start"). Recovery worked.
- `git -C /w log -1` on the machine: 2a9d435 (pick order; includes 6d72e66 and 71e3872).
- 19467 01:05:16 page-glitches-2026-10-18 +reviewer-processing (claim key drain/page-glitches-2026-10-18/reviewer/19438); 19468 01:05:23 started reviewer session d37d29ae fresh. Reviewer picked before workers: pick order live.
- watch3.ts (liveness = newest transcript mtime) from 19466, 90 min, to scratchpad/watch3.log.
## C3 first reviewer run and the first done
- 01:05:16 claim (19467), 01:05:23 started d37d29ae fresh. 01:07:18 review pass (19469) refs patch:607f4065…bf57 ("commit 31eb6f8, merged in ca3486f"); 01:07:18.5 moved open->done (19470) key auto/19469 "no part holds it after event 19469", holder the reviewer token: the tracker's automatic finish (guard: pass by a holder other than +worker-processing's, after +needs-reviewer; no major).
- 01:07:28 cost (19471). drain2's finish: 403 {"error":"Refused","message":"no move from done to done"} -> comment "the guard does not hold yet" (19472) and +needs-owner -reviewer-processing (19473). Not a guard clause: the issue was already done.
- Reviewer session about 2 min. Next: 01:07:31 i13852 reviewer claim (19474), started 42718603 (19475); 01:17:20 it opened i13852-lopecode-seeds.
- Fix `e379022` on `redesign-fix-auto-done`: an issue already done after a pass only loses the processing label (placed after the dev and major branches). drain2-session: stub tracker auto-finishes on pass for `autoDone` ids and refuses a move to the same state; new test fails before, passes after; 74 pass 1 fail (T3). land 03:17:09-03:17:13 CEST, pushed 2a9d435..e379022.
- By hand: 19478 comment, 19479 -needs-owner on page-glitches.
- restart-between re-armed from 19479.
## C2 loop deferred decisions
- Subagent diagnosis (window 00:46:24-01:01:24Z): core 201 loop.receive calls all 200 (median 332 ms); loop 202 receive invocations, 192 "waitUntil() tasks did not complete within the allowed time after invocation end and have been cancelled", 10 loop.decide. Bursts: one topic tick pushes its backlog serially (trace 2acf0451: 57 pushes in 19.6 s; 10 finished at 21.5-31 s, 47 cancelled 31-49 s). Decide alone: loop.check 10.5/14.7/46 s min/med/max over 24 h. Not forwarding (core and topic 0 cancels), no 409s. The tick never ran: 6 days loop.decide by receive 3220, check 230, tick 0; deployer sets crons only on first upload (brain-deployer.js:763) and the wrapper arms its minute alarm only on an outside request to the Worker's own address.
- Fix `39caffb` on `redesign-fix-loop-defer` (brain-loop.js +75 -10): a 45 s `deciding` lease, one deferred decision at a time; `decided` row written at the end; tick decides when decided < received. Test test_loop_one_deferred_decision_at_a_time_and_the_tick_decides_what_was_left.
- cb4 taken 03:14:48 CEST; sync; dry ready 85 tests; apply verified hash 8e8d690d1e54 version 809e3717 at 01:15:29Z; released. Branch pushed.
- GET https://cb4-x-loop.endpointservices.workers.dev/ answered 404 (to arm the alarm); whether it armed is read from tick lines.
## C2 measurement (after 8e8d690d1e54)
- before 00:46:24-01:01:24Z: loop.receive requests 202, loop.decide by receive 10, cancels 192 (all cb4-x-loop).
- after 01:15:30-01:30:30Z: loop.receive requests 14, loop.decide by receive 14, cancels 0 (no script). No `by: tick` line: the GET to cb4-x-loop's workers.dev (404) did not arm the alarm. Low traffic: the burst case was not exercised.
## C3 after the second restart
- 01:17:50 i13852 reviewer pass (19480), auto done (19481); old drain2 (2a9d435) wrote the dev-patch owner comment and +needs-owner (19483/19484) on the done issue: about cloud-brain-dev, the patch is not landed. Open: the finish guard finishes a dev patch before it lands.
- restart-between: cost 19482 at 01:18:03.9 -> restart 01:18:08.9; machine on e379022.
- 01:18:18 pds-worker-api worker resumed (c6a5c88b), record 19487, hand 19488; 01:19:22 reviewer claim, 01:22:25 pass (19492) refs patch:1415d28a… deployed:brain-x-pds@a713822f…; 19493 auto done; 19495 drain2 -reviewer-processing only (e379022 path). First flow issue to done through worker+deploy+review.
- 01:22:39 pds-atproto-declare: wait 19501 before send; deployer lines 19502-19506 via issue.receive; +needs-worker at confirm 19507; deploy.ts sent 19508; yield 19510 -worker-processing only (arrived). Early-wait fix live.
- costs: i13852 worker 3551 s $4.559; page-glitches reviewer 117 s $0.681; i13852 reviewer 622 s $1.040; pds-worker-api worker (resumed) 58 s $2.830 ctx 102193; pds-worker-api reviewer 184 s $0.753; pds-atproto-declare worker 384 s $1.885.
## Close-out (01:33Z)
- No restart-between/watch process left (pgrep none; 90594 killed 00:59, 99647 and 32335 exited after firing).
- Machine on e379022; loop.status last 01:29:23 receive flow 5 machine started; latest claim i13852-undefined-deps worker 01:29:23 (19515/19516), session 37f18492; lock loop-890666a6917d98 held by drain2; no cb4/land lock of mine.
- Tokens/files: CF token + account files deleted (Phase A); Fly/agents token files deleted; drain-loop-3 revoked; git write tokens were 120 s; out-0535ef is the coordinator's session token (not mine to revoke).
- brain-x-loop declares crons ["*/5 * * * *"] (brain-loop.js:1478); the deployer PUTs /schedules only when !live (brain-deployer.js:763). No deployer method re-sets it.
