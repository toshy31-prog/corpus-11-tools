#!/usr/bin/env python3
"""Exploratory replays of external artifacts; never a CCT effectiveness test."""
import argparse, collections, csv, ctypes as C, hashlib, json, math, pathlib, statistics, subprocess, tempfile
HERE=pathlib.Path(__file__).resolve().parent

def human(csv_path):
    with csv_path.open(encoding='utf-8-sig',newline='') as f: rows=list(csv.DictReader(f,delimiter=';'))
    def num(r,k): return float(r[k].replace(',','.'))
    groups=collections.defaultdict(list)
    for r in rows: groups[tuple(r[k] for k in ('Session','Group','Period'))].append(r)
    valid=[]; issues=collections.Counter()
    shared=['CPR0','extract1','CPR1','extract2','CPR2','extract3','CPR3']
    for key, rs in groups.items():
        if len(rs)!=3 or sorted(num(r,'Rank') for r in rs)!=[1,2,3]: issues['group_size_or_rank']=issues['group_size_or_rank']+1;continue
        if any(len({r[k] for r in rs})!=1 for k in shared):issues['inconsistent_group_resource_trace']+=1;continue
        r=rs[0];pool=num(r,'CPR0');xs=[num(r,f'extract{i}') for i in (1,2,3)]
        if not all(math.isfinite(v) and v>=0 for v in [pool,*xs]):issues['invalid_number']+=1;continue
        balances=all(abs(num(r,f'CPR{i}')-(pool-sum(xs[:i])))<1e-9 for i in (1,2,3))
        individual=all(abs(num(q,'extract')-xs[int(num(q,'Rank'))-1])<1e-9 for q in rs)
        if not balances or not individual:issues['balance_or_individual_mismatch']+=1;continue
        valid.append((pool,xs,num(r,'CPR3')))
    if not valid:raise ValueError('No consistent group-period observations')
    return {'source_sha256':hashlib.sha256(csv_path.read_bytes()).hexdigest(),'rows':len(rows),'groups':len({(r['Session'],r['Group']) for r in rows}),'group_periods':len(groups),'unique_participants_by_session_subject':len({(r['Session'],r['Subject']) for r in rows}),'valid_group_periods':len(valid),'excluded_group_periods':dict(issues),'fsd_no_values':sorted({r['fsd_no'] for r in rows}),'treatment_values':sorted({r['Treatment'] for r in rows}),'mean_extraction_by_position':[statistics.mean(x[1][i] for x in valid) for i in range(3)],'unequal_extraction_group_periods':sum(len(set(x[1]))>1 for x in valid),'zero_third_extraction_group_periods':sum(x[1][2]==0 for x in valid),'mean_remaining_pool':statistics.mean(x[2] for x in valid),'scope':'descriptive_received_file_only; archive identifier discrepancy unresolved; no causal or CCT inference'}

