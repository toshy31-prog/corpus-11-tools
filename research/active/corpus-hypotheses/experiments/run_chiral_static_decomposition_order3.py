from collections import Counter, defaultdict, deque
from fractions import Fraction
from itertools import permutations, product

O=3; E=tuple(range(O)); PS=tuple(permutations(E)); TH=Fraction(1,27)

def opp(t): return tuple(t[b*3+a] for a in E for b in E)
def rel(t,p):
    out=[0]*9
    for a in E:
      for b in E: out[p[a]*3+p[b]]=p[t[a*3+b]]
    return tuple(out)
def canon(t): return min(rel(t,p) for p in PS)
def aut(t): return sum(rel(t,p)==t for p in PS)
def hist_l1(a,b):
    ca,cb=Counter(a),Counter(b); return Fraction(sum(abs(ca[k]-cb[k]) for k in set(ca)|set(cb)),6)

def i0(t):
    li=[];ri=[];lc=[];rc=[];lf=[];rf=[]
    for a in E:
      row=[t[a*3+x] for x in E]; col=[t[x*3+a] for x in E]
      li.append(len(set(row))); ri.append(len(set(col)))
      lc.append(sum(v*v for v in Counter(row).values())); rc.append(sum(v*v for v in Counter(col).values()))
      lf.append(sum(t[a*3+x]==x for x in E)); rf.append(sum(t[x*3+a]==x for x in E))
    ai,ac,af=hist_l1(li,ri),hist_l1(lc,rc),hist_l1(lf,rf)
    d=1 if ai else (2 if ac else (3 if af else 99)); A=max(ai,ac,af)
    controls=(sum(t[x*3+x]==x for x in E), tuple(sorted(Counter(t).values(), reverse=True)),
      sum(t[t[a*3+b]*3+c]==t[a*3+t[b*3+c]] for a,b,c in product(E,repeat=3)),
      sum(t[a*3+b]==t[b*3+a] for a,b in product(E,repeat=2)), aut(t), tuple(sorted(li+ri)))
    return (d,A,controls)

def invperm(p):
    q=[0]*3
    for i,x in enumerate(p): q[x]=i
    return tuple(q)
def conj_map(f,p):
    q=invperm(p)
    return tuple(p[f[q[x]]] for x in E)
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
    s=semigroup(gens); ranks=[len(set(f)) for f in s]
    idem=sum(comp(f,f)==f for f in s); maxfib=[]
    for f in s: maxfib.append(max(Counter(f).values()))
    return (len(s),tuple(sorted(ranks)),idem,tuple(sorted(ranks)),tuple(sorted(maxfib)),sum(len(set(f))==3 for f in s))
def i2_raw(t):
    L=sg_sig([trans(t,'L',a) for a in E]); R=sg_sig([trans(t,'R',a) for a in E]); return tuple(sorted((L,R)))
def i2(t): return min(i2_raw(rel(x,p)) for x in (t,opp(t)) for p in PS)

def i3_raw(t):
    pairs=[]; hu=[0]*3; hv=[0]*3; eq=0; fib=Counter()
    for a,b,c in product(E,repeat=3):
      u=t[t[a*3+b]*3+c]; v=t[a*3+t[b*3+c]]
      hu[u]+=1; hv[v]+=1; eq += (u==v); pair=tuple(sorted((u,v))); pairs.append(pair); fib[pair]+=1
    return (tuple(sorted(pairs)), tuple(sorted((tuple(hu),tuple(hv)))), eq, tuple(sorted(fib.values())))
def i3(t): return min(i3_raw(rel(x,p)) for x in (t,opp(t)) for p in PS)

def shapes(n):
    if n==1: return (None,)
    out=[]
    for k in range(1,n):
      for l in shapes(k):
       for r in shapes(n-k): out.append((l,r))
    return tuple(out)
def label(s,i=0):
    if s is None:return i,i+1
    l,j=label(s[0],i); r,k=label(s[1],j); return (l,r),k
def evaltree(tr,xs,t):
    if isinstance(tr,int): return xs[tr]
    return t[evaltree(tr[0],xs,t)*3+evaltree(tr[1],xs,t)]
TREES={n:[label(s)[0] for s in shapes(n)] for n in (3,4,5)}

