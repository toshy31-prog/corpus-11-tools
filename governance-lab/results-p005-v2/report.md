# Résultats P005-DT-002

## Verdict

**cct_v012_lean_survives_p005_dt_002**

Verdict interne au jumeau synthétique. Il ne valide ni paramètres, ni causalité, ni transport territorial.

## Médianes par protocole

| Protocole | Mode | Besoins non servis | Dépassement éco | Droits suspendus | Décisions sans trace | Récupération | Charge | Cause commune | Portes perdues |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| grid_and_payments | CCT v0.11 — charge bornée | 0.0% | 0.0% | 0.0% | 0.0% | 0.0 j | 83.8 | 5.0% | 0 |
| grid_and_payments | CCT v0.10 — contrôles sectoriels | 0.3% | 0.0% | 0.0% | 0.0% | 2.7 j | 120.3 | 7.3% | 0 |
| grid_and_payments | Urgence centralisée simple | 0.0% | 0.0% | 0.0% | 0.0% | 3.0 j | 61.5 | 6.7% | 0 |
| grid_and_payments | CCT v0.12 — noyau frugal | 0.0% | 0.0% | 0.0% | 0.0% | 0.0 j | 60.9 | 4.9% | 0 |
| transition_collision | CCT v0.11 — charge bornée | 0.0% | 0.0% | 0.0% | 0.0% | 0.0 j | 84.8 | 4.3% | 0 |
| transition_collision | CCT v0.10 — contrôles sectoriels | 0.0% | 0.0% | 0.0% | 0.0% | 2.9 j | 121.2 | 6.2% | 0 |
| transition_collision | Urgence centralisée simple | 0.0% | 1.2% | 0.0% | 0.0% | 3.3 j | 62.0 | 5.7% | 0 |
| transition_collision | CCT v0.12 — noyau frugal | 0.0% | 0.0% | 0.0% | 0.0% | 0.0 j | 61.9 | 4.2% | 0 |
| security_saturation | CCT v0.11 — charge bornée | 0.0% | 0.0% | 0.0% | 0.0% | 7.2 j | 105.5 | 13.1% | 0 |
| security_saturation | CCT v0.10 — contrôles sectoriels | 4.5% | 0.0% | 0.2% | 9.8% | 17.7 j | 158.3 | 22.0% | 2 |
| security_saturation | Urgence centralisée simple | 0.0% | 0.0% | 17.6% | 7.3% | 12.2 j | 76.0 | 15.3% | 1 |
| security_saturation | CCT v0.12 — noyau frugal | 0.0% | 0.0% | 0.0% | 0.0% | 4.9 j | 75.8 | 11.2% | 0 |
| full_polycrisis | CCT v0.11 — charge bornée | 55.7% | 14.9% | 6.8% | 14.0% | 32.5 j | 176.6 | 34.9% | 5 |
| full_polycrisis | CCT v0.10 — contrôles sectoriels | 74.0% | 19.7% | 16.4% | 26.1% | 44.6 j | 231.8 | 49.1% | 6 |
| full_polycrisis | Urgence centralisée simple | 28.5% | 8.9% | 19.1% | 12.9% | 29.4 j | 111.9 | 32.6% | 6 |
| full_polycrisis | CCT v0.12 — noyau frugal | 44.2% | 11.1% | 0.0% | 7.1% | 27.0 j | 135.6 | 30.1% | 4 |
| communications_and_keys | CCT v0.11 — charge bornée | 2.6% | 0.0% | 0.0% | 0.0% | 6.1 j | 103.2 | 11.1% | 0 |
| communications_and_keys | CCT v0.10 — contrôles sectoriels | 18.7% | 0.0% | 0.0% | 10.2% | 16.4 j | 155.8 | 19.2% | 2 |
| communications_and_keys | Urgence centralisée simple | 0.0% | 0.0% | 3.6% | 8.5% | 11.2 j | 75.3 | 13.2% | 1 |
| communications_and_keys | CCT v0.12 — noyau frugal | 0.0% | 0.0% | 0.0% | 0.0% | 4.1 j | 74.8 | 9.6% | 0 |
| appeals_and_transition | CCT v0.11 — charge bornée | 6.1% | 0.9% | 0.0% | 0.0% | 9.6 j | 113.9 | 13.6% | 0 |
| appeals_and_transition | CCT v0.10 — contrôles sectoriels | 22.5% | 5.3% | 0.5% | 0.0% | 20.1 j | 167.2 | 22.2% | 3 |
| appeals_and_transition | Urgence centralisée simple | 0.0% | 1.1% | 8.2% | 0.0% | 13.0 j | 78.9 | 14.2% | 0 |
| appeals_and_transition | CCT v0.12 — noyau frugal | 0.0% | 0.0% | 0.0% | 0.0% | 5.9 j | 79.6 | 10.5% | 0 |

## Test de perte

- **grid_and_payments** — porte CCT perdue : non ; rival simple protège autant : non ; rival au moins 15 % moins chargé : non ; domination : non.
  - Face à la version précédente : noyaux non inférieurs : oui ; réduction de charge : 27.3 %.
- **transition_collision** — porte CCT perdue : non ; rival simple protège autant : non ; rival au moins 15 % moins chargé : non ; domination : non.
  - Face à la version précédente : noyaux non inférieurs : oui ; réduction de charge : 26.9 %.
- **security_saturation** — porte CCT perdue : non ; rival simple protège autant : non ; rival au moins 15 % moins chargé : non ; domination : non.
  - Face à la version précédente : noyaux non inférieurs : oui ; réduction de charge : 28.1 %.
- **full_polycrisis** — porte CCT perdue : oui ; rival simple protège autant : non ; rival au moins 15 % moins chargé : oui ; domination : non.
  - Face à la version précédente : noyaux non inférieurs : oui ; réduction de charge : 23.2 %.
- **communications_and_keys** — porte CCT perdue : non ; rival simple protège autant : non ; rival au moins 15 % moins chargé : non ; domination : non.
  - Face à la version précédente : noyaux non inférieurs : oui ; réduction de charge : 27.5 %.
- **appeals_and_transition** — porte CCT perdue : non ; rival simple protège autant : non ; rival au moins 15 % moins chargé : non ; domination : non.
  - Face à la version précédente : noyaux non inférieurs : oui ; réduction de charge : 30.1 %.

## Conclusion bornée

P005-DT-002 mesure l'interférence entre protections sous ressources partagées. Un succès indique seulement que les équations préspécifiées ne réfutent pas la candidate. Les seuils restent conventionnels jusqu'à calibration indépendante.
