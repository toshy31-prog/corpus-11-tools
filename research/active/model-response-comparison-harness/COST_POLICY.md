# Politique de coût — permanente jusqu'à révision explicite

## Règle

Le projet ne doit entraîner **aucune dépense supplémentaire obligatoire** au
forfait ChatGPT déjà détenu par l'utilisateur. En particulier :

- aucune clé API OpenAI n'est configurée, lue ou requise ;
- aucun appel API payant n'est une dépendance du harness ;
- aucun achat de crédits, rechargement automatique ou facturation flexible
  n'est autorisé pour poursuivre un run ;
- lorsque la limite incluse de ChatGPT ou Codex est atteinte, le run attend le
  rétablissement de cette limite ou est marqué `timed_out`/`cancelled`.

Le MVP repose donc sur l'import manuel depuis les surfaces ChatGPT et Codex
accessibles avec le compte de l'utilisateur, et sur le stockage local.

## Hors périmètre

Les adaptateurs API sont hors périmètre, et non une étape planifiée. Ils ne
peuvent être proposés ou ajoutés qu'après une nouvelle autorisation explicite
de l'utilisateur modifiant cette politique.

Cette règle ne prétend pas que les fonctionnalités incluses sont illimitées :
les quotas, leur remise à zéro et les options disponibles dépendent du plan et
de l'état du compte. Le harness ne tente ni de les contourner ni de les
transformer en crédit payant.

