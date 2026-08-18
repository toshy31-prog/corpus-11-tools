#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter, defaultdict
from fractions import Fraction
from itertools import permutations, product
from statistics import median

ORDER = 3
E = tuple(range(ORDER))
PERMS = tuple(permutations(E))
P1_THRESHOLD = Fraction(1, 27)


def opposite(t):
    return tuple(t[b * ORDER + a] for a in E for b in E)


def relabel(t, p):
    out = [0] * 9
    for a in E:
        for b in E:
            out[p[a] * ORDER + p[b]] = p[t[a * ORDER + b]]
    return tuple(out)


def canonical(t):
    return min(relabel(t, p) for p in PERMS)


def aut_size(t):
    return sum(relabel(t, p) == t for p in PERMS)


def hist_l1(a, b):
    ca, cb = Counter(a), Counter(b)
    return Fraction(sum(abs(ca[k] - cb[k]) for k in set(ca) | set(cb)), 2 * ORDER)


def static(t):
    li, ri, lc, rc, lf, rf = [], [], [], [], [], []
    for a in E:
        row = [t[a * 3 + x] for x in E]
        col = [t[x * 3 + a] for x in E]
        li.append(len(set(row))); ri.append(len(set(col)))
        lc.append(sum(v*v for v in Counter(row).values())); rc.append(sum(v*v for v in Counter(col).values()))
        lf.append(sum(t[a*3+x] == x for x in E)); rf.append(sum(t[x*3+a] == x for x in E))
    ai, ac, af = hist_l1(li, ri), hist_l1(lc, rc), hist_l1(lf, rf)
    d = 1 if ai else (2 if ac else (3 if af else 99))
    controls = (
        sum(t[x*3+x] == x for x in E),
        tuple(sorted(Counter(t).values(), reverse=True)),
        sum(t[t[a*3+b]*3+c] == t[a*3+t[b*3+c]] for a,b,c in product(E, repeat=3)),
        sum(t[a*3+b] == t[b*3+a] for a,b in product(E, repeat=2)),
        aut_size(t),
        tuple(sorted(li+ri)),
    )
    return d, max(ai, ac, af), controls

# Protocol 1, reproduced exactly to freeze the already-known partition.
def shapes(n):
    if n == 1: return (None,)
    out=[]
    for k in range(1,n):
        for l in shapes(k):
            for r in shapes(n-k): out.append((l,r))
    return tuple(out)

def mir(s): return None if s is None else (mir(s[1]), mir(s[0]))
def label(s, i=0):
    if s is None: return i, i+1
    l,j=label(s[0],i); r,k=label(s[1],j); return (l,r),k

def unl(t): return None if isinstance(t,int) else (unl(t[0]),unl(t[1]))
def evaltree(tr, xs, t):
    if isinstance(tr,int): return xs[tr]
    return t[evaltree(tr[0],xs,t)*3 + evaltree(tr[1],xs,t)]
def coll(t,tr,n):
    c=[0,0,0]
    for xs in product(E, repeat=n): c[evaltree(tr,xs,t)] += 1
    den=3**n
    return Fraction(sum(x*x for x in c), den*den)

PAIRS={}
for n in (3,4,5):
    trees=[label(s)[0] for s in shapes(n)]; seen=set(); ps=[]
    for tr in trees:
        mt=label(mir(unl(tr)))[0]
        key=tuple(sorted((repr(tr),repr(mt))))
        if key in seen: continue
        seen.add(key); ps.append((tr,mt))
    PAIRS[n]=ps

def p1(t):
    vals=[]
    for n in (3,4,5):
        c=max((abs(coll(t,a,n)-coll(t,b,n)) for a,b in PAIRS[n]), default=Fraction(0))
        vals.append(c)
    return tuple(vals), sum(v >= P1_THRESHOLD for v in vals) >= 2

# Protocol 2: rank distributions of composed translations.
def compose(f,g):
    # g o f
    return tuple(g[f[x]] for x in E)

def trans(t, side, a):
    if side == 'L': return tuple(t[a*3+x] for x in E)
    return tuple(t[x*3+a] for x in E)
def word_map(t, side, word):
    f=(0,1,2)
    for a in word: f=compose(f, trans(t,side,a))
    return f

