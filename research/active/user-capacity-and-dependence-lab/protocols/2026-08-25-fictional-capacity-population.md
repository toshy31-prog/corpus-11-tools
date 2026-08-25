# Protocole fixé avant exécution — capacité et dépendance fictives

## Portée et générateur

`model_internal`. Trois profils sont générés : opération apprise, procédure
enregistrée seulement, assistance seulement. Quatre tâches déclarent template,
opérandes, opération requise et réponse exacte.

## Paramètres, invariants et contrôles

Tous réussissent avec aide. Le retrait masque aide et procédure ; deux transferts
utilisent des templates et opérandes nouveaux ; la reprise réintroduit seulement
la procédure enregistrée indexée par le template familier. L'exécuteur calcule
une réponse avec l'opération disponible et la compare à l'oracle : aucun flag de
classe ne peut produire directement un succès. La classe autonome exige retrait
et deux transferts sans support. Les contrôles changent le template, l'oracle,
l'opération requise et injectent l'ancien flag latent `general_rule`.

## Effet et retrait

Les opérations disponibles restent encodées dans les profils ; le résultat
classe le générateur, pas une population externe. Retirer une classe si une aide
cachée apparaît, si les tâches de transfert réutilisent le même template, si un
template ou un label latent suffit à forcer le succès, ou si le classifieur
reçoit le nom du profil.
