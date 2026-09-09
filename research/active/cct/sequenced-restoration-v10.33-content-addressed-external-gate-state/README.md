# CCT-EXEC 10.33 — état externe du gate adressé par contenu

## Lacune fermée

10.32 passait directement un booléen au harnais, qui restait donc maître de
l’état qu’il prétendait observer.

## Gain concret

Deux artefacts JSON externes au harnais décrivent les états désactivé et activé.
Leur SHA-256, schéma et opposition sont vérifiés avant exécution, puis le module
consomme la configuration parsée. Contenu modifié ou deux états identiques
invalident le contrôle négatif.

Cela établit le pilotage par des artefacts locaux, pas leur origine dans une
configuration de production ni leur couplage au gate déployé.

## Condition de retrait

Retirer cette couche si un hash périmé, un schéma invalide ou deux états non
opposés conservent l’admission.
