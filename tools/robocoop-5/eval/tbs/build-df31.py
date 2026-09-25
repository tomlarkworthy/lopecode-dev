# df31 = df30 + a template-literal /local-disk path whose STATIC PREFIX (up to the first hole) sits under a seed root is
# the task's data. Walk ad turn 5 (2026-09-23): `loadTargets` reads `/local-disk/root/data/target_${i}.csv` and df29
# demoted it ("a /local-disk path built at run time"), blocking the deliverable on the data loader itself.
src, dst = "robocoop-5-eval-bigcap-df30.html", "robocoop-5-eval-bigcap-df31.html"
s = open(src, encoding="utf8").read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:70])
    s = s.replace(old, new)
rep("const bad = paths.filter(p => p.unknown || !underRoot(p.path, roots));",
    "const prefixUnderRoot = path => { const i = path.indexOf('${'); const pre = i < 0 ? path : path.slice(0, i); return roots.some(r => pre === r || pre.indexOf(r + '/') === 0); };\n"
    "    const bad = paths.filter(p => p.unknown ? !prefixUnderRoot(p.path) : !underRoot(p.path, roots));")
open(dst, "w", encoding="utf8").write(s)
print(dst, len(s))
