# CCT-EXEC 10.9 — écran borné de corrélation

Cette candidate dérive les quatre vecteurs de 32 bits depuis les lignées 10.8 et applique deux conditions préengagées : chaque lot doit contenir entre 8 et 24 bits à 1, et chacune des six distances de Hamming inter-lots doit rester entre 8 et 24. Un déséquilibre marginal ou une proximité/anticorrélation manifeste retire la conclusion.

Le verdict est volontairement nommé « écran borné », jamais « indépendance établie ». Quatre vecteurs courts ne permettent pas d’exclure les dépendances d’ordre supérieur, une faible entropie conditionnelle ou une coordination restant à l’intérieur des bornes. Le succès signifie seulement qu’aucune dégénérescence couverte par ces observables n’a été détectée.
