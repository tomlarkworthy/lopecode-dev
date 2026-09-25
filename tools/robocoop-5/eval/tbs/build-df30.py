# df30 = df29 + the path's second kind must be EXECUTED evidence (crossing / metamorphic / library), never proof or literature.
# Walk ac turn 10 (2026-09-07): `PATH EVIDENCE KINDS: reference ×1, nullcheck ×1, proof ×2` satisfied the core rule on a
# two-cell pipeline flagging 80 of 100 targets — the two proofs were sentences naming a paper.
src, dst = "robocoop-5-eval-bigcap-df29.html", "robocoop-5-eval-bigcap-df30.html"
s = open(src, encoding="utf8").read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:70])
    s = s.replace(old, new)
rep("if (!KINDS.some(k => k !== 'reference' && k !== 'null' && pathKinds[k]))\n        pathMissing.push('every attestation on the deliverable\\'s path is a synthetic reference — add one crossing, metamorphic, library, proof or literature attestation to any upstream cell');",
    "if (!KINDS.some(k => k !== 'reference' && k !== 'null' && k !== 'proof' && k !== 'literature' && pathKinds[k]))\n        pathMissing.push('no EXECUTED second kind on the deliverable\\'s path — add one crossing, metamorphic or library attestation to any upstream cell (a proof or literature attestation is a sentence: it weighs, it does not count as a second derivation; df30)');")
open(dst, "w", encoding="utf8").write(s)
print(dst, len(s))
