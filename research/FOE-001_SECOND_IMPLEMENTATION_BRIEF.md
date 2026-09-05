# FOE-001 — brief pour seconde implémentation indépendante

Statut : paquet de reprise. Il ne constitue ni une implémentation ni un
verdict de passage.

## Entrées gelées à utiliser, sans modification

| Artefact | SHA-256 |
| --- | --- |
| `FOUNDATIONS_OF_EVIDENCE_PROTOCOL_v0.1.md` | `ad523be81c6a4f3478b8d88de41b85b99ee30b368c0f7729942d3cdbabd63711` |
| `fixtures/foundations_of_evidence_foe_001.json` | `0fde7cb2e30ee0352ab9f0101666698e485559fede42d7ec5df930daa22d41b1` |

L’implémenteur reçoit ces deux fichiers et ce brief, mais pas les adaptateurs
ni l’orchestrateur actuels de FOE-001.

## Travail demandé

Écrire, dans un répertoire distinct, une implémentation qui accepte le fixture
FOE-001 et produit les quatre résultats suivants :

1. `independent`, `shared_failure_mode` et `independence_unknown` pour les
   trois variantes de lignage ;
2. conservation de tous les champs du noyau au travers de deux représentations,
   avec rejet d’une collision et traitement visible d’une extension ;
3. `stable`, `declared_rule_change` et `unexplained_drift` pour les migrations ;
4. préservation de la distinction entre le cluster de mode commun et celui de
   lignage incomplet, sans les compter comme des preuves indépendantes.

La procédure témoin doit accepter le mode commun par simple comptage de sources
nommées, tandis que la procédure évaluée doit le refuser.

## Contraintes d’indépendance à attester

- auteur ou exécutant distinct ;
- code écrit sans consulter les adaptateurs ni l’orchestrateur actuels ;
- dépendances, langage, version d’exécution et empreinte du fichier de sortie
  déclarés ;
- résultat de chaque variante et écart éventuel conservés ;
- aucun champ du fixture complété ou corrigé silencieusement.

## Réception

La réception compare uniquement les sorties attendues, les traces d’exécution,
les empreintes et les dépendances. Un accord de sortie ne suffit pas : une
dépendance commune non déclarée, l’accès au code existant ou une modification
des entrées entraîne `independence_unknown` et maintient la décision
`réparation_ciblée`.
