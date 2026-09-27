# Sélection automatique des outils

Le libellé **Outils · automatiques** ne laisse plus tous les outils visibles au
modèle. Avant l’envoi, Corpus lit localement les mots explicites de la demande
et prépare le plus petit profil correspondant : réponse sans outil, exploration
de fichiers, modification et vérification, recherche de sources, mémoire, ou
une combinaison nécessaire.

Cette sélection s’exécute dans le navigateur, avant la mise en file : elle est
déterministe, sans requête réseau, sans modèle, sans action et sans changement
de permission. Elle ne prétend pas comprendre une demande ambiguë. Le bouton
des outils du composeur conserve les profils manuels pour choisir exactement le
périmètre voulu.

Les messages planifiés ne passent pas par le composeur. Ils reçoivent donc un
masque explicite avec tous les outils désactivés : une échéance peut transmettre
une question, mais ne peut pas découvrir ou exécuter des capacités par défaut.

Le warmup KV, désactivé par défaut, applique le même masque. S’il est activé
plus tard, son unique rôle reste de préparer le cache ; il ne peut jamais
appeler un outil.

## Inventaire des voies d’inférence

| Voie | Périmètre transmis |
| --- | --- |
| Composeur Corpus | Sélection locale minimale, ou profil manuel prioritaire |
| Message planifié | Aucun outil |
| Warmup KV | Aucun outil, et désactivé par défaut |
| Chat parallèle ou express | Aucun outil dans le payload du moteur |

Cet inventaire porte sur l’exposition des capacités, pas sur une mesure de
latence, de qualité ou d’autonomie.

Le gain de contexte et de latence devra être mesuré sur une épreuve réelle ; il
n’est pas déduit du seul nombre d’outils masqués.
