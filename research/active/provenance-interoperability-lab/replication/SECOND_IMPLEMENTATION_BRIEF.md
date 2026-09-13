# Provenance core mutations v0.2 — brief de seconde implémentation

Statut : paquet gelé pour une réplication locale séparée. Il ne modifie ni le
noyau, ni les quinze mutations, ni le statut `pipeline_verified` de la
recherche.

## Seules entrées autorisées

| Entrée | SHA-256 |
| --- | --- |
| `protocols/core_mutations_v0.2.md` | `e6f48b57534e419ba9ad6e2fb63bba7f4614e832b918c28e6b6323c81d76891f` |
| `fixtures/core_mutations_v0.2.json` | `f3b27021304752573125f95d5625d131976d0ebfa71071f260d999ebdda50beb` |
| `replication/output_contract.json` | `ed6a8f5f443ebeb3c4bc1a5b08265792f3f72affc27bdf97a0d9ab025af54bc6` |

Le soumissionnaire reçoit ce brief, ces trois entrées et aucun encodeur,
décodeur ni test de référence.

## Sortie requise

Le contrat fixe une sortie JSON qui rend visibles, sans noms ni structure des
profils de référence :

1. conservation du noyau sur deux représentations ;
2. rejet d’un reçu de même `receipt_id` mais de noyau différent ;
3. préservation de `display_note`, ou sa perte explicitement inscrite dans un
   registre de perte ;
4. les quinze chemins scalaires du noyau et leur détectabilité à travers les
   deux représentations.

Les seules valeurs de sortie comparées sont celles indiquées par
`comparable_paths`. Une sortie incomplète ou une divergence reste visible,
jamais moyennée.

## Attestation et limite

Déclarer langage, runtime, paquets, fichiers lus et dépendances de code. La
projection locale doit contenir seulement les trois entrées et le code de la
soumission. Une dépendance commune reste dans le reçu ; toute dépendance ou
entrée observée sans déclaration invalide le contrat.

Même si la projection exclut le code de référence et que les sorties
convergent, le verdict reste `independence_unknown` : aucun isolement de
processus, d’auteur, d’environnement ou externe n’est démontré.
