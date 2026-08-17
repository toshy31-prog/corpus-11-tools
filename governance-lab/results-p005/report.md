# Résultats P005-DT-001

## Verdict

**cct_v011_survives_p005_dt001**

Verdict interne au jumeau synthétique. Il ne valide ni paramètres, ni causalité, ni transport territorial.

## Médianes par protocole

| Protocole | Mode | Besoins non servis | Dépassement éco | Droits suspendus | Décisions sans trace | Récupération | Charge | Cause commune | Portes perdues |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| grid_and_payments | CCT v0.11 — charge bornée | 0.0% | 0.0% | 0.0% | 0.0% | 0.0 j | 83.8 | 5.0% | 0 |
| grid_and_payments | CCT v0.10 — contrôles sectoriels | 0.3% | 0.0% | 0.0% | 0.0% | 2.7 j | 120.3 | 7.3% | 0 |
| grid_and_payments | Urgence centralisée simple | 0.0% | 0.0% | 0.0% | 0.0% | 3.0 j | 61.5 | 6.7% | 0 |
| transition_collision | CCT v0.11 — charge bornée | 0.0% | 0.0% | 0.0% | 0.0% | 0.0 j | 84.8 | 4.3% | 0 |
| transition_collision | CCT v0.10 — contrôles sectoriels | 0.0% | 0.0% | 0.0% | 0.0% | 2.9 j | 121.2 | 6.2% | 0 |
| transition_collision | Urgence centralisée simple | 0.0% | 1.2% | 0.0% | 0.0% | 3.3 j | 62.0 | 5.7% | 0 |
| security_saturation | CCT v0.11 — charge bornée | 0.0% | 0.0% | 0.0% | 0.0% | 7.2 j | 105.5 | 13.1% | 0 |
| security_saturation | CCT v0.10 — contrôles sectoriels | 4.5% | 0.0% | 0.2% | 9.8% | 17.7 j | 158.3 | 22.0% | 2 |
| security_saturation | Urgence centralisée simple | 0.0% | 0.0% | 17.6% | 7.3% | 12.2 j | 76.0 | 15.3% | 1 |
| full_polycrisis | CCT v0.11 — charge bornée | 55.7% | 14.9% | 6.8% | 14.0% | 32.5 j | 176.6 | 34.9% | 5 |
| full_polycrisis | CCT v0.10 — contrôles sectoriels | 74.0% | 19.7% | 16.4% | 26.1% | 44.6 j | 231.8 | 49.1% | 6 |
| full_polycrisis | Urgence centralisée simple | 28.5% | 8.9% | 19.1% | 12.9% | 29.4 j | 111.9 | 32.6% | 6 |

## Test de perte

- **grid_and_payments** — porte CCT perdue : non ; rival simple protège autant : non ; rival au moins 15 % moins chargé : oui ; domination : non.
- **transition_collision** — porte CCT perdue : non ; rival simple protège autant : non ; rival au moins 15 % moins chargé : oui ; domination : non.
- **security_saturation** — porte CCT perdue : non ; rival simple protège autant : non ; rival au moins 15 % moins chargé : oui ; domination : non.
- **full_polycrisis** — porte CCT perdue : oui ; rival simple protège autant : non ; rival au moins 15 % moins chargé : oui ; domination : non.

## Conclusion bornée

P-005-DT-001 mesure l'interférence entre protections sous ressources partagées. Un succès indique seulement que les équations préspécifiées ne réfutent pas la candidate. Les seuils restent conventionnels jusqu'à calibration indépendante.
