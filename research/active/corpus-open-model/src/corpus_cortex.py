"""Pont local : contexte Corpus explicite + modèle Ollama local remplaçable."""
from __future__ import annotations

import json
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

from doctrine_corpus import compile_corpus
from neural_router import tokens


ROOT = Path(__file__).resolve().parents[4]
OLLAMA_CHAT = "http://127.0.0.1:11434/api/chat"


def retrieve(question: str, limit: int = 4) -> list[dict]:
    query = set(tokens(question))
    scored = []
    for document in compile_corpus(ROOT):
        overlap = len(query & set(document.tokens))
        if overlap:
            excerpt = (ROOT / document.path).read_text(errors="ignore")[:1200].strip()
            scored.append((overlap, document.path, document.surface, document.status, excerpt))
    return [{"path": path, "surface": surface, "status": status, "lexical_overlap": score, "excerpt": excerpt} for score, path, surface, status, excerpt in sorted(scored, reverse=True)[:limit]]


def ask(question: str, model: str) -> dict:
    model = model.strip()
    if not question.strip() or not model:
        raise ValueError("A question and an installed local Ollama model are required.")
    sources = retrieve(question)
    context = "\n\n".join(f"SOURCE {item['path']} | surface={item['surface']} | status={item['status']}\n{item['excerpt']}" for item in sources)
    system = """You are the language interface of a local Corpus experiment. Use only the supplied Corpus excerpts for factual claims about Corpus. State uncertainty when excerpts do not establish an answer. Do not claim consciousness, agency, memory, or autonomous action for Corpus or its models. You cannot modify files or start training. Reply in the user's language."""
    payload = {"model": model, "stream": False, "messages": [{"role": "system", "content": system}, {"role": "user", "content": f"Question: {question}\n\nCorpus excerpts:\n{context or 'No matching Corpus excerpt was retrieved.'}"}]}
    request = Request(OLLAMA_CHAT, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    try:
        with urlopen(request, timeout=120) as response:
            answer = json.loads(response.read())["message"]["content"]
    except URLError as error:
        raise RuntimeError("Ollama local is unavailable. Start its local server and use an installed model.") from error
    return {"answer": answer, "sources": [{key: item[key] for key in ("path", "surface", "status", "lexical_overlap")} for item in sources], "runtime": "local_ollama_only", "scope_limit": "A local language-model answer grounded by lexical Corpus excerpts; it is not a Corpus-owned model, autonomous action, or evidence of agency."}
