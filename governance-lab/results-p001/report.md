# Résultats P001-DT-001

## Verdict

**capacity_gate_rejected**

Ce verdict porte sur le jumeau numérique synthétique, pas sur un service réel.

## Résultats par protocole

| Protocole | Mode | Service moyen | Pire service | Besoin non servi | Retour sûr | Charge de droits | Restitution | Passage conjoint |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| base | Porte de capacité CCT | 92.3% | 71.0% | 345 | 13.0 j | 5.3 | 2.3 j | 100.0% |
| base | Transfert à calendrier fixe | 90.4% | 68.5% | 432 | 17.0 j | 7.5 | 2.8 j | 100.0% |
| base | Commandement central temporaire | 92.2% | 71.2% | 350 | 14.0 j | 18.0 | 6.5 j | 52.0% |
| dense_shocks | Porte de capacité CCT | 85.7% | 57.5% | 644 | 21.0 j | 8.3 | 2.3 j | 85.4% |
| dense_shocks | Transfert à calendrier fixe | 82.2% | 53.0% | 799 | 26.0 j | 11.1 | 2.8 j | 49.6% |
| dense_shocks | Commandement central temporaire | 85.6% | 58.1% | 649 | 22.0 j | 27.9 | 6.5 j | 0.3% |
| long_supply | Porte de capacité CCT | 89.1% | 68.6% | 489 | 18.0 j | 7.3 | 2.3 j | 99.7% |
| long_supply | Transfert à calendrier fixe | 86.5% | 66.5% | 607 | 23.0 j | 10.1 | 2.8 j | 91.7% |
| long_supply | Commandement central temporaire | 88.8% | 68.8% | 502 | 19.0 j | 25.1 | 6.5 j | 5.4% |
| hostile_to_gate | Porte de capacité CCT | 83.2% | 58.2% | 757 | 26.0 j | 11.4 | 3.5 j | 62.8% |
| hostile_to_gate | Transfert à calendrier fixe | 85.1% | 59.3% | 672 | 23.0 j | 9.8 | 2.8 j | 82.1% |
| hostile_to_gate | Commandement central temporaire | 87.7% | 63.1% | 552 | 21.0 j | 24.6 | 6.5 j | 3.7% |

## Conditions de perte

- **base** — amélioration du besoin non servi : 20.1 % ; ratio de retour sûr face au centre : 0.93 ; gain droits : 12.7 ; gain restitution : 4.2 ; échec : non.
- **dense_shocks** — amélioration du besoin non servi : 19.4 % ; ratio de retour sûr face au centre : 0.95 ; gain droits : 19.6 ; gain restitution : 4.2 ; échec : oui.
- **long_supply** — amélioration du besoin non servi : 19.5 % ; ratio de retour sûr face au centre : 0.95 ; gain droits : 17.8 ; gain restitution : 4.2 ; échec : oui.
- **hostile_to_gate** — amélioration du besoin non servi : -12.7 % ; ratio de retour sûr face au centre : 1.24 ; gain droits : 13.2 ; gain restitution : 3.0 ; échec : oui.

## Limite

Les ressources, chocs et fonctions de restauration sont hypothétiques. Le test peut réfuter une mécanique interne ou révéler une dépendance ; il ne peut établir la performance territoriale sans données d’opérateur.
