#!/usr/bin/env python3
from collections import Counter, defaultdict, deque
from fractions import Fraction
from itertools import permutations, product

O=3; E=tuple(range(O)); PS=tuple(permutations(E))

def opp(t): return tuple(t[b*3+a] for a in E for b in E)
def rel(t,p):
    out=[0]*9
    for a in E:
        for b in E: out[p[a]*3+p[b]]=p[t[a*3+b]]
    return tuple(out)
def canon(t): return min(rel(t,p) for p in PS)
def aut(t): return sum(rel(t,p)==t for p in PS)
def hist_l1(a,b):
    ca,cb=Counter(a),Counter(b)
    return Fraction(sum(abs(ca[k]-cb[k]) for k in set(ca)|set(cb)),6)

def i0(t):
    li=[];ri=[];lc=[];rc=[];lf=[];rf=[]
    for a in E:
        row=[t[a*3+x] for x in E]; col=[t[x*3+a] for x in E]
        li.append(len(set(row))); ri.append(len(set(col)))
        lc.append(sum(v*v for v in Counter(row).values())); rc.append(sum(v*v for v in Counter(col).values()))
        lf.append(sum(t[a*3+x]==x for x in E)); rf.append(sum(t[x*3+a]==x for x in E))
    ai,ac,af=hist_l1(li,ri),hist_l1(lc,rc),hist_l1(lf,rf)
    d=1 if ai else (2 if ac else (3 if af else 99)); A=max(ai,ac,af)
    controls=(sum(t[x*3+x]==x for x in E),tuple(sorted(Counter(t).values(),reverse=True)),
      sum(t[t[a*3+b]*3+c]==t[a*3+t[b*3+c]] for a,b,c in product(E,repeat=3)),
      sum(t[a*3+b]==t[b*3+a] for a,b in product(E,repeat=2)),aut(t),tuple(sorted(li+ri)))
    return (d,A,controls)

def invperm(p):
    q=[0]*3
    for i,x in enumerate(p): q[x]=i
    return tuple(q)
def conj_map(f,p):
    q=invperm(p); return tuple(p[f[q[x]]] for x in E)
def map_type(f): return min(conj_map(f,p) for p in PS)
def trans(t,side,a): return tuple(t[a*3+x] for x in E) if side=='L' else tuple(t[x*3+a] for x in E)
def i1_raw(t):
    L=tuple(sorted(map_type(trans(t,'L',a)) for a in E)); R=tuple(sorted(map_type(trans(t,'R',a)) for a in E))
    return tuple(sorted((L,R)))
def i1(t): return min(i1_raw(rel(x,p)) for x in (t,opp(t)) for p in PS)
def comp(f,g): return tuple(g[f[x]] for x in E)
def semigroup(gens):
    s=set(gens); q=deque(gens)
    while q:
        f=q.popleft()
        for g in tuple(s):
            for h in (comp(f,g),comp(g,f)):
                if h not in s: s.add(h); q.append(h)
    return s
def sg_sig(gens):
    s=semigroup(gens); ranks=[len(set(f)) for f in s]; maxfib=[max(Counter(f).values()) for f in s]
    return (len(s),tuple(sorted(ranks)),sum(comp(f,f)==f for f in s),tuple(sorted(ranks)),tuple(sorted(maxfib)),sum(len(set(f))==3 for f in s))
def i2_raw(t):
    L=sg_sig([trans(t,'L',a) for a in E]); R=sg_sig([trans(t,'R',a) for a in E])
    return tuple(sorted((L,R)))
def i2(t): return min(i2_raw(rel(x,p)) for x in (t,opp(t)) for p in PS)

def base_i2(t): return (i0(t),i1(t),i2(t))

def assoc_pairs(t):
    return [(t[t[a*3+b]*3+c],t[a*3+t[b*3+c]]) for a,b,c in product(E,repeat=3)]
def A1(t): return sum(u!=v for u,v in assoc_pairs(t))
def A2_raw(t):
    reps=[]
    pairs=assoc_pairs(t)
    for p in PS:
        reps.append(tuple(sorted(Counter((p[u],p[v]) for u,v in pairs).items())))
    return min(reps)
def A2(t): return min(A2_raw(t),A2_raw(opp(t)))

POS_PERMS=tuple(permutations(range(3)))
def orbit(tri): return tuple(sorted(set(tuple(tri[i] for i in q) for q in POS_PERMS)))
ORBITS=tuple(sorted({orbit(x) for x in product(E,repeat=3)}))
def A3_raw(t,p):
    pieces=[]
    for orb in ORBITS:
        vals=[]
        for a,b,c in orb:
            u=t[t[a*3+b]*3+c]; v=t[a*3+t[b*3+c]]; vals.append((p[u],p[v]))
        pieces.append(tuple(sorted(Counter(vals).items())))
    return tuple(sorted(pieces))
