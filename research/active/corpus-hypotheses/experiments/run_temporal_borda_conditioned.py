#!/usr/bin/env python3
from collections import defaultdict
from fractions import Fraction
from itertools import combinations, permutations

N=6
V=tuple(range(N))
EDGES=tuple(combinations(V,2))
ORDERS=tuple(permutations(V))

def order_mask(order):
    pos={v:i for i,v in enumerate(order)}
    mask=0
    for k,(a,b) in enumerate(EDGES):
        if pos[a] < pos[b]: mask |= 1<<k
    return mask
ORDER_MASKS=tuple(order_mask(o) for o in ORDERS)

def degrees(t):
    d=[0]*N
    for k,(a,b) in enumerate(EDGES):
        if (t>>k)&1: d[a]+=1
        else: d[b]+=1
    return tuple(d)

def minimizers(t):
    losses=[(t^m).bit_count() for m in ORDER_MASKS]
    best=min(losses)
    return tuple(ORDER_MASKS[i] for i,x in enumerate(losses) if x==best)

def borda_masks(d):
    return tuple(m for o,m in zip(ORDERS,ORDER_MASKS)
                 if all(d[o[i]]>=d[o[i+1]] for i in range(N-1)))

def loss(t,masks):
    return Fraction(sum((t^m).bit_count() for m in masks),len(masks))

TOURNAMENTS=tuple(range(1<<len(EDGES)))
groups=defaultdict(list)
for t in TOURNAMENTS: groups[degrees(t)].append(t)

mins={t:minimizers(t) for t in TOURNAMENTS}
bordas={d:borda_masks(d) for d in groups}

pairs=0; delta_total=Fraction(0); wins=ties=losses=0
sp=sz=sn=0; nontrivial=0
for d,ts in groups.items():
    if len(ts)<2: continue
    nontrivial+=1
    ds=Fraction(0); npairs=0
    bm=bordas[d]
    for train in ts:
        fm=mins[train]
        for test in ts:
            if test==train: continue
            lf=loss(test,fm); lb=loss(test,bm); delta=lb-lf
            delta_total += delta; ds += delta; pairs += 1; npairs += 1
            if delta>0: wins+=1
            elif delta<0: losses+=1
            else: ties+=1
    mean=ds/npairs
    if mean>0: sp+=1
    elif mean<0: sn+=1
    else: sz+=1

if delta_total>0 and wins>losses and sp*3>=nontrivial*2:
    outcome='incremental_value'
elif delta_total<0 and losses>wins:
    outcome='borda_better'
else:
    outcome='no_incremental_value'

assert len(TOURNAMENTS)==32768
assert len(ORDERS)==720
assert pairs==sum(len(ts)*(len(ts)-1) for ts in groups.values())
print('PASS: exact exhaustive conditioned tournament test')
print('tournaments:',len(TOURNAMENTS))
print('degree strata:',len(groups),'nontrivial:',nontrivial)
print('ordered train-test pairs:',pairs)
print('Delta_total:',delta_total)
print('Delta_mean:',delta_total/pairs, float(delta_total/pairs))
print('pairwise F_T better/equal/worse:',wins,ties,losses)
print('strata positive/zero/negative:',sp,sz,sn)
print('random expected violations:',Fraction(len(EDGES),2))
print('OUTCOME:',outcome)
