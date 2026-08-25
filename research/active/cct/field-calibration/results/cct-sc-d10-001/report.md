# CCT-SC-D10-001 — campagne fictive appariée

## Portée

Résultat `model_internal` sur 32 mondes factoriels fictifs et cinq variations déclarées. Il ne mesure aucune institution, population, personne, décision ou donnée réelle.

## Classifications mécaniques

| Variation | Verdict | Pertes de porte D10 | Trace D10 inutilisable | Restitution D10 inutilisable | Rival meilleur sur les trois charges et cinq portes |
|---|---|---:|---:|---:|---:|
| baseline | not_reversed_in_declared_model | 0/32 | 0/32 | 0/32 | 0/32 |
| d10_hidden_load | not_reversed_in_declared_model | 0/32 | 0/32 | 0/32 | 0/32 |
| d10_constrained_recourse | reversal_triggered | 0/32 | 24/32 | 0/32 | 0/32 |
| d10_delayed_restitution | not_reversed_in_declared_model | 0/32 | 0/32 | 0/32 | 0/32 |
| improved_baseline | not_reversed_in_declared_model | 0/32 | 0/32 | 0/32 | 0/32 |

## Conclusion la plus forte permise

Dans la variation de base, la condition de renversement est `not_reversed_in_declared_model`. D10 perd au moins une porte dans 0/32 mondes, sa trace devient inutilisable dans 0/32 mondes et sa restitution dans 0/32 mondes. Ces nombres décrivent uniquement les équations déclarées.

La variation de recours contraint produit `reversal_triggered` et rend la trace inutilisable dans 24/32 mondes. La survie de base est donc dépendante du protocole; elle ne constitue pas une validation du mécanisme.

Les charges visible, cachée et perdue restent séparées; aucun score global ne compense une porte perdue. Les variations montrent l'effet possible du protocole et des coefficients choisis.

## Génération, contrôles et retrait

- Générateur : `exhaustive_factorial`, graine `not_used_exhaustive_v0.1` (non utilisée car parcours exhaustif).
- Paramètres : deux niveaux déclarés pour charge, canal, rythme, perturbation et environnement.
- Invariants : mondes appariés, parcours complet, cinq portes et trois charges séparées, aucun score compensatoire.
- Effet possible du protocole : The generator, gate equations, thresholds and rival definitions create the measured differences; no parameter is calibrated to an external institution.
- Condition de retrait : Withdraw the result if the factorial space is incomplete, matched worlds differ between mechanisms, a gate is averaged away, an undeclared coefficient affects execution, or deterministic reconstruction changes an artifact.
