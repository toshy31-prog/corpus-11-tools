"""Pont local : contexte Corpus explicite + fournisseur LLM Corpus remplaçable."""
from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from doctrine_corpus import compile_corpus
from neural_router import tokens


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_LLM_BASE_URL = "http://127.0.0.1:18741/v1"
DEFAULT_LLM_MODEL = "corpus"


def provider_config() -> dict:
    """Contrat du fournisseur linguistique local Corpus.

    L'adaptateur est volontairement loopback-only : une variable d'environnement
    ne doit jamais transformer ce laboratoire en client distant silencieux.
    """
    base_url = os.environ.get(
        "CORPUS_LLM_BASE_URL", DEFAULT_LLM_BASE_URL
    ).strip().rstrip("/")
    model = os.environ.get("CORPUS_LLM_MODEL", DEFAULT_LLM_MODEL).strip()
    parsed = urlparse(base_url)

    if (
        parsed.scheme != "http"
        or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or parsed.path.rstrip("/") != "/v1"
    ):
        raise ValueError(
            "CORPUS_LLM_BASE_URL doit être une API OpenAI-compatible locale "
            "sur loopback, terminée par /v1."
        )
    if not model:
        raise ValueError("CORPUS_LLM_MODEL ne peut pas être vide.")

    return {
        "base_url": base_url,
        "chat_url": base_url + "/chat/completions",
        "model": model,
    }


def retrieve(question: str, limit: int = 4) -> list[dict]:
    query = set(tokens(question))
    scored = []
    for document in compile_corpus(ROOT):
        overlap = len(query & set(document.tokens))
        if overlap:
            excerpt = (ROOT / document.path).read_text(errors="ignore")[:1200].strip()
            scored.append(
                (overlap, document.path, document.surface, document.status, excerpt)
            )
    return [
        {
            "path": path,
            "surface": surface,
            "status": status,
            "lexical_overlap": score,
            "excerpt": excerpt,
        }
        for score, path, surface, status, excerpt
        in sorted(scored, reverse=True)[:limit]
    ]


def ask(question: str) -> dict:
    if not question.strip():
        raise ValueError("Une question est requise.")

    provider = provider_config()
    sources = retrieve(question)
    context = "\n\n".join(
        f"SOURCE {item['path']} | surface={item['surface']} | "
        f"status={item['status']}\n{item['excerpt']}"
        for item in sources
    )
    system = (
        "You are the language interface of a local Corpus experiment. "
        "Use only the supplied Corpus excerpts for factual claims about Corpus. "
        "State uncertainty when excerpts do not establish an answer. "
        "Do not claim consciousness, agency, memory, or autonomous action for "
        "Corpus or its models. You cannot modify files or start training. "
        "Reply in the user's language."
    )
    payload = {
        "model": provider["model"],
        "stream": False,
        "messages": [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\nCorpus excerpts:\n"
                    f"{context or 'No matching Corpus excerpt was retrieved.'}"
                ),
            },
        ],
        "temperature": 0,
        "max_tokens": 256,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    request = Request(
        provider["chat_url"],
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer local",
        },
    )
    try:
        with urlopen(request, timeout=180) as response:
            body = json.loads(response.read())
            answer = body["choices"][0]["message"]["content"]
    except (URLError, KeyError, IndexError, TypeError, ValueError) as error:
        raise RuntimeError(
            "Le fournisseur LLM local Corpus est indisponible ou incompatible. "
            "Démarrer le fournisseur local canonique ; aucun repli distant "
            "n'est autorisé."
        ) from error

    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError("Le fournisseur local Corpus a renvoyé une réponse vide.")

    return {
        "answer": answer,
        "sources": [
            {
                key: item[key]
                for key in ("path", "surface", "status", "lexical_overlap")
            }
            for item in sources
        ],
        "runtime": "corpus_local_openai_compatible",
        "provider": {
            "base_url": provider["base_url"],
            "model": provider["model"],
            "network_scope": "loopback_only",
        },
        "scope_limit": (
            "A local language-model answer grounded by lexical Corpus excerpts; "
            "it is not a Corpus-owned model, autonomous action, or evidence of agency."
        ),
    }