def term_raw(t,n):
    vals=[]
    for tr in TREES[n]: vals.append(tuple(evaltree(tr,xs,t) for xs in product(E,repeat=n)))
    return tuple(sorted(vals))
def i4_raw(t): return (term_raw(t,3),term_raw(t,4))
def i4(t): return min(i4_raw(rel(x,p)) for x in (t,opp(t)) for p in PS)

def mir(s): return None if s is None else (mir(s[1]),mir(s[0]))
def unl(tr): return None if isinstance(tr,int) else (unl(tr[0]),unl(tr[1]))
PAIRS={}
for n in (3,4,5):
    seen=set(); out=[]
    for tr in TREES[n]:
      mt=label(mir(unl(tr)))[0]; key=tuple(sorted((repr(tr),repr(mt))))
      if key not in seen: seen.add(key); out.append((tr,mt))
    PAIRS[n]=out

def coll(t,tr,n):
    c=[0,0,0]
    for xs in product(E,repeat=n): c[evaltree(tr,xs,t)]+=1
    d=3**n; return Fraction(sum(x*x for x in c),d*d)
def p1(t):
    return tuple(max((abs(coll(t,a,n)-coll(t,b,n)) for a,b in PAIRS[n]),default=Fraction(0)) for n in (3,4,5))

def word_map(t,side,w):
    f=(0,1,2)
    for a in w: f=comp(f,trans(t,side,a))
    return f
def p2(t):
    out=[]
    for h in (2,3,4):
      cl=Counter();cr=Counter();den=3**h
      for w in product(E,repeat=h):
        cl[len(set(word_map(t,'L',w)))]+=1; cr[len(set(word_map(t,'R',w)))]+=1
      d=[Fraction(cl[r]-cr[r],den) for r in (1,2,3)]; out.append(Fraction(sum(abs(x) for x in d),2))
    return tuple(out)

reps=set()
for t in product(E,repeat=9): reps.add(canon(t))
print('reps',len(reps),flush=True)
records=[]
for t in sorted(reps):
    ch=canon(opp(t))!=t
    if not ch: continue
    vals=(i0(t),i1(t),i2(t),i3(t),i4(t)); y1=p1(t); y2=p2(t)
    records.append((t,vals,y1,y2))
    if len(records)%500==0: print('done',len(records),flush=True)
print('chiral',len(records),flush=True)

swap=(1,0,2)
for t,vals,y1,y2 in records:
    o=opp(t)
    assert vals==(i0(o),i1(o),i2(o),i3(o),i4(o))
    assert y1==p1(o) and y2==p2(o)
    r=rel(t,swap)
    assert vals==(i0(r),i1(r),i2(r),i3(r),i4(r))
    assert y1==p1(r) and y2==p2(r)
print('controls pass: opposition and relabeling',flush=True)

def residual(level, which):
    buckets=defaultdict(list)
    for t,vals,y1,y2 in records:
      key=vals[:level+1]; y=y1 if which=='y1' else (y2 if which=='y2' else (y1,y2)); buckets[key].append(y)
    rcells=[]
    for k,ys in buckets.items():
      if len(set(ys))>1: rcells.append((k,ys))
    return len(rcells),sum(len(ys) for _,ys in rcells),max([len(ys) for _,ys in rcells],default=0),len(buckets)

def both_sep(level):
    buckets=defaultdict(list)
    for t,vals,y1,y2 in records: buckets[vals[:level+1]].append((y1,y2))
    n=0
    for arr in buckets.values():
      if len(set(x[0] for x in arr))>1 and len(set(x[1] for x in arr))>1: n+=1
    return n
for k in range(5):
    a=residual(k,'y1'); b=residual(k,'y2'); c=residual(k,'both')
    print('LEVEL',k,'Y1',a,'Y2',b,'Y12',c,'BOTHSEP',both_sep(k),flush=True)

r3y1=residual(3,'y1')[0]; r3y2=residual(3,'y2')[0]; r4joint=residual(4,'both')[0]
if r3y1==0 and r3y2==0: outcome='standard_absorption'
elif r4joint==0: outcome='term_absorption'
else: outcome='residual'
print('OUTCOME',outcome,flush=True)
