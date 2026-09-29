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

Le fast path évite les préflights redondants :

``` text
Corpus.status, une fois
  ├─ sain + job exact connu → run_job / start_job selon le cas
  ├─ job inconnu → job_info ou jobs
  ├─ infrastructure dégradée / état insuffisant → doctor
  └─ arbitrage réel de route, portée, modalités ou réversibilité → plan_next
```

`latest_evidence` reste disponible lorsque des preuves existantes sont
nécessaires à la conclusion. Job connu ne signifie jamais action autorisée.

## Résilience de contrôle

La surface MCP distingue désormais exécution courte et exécution longue.
run_job reste synchrone. start_job lance uniquement un nom déjà présent dans jobs
et écrit un état persistant sous le runner local ; async_jobs et job_status
permettent ensuite de reprendre l'observation après un timeout ou un redémarrage
du tunnel. Un même job encore actif n'est pas dupliqué.

assess_blocker fournit la stratégie de reprise déterministe commune à Corpus.

## Cycle de vie des objets persistants spécialisés

Corpus ne possède pas de gestionnaire global de rétention. Chaque propriétaire
persistant reste responsable de son propre contrat de conservation et de
suppression. Pour tout nouvel objet persistant, sa documentation doit préciser :

1. sa source canonique ;
2. s'il est mutable ou immutable ;
3. si sa suppression est `safe`, `conditional`, `unsafe` ou encore
   `undefined` ;
4. ce qui cesse d'être résoluble lorsque l'objet disparaît ;
5. si metadata et payload ont des disponibilités distinctes ;
6. si une expiration logique existe indépendamment de la suppression physique.

Cette convention s'applique notamment aux états async, handoffs, occurrences
visuelles, Decision Receipts et rapports/preuves, sans leur imposer une durée de
conservation commune. Une référence devenue non résoluble après suppression
n'est pas pour autant historiquement invalide. De même, une expiration logique
ne vaut jamais ordre de suppression physique ; par exemple
`authorization.expires_at` ne signifie pas `delete_at`. Pour les occurrences
visuelles, la disponibilité du receipt/metadata reste distincte de celle du
payload.

## Provenance des références

Les champs qui transportent des références décrivent leur rôle causal :
`decision_ref`, `authorization_ref`, `evidence_refs`, `verification_refs`
ou `parent_ref` ne forment pas un espace global de résolution.

- Le propriétaire spécialisé reste responsable de la syntaxe, de la résolution
  et de l'intégrité éventuelles de ses références. Par exemple, Decision Receipt
  et Authorization conservent leurs propres contrats de vérification.
- Une référence peut être transportée comme ancre opaque sans promettre de
  résolution globale. `evidence_refs` et `parent_ref` peuvent notamment
  rester transport-only pour un consommateur qui ne les interprète pas.
- L'existence n'a pas à être vérifiée au simple transport lorsque le consommateur
  ne dépend pas de l'objet référencé ; elle doit l'être par l'owner au moment où
  une interprétation ou une résolution est réellement requise.
- Une référence historiquement valide peut devenir actuellement non résoluble
  sans rendre faux le lien historique qu'elle attestait.
- Un préfixe auto-descriptif comme `decision_context_receipt:` ou
  `authorization:` n'implique jamais l'existence d'un resolver fédéré.
