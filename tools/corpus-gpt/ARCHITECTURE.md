# Corpus GPT --- carte d'architecture

Ce fichier complète README.md et sert de repère rapide.

``` text
CHATGPT
│
├─ Plugin MCP : Corpus
│  └─ auth plugin : sans authentification
│
└─ Secure MCP Tunnel
   └─ tunnel_6ab956b7bd2481919646752e10115b59
      │
      ▼
tunnel-client (systemd user)
│  profil : ~/.config/tunnel-client/corpus-gpt.yaml
│  secret : ~/.config/corpus-gpt-tunnel/runtime.env
│  health : 127.0.0.1:8080
│
▼ stdio
projets/corpus-local-llm-migration/corpus_gpt_mcp.py
│
├─ status
├─ doctor
├─ jobs
├─ run_job
├─ latest_evidence
├─ runtime_probe
└─ install_managed_job
│
▼
~/.local/bin/corpus-gpt
│
▼
~/.local/share/corpus-bb-runner
├─ jobs/
├─ runs/
└─ state/runner-v2.lock
│
├───────────────┐
▼               ▼
terminal/jobs   CDP / navigateur
                │
                ├─ DOM/ARIA
                ├─ Accès rapide Corpus
                ├─ conversations
                ├─ Modifications du projet
                ├─ Révision
                ├─ Fichier précédent/suivant
                ├─ Actualiser
                └─ screenshots
                │
                ▼
             Corpus local
                │
                ▼
        preuves / rapports
                │
                ├─ retour MCP
                ├─ corpus-bb-send-text
                └─ corpus-bb-send-shot
                        │
                        ▼
                     ChatGPT
```

## Invariant de sécurité

Le modèle n'obtient pas un shell général. Il obtient des outils MCP et
des jobs enregistrés. Tout élargissement doit rester explicite, borné et
auditable.

## Ordre de diagnostic recommandé

``` text
Corpus.status
  ↓
Corpus.doctor
  ↓
Corpus.jobs
  ↓
Corpus.latest_evidence si nécessaire
  ↓
Corpus.run_job seulement pour un job réellement listé
```
