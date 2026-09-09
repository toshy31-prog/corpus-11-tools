# CCT-EXEC 3.6 — perturbation croisée des signaux (candidat)

## Lacune traitée

La version 3.5 peut établir une lignée documentaire cohérente tout en omettant une cause commune réelle entre deux signaux.

## Gain concret

Le candidat 3.6 engage deux perturbations indépendantes des générateurs pour chacun des 45 signaux. Chaque sonde compare les 45 effets normalisés. Le signal cible doit réagir d'au moins 0,2 ; tout effet supérieur à 0,05 sur un autre signal révèle une dépendance non enregistrée et bloque le portefeuille.

La confrontation tenue à l'écart ajoute un effet croisé de 0,2 entre une marge et un risque dont les lignées documentaires restent distinctes. Les versions précédentes l'acceptent ; 3.6 le refuse avec `cross_signal_perturbation_detected`.

Le statut `bounded_cross_signal_perturbation_candidate` établit seulement une sélectivité dans les sondes synthétiques préengagées. Il ne prouve ni la fidélité d'une intervention réelle, ni l'exhaustivité de la recherche de causes communes, ni un effet causal au-delà du protocole.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v3.6-cross-signal-perturbation/test.mjs
node research/active/cct/sequenced-restoration-v3.6-cross-signal-perturbation/held-out/run-confrontation.mjs
```
