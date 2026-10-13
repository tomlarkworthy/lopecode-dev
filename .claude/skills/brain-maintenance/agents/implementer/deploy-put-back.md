<!-- A page of `agents/implementer.md`: a deploy the deployer put back on a failed test.
Read it when your issue is `fix-tests-WORKER-HASH8`, or your own deploy was put back.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
## When a deploy is put back on a test

The deployer runs the Worker's tests in a browser of the cluster after the deploy and puts the
version back when one fails. Since 2026-10-11 it also opens an issue `fix-tests-WORKER-HASH8` whose
body is JSON: both hashes, the run's address (`run`), the browser (`browser`), each failed test
with its message and stack. Read it before anything else.

That browser is not yours: HeadlessChrome 128 there, Chrome 151 in a QA tab on 2026-10-11, when a
test of `brain-container` passed in the second and failed in the first (`records/put-back-opens-an-issue.md`).
So: open the `run` address in a QA tab. When the test passes there, do not call it timing. Ask the
cluster's browser the one thing you suspect, with a token for `browser.extend browser.run`:
`browser.run { url, expression }` gives the expression's value from a page there (60 s is $0.0015).

A landing whose apply was put back makes no backup of the notebook in `lopebooks`, and one it finds there
unpushed is undone with `notebook-backup.sh --take-back` (the page `landing`, step 10; since
`backup-committed-before-apply-answers`, 2026-10-13).

