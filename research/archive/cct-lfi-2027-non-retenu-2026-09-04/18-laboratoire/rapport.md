# Rapport de laboratoire — essai synthétique n°1

## Statut

Source : **interne synthétique**. Le scénario a été écrit par nous ; ses résultats ne sont donc pas des faits sur la France, ni une preuve d'efficacité des six garanties. Il constitue un test de cohérence et de visibilité des arbitrages.

## Scénario gelé

Quatre chocs identiques sont appliqués à chaque logique : transfert d'opérateur, canicule, panne numérique et prolongation d'une mesure d'urgence. Chaque logique reçoit le même état initial, les mêmes informations, les mêmes trois actions et quatre tours.

## Résultats vectoriels, sans vainqueur

| Logique aveugle | Continuité | Accès aux droits | Réversibilité | Charge habitants | Progression |
|---|---:|---:|---:|---:|---:|
| method-030c2318 | 80 | 90 | 96 | 19 | 43 |
| method-98ca48f4 | 50 | 83 | 96 | 27 | 58 |
| method-c445a8f8 | 26 | 32 | 51 | 63 | 88 |

Les dimensions ne sont pas additionnées. La correspondance entre étiquettes aveugles et logiques est conservée dans `resultat-interne.json` et ne doit pas être exposée comme une validation indépendante.

## Ce que l'essai apprend réellement

1. Dans les règles **que nous avons écrites**, la vitesse de déploiement entre en conflit avec continuité, accès et charge ; le dossier doit donc assumer ce coût, pas le nier.
2. La préparation avant transfert est la condition qui évite que les garanties de recours ne compensent trop tard une rupture de continuité.
3. Les six garanties ne doivent pas être défendues comme une machine à « maximiser » un résultat : elles explicitent des arbitrages qui seraient autrement reportés sur les habitants.

## Ce que l'essai ne permet pas de dire

- qu'une mesure fonctionnerait dans une collectivité, un ministère ou une entreprise donnée ;
- combien elle coûterait ;
- quelle logique politique serait globalement préférable ;
- que les coefficients du scénario décrivent le monde réel.

## Réutilisation admissible

Le laboratoire peut figurer dans les archives de méthode, mais pas dans le message politique principal ni comme source empirique. Sa valeur est de montrer que le dossier accepte d'être testé contre ses propres compromis.
