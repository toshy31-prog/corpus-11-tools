"""Frozen external retrieval protocol; stdout JSON for the common Node evaluator."""
import csv
import hashlib
import io
import json
import sys
import time
import unicodedata
import pandas as pd
import recordlinkage

with open(sys.argv[1], "rb") as stream:
    raw = stream.read()
digest = hashlib.sha256(raw).hexdigest()
if digest != "527a94f24f7e813a9bc3fef35a635f13e195516966b308140a0dd2926afbb97d":
    raise ValueError("Unexpected corpus hash")
reader = csv.DictReader(io.StringIO(raw.decode("utf8")), strict=True)
expected_headers = "TID,CID,CTID,SourceID,id,number,title,length,artist,album,year,language".split(",")
if reader.fieldnames != expected_headers:
    raise ValueError("Unexpected schema")
records = list(reader)
if len({r["TID"] for r in records}) != len(records) or any(not r["CID"] or None in r for r in records):
    raise ValueError("Invalid rows")
groups = {}
for row in records:
    groups.setdefault(row["CID"], []).append(row)

def hash_cid(cid):
    return hashlib.sha256(cid.encode()).digest()

def absent(cid):
    return hash_cid(cid)[1] % 5 == 0

def project(row):
    return {"id": row["TID"], **{field: "" if row[field] in ("null", "[unknown]") else row[field] for field in ("artist", "title")}}

def normalize(value):
    chars = unicodedata.normalize("NFKD", value)
    chars = "".join(c for c in chars if not "\u0300" <= c <= "\u036f").lower()
    chars = "".join(c if unicodedata.category(c)[0] in "LN" else " " for c in chars)
    result = " ".join(chars.split())
    return None if result in ("", "null", "unknown") else result

def dataframe(rows):
    return pd.DataFrame([{field: normalize(row[field]) for field in ("artist", "title")} for row in rows], index=[r["id"] for r in rows])

refs = [project(g[0]) for cid, g in groups.items() if not absent(cid)]
right = dataframe(refs)
output = {"sha256": digest, "recordlinkageVersion": recordlinkage.__version__, "references": refs, "labels": {r["TID"]: r["CID"] for r in records}, "splits": []}
for split in ("historical", "reserved"):
    ids = sorted((cid for cid, g in groups.items() if len(g) > 1 and ((hash_cid(cid)[0] % 5 == 0) == (split == "reserved"))), key=hash_cid)
    if split == "historical":
        ids = ids[:1000]
    queries = [project(groups[cid][1]) for cid in ids]
    left = dataframe(queries)
    result = {"name": split, "queries": queries, "absent": {q["id"]: absent(cid) for q, cid in zip(queries, ids)}, "methods": []}
    for mode in ("block", "sortedneighbourhood3"):
        start = time.perf_counter()
        index = recordlinkage.Index()
        for field in ("artist", "title"):
            if mode == "block":
                index.block(left_on=field, right_on=field)
            else:
                index.sortedneighbourhood(left_on=field, right_on=field, window=3)
        pairs = index.index(left, right)
        compare = recordlinkage.Compare()
        for field in ("artist", "title"):
            compare.string(field, field, method="jarowinkler", missing_value=0, label=field)
        similarities = compare.compute(pairs, left, right).mean(axis=1)
        ranked = {}
        for (qid, rid), score in similarities.items():
            ranked.setdefault(qid, []).append((rid, float(score)))
        hits = {qid: [rid for rid, score in sorted(values, key=lambda x: (-x[1], x[0]))[:10]] for qid, values in ranked.items()}
        result["methods"].append({"name": mode, "pairs": len(pairs), "retrievalMs": (time.perf_counter()-start)*1000, "hits": hits})
    output["splits"].append(result)
print(json.dumps(output, ensure_ascii=False))
