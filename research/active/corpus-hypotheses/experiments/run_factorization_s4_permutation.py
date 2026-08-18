#!/usr/bin/env python3
from collections import Counter, defaultdict
from fractions import Fraction
from itertools import combinations, permutations

N=4

def matrices():
    out=[]
    for p in permutations(range(N)):
        m=[[0]*N for _ in range(N)]
        for col,row in enumerate(p):m[row][col]=1
        out.append(tuple(tuple(r) for r in m))
    return tuple(out)

def rank(rows):
    w=[[Fraction(v) for v in row] for row in rows if any(row)]
    r=0
    for c in range(N):
        piv=next((i for i in range(r,len(w)) if w[i][c]),None)
        if piv is None:continue
        w[r],w[piv]=w[piv],w[r]
        s=w[r][c];w[r]=[x/s for x in w[r]]
        for i in range(len(w)):
            if i!=r and w[i][c]:
                f=w[i][c];w[i]=[x-f*y for x,y in zip(w[i],w[r])]
        r+=1
    return r

def fixed_dimension(selected):
    eq=[]
    for m in selected:
        for i in range(N):eq.append(tuple(m[i][j]-(i==j) for j in range(N)))
    return N-rank(eq)

M=matrices()
assert len(M)==24
by_key=defaultdict(Counter);examples={};total=0
for inds in combinations(range(len(M)),3):
    selected=tuple(M[i] for i in inds)
    marginal=tuple(sorted((fixed_dimension((x,)) for x in selected),reverse=True))
    pairwise=tuple(sorted((fixed_dimension(pair) for pair in combinations(selected,2)),reverse=True))
    triple=fixed_dimension(selected)
    key=(marginal,pairwise)
    by_key[key][triple]+=1
    examples.setdefault((key,triple),inds)
    total+=1
assert total==2024

discriminating={k:v for k,v in by_key.items() if len(v)>1}
outcome='transported_remainder' if discriminating else 'no_remainder'
print('PASS: matrices=24 triplets=2024 exact-rational')
print('lower-order keys:',len(by_key))
print('discriminating keys:',len(discriminating))
for key,counts in discriminating.items():
    print('KEY',key,'TRIPLE_COUNTS',dict(sorted(counts.items())))
    for d in sorted(counts):print('EXAMPLE',d,examples[(key,d)])
print('OUTCOME:',outcome)
