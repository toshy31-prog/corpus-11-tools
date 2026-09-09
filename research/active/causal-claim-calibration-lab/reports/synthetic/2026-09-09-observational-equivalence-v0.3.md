# Résultat — équivalence observationnelle v0.3

## Exécution observée

- Campagne : `CCCL-OE-001-v0.3`.
- Commande unique :
  `/usr/bin/python3 research/active/causal-claim-calibration-lab/tests/test_observational_equivalence_v0_3.py`.
- Résultat exact : `PASS causal observational equivalence v0.3: 2
  observationally identical models, ATE bound [0,1], 1 rejected conclusion,
  1 compatible survivor`.
- Manifeste scellé : SHA-256
  `ba06af577e0e95f5abfea1b67ce3c8507693b0176750243505aa73eb1a8947dd`.

## Résultat causal borné

Les deux modèles donnent la même distribution observationnelle : masse `1/2`
sur `(X=0,Y=0)` et masse `1/2` sur `(X=1,Y=1)`. Les observations seules ne les
séparent donc pas.

Sous binarité et cohérence, sans ignorabilité ni direction causale imposée :

- `E[Y(1)]` est borné par `[1/2,1]` ;
- `E[Y(0)]` est borné par `[0,1/2]` ;
- `ATE` est borné par `[0,1]`.

Le modèle `direct_effect_one` occupe l'extrémité `ATE=1`; le modèle
`latent_common_cause_zero` occupe l'extrémité `ATE=0`. Le verdict fondé sur les
observations seules est `partially_identified`.

Le résultat d'intervention synthétique gelé observe `1/2` dans chacun des deux
bras et donc `ATE=0`. Il rejette la conclusion `C-direct-ATE-1` et conserve
`C-common-ATE-0` comme seul survivant compatible dans l'ensemble fermé des deux
candidats.

## Limites

Le résultat est `model_internal`. Le témoin d'intervention, les modèles et les
critères ont été construits dans le même chantier synthétique : ils vérifient
qu'une conclusion peut perdre, pas que le modèle survivant est vrai ni que
l'ensemble des modèles est complet. Aucune validité externe, indépendance
externe, intégration produit ou transport vers une population réelle n'est
établie. Le statut d'indépendance reste `independence_unknown`.

Retirer le résultat si une empreinte scellée change, si les distributions
observationnelles cessent d'être identiques, si les effets d'intervention ne
divergent plus, si les bornes ne sont plus dérivées des seules hypothèses
déclarées, ou si aucune conclusion pré-enregistrée ne perd.
