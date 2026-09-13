#!/usr/bin/env python3
"""Post hoc descriptive arm comparison; keeps all consistent extraction traces."""
import collections,csv,hashlib,json,pathlib,statistics,sys
p=pathlib.Path(sys.argv[1]);rows=list(csv.DictReader(p.open(encoding='utf-8-sig'),delimiter=';'))
groups=collections.defaultdict(list)
for r in rows:groups[r['Session'],r['Group'],r['Period']].append(r)
by_arm=collections.defaultdict(list);errors=[]
for key,rs in groups.items():
 fields=['Treatment','CPR0','extract1','extract2','extract3','CPR1','CPR2']
 if len(rs)!=3 or any(len({r[k] for r in rs})!=1 for k in fields):errors.append('inconsistent trace');continue
 r=rs[0];x=[float(r['extract'+str(i)]) for i in (1,2,3)];pool=float(r['CPR0']);contrib=sum(float(q['ContributionBR']) for q in rs)
 assert sorted(int(q['Rank']) for q in rs)==[1,2,3]
 assert all(float(q['extract'])==x[int(q['Rank'])-1] for q in rs)
 assert all(0<=v<=float(r['extractlimit']) for v in x)
 assert pool-sum(x)>=0
 assert float(r['CPR1'])==pool-x[0] and float(r['CPR2'])==pool-sum(x[:2])
 by_arm[r['Treatment']].append({'x':x,'pool':pool,'contribution':contrib,'remaining_derived':pool-sum(x),'residual_field_consistent':len({q['CPR3'] for q in rs})==1 and float(r['CPR3'])==pool-sum(x),'session':key[0],'group':key[:2]})
summary={}
for arm,gs in sorted(by_arm.items()):
 summary[arm]={'group_periods':len(gs),'groups':len({g['group'] for g in gs}),'sessions':len({g['session'] for g in gs}),'mean_contribution_per_group':statistics.mean(g['contribution'] for g in gs),'mean_extraction_by_position':[statistics.mean(g['x'][i] for g in gs) for i in range(3)],'unequal_extraction_group_periods':sum(len(set(g['x']))>1 for g in gs),'third_position_zero_extraction':sum(g['x'][2]==0 for g in gs),'mean_within_group_max_minus_min_extraction':statistics.mean(max(g['x'])-min(g['x']) for g in gs),'residual_field_inconsistent_group_periods':sum(not g['residual_field_consistent'] for g in gs),'mean_derived_residual':statistics.mean(g['remaining_derived'] for g in gs)}
print(json.dumps({'status':'post_hoc_descriptive_only','source_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'labels':{'0':'no communication','1':'unstructured chat','2':'structured deliberation'},'exclusions':errors,'arms':summary,'cautions':['repeated group-periods are not independent samples','treatment assignment not reconstructed','archive identifier discrepancy unresolved','derived residual does not overwrite source CPR3','no CCT arm; no evidence of CCT effect']},indent=2))
