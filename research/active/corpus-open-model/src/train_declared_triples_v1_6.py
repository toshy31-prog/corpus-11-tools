"""Entraînement v1.6 sur arêtes déclarées contre corruptions contrôlées."""

from __future__ import annotations

import argparse, json, random
from pathlib import Path

from compute_profile import hardware_status
from declared_triple_model import DeclaredTripleModel, token_ids, torch
from relation_triples import manifest, split, triples
from triple_data import descriptors, relation_index

ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
OUTPUT = ARTIFACTS / "declared-triples-v1.6.pt"
BEST = ARTIFACTS / "declared-triples-v1.6-best.pt"

def batch(rows, descriptions, relations, device):
    encoded = [(token_ids(descriptions[row['source']]), relations[row['relation']], token_ids(descriptions[row['target']]), row['label']) for row in rows]
    width = max(max(len(x[0]), len(x[2])) for x in encoded)
    def pad(values): return values + [0] * (width - len(values))
    return (torch.tensor([pad(x[0]) for x in encoded], device=device), torch.tensor([[1]*len(x[0])+[0]*(width-len(x[0])) for x in encoded], device=device), torch.tensor([x[1] for x in encoded], device=device), torch.tensor([pad(x[2]) for x in encoded], device=device), torch.tensor([[1]*len(x[2])+[0]*(width-len(x[2])) for x in encoded], device=device), torch.tensor([x[3] for x in encoded], dtype=torch.float32, device=device))

def evaluate(model, rows, descriptions, relations, device):
    model.eval()
    correct = count = 0; loss_sum = 0.0
    with torch.no_grad():
        for start in range(0, len(rows), 32):
            values = batch(rows[start:start+32], descriptions, relations, device)
            logits = model(*values[:-1]); labels = values[-1]
            loss_sum += torch.nn.functional.binary_cross_entropy_with_logits(logits, labels, reduction='sum').item()
            correct += ((torch.sigmoid(logits) >= .5) == labels.bool()).sum().item(); count += len(labels)
    model.train(); return {'binary_cross_entropy': loss_sum/count, 'accuracy': correct/count, 'examples': count}

def train(epochs=200):
    if not hardware_status()['ready_for_gpu_training'] or DeclaredTripleModel is None: raise RuntimeError('GPU PyTorch unavailable.')
    torch.manual_seed(261); torch.cuda.manual_seed_all(261)
    partitions=split(triples(ROOT)); descriptions=descriptors(ROOT); relations=relation_index(sum(partitions.values(), [])); device=torch.device('cuda')
    model=DeclaredTripleModel(len(relations)).to(device); opt=torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=.01); rng=random.Random(261); best=float('inf'); history=[]
    for epoch in range(epochs):
        rows=partitions['train'][:]; rng.shuffle(rows)
        for start in range(0,len(rows),32):
            values=batch(rows[start:start+32], descriptions, relations, device); loss=torch.nn.functional.binary_cross_entropy_with_logits(model(*values[:-1]), values[-1]); opt.zero_grad(); loss.backward(); opt.step()
        if (epoch+1)%20==0:
            value=evaluate(model, partitions['validation'], descriptions, relations, device); history.append({'epoch':epoch+1, **value})
            if value['binary_cross_entropy'] < best:
                best=value['binary_cross_entropy']; ARTIFACTS.mkdir(exist_ok=True); torch.save({'model':'DeclaredTripleModel v1.6','state_dict':model.state_dict(),'relations':relations,'epoch':epoch+1,'validation':value}, BEST)
    payload={'model':'DeclaredTripleModel v1.6','state_dict':model.state_dict(),'relations':relations,'epochs':epochs,'validation_history':history,'graph':manifest(partitions),'status':'locally_trained_validation_observed_test_reserved'}; ARTIFACTS.mkdir(exist_ok=True); torch.save(payload, OUTPUT)
    return {k:v for k,v in payload.items() if k!='state_dict'} | {'checkpoint':str(OUTPUT),'best_checkpoint':str(BEST)}

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--epochs',type=int,default=200); a=p.parse_args()
    try: print(json.dumps(train(a.epochs),ensure_ascii=False,indent=2))
    except RuntimeError as e: raise SystemExit(str(e))
