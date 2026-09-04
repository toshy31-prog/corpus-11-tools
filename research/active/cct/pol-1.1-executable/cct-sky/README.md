# Le Ciel de la CCT — architecture de continuité mobile

Le Ciel est la couche qui relie les communs lors d'une rupture sans les mettre
sous tutelle. Il ne désigne pas une institution déjà existante, une flotte ou
un financement déjà disponible. Il sert à vérifier qu'une capacité mobile —
bateau, véhicule, relais, stock déplacé, équipe de réparation — **renforce** le
territoire au lieu de le rendre dépendant d'un centre.

## La forme

```text
sol local : droits, stock, savoir, équipes, décision et recours
      ⇅
veines : routes, eau, radio, énergie, informations et entraide
      ⇅
vecteurs : bateau | barge | camion | moto | vélo | relais humain | autre voie locale
      ⇅
rupture : route coupée | sécheresse | crue | panne | isolement | évacuation
```

Un vecteur n'est pas un succès parce qu'il arrive. Il ne devient Ciel-CCT que
s'il :

1. ouvre une voie qui ne partage pas la panne principale ;
2. protège l'accès vital sans condition idéologique ou extractive ;
3. travaille avec le porteur local compétent, ou rend compte immédiatement de
   la nécessité qui empêchait cet accord ;
4. laisse une capacité locale durable : pièces, savoir, financement de
   réparation, droit de recours, réseau ou stock ;
5. peut être arrêté, remplacé et contrôlé sans couper les personnes du vital.

`CCT-SKY-01` est le contrat de cette forme. Il ne rend ni bateau ni réseau réel.

```bash
node validate.mjs
node --test test.mjs
```

## Exemple juste

Dans un territoire inondé, un bateau localement opéré peut transporter une
équipe, un kit de réparation, de l'eau sûre et une alimentation électrique de
secours vers un service isolé. Son rôle est terminé correctement si le service
retrouve une voie de réparation, une réserve et une décision locale — pas si le
bateau devient le seul moyen de rester vivant.

Dans une zone de sécheresse, le même contrat peut financer des pièces de pompe,
du stockage, une équipe mobile terrestre et un relais de communication. Le Ciel
est une fonction de continuité, non l'objet bateau lui-même.
