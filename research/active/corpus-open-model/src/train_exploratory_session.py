"""Session locale contrôlable : entraînement MLM sans prétention d'évaluation."""
from __future__ import annotations
import argparse, json, signal
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
import torch
from compute_profile import TinyDoctrineProfile, hardware_status
from doctrine_corpus import compile_corpus, manifest
from doctrine_split import split_documents
from tiny_doctrine_encoder import TinyDoctrineEncoder
from train_tiny_doctrine import batches, token_id
from metabolic_cycle import probes

ROOT=Path(__file__).resolve().parents[4]; ARTIFACTS=Path(__file__).resolve().parents[1]/"artifacts/exploratory-sessions"; stopped=False
def halt(*_):
    global stopped; stopped=True
signal.signal(signal.SIGINT,halt); signal.signal(signal.SIGTERM,halt)
def run(steps=1_000_000, checkpoint_every=50):
    if not hardware_status()["ready_for_gpu_training"]: raise RuntimeError("GPU PyTorch unavailable.")
    profile=TinyDoctrineProfile(); documents=compile_corpus(ROOT); train=split_documents(documents)["train"]; device=torch.device("cuda")
    session_id=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"); out=ARTIFACTS/f"exploratory-session-{session_id}.pt"; trajectory=ARTIFACTS/f"exploratory-session-{session_id}-trajectory.jsonl"; probe_rows=probes(ROOT)
    model=TinyDoctrineEncoder(**{k:getattr(profile,k) for k in ("vocabulary_size","hidden_size","layers","heads","feedforward_size","sequence_length")}).to(device); opt=torch.optim.AdamW(model.parameters(),lr=1e-4,weight_decay=.01); scaler=torch.amp.GradScaler("cuda"); iterator=iter(batches(train,profile)); losses=[]; ARTIFACTS.mkdir(parents=True,exist_ok=True)
    def save(step,status):
        torch.save({"model":"ExploratorySession v0","session_id":session_id,"state_dict":model.state_dict(),"profile":asdict(profile),"step":step,"loss":losses[-1] if losses else None,"status":status,"scope_limit":"Interactive exploratory local run; not evaluated, selected, deployed, or a basis for claims of capability."},out)
        model.eval(); positions=[]
        with torch.no_grad():
            for probe in probe_rows:
                text=(ROOT/probe["path"]).read_text(errors="ignore"); ids=torch.tensor([[token_id(word,profile.vocabulary_size) for word in text.split()[:profile.sequence_length]]],device=device)
                if ids.shape[1] == 0: continue
                vector=model.encode(ids).mean(dim=1)[0].float().cpu().tolist(); positions.append({"path":probe["path"],"xyz":[sum(vector[:128])/128,sum(vector[128:256])/128,sum(vector[256:384])/128]})
        model.train()
        with trajectory.open("a") as handle: handle.write(json.dumps({"step":step,"loss":losses[-1] if losses else None,"probes":positions,"projection":"mean of hidden dimensions 0-127, 128-255, 256-383"})+"\n")
    for step in range(steps):
        if stopped: save(step,"stopped_checkpoint_preserved"); print(json.dumps({"event":"stopped","step":step,"checkpoint":str(out)},ensure_ascii=False),flush=True); return
        group=[]
        while len(group)<profile.micro_batch_size:
            try: group.append(next(iterator))
            except StopIteration: iterator=iter(batches(train,profile))
        ids=torch.tensor(group,device=device); labels=ids.clone(); mask=torch.rand(ids.shape,device=device)<.15; labels[~mask]=-100; ids[mask]=torch.randint(profile.vocabulary_size,(int(mask.sum()),),device=device)
        with torch.autocast(device_type="cuda",dtype=torch.float16): loss=torch.nn.functional.cross_entropy(model(ids).view(-1,profile.vocabulary_size),labels.view(-1),ignore_index=-100)/profile.gradient_accumulation
        scaler.scale(loss).backward()
        if (step+1)%profile.gradient_accumulation==0: scaler.unscale_(opt); torch.nn.utils.clip_grad_norm_(model.parameters(),1.0); scaler.step(opt); scaler.update(); opt.zero_grad(set_to_none=True)
        losses.append(loss.item()*profile.gradient_accumulation)
        if (step+1)%checkpoint_every==0: save(step+1,"running_checkpoint_preserved"); print(json.dumps({"event":"progress","step":step+1,"loss":losses[-1],"checkpoint":str(out)},ensure_ascii=False),flush=True)
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--steps",type=int,default=1_000_000);p.add_argument("--checkpoint-every",type=int,default=50);a=p.parse_args();run(a.steps,a.checkpoint_every)
