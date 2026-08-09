# Marks inside one case share a frame, a pose and a lighting condition, so they
# are not independent draws. Resample CASES, not marks.
import json, random, statistics as st
from collections import defaultdict

rows = json.load(open("scratch/rmbt/votepick-heldout.json"))
by_case = defaultdict(list)
for r in rows:
    by_case[r["k"].rsplit("/", 1)[0]].append(r["vote"] - r["base"])
cases = list(by_case)
print(f"{len(rows)} marks across {len(cases)} cases")

net = sum(sum(v) for v in by_case.values())
mean_delta = net / len(rows)
print(f"net {net:+.2f}px, mean delta {mean_delta:+.4f}px/mark")

case_net = {c: sum(v) for c, v in by_case.items()}
better = [c for c, v in case_net.items() if v < -1e-9]
worse  = [c for c, v in case_net.items() if v >  1e-9]
same   = len(cases) - len(better) - len(worse)
print(f"cases: {len(better)} better, {len(worse)} worse, {same} unchanged")
print(f"  worst regressions: {sorted(case_net.items(), key=lambda x:-x[1])[:4]}")
print(f"  best improvements: {sorted(case_net.items(), key=lambda x:x[1])[:4]}")

random.seed(12345)
boots = []
for _ in range(20000):
    samp = [random.choice(cases) for _ in cases]
    tot = sum(case_net[c] for c in samp)
    n   = sum(len(by_case[c]) for c in samp)
    boots.append(tot / n)
boots.sort()
lo, hi = boots[int(.025*len(boots))], boots[int(.975*len(boots))]
p_side = sum(1 for b in boots if b >= 0) / len(boots)
print(f"\nclustered bootstrap (20k, resampling cases):")
print(f"  mean delta {mean_delta:+.4f} px/mark   95% CI [{lo:+.4f}, {hi:+.4f}]")
print(f"  P(delta >= 0) = {p_side:.4f}   -> two-sided p ~ {min(1,2*p_side):.4f}")

# Is it driven by a handful of cases? Drop the single most influential case.
worst_case = max(case_net, key=lambda c: abs(case_net[c]))
rest = [c for c in cases if c != worst_case]
net2 = sum(case_net[c] for c in rest); n2 = sum(len(by_case[c]) for c in rest)
print(f"\nleave out the most influential case ({worst_case}, {case_net[worst_case]:+.1f}px):")
print(f"  net {net2:+.2f}px over {n2} marks -> {net2/n2:+.4f} px/mark")
