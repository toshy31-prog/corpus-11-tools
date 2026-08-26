# Validation de release v1.5.0

## Périmètre

Cette release transforme la représentation de Corpus sans remplacer son
contenu analytique : le paquet installé devient explicitement le corps actif
d'une discipline versionnée, tandis que lignée, invariants, provenance,
archives, laboratoires, recherches et transferts conservent des fonctions
distinctes. Elle ne confère ni conscience ni autonomie au plugin, ne promeut
aucun résultat de recherche en règle active et ne présume pas son installation
dans un hôte donné.

## Matrice attendue

| Surface | Contrôle | Attendu |
|---|---|---|
| Paquet | `python3 tools/validate_package.py` | PASS |
| Graphe | `python3 tools/check_graph.py` | PASS |
| Documentation | `python3 tools/check_docs.py` | PASS |
| Frontières | `python3 tools/check_boundaries.py` | PASS |
| Continuité de l'organisme | `python3 tools/check_organism.py --self-test` | PASS, lignée, porteurs, cycle d'activation et mutations adversariales |
| Contenu distribué | `python3 tools/check_release_content.py` | chaque chemin et chaque octet du plugin concordent avec l'attestation ; seule l'auto-référence déclarée est exclue |
| Gardes extraites de recherche | `python3 tools/check_research_derived_guards.py` | PASS, cas positifs et négatifs |
| Candidat de surface conversationnelle | `python3 tools/check_conversational_surface.py` | 6/6 fixtures : paquet analytique scellé sous variations de présentation |
| Intégrité sources/archives | `python3 tools/check_integrity.py` | PASS |
| Identité release/tag locale | `python3 tools/check_release_identity.py` | tag immuable cohérent sur l'histoire de `main` locale |
| Identité release distante | `python3 tools/check_release_identity.py --require-remote` | après push, tag cohérent et ancêtre d'`origin/main` |
| Lignée publique distante | `python3 tools/check_organism.py --require-remote-tags` | objets de tags et commits publics historiques inchangés ; v1.5.0 publiée au commit local |
| Contrats et couverture des evals | `python3 tools/check_evals.py` | 77/77 contrats ; 49/49 capabilities couvertes positivement |
| Métavalidation | `python3 tools/test_validation_guards.py` | toutes les mutations adversariales rejetées |
| Installation plugin | actualisation Codex + installation depuis `corpus-11-local` + `codex plugin list` | version `1.5.0+codex.20260826132834` détectée ; nouvelle tâche requise pour l'accès en contexte |
| Laboratoires Python | tests `corpus_labs` | tous les tests collectés passent ; cardinalité figée par la gate totale |
| Moteurs génériques Node | tests de trajectoire et du moteur expérimental | tous les modules déclarés passent ; zéro test interdit |
| Adaptateurs de recherche et simulateur de domaine | tests Node | tous les modules déclarés passent ; zéro test interdit |
| Recherche CCT | `executable/run_all.py` | 15/15 contrôles |
| Non-régression scientifique | récupération, temporalité, factorisation | toutes les unités déclarées passent sans dérive matérielle inexpliquée |
| Routage comportemental | `tools/run_behavioral_evals.py --fresh --codex-home .validation-state/behavioral/codex-home --initialize-codex-home` | 77/77 en ordre forward et reverse, dans un état Codex isolé |

La gate totale compte les unités présentes, exécute l'ensemble déclaré, refuse
une découverte vide et rend explicite toute modification de cardinalité. Les
nombres intrinsèques au protocole — 15 contrôles CCT et 77 evals de routage —
restent des invariants explicites.

## Lecture exhaustive

`docs/release-content-v1.5.0.json` énumère chaque fichier distribué du plugin,
sa taille en octets et son SHA-256. Son propre chemin est la seule exclusion,
car un fichier ne peut contenir sa propre empreinte sans circularité. Le tag Git
annoté couvre néanmoins ce manifeste, son nom, son mode et tous les autres
objets du dépôt. La validation finale ajoute :

- lecture binaire de chaque fichier attesté ;
- parsing de tous les JSON suivis ;
- lecture UTF-8 de tous les fichiers texte suivis, avec refus des octets NUL et
  signalement des fins de ligne non canoniques ;
- `git diff --check`, `git fsck --full` et inspection de l'archive du tag ;
- relecture sémantique des surfaces de release et du diff indexé.

## État de l'évaluation vivante

L'attestation comportementale du 2026-08-25 concerne une release antérieure.
Elle reste une preuve historique locale et bornée ; elle n'est pas réétiquetée
comme réobservation de v1.5.0.

Sur instruction du mainteneur, l'invocation vivante Codex qui consomme des
crédits API reste différée manuellement jusqu'à nouvelle autorisation. Elle
n'est ni supprimée ni déclarée `PASS`. Les contrôles locaux non payants
continuent et cette différation n'empêche ni le commit ni le push.

## Frontières vérifiées

- l'installation, l'accès en contexte, l'exercice et la réobservation restent
  des états distincts de la publication ;
- une recherche peut modifier la mémoire et les questions de Corpus sans
  devenir une règle du produit ;
- seul un transfert accepté, testé, publié puis installé peut modifier le corps
  actif au niveau revendiqué ;
- les tags et commits historiques restent reconstructibles, y compris la
  distinction entre anciens tags locaux divergents et lignée publique continue ;
- aucun runtime Corpus n'importe une configuration, un résultat ou une
  conclusion de recherche ;
- les fixtures démontrent le fonctionnement des instruments, pas une validation
  scientifique extérieure.

Un contrôle non exécuté, une découverte vide ou un résultat non comparable
interdit un verdict `PASS total`. Un épuisement extérieur de crédits, quota ou
capacité Codex reste `BLOCKED_EXTERNAL_CAPACITY` et ne vaut ni succès ni échec
analytique.