def hydraulics(source,output):
    source=source.resolve();output.mkdir(parents=True,exist_ok=True)
    manifest=json.loads((HERE/'epanet-source-manifest.json').read_text())
    actual={str(f.relative_to(source)):hashlib.sha256(f.read_bytes()).hexdigest() for f in source.rglob('*') if f.is_file()}
    if actual!=manifest:raise ValueError('EPANET source differs from upstream snapshot')
    lib_path=output/'libepanet2.so'
    files=sorted(str(f) for f in list((source/'src').glob('*.c'))+list((source/'src/util').glob('*.c')) if f.name!='epanet_py.c')
    command=['gcc','-shared','-fPIC','-O2','-I'+str(source/'include'),*files,'-lm','-o',str(lib_path)]
    p=subprocess.run(command,capture_output=True,text=True)
    (output/'build.log').write_text(p.stdout+p.stderr);p.check_returncode()
    lib=C.CDLL(str(lib_path));ptr=C.c_void_p;I=C.c_int;D=C.c_double;L=C.c_long
    signatures={'EN_createproject':[C.POINTER(ptr)],'EN_deleteproject':[ptr],'EN_open':[ptr,C.c_char_p,C.c_char_p,C.c_char_p],'EN_close':[ptr],'EN_getversion':[C.POINTER(I)],'EN_getcount':[ptr,I,C.POINTER(I)],'EN_getnodetype':[ptr,I,C.POINTER(I)],'EN_getflowunits':[ptr,C.POINTER(I)],'EN_setdemandmodel':[ptr,I,D,D,D],'EN_openH':[ptr],'EN_initH':[ptr,I],'EN_runH':[ptr,C.POINTER(L)],'EN_nextH':[ptr,C.POINTER(L)],'EN_closeH':[ptr],'EN_getnodevalue':[ptr,I,I,C.POINTER(D)]}
    for name,args in signatures.items():getattr(lib,name).argtypes=args;getattr(lib,name).restype=I
    def call(name,*args):
        code=getattr(lib,name)(*args)
        if code>=100:raise RuntimeError((name,code))
        return code
    version=I();call('EN_getversion',C.byref(version));runs=[]
    for network in ['Net1','Net2','Net3']:
        for mode in [0,1]:
            ph=ptr();call('EN_createproject',C.byref(ph));inp=source/'example-networks'/f'{network}.inp';label=f'{network}-'+['DDA','PDA'][mode]
            call('EN_open',ph,str(inp).encode(),str(output/f'{label}.rpt').encode(),b'')
            units=I();call('EN_getflowunits',ph,C.byref(units));assert units.value==1,'Selected examples must be GPM; pressure PSI'
            if mode==1:call('EN_setdemandmodel',ph,1,0.,20.,0.5)
            n=I();call('EN_getcount',ph,0,C.byref(n));junctions=[]
            for i in range(1,n.value+1):
                kind=I();call('EN_getnodetype',ph,i,C.byref(kind))
                if kind.value==0:junctions.append(i)
            call('EN_openH',ph);call('EN_initH',ph,0);warnings=[];min_pressure=math.inf;volume=0.;deficit=0.;steps=0
            while True:
                time=L();code=call('EN_runH',ph,C.byref(time))
                if code:warnings.append({'time_seconds':time.value,'code':code})
                flow=0.;gap=0.
                for i in junctions:
                    vals=[]
                    for k in [9,11,27]:
                        v=D();call('EN_getnodevalue',ph,i,k,C.byref(v));assert math.isfinite(v.value);vals.append(v.value)
                    flow+=max(0.,vals[0]);min_pressure=min(min_pressure,vals[1]);gap+=max(0.,vals[2])
                step=L();call('EN_nextH',ph,C.byref(step));volume+=flow*step.value/60.;deficit+=gap*step.value/60.;steps+=1
                if step.value==0:break
            call('EN_closeH',ph);call('EN_close',ph);call('EN_deleteproject',ph)
            runs.append({'network':network,'mode':['DDA','PDA'][mode],'input_sha256':hashlib.sha256(inp.read_bytes()).hexdigest(),'junctions':len(junctions),'hydraulic_states':steps,'duration_seconds':time.value,'minimum_junction_pressure_psi':min_pressure,'delivered_us_gallons_positive_junction_demands':volume,'demand_deficit_us_gallons':deficit,'warnings':warnings})
    return {'engine_version':version.value,'compiler':subprocess.check_output(['gcc','--version'],text=True).splitlines()[0],'library_sha256':hashlib.sha256(lib_path.read_bytes()).hexdigest(),'runs':runs,'scope':'external engine and example networks; local execution and PDA parameters; no independent policy decisions or counter-review'}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--csv',type=pathlib.Path,required=True);ap.add_argument('--epanet-source',type=pathlib.Path,required=True);ap.add_argument('--output',type=pathlib.Path,required=True);a=ap.parse_args()
    a.output.mkdir(parents=True,exist_ok=True)
    plan=json.loads((HERE/'analysis-plan.json').read_text())
    assert hashlib.sha256(a.csv.read_bytes()).hexdigest()==plan['input_sha256']['daF3668_eng.csv'],'CSV differs from observed input'
    result={'human_decisions':human(a.csv),'hydraulic_generator':hydraulics(a.epanet_source,a.output/'engine')}
    (a.output/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