def p2(t):
    profile=[]; signed=[]
    for h in (2,3,4):
        cl=Counter(); cr=Counter(); den=3**h
        for w in product(E, repeat=h):
            cl[len(set(word_map(t,'L',w)))] += 1
            cr[len(set(word_map(t,'R',w)))] += 1
        d=tuple(Fraction(cl[r]-cr[r],den) for r in (1,2,3))
        signed.append(d)
        profile.append(Fraction(sum(abs(x) for x in d),2))
    return tuple(profile), tuple(signed)

reps={}
for t in product(E, repeat=9): reps.setdefault(canonical(t),None)
records={}
for t in reps:
    opp=canonical(opposite(t))
    sm=static(t); one,strong=p1(t); two,ds=p2(t)
    records[t]={'opp':opp,'chiral':opp!=t,'static':sm,'p1':one,'strong':strong,'p2':two,'d2':ds}

# Exact controls.
swap=(1,0,2)
for t,r in records.items():
    ro=records[r['opp']]
    if not r['chiral']:
        assert r['p2'] == (0,0,0)
        assert all(all(x==0 for x in d) for d in r['d2'])
    assert r['p2'] == ro['p2']
    for a,b in zip(r['d2'],ro['d2']): assert all(x == -y for x,y in zip(a,b))
    rt=p2(relabel(t,swap))[0]
    assert rt == r['p2']

buckets=defaultdict(lambda:{True:[],False:[]})
for t,r in records.items():
    if r['chiral']: buckets[r['static']][r['strong']].append(t)
matched=[(k,g[True],g[False]) for k,g in buckets.items() if g[True] and g[False]]
assert len(matched)==42, len(matched)

def med(vals):
    vals=sorted(vals); n=len(vals)
    if n%2: return vals[n//2]
    return (vals[n//2-1]+vals[n//2])/2

def B(t): return max(records[t]['p2'])

contrasts=[]; pred=[]
for key,plus,minus in matched:
    delta=med([B(t) for t in plus])-med([B(t) for t in minus])
    contrasts.append(delta)
    all_t=plus+minus
    scores={t:sum(records[t]['p1']) for t in all_t}
    hi=max(scores.values()); lo=min(scores.values())
    hi_b=Fraction(sum(B(t) for t in all_t if scores[t]==hi), sum(scores[t]==hi for t in all_t))
    lo_b=Fraction(sum(B(t) for t in all_t if scores[t]==lo), sum(scores[t]==lo for t in all_t))
    pred.append(1 if hi_b>lo_b else (-1 if hi_b<lo_b else 0))

npos=sum(x>0 for x in contrasts); nneg=sum(x<0 for x in contrasts); nzero=sum(x==0 for x in contrasts)
dmed=med(contrasts)
if npos>=28 and dmed>0: contrast_class='transported'
elif nneg>=28 and dmed<0: contrast_class='reversed'
else: contrast_class='not_transported'
p_success=sum(x==1 for x in pred)
p_fail=sum(x==-1 for x in pred); p_zero=sum(x==0 for x in pred)
pred_class='predictive_transport' if p_success>=28 else 'no_predictive_transport'
if contrast_class=='reversed': outcome='reversed'
elif contrast_class=='transported' and pred_class=='predictive_transport': outcome='supported_transport'
elif contrast_class=='transported': outcome='contrast_only'
elif pred_class=='predictive_transport': outcome='prediction_only'
else: outcome='not_transported'

print('PASS: protocol-2 exact controls')
print('isomorphism classes:',len(records))
print('chiral classes:',sum(r['chiral'] for r in records.values()))
print('frozen matched strata:',len(matched))
print('contrast signs: positive=%d zero=%d negative=%d median=%s' % (npos,nzero,nneg,dmed))
print('contrast classification:',contrast_class)
print('prediction: success=%d zero=%d failure=%d' % (p_success,p_zero,p_fail))
print('prediction classification:',pred_class)
print('OUTCOME:',outcome)
print('P2 nonzero chiral:',sum(any(x>0 for x in r['p2']) for r in records.values() if r['chiral']))
print('P2 profile unique:',len(set(r['p2'] for r in records.values() if r['chiral'])))
