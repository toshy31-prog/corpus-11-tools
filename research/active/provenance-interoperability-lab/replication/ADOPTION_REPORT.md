# Adoption 2 — harnais de réplication indépendante locale

Date : 2026-09-05

## Portée observée

Le paquet gelé contient uniquement le protocole v0.2, le fixture de ses quinze
mutations et le contrat de sortie. La projection de la soumission contient ces
trois fichiers et `second_implementation/provenance_independent.py`; elle
exclut `tests/test_core_mutations.py`, `tests/test_initial_protocol.py` et
`replication_reference_adapter.py`.

La référence réexécute les deux profils existants. La soumission séparée utilise
un registre colonne et un ledger typé. Les noms et structures de profils ne
sont pas comparés : seuls les observables gelés le sont.

## Résultat attendu du test

- noyau conservé par deux représentations ;
- collision de même `receipt_id` et noyau différent rejetée ;
- `display_note` absente seulement avec `loss_ledger=["display_note"]` ;
- les quinze chemins du noyau restent détectables par les deux représentations ;
- dépendance commune Python déclarée ;
- `local_projection_tested`, mais `independence_unknown`.

## Contrôles négatifs

Le test de réplication rend divergent : noyau perdu, collision absorbée,
extension perdue silencieusement et mutation indétectable. Il rend une sortie
incomplète visible si `mutation_results` manque et retire l’établissement local
si l’accès au code de référence est signalé.

## États de changement

| État | Statut |
| --- | --- |
| Proposé | paquet minimal, seconde implémentation et comparaison d’observables gelés |
| Écrit | brief, contrat, adaptateur de référence, source séparée et test |
| Testé | après exécution des suites listées dans le test d’adoption |
| Intégré | adoption par la recherche ; aucune règle de provenance dans le harnais |
| Réobservé | requis lors d’une passe ultérieure avant une conclusion au-delà de cette exécution locale |

## Limite et retrait

L’accord ne démontre ni indépendance externe, ni conformité à PROV/RO-Crate
réels, ni absence de dépendance cachée. Retirer l’adoption si le noyau, les
mutations ou un encodeur de la recherche deviennent une branche de
`corpus_labs.independent_replication`, ou si la projection laisse entrer un
fichier de référence.
