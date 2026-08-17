# Ablation prospective de l'ordre latent

## Verdict

Dans ce protocole, l'avantage prédictif de l'ordre minimisant exactement `F_T` dépend matériellement de la structure commune injectée entre apprentissage et test. Le groupe apparié sur les statistiques locales mais sans ordre latent commun ne conserve que `39/983`, soit `3,97 %`, de l'avantage du groupe latent. Ce résultat requalifie le succès prospectif antérieur comme dépendant du générateur ; il ne reçoit aucune interprétation physique.

## Protocole figé

- Groupe A : deux tournois bruités indépendants partagent un ordre latent généré explicitement.
- Groupe B : deux tournois sont tirés indépendamment et uniformément parmi tous les tournois étiquetés ayant les mêmes multiensembles de degrés que les objets A correspondants. Aucun ordre latent commun n'est utilisé pour produire B.
- Groupe C : espérance exacte d'un ordre aléatoire, appariement des degrés, renommage transporté et oracle du générateur.
- `192` paires A/B : `48` aux niveaux de bruit `0`, `3`, `6` et `9`.
- Seuil préenregistré : B ne doit pas conserver `25 %` ou plus de l'avantage de A.

## Résultats

| Mesure | A : ordre latent commun | B : nul localement apparié |
|---|---:|---:|
| Violations hors ajustement | 1 033 | 1 977 |
| Espérance exacte sous ordre aléatoire | 2 016 | 2 016 |
| Avantage | 983 | 39 |
| Fraction de l'avantage A conservée | 100 % | 3,97 % |

- Contraste A–B : `944` violations.
- Test entier verrouillé du quart : `-1654`, donc non déclenché.
- Écarts d'appariement local : `0`.
- Écarts de représentation : `0`.
- Écarts de l'oracle : `0`.
- Classification automatique : `not_triggered`.
- Reconstruction déterministe : `5/5` artefacts identiques octet par octet.

## Portée scientifique

Observation : le signal hors échantillon est presque entièrement perdu lorsque l'ordre commun est supprimé tout en conservant exactement le multiensemble des degrés de chaque tournoi.

Attribution bornée : l'avantage observé précédemment mesurait principalement la récupération d'une correspondance ordonnée injectée dans le générateur. Il n'établissait pas l'émergence d'un ordre à partir des seules statistiques locales.

Ce test ne montre pas que `F_T` est dépourvu d'intérêt descriptif, ni qu'aucune structure non injectée ne puisse être détectée. Il ne compare pas encore `F_T` à un prédicteur standard fondé uniquement sur les degrés et ne porte sur aucune donnée physique.

## Empreintes

- `protocol_hash` : `sha256:fb8d34feb677176e38d5c925f6622cf84c6856d7a64b9e8b41b599732f37f686`
- `experiment_fingerprint` : `sha256:3d616fc956dc8e3174925d1185958d0f432f7ece53afc3c758ac011d6213d7fb`
- `raw_hash` : `sha256:65bf62aad4bd181e83414e8f805a9b5e049f7a1fec039a7fbc39d06697ec5b44`
- `classification_hash` : `sha256:30ebdea010d1aa2d4f0c6e5dc1c4638d4edbd3c50d2ca9ca91b00011541fcda0`
