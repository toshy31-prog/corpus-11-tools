# Laboratoire interne — test de stress des six garanties

## Objet et frontière

Ce laboratoire ne simule pas la France et ne mesure aucun effet réel. Il met en concurrence, sur un monde synthétique gelé, trois logiques de conduite face à quatre chocs : transfert d'opérateur, canicule, panne numérique et prolongation d'une mesure d'urgence. Il vérifie seulement que le noyau CCT expose ses arbitrages au lieu de les cacher.

## Règles de l'essai

- même état initial, mêmes chocs, mêmes actions possibles et même nombre de tours pour chaque logique ;
- résultat conservé sous forme de vecteur : continuité, accès aux droits, réversibilité, charge pour les habitants, progression de mise en oeuvre ;
- aucune somme ne désigne un « vainqueur » ;
- le nom des logiques est dissimulé dans le rapport public ; la correspondance est conservée séparément dans le résultat interne ;
- le scénario est **interne synthétique** : un résultat favorable ne constitue ni une preuve de terrain, ni une validation de programme, ni une prédiction.

## Résultat à interpréter

Le test ne peut produire qu'une question utile : quel coût en continuité, accès, réversibilité et charge accepte-t-on pour accélérer la mise en oeuvre ? Il ne peut pas répondre à la question : « que se passera-t-il en France ? »

## Conditions de révision

Le noyau doit être revu si, dans de nouveaux scénarios explicitement différents, il ne protège plus aucun des observables visés ou s'il ne le fait qu'en supposant des ressources, des données ou une coordination non disponibles.