def A3_one(t): return min(A3_raw(t,p) for p in PS)
def A3(t): return min(A3_one(t),A3_one(opp(t)))
def A4_one(t):
    reps=[]
    for p in PS:
        vals=[]
        for a,b,c in product(E,repeat=3):
            u=t[t[a*3+b]*3+c]; v=t[a*3+t[b*3+c]]
            vals.append((p[a],p[b],p[c],p[u],p[v]))
        reps.append(tuple(sorted(vals)))
    return min(reps)
def A4(t): return min(A4_one(t),A4_one(opp(t)))

def shapes(n):
    if n==1:return (None,)
    out=[]
    for k in range(1,n):
        for l in shapes(k):
            for r in shapes(n-k):out.append((l,r))
    return tuple(out)
def label(s,i=0):
    if s is None:return i,i+1
    l,j=label(s[0],i); r,k=label(s[1],j); return (l,r),k
def mir(s):return None if s is None else (mir(s[1]),mir(s[0]))
def unl(tr):return None if isinstance(tr,int) else (unl(tr[0]),unl(tr[1]))
def evaltree(tr,xs,t):
    if isinstance(tr,int):return xs[tr]
    return t[evaltree(tr[0],xs,t)*3+evaltree(tr[1],xs,t)]
TREES={n:[label(s)[0] for s in shapes(n)] for n in (3,4,5)}
PAIRS={}
for n in (3,4,5):
    seen=set(); out=[]
    for tr in TREES[n]:
        mt=label(mir(unl(tr)))[0]; key=tuple(sorted((repr(tr),repr(mt))))
        if key not in seen:seen.add(key);out.append((tr,mt))
    PAIRS[n]=out
def coll(t,tr,n):
    c=[0,0,0]
    for xs in product(E,repeat=n):c[evaltree(tr,xs,t)]+=1
    d=3**n; return Fraction(sum(x*x for x in c),d*d)
def p1(t):return tuple(max((abs(coll(t,a,n)-coll(t,b,n)) for a,b in PAIRS[n]),default=Fraction()) for n in (3,4,5))
def word_map(t,side,w):
    f=(0,1,2)
    for a in w:f=comp(f,trans(t,side,a))
    return f
def p2(t):
    out=[]
    for h in (2,3,4):
        cl=Counter();cr=Counter();den=3**h
        for w in product(E,repeat=h):
            cl[len(set(word_map(t,'L',w)))]+=1;cr[len(set(word_map(t,'R',w)))]+=1
        d=[Fraction(cl[r]-cr[r],den) for r in (1,2,3)];out.append(Fraction(sum(abs(x) for x in d),2))
    return tuple(out)

reps={canon(t) for t in product(E,repeat=9)}
records=[]
for t in sorted(reps):
    if canon(opp(t))==t:continue
    records.append((t,base_i2(t),(A1(t),A2(t),A3(t),A4(t)),p1(t),p2(t)))
assert len(reps)==3330 and len(records)==3192
for t,base,a,y1,y2 in records:
    for p in PS:
        r=rel(t,p)
        assert a==(A1(r),A2(r),A3(r),A4(r))
    o=opp(t); assert a==(A1(o),A2(o),A3(o),A4(o)); assert y1==p1(o) and y2==p2(o)

def residual(level,which):
    buckets=defaultdict(list)
    for t,base,a,y1,y2 in records:
        key=(base,) if level==0 else (base,)+a[:level]
        y=y1 if which=='p1' else y2 if which=='p2' else (y1,y2)
        buckets[key].append(y)
    bad=[ys for ys in buckets.values() if len(set(ys))>1]
    return len(buckets),len(bad),max((len(x) for x in bad),default=0),sum(len(x) for x in bad)

names=['I2','I2+A1','I2+A1+A2','I2+A1+A2+A3','I2+A1+A2+A3+A4']
minimal=None
for level,name in enumerate(names):
    r1=residual(level,'p1');r2=residual(level,'p2');rj=residual(level,'joint')
    print(name,'P1',r1,'P2',r2,'JOINT',rj)
    if minimal is None and r1[1]==r2[1]==rj[1]==0:minimal=name
print('CONTROLS: PASS')
print('MINIMAL_SUFFICIENT_REFINEMENT:',minimal)
