# CCT-MIN-01 — Continuité locale de l'eau

## L'objet à adopter, pas la CCT entière

`CCT-MIN-01` est un instrument minimal pour un réseau local d'eau existant :
une garantie de continuité qui rend visibles les seuils, les responsables, les
pièces, l'énergie, les canaux d'alerte, le recours et le secours. Il ne crée
ni autorité CCT, ni nouveau droit de couper l'eau, ni substitution à l'opérateur
public, communautaire ou associatif déjà responsable.

Le cas Mozambique/El Niño rend cet instrument pertinent parce que la collecte
et le stockage de l'eau font partie des mesures anticipatoires annoncées. Il
reste toutefois une proposition de conception : aucun site, aucun opérateur et
aucune donnée locale n'ont été engagés.

## Hypothèse étroite

À contraintes comparables, un point ou petit réseau d'eau équipé de marges
réellement distribuées — pièces critiques sur site ou à proximité, énergie de
secours indépendante, réparateurs identifiés et indemnisés, alerte utilisable,
canal de recours et déclenchement de secours — devrait réduire le temps sans
eau utilisable et la charge imposée aux ménages, par rapport à une maintenance
centralisée déclenchée seulement après panne.

Cette hypothèse peut perdre. Elle ne sera pas considérée comme soutenue si le
dispositif déplace les coûts vers les usagers ou les travailleurs, accroît les
inégalités d'accès, échoue à maintenir l'eau sûre, ou n'améliore pas les
résultats par rapport au service standard dans le périmètre réellement observé.

## Deux couches qui ne doivent pas être confondues

1. **Le plan de continuité** : service concret, à administrer par l'acteur
   local compétent.
2. **L'évaluation** : protocole limité qui compare des indicateurs prévus,
   sans retirer le service standard à quiconque.

Le plan détaillé est dans [proposition.md](proposition.md) ; les mesures et le
comparateur sont dans [measurement-plan.md](measurement-plan.md). Le contrat
statique vérifie les protections minimales, pas l'efficacité réelle :

```bash
node validate.mjs
node --test test.mjs
```

## Statut

`candidate_design_not_authorized`.

Le premier acteur extérieur n'aurait pas à « adopter la CCT ». Il pourrait
seulement accepter, modifier ou refuser ce plan local de continuité, puis le
soumettre à la porte de pré-adoption et à une revue indépendante.

Il ne doit être approché que si un véhicule apporte une ressource nette. Le
candidat [`CCT-RV-01`](../resource-vehicle/) est conçu pour financer les
pièces, le secours, la maintenance payée et la réparation ; il n'est pas encore
financé ni opérationnel.

La [cartographie des porteurs réels au Mozambique](host-map-mozambique.md)
identifie la chaîne institutionnelle pertinente sans impliquer qu'un accord ou
un contact existe.
