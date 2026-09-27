# AI START HERE — Corpus sans contexte préalable

Tu es une IA qui découvre Corpus sans mémoire de conversations antérieures. N'essaie pas de reconstruire le projet en lisant tout le dépôt.

## Ordre de lecture minimal

1. `AI_START_HERE.md`.
2. `ONBOARDING.md`.
3. `CARTE_DES_PROJETS.md`.
4. `PILOTAGE_CORPUS.md`.
5. Runtime local : `projets/corpus-local-llm-migration/README.md`, `CONTEXTE_LOCAL.md`, `ETAT_LOCAL_ACTUEL.md`, puis `state.json`.
6. Corpus 11 Tools : `corpus-11-tools/AGENTS.md`, puis `corpus-11-tools/README.md`.
7. Pont ChatGPT local si pertinent : `tools/corpus-gpt/README.md`, `CONTRACT.md`, `OPERATIONS.md`.

Ne charge pas tout `research/`, les archives ou toutes les preuves sans besoin précis.

## Modèle mental minimal

- Corpus n'est pas un seul programme et n'est pas synonyme d'OpenCode.
- Corpus local est l'environnement agentique local.
- OpenCode est une brique interne, pas l'identité du produit ni son interface finale.
- Qwen est le modèle conversationnel local actuellement observé ; sa présence ne prouve pas la réussite de tous les workflows.
- Corpus 11 Tools est le corps analytique versionné/installable.
- `research/` est séparé du produit.
- Scouts et Corpus 3D sont des applications distinctes.
- le MCP Corpus GPT est un pont borné, pas un shell général.

## Règles épistémiques obligatoires

Toujours distinguer : `écrit → testé → intégré → installé → lancé → observé en usage`.

Distinguer aussi état courant et preuve historique ; code du dépôt et état machine ; recherche et produit ; capacité déclarée et robustesse démontrée ; échec du transport et échec du travail local.

En cas de contradiction documentaire, chercher la source plus récente et plus proche de l'état effectif. Ne jamais choisir silencieusement une version commode.

## Reprise d'un travail

Avant toute écriture : vérifier Git et les travaux concurrents ; lire le contrat du sous-système ; vérifier les outils disponibles ; préserver le working tree ; reprendre au dernier checkpoint vérifié.

Tout blocage suit `projets/corpus-local-llm-migration/BLOCKER_RESILIENCE.md`. Un timeout ou une session MCP interrompue n'est pas une preuve d'échec. Ne jamais dupliquer un run à état inconnu.

## Ne pas faire

- prendre un README d'expérience pour l'état global ;
- considérer une recherche comme intégrée parce qu'elle est dans le dépôt ;
- déduire une installation depuis la présence des sources ;
- écraser un working tree pour retrouver un état propre ;
- contourner un refus de permission ;
- supprimer des données primaires pour résoudre implicitement un manque d'espace ;
- demander un copier-coller terminal si un outil Corpus borné peut raisonnablement faire l'action.

Une IA peut considérer son amorçage suffisant lorsqu'elle sait expliquer séparément Corpus local, Corpus 11 Tools, recherche, applications, stockage/état, pont GPT et leur niveau de maturité.
