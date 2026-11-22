# python3 table.py: per-mechanism table from out/progs-{ctl,noB,B,main}.txt and out/ablate-N0-noB.txt
import re,collections
def parse(f):
    acc={};sil=set()
    for l in open(f):
        m=re.match(r'^== (\S+) \[(\S+)\]: (\w+)',l)
        if m: acc[m.group(1)]=(m.group(2),m.group(3)=='ACCEPT')
        m=re.match(r'^SILENT (\S+)',l)
        if m: sil.add(m.group(1))
    return acc,sil
ctl,ctls=parse('out/progs-ctl.txt'); nb,nbs=parse('out/progs-noB.txt'); b,bs=parse('out/progs-B.txt'); mn,mns=parse('out/progs-main.txt'); ab,abs_=parse('out/ablate-N0-noB.txt')
T=collections.OrderedDict()
for k,(mech,ok) in nb.items():
    t=T.setdefault(mech,[0]*8)
    t[0]+=1; t[1]+=ok; t[2]+= k in ctls; t[3]+= ok and k in ctls; t[4]+= k in nbs; t[5]+= k in bs; t[6]+= mn[k][1]; t[7]+= k in mns
print("| group | programs | accepted (strong) | fired in ctl | accepted and fired | silent, no B | silent, B | accepted (main) | silent (main) |")
print("|---|---|---|---|---|---|---|---|---|")
tot=[0]*8
for m,t in T.items():
    print("| "+m+" | "+" | ".join(map(str,t))+" |"); tot=[a+c for a,c in zip(tot,t)]
print("| total | "+" | ".join(map(str,tot))+" |")
print("\nno channel (accepted, did not fire in ctl):", ", ".join(k for k,(m,ok) in nb.items() if ok and k not in ctls))
print("\nsilent with B:", ", ".join(sorted(bs)))
print("\nsilent without B only:", ", ".join(sorted(nbs-bs)))
print("\nsilent without B that SS_N=0 repairs:", ", ".join(sorted(k for k in nbs if k in ab and k not in abs_)))
print("\nsilent without B that SS_N=0 does not repair:", len([k for k in nbs if k in abs_]))
