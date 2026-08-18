#!/usr/bin/env python3
from collections import defaultdict, Counter
from fractions import Fraction
from itertools import combinations, permutations

DIM=4
PERMS=tuple(permutations(range(DIM)))

def matrix(p):
    out=[[0]*DIM for _ in range(DIM)]
    for col,row in enumerate(p): out[row][col]=1
    return tuple(tuple(r) for r in out)

MATS=tuple(matrix(p) for p in PERMS)

def rank(rows):
    work=[[Fraction(v) for v in row] for row in rows if any(row)]
    pivot=0
    for col in range(DIM):
        r=next((i for i in range(pivot,len(work)) if work[i][col]),None)
        if r is None: continue
        work[pivot],work[r]=work[r],work[pivot]
        s=work[pivot][col]
        work[pivot]=[v/s for v in work[pivot]]
        for i in range(len(work)):
            if i!=pivot and work[i][col]:
                f=work[i][col]
                work[i]=[v-f*w for v,w in zip(work[i],work[pivot])]
        pivot+=1
    return pivot

def fixed_dim(indices):
    equations=[]
    for idx in indices:
        m=MATS[idx]
        for r in range(DIM):
            equations.append(tuple(m[r][c]-(r==c) for c in range(DIM)))
    return DIM-rank(equations)

def mean(values):
    return sum(values,Fraction(0))/len(values)

def median(values):
    values=sorted(values); n=len(values)
    if n%2: return values[n//2]
    return (values[n//2-1]+values[n//2])/2

assert len(MATS)==24
triples=[]
for T in combinations(range(24),3):
    marginal=tuple(sorted((fixed_dim((i,)) for i in T),reverse=True))
    pairwise=tuple(sorted((fixed_dim(pair) for pair in combinations(T,2)),reverse=True))
    if marginal==(3,3,3) and pairwise==(2,2,2):
        triples.append((T,fixed_dim(T)))

counts=Counter(d3 for _,d3 in triples)
assert len(triples)==20
assert counts==Counter({1:16,2:4})

extensions=[]
for T,d3 in triples:
    for d in range(24):
        if d in T: continue
        g=(fixed_dim((d,)),tuple(sorted((fixed_dim((a,d)) for a in T),reverse=True)))
        d4=fixed_dim(T+(d,))
        extensions.append((T,d3,d,g,d4,int(d4>0),int(d4==d3)))

assert len(extensions)==20*21
strata=defaultdict(lambda:{1:[],2:[]})
for T,d3,d,g,d4,spos,sfull in extensions:
    strata[g][d3].append((d4,spos,sfull))
matched={g:v for g,v in strata.items() if v[1] and v[2]}

rows=[]
for g,v in sorted(matched.items()):
    m1=mean([x[0] for x in v[1]]); m2=mean([x[0] for x in v[2]])
    p1=mean([x[1] for x in v[1]]); p2=mean([x[1] for x in v[2]])
    f1=mean([x[2] for x in v[1]]); f2=mean([x[2] for x in v[2]])
    rows.append((g,len(v[1]),len(v[2]),m1,m2,m2-m1,p2-p1,f2-f1))

deltas=[r[5] for r in rows]
pos=sum(x>0 for x in deltas); neg=sum(x<0 for x in deltas); zero=sum(x==0 for x in deltas)
med=median(deltas) if deltas else None
if not rows:
    outcome='unidentified'
elif neg*3>=2*len(rows) and med<0:
    outcome='reversed'
elif pos*3>=2*len(rows) and med>0:
    outcome='supported_survival'
else:
    outcome='not_supported'

# Structural check specific to the permutation representation: every matrix fixes the constant line.
one=(1,1,1,1)
assert all(tuple(sum(M[r][c]*one[c] for c in range(DIM)) for r in range(DIM))==one for M in MATS)

print('PASS: 24 permutation matrices; 2024 starting triples audited')
print('qualifying triples:',len(triples),'D3 counts:',dict(sorted(counts.items())))
print('extensions:',len(extensions),'control keys:',len(strata),'matched strata:',len(rows))
for row in rows:
    print('G=',row[0],'n1=',row[1],'n2=',row[2],'meanD4_1=',row[3],'meanD4_2=',row[4],
          'DeltaD4=',row[5],'DeltaPos=',row[6],'DeltaFull=',row[7])
print('DeltaD4 signs: positive=%d zero=%d negative=%d median=%s' % (pos,zero,neg,med))
print('constant-line control: PASS')
print('OUTCOME:',outcome)
