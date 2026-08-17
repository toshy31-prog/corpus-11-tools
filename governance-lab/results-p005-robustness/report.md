# Robustesse de protocole P005-DT-002-R1

Ces variations sont des analyses de sensibilité déclarées, non des probabilités sur le monde.

| Variation | Verdict de viabilité | Protocoles perdant une porte | Gain face à v0.11 | Statut du gain | Domination simple |
|---|---|---|---:|---|---|
| baseline | cct_v012_lean_survives_p005_dt_002 | full_polycrisis | 6/6 | persists | aucune |
| hidden_complexity | cct_v012_lean_survives_p005_dt_002 | full_polycrisis | 5/6 | persists | aucune |
| weak_load_shedding | cct_v012_lean_survives_p005_dt_002 | full_polycrisis | 6/6 | persists | aucune |
| false_independence | cct_v012_lean_survives_p005_dt_002 | full_polycrisis | 5/6 | persists | aucune |
| core_erosion | cct_v012_lean_survives_p005_dt_002 | full_polycrisis | 6/6 | persists | aucune |
| combined_pessimistic | cct_v012_lean_survives_p005_dt_002 | full_polycrisis | 0/6 | not_established_under_variation | aucune |

## Conclusion

La candidate est classée dépendante du protocole si une variation plausible préspécifiée renverse son verdict. Aucun renversement n'est produit dans cette famille de variations.

Le verdict de viabilité et le gain de rendement sont distincts. Le gain face à v0.11 n'est plus établi sous : combined_pessimistic.

Un maintien du verdict n'établit pas la robustesse territoriale ; il borne seulement cette famille de sensibilité.
