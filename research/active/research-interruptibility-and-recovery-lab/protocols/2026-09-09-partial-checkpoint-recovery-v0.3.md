# Protocole v0.3 — checkpoint partiel et reprise bornée

## Portée et gel

Ce protocole est fixé avant la première exécution de la v0.3. Il réutilise
exclusivement `initial_state`, `advance`, `serialize`, `restore` et
`material_view` depuis `tests/test_cutpoint_recovery.py`, sans les modifier.

La portée est `pipeline_verified`, `internal_synthetic_only`. La validité
externe est `not_claimed` et l'indépendance reste `independence_unknown`. Le
pré-enregistrement n'est pas revendiqué comme démontré par un tiers ou par un
scellement indépendant.

Liste fermée écrite avant exécution :

1. `protocols/2026-09-09-partial-checkpoint-recovery-v0.3.md` ;
2. `fixtures/partial_checkpoint_recovery_v0.3.json` ;
3. `tests/test_partial_checkpoint_recovery.py`.

Aucun rapport ni état courant n'entre dans cette première passe.

## Contrôle positif

Le pipeline est coupé au curseur `2`, après `frame` et `compare`. Le snapshot
complet est restauré puis mené à son terme. Le contrôle exige séparément :

- `material_view(resumed) == material_view(baseline)` ;
- le journal exact `['stop@2', 'resume@2']`.

Cette comparaison ne revendique pas une identité complète avec la baseline,
dont le journal est vide.

## Mutation unique

Le checkpoint partiel part du même snapshot JSON valide. La mutation retire
uniquement l'artefact d'empreinte produit par `compare`, à l'index `1`. Le
curseur reste `2`; la dépendance `tie-break-v1`, la décision, le recours, le
journal et tous les autres champs restent identiques.

Avant toute restauration, le test doit prouver que :

- l'artefact retiré est exactement le hash calculé pour `compare` ;
- la seule clé de premier niveau modifiée est `artifacts` ;
- la liste mutée égale exactement la liste initiale privée de l'index `1` ;
- aucun autre champ ni aucune autre valeur ne change.

## Rivaux gelés

`cursor_authoritative_resume` prédit que le snapshot sera accepté, que le
processus atteindra le curseur terminal et que la décision restera
`retain-two-rivals`, même si le paquet matériel final diverge. Il perd si la
restauration est refusée avant reprise.

`integrity_gated_resume` prédit que l'incohérence entre `cursor == 2` et un
seul artefact sera refusée avant toute nouvelle étape. Il perd si le pipeline
accepte le snapshot, reprend et termine avec un paquet matériel divergent.

Le résultat n'est pas codé comme un verdict unique. Deux classifications sont
admises :

- `rejected_before_resume` : `cursor_authoritative_resume` perd ;
- `resumed_with_material_divergence` : `integrity_gated_resume` perd.

Tout autre résultat est `candidate_set_incomplete` et arrête l'interprétation.

## Observables séparés

La reprise du processus observe l'acceptation ou le rejet par `restore`, une
éventuelle erreur de `advance` et le curseur final.

L'intégrité de l'état observe le curseur restauré, le nombre et l'ordre des
artefacts, leur chaîne SHA-256, la dépendance d'exécution et le journal.

L'équivalence du résultat final compare la vue matérielle complète avec la
baseline, ainsi que la décision et la chaîne d'artefacts séparément. Une
décision identique ne suffit jamais à qualifier une récupération complète.

## Critères d'échec et arrêt

Arrêter sans réparation si le contrôle positif diverge, si la mutation touche
un autre champ, si l'exécuteur v0.2 doit être modifié, si les observations ne
permettent pas de séparer processus, état et résultat, ou si la classification
est `candidate_set_incomplete`.

Conserver également la condition de retrait v0.2 : l'omission de
`execution_dependency` doit continuer à modifier les hashes et la décision.

Ce protocole ne teste ni arrêt de processus système, ni panne de stockage, ni
écriture concurrente, ni récupération universelle.
