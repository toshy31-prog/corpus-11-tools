# Résultat synthétique v0.3 — checkpoint partiel

## Portée

- Statut : `pipeline_verified`.
- Régime de preuve : `internal_synthetic_only`.
- Validité externe : `not_claimed`.
- Indépendance : `independence_unknown`.

Ce test porte uniquement sur l'exécuteur synthétique existant. Il ne simule ni
panne réelle du processus ou du système, ni panne de stockage, ni écriture
concurrente. Il ne constitue ni un correctif du moteur, ni un transfert produit.

## Contrôle positif

Un checkpoint complet pris au curseur `2`, après `frame` et `compare`, est
restauré puis repris. La vue matérielle terminale vérifie exactement
`material_view(resumed) == material_view(baseline)`. Le journal est contrôlé
séparément et vaut exactement `['stop@2', 'resume@2']`.

Ce résultat établit l'équivalence de la vue matérielle déclarée dans ce cas. Il
ne revendique pas une identité complète avec la baseline incluant le journal.

## Checkpoint amputé

La mutation retire exactement l'artefact `compare`, à l'index `1`, du snapshot
valide. Le test vérifie avant restauration que la clé `artifacts` est le seul
champ modifié et qu'aucune autre valeur ne change.

Observation :

- `restore` accepte le checkpoint incohérent ;
- le curseur restauré reste `2`, avec un seul artefact au lieu du préfixe
  matériel attendu ;
- la reprise atteint le curseur terminal `4` ;
- la décision finale reste `retain-two-rivals` ;
- le paquet terminal contient trois artefacts, dans l'ordre
  `frame → decide → report` ;
- leur chaîne SHA-256 est cohérente avec cet ordre amputé, mais elle diffère de
  la chaîne de la baseline ;
- le journal terminal vaut `['stop@2', 'resume@2']`.

Les dimensions de récupération restent distinctes :

| Dimension | Résultat |
| --- | --- |
| Reprise du processus | oui |
| Décision finale identique | oui |
| Intégrité du checkpoint | non |
| Équivalence matérielle finale | non |
| Récupération complète | non |

Le contrôle négatif construit un état terminal ayant la bonne décision, mais
sans intégrité restaurée ni équivalence matérielle finale. Le validateur refuse
correctement de le qualifier comme récupération complète.

## Rivaux

`integrity_gated_resume` perd uniquement comme prédiction du comportement
actuel : il prédisait un rejet avant reprise, alors que `restore` accepte le
checkpoint amputé.

L'observation correspond à la branche prédite par `cursor_authoritative_resume`,
mais ne valide pas ce rival comme mécanisme correct. La reprise pilotée par le
curseur termine avec une décision identique tout en produisant un paquet
matériel divergent.

Conclusion bornée : dans ce cas synthétique, « le processus a fini » ne signifie
pas « la récupération est complète ».

## Liste fermée v0.3

1. `protocols/2026-09-09-partial-checkpoint-recovery-v0.3.md` ;
2. `fixtures/partial_checkpoint_recovery_v0.3.json` ;
3. `tests/test_partial_checkpoint_recovery.py` ;
4. `reports/synthetic/2026-09-09-partial-checkpoint-recovery-v0.3.md` ;
5. `state/current_state.md`.
