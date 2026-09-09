# CCT-EXEC 3.7 — effets de perturbation observés (candidat)

## Lacune traitée

La version 3.6 décide à partir d'amplitudes ponctuelles déclarées. Une valeur favorable peut donc être inscrite sans correspondre aux observations, ou masquer une incertitude qui franchit le seuil.

## Gain concret

Le candidat 3.7 dérive chacune des 4 050 amplitudes de comptes d'événements avant et après perturbation. Les deux bras possèdent des racines, contrôleurs et domaines de panne distincts, engagés avant résultat. La valeur déclarée doit correspondre exactement aux comptes.

Des intervalles de Wilson ajustés avec `z = 4,4` couvrent la famille préengagée. La borne basse d'un effet cible doit atteindre 0,2 ; la plus grande borne absolue d'un effet non cible doit rester au plus à 0,05. Une absence d'effet imprécise est donc refusée même si son estimation ponctuelle vaut zéro.

Le statut `bounded_observed_perturbation_effects_candidate` reste synthétique. Il ne prouve ni l'indépendance réelle des échantillons, ni la fidélité d'une intervention de terrain, ni l'exhaustivité des causes communes recherchées.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v3.7-observed-perturbation-effects/test.mjs
node research/active/cct/sequenced-restoration-v3.7-observed-perturbation-effects/held-out/run-confrontation.mjs
```
