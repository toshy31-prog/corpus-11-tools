# Étude de la PR #22 — 13 septembre 2026

**Conclusion : conserver la question de recherche, demander des corrections avant fusion et ne pas promouvoir les quatre concepts en invariants du produit.** Le candidat met le doigt sur une lacune exécutable pertinente, mais son code ne garantit pas la réversibilité qu'il annonce. Les principes généraux recoupent largement la gouvernance déjà installée.

Source : [PR #22](https://github.com/toshy31-prog/corpus-11-tools/pull/22), commit `ffb7bd6f41581168b05dd8851693a1369fa53f5e`. Les quatre fichiers sont conservés sans modification dans `source/`. Les SHA-256, le HEAD local et la version Node figurent dans `manifest.json`. La base distante observée diffère du HEAD local : cette étude n'est pas une validation de l'intégration sur la base distante. Aucune fusion, publication ni modification du candidat distant.

## Résultats exécutés

- Tests livrés : **6/6 passent**, journal `original.tap`.
- Caractérisation ajoutée : **18/18 observations reproduites**, journal `characterization.tap`.
- Ces 18 succès ne valident pas le candidat : ils attestent notamment qu'il accepte les situations invalides décrites ci-dessous. Ce sont des tests de caractérisation du commit gelé ; après correction, plusieurs devront changer d'attente ou être remplacés par des tests de conformité.
- Données synthétiques ; aucune preuve externe nouvelle. Statut maintenu : `design_candidate_unvalidated`, `independence_unknown`.

Commandes de reproduction depuis la racine du dépôt :

```bash
node --test research/artifacts/pr22-study-2026-09-13/source/test.mjs
node --test research/artifacts/pr22-study-2026-09-13/characterization.test.mjs
```

Les exécutions archivées utilisent les chemins absolus équivalents. Aucun test global du produit n'est requis pour cette étude isolée ; aucun n'a été exécuté. Les tests fournis ont été lus avant exécution et ne demandent aucune dépendance tierce.

## Défauts et conséquences

Les lignes renvoient à `source/adjudication.mjs`, identique au fichier de la PR.

| Priorité | Localisation | Observation reproduite | Conséquence / correction attendue |
|---|---|---|---|
| P1 | 49–54 | `has(hash) === true` suffit ; `get` n'est jamais appelé. Octets absents, corrompus ou sans décodeur : `PASS`. | Résoudre effectivement, vérifier le digest, décoder, valider le schéma et le contenu requis pour le rejeu annoncé. |
| P1 | 3–4, 42–43 | `NaN`, `null`, texte non numérique, seuil absent : `PASS` promouvable. | Exiger des nombres finis et une définition de métrique avant le calcul. Ne pas convertir une donnée inconnue en succès. |
| P1 | 64–72 | Modifier `execution` de `FAIL` en `PASS` suffit à promouvoir le résultat falsifié ; une valeur contradictoire avec le paquet est aussi acceptée. | Lier preuve, métrique, paramètres et résultat ; recalculer le verdict plutôt que faire confiance à son champ modifiable. |
| P1 | 37, 49, 57 | Supprimer tout `compression_reversibility` permet un `PASS` sans résolveur. | Valider un mode obligatoire et cohérent ; un champ absent ne doit pas désactiver un contrôle requis. |
| P1 au regard du contrat annoncé | 72 | Après disparition de la source, l'ancien objet conserve `PASS` ; une nouvelle promotion le rejette. | Distinguer résultat historique et état de vérification actuel ; intégrer une vérification à l'usage si une validité actuelle est revendiquée. |
| P2 | 39–40 | Une compression explicitement irréversible et bornée sans provenance est rejetée. | Prévoir un résultat limité autorisé par un contrat explicite, sans lui attribuer de réversibilité. |
| P2 | 52 | `has: async () => false` donne `PASS` ; une exception du résolveur se propage. | Déclarer le contrat synchrone/asynchrone ; rejeter les types incompatibles ou attendre la résolution et traiter ses erreurs. |

Les trois observations de la revue GitHub sont confirmées dans leur portée. La remarque sur le verdict périmé est une incompatibilité avec le README, pas une preuve que tout résultat historique devrait être annulé.

## Les huit cas demandés par CODEX_HANDOFF

| Cas | Observation / limite |
|---|---|
| H1 — hash présent, octets indisponibles | `PASS`, zéro lecture du contenu. |
| H2 — octets présents, décodeur indisponible | `PASS` malgré des octets inexploitables. |
| H3 — incertitude ou dissensus supprimés | Un paquet réduit à sa valeur est accepté et annonce toujours le rejeu alternatif. |
| H4 — nouveau seuil | Possible à partir de la valeur conservée : 0,4 passe à 0,5 et échoue à 0,3. Cela ne nécessite pas de reconstruire toutes les observations. |
| H5 — nouvelle métrique | `[0,2 ; 0,6]` et `[0,4 ; 0,4]` ont la même moyenne mais des maximums différents. Une moyenne seule ne permet donc pas de recalculer le maximum ; le code n'explicite pas cette limite. |
| H6 — observateurs contradictoires | Incertitude et observations ne sont pas conservées dans l'objet résultat ; `raw_material_preserved` vaut pourtant vrai. Un stockage externe pourrait les préserver, mais ce code ne le vérifie pas. |
| H7 — disparition après promotion | L'ancien `PASS` persiste ; une nouvelle promotion constate la source indisponible. |
| H8 — perte intentionnelle bornée | Le mode sans provenance est rejeté même avec portée et coût explicites. Ces champs n'ont pas de contrat exécutable reconnu. |

H5 est un contre-exemple mathématique limité à la représentation par moyenne, pas un test d'un moteur de rejeu de métriques : la PR n'en fournit aucun. H6 ne prouve pas une destruction chez l'appelant ; il prouve l'absence de conservation ou de résolution garantie par ce module. Le premier test livré vérifie que l'entrée n'a pas été mutée, ce qui est plus faible qu'une preuve de conservation durable.

## Apport conceptuel par rapport à Corpus

Comparaison avec le plugin installé `1.6.2+codex.20260906013502`. Les quatre fichiers d'architecture examinés sont identiques octet pour octet à leurs versions du checkout ; empreintes dans `manifest.json`. Ce constat est borné à ces fichiers.

| Proposition | Déjà présent | Apport encore à établir |
|---|---|---|
| `residual_irreducibility` | La garde épistémique refuse de considérer un résidu comme naturellement secondaire et maintient les alternatives. | Documenter ce qui est actuellement non modélisé ; éviter que le nom « irréductibilité » fasse passer une ignorance provisoire pour une propriété intrinsèque. Aucun résidu n'est testé par l'exécutable fourni. |
| `explanatory_ceiling` | Distinction entre représentation locale et totalité, domaine de validité, non-attribution automatique d'une propriété au système. | Un plafond vérifiable propre à chaque usage. La chaîne fixe du candidat borne le discours mais ne contrôle pas les usages futurs. |
| `compression_ledger` | Registre de pertes, gains, reconstruction et coût total dans la garde ; laboratoire de trajectoire déjà accepté par transfert. | Un exemple d'information nécessaire manquant au registre existant. Pas de justification actuelle pour créer un deuxième registre universel. |
| `compression_reversibility` | Chemin de récupération déclaré, oubli reconstructible ; outils de hachage et journal à instantanés. | Un contrôle effectif, limité à une opération de rejeu définie, liant disponibilité, intégrité, données suffisantes et calcul. C'est le candidat le plus utile. |

Points d'architecture examinés :

- `corpus-11-tools/skills/corpus-11-routing/references/epistemic-governance.md` : comptabilité totale de compression, pertes, trajectoire, irréversibilité déclarée. Ce sont des règles analytiques, pas un stockage.
- `corpus-11-tools/labs/epistemic-trajectory/trajectory.mjs:3` et `:56` : un mouvement ou une trajectoire devient un statut discret. Les détails et raisons restent dans la trajectoire ; `reconstructible` et `recoveryPath` sont des déclarations, aucun artefact n'est chargé.
- `corpus-11-tools/labs/experiment-lab/governance/execution-closure.mjs:70`, `:99`, `:125` : lecture et hachage des fichiers à la clôture ; vérification possible contre des empreintes effectivement recalculées. Sans `actualArtifactHashes`, la vérification porte sur la cohérence de l'attestation, pas sur la disponibilité actuelle des fichiers. Pas de preuve générique de complétude sémantique.
- `corpus-11-tools/labs/python/corpus_labs/event_store.py:199`, `:260`, `:321` : instantanés complets journalisés, contrôle des données lues, restauration possible. Cela préserve l'état enregistré ; aucune garantie sur une observation jamais enregistrée ni sur une pièce externe seulement référencée.
- `transfers/accepted/epistemic-trajectory-governance.md` : destination et condition de retrait de l'intégration existante. Une extension éventuelle doit réutiliser cette frontière de transfert.

Cette cartographie cible les composants directement pertinents ; ce n'est pas un inventaire exhaustif de tous les seuils et résumés du dépôt.

## Concurrent plus simple : reçu de calcul et vérification à l'usage

Alternative de conception **non implémentée**, élaborée après lecture des défauts : comparaison post hoc, pas victoire expérimentale.

Pour une seule famille de calculs de seuil, conserver un reçu : référence d'artefact avec digest, version du schéma, identifiant/version de la règle, paramètres, résultat historique, portée de rejeu et pertes connues. Les pertes et le plafond peuvent réutiliser le registre existant au lieu de quatre nouveaux blocs obligatoires. Les informations nécessaires ne disparaissent pas parce que le format est plus court.

À l'usage d'une capacité de rejeu, un vérificateur résout l'artefact, contrôle ses octets, applique un décodeur et une règle autorisés, vérifie les données nécessaires à cette règle puis recalcule. Il renvoie séparément le résultat et l'état de vérification, avec date et portée. Il ne charge pas de code arbitraire depuis la source. Les erreurs d'accès deviennent un état explicite d'indisponibilité.

Deux portées distinctes évitent les promesses excessives :

1. **Changer seulement le seuil** : conserver une valeur valide et une métrique identifiée peut suffire au calcul. Cela ne vérifie pas l'origine empirique de la valeur.
2. **Recalculer une autre métrique** : exige les observations et transformations nécessaires à cette métrique. Une moyenne et son hash ne suffisent pas au maximum. Une métrique hors du domaine prévu doit recevoir `unsupported`, pas une promesse générale de réversibilité.

| Dimension commune | Candidat actuel | Alternative proposée |
|---|---|---|
| Preuves disponibles | Identifiant et valeur, puis appel à `has` | Même artefact autorisé, mais octets effectivement chargés : infrastructure de résolution supplémentaire nécessaire |
| Résultat | Champ `execution` cru | Calcul dérivé de la règle versionnée et de l'entrée vérifiée |
| Péremption | Objet `PASS` sans portée temporelle | Résultat historique distinct d'une vérification actuelle à l'usage |
| Perte bornée | Rejet ou contournement par champs absents | Mode explicite avec perte et opération encore permise |
| Coût | Nombreux booléens faciles à déclarer ; coût de résolution non réalisé | Décodeurs, stockage, versions, contrôles métier et coût de lecture ; réutilisation du registre existant |

La comparaison ne démontre ni moins de code total ni moins de coût : décodeurs, règles et disponibilité du stockage doivent être comptés. Aucun vérificateur universel ne peut certifier par le seul schéma que tout dissensus pertinent a été collecté. Il faut une exigence métier bornée, des pièces attendues et, si nécessaire, une évaluation indépendante.

## Décision et condition de révision

Recommandation : conserver ce travail en recherche, corriger les acceptations erronées, puis expérimenter le seul mécanisme de vérification du rejeu dans un laboratoire limité. Ne pas ajouter quatre invariants ni imposer un audit universel à chaque synthèse.

Une comparaison utile ferait passer un candidat corrigé et le reçu concurrent sur les mêmes artefacts, règles autorisées et cas gelés, avec contrôle des faux rejets, des fausses acceptations, des lectures, du stockage, des dépendances et des possibilités de recalcul. La perte de sources suspendrait la capacité revendiquée de revérification actuelle ; elle ne transformerait pas automatiquement un résultat historique en faux résultat.

Je réviserais la préférence pour la réutilisation de l'architecture existante si le candidat corrigé préservait une distinction décisionnelle que cette alternative ne peut préserver à portée et ressources égales. Un passage des cas synthétiques établirait une cohérence locale du mécanisme, pas la nécessité scientifique des quatre concepts ni leur validité de terrain.
