# État courant

L’ancienne égalité snapshot/restored est `weakened` : elle ne testait aucun
mécanisme de reprise. Le pipeline généré récupère exactement à 4/4 coupures
lorsque la dépendance d’exécution est sérialisée. Son omission change les hashes
et la décision. Portée `pipeline_verified`.

La v0.3 synthétique teste un checkpoint pris au curseur `2` puis amputé de son
artefact `compare`, sans modifier les autres champs. `restore` accepte cet état,
la reprise atteint le curseur `4` et conserve la décision
`retain-two-rivals`, mais le paquet terminal ne contient que trois artefacts
dans l'ordre `frame → decide → report`.

## Qualification de la récupération v0.3

- reprise du processus : oui ;
- décision finale identique : oui ;
- intégrité du checkpoint : non ;
- équivalence matérielle finale : non ;
- récupération complète : non.

Le contrôle positif vérifie séparément l'égalité de `material_view()` avec la
baseline et le journal exact `['stop@2', 'resume@2']`; il ne revendique pas une
identité complète incluant le journal. Le contrôle négatif confirme qu'une
bonne décision terminale ne suffit pas à qualifier une récupération complète.

`integrity_gated_resume` perd uniquement comme prédiction du comportement
actuel, puisque le checkpoint incohérent n'est pas rejeté. Cela ne valide pas
`cursor_authoritative_resume` comme mécanisme correct : son issue observée reste
matériellement divergente.

Portée conservée : `pipeline_verified`, `internal_synthetic_only`. Aucune panne
système réelle n'est testée, la validité externe est `not_claimed` et
l'indépendance reste `independence_unknown`. Aucun correctif moteur ni transfert
produit n'est proposé.
