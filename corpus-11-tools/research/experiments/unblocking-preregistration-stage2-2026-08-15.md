# Préenregistrement de second niveau

## Déclenchement

Le test primaire sur les arbres à sept sommets n'a trouvé aucune paire appariée séparée par les pertes de deux liens. Les trois autres tests primaires ont produit un résultat. Ce document fixe les prolongements avant leur exécution.

## Désinscription sur huit sommets

Le même test est étendu de sept à huit sommets sans changer l'appariement ni l'observable : degrés, degré du port, excentricité et profil complet des pertes d'un lien sont fixés ; le profil des pertes de deux liens est comparé. Le résultat est négatif si les `8^6` arbres étiquetés ne contiennent aucune paire.

## Premier modèle fini complet

Deux complexes à huit distinctions sont fixés dans `finite_compatible_model_input.py`.

- `cycle8` contient les huit triplets cycliques `(i,i+1,i+2 mod 8)`.
- `two_cycles4` contient les quatre triplets cycliques de `0..3` et les quatre de `4..7`.

Ils sont appariés sur huit sommets, huit triplets et trois occurrences par sommet. Chaque triplet `(a,b,c)` impose les précédences `a<b`, `b<c`, `a<c` et l'opération partielle `a∘b=c`. Les transports attachés au sommet `i` sont les matrices diagonales de signes données explicitement dans le fichier d'entrée.

Les observables sont calculés sans adaptation :

- `F_T` : minimum exact de précédences violées parmi les `8!` ordres, divisé par 24 ;
- `D_I` : dimension exacte de l'intersection des espaces fixes des huit transports ;
- `Δ` : proportion d'occurrences d'une même paire `(a,b)` qui donnent des sorties incompatibles.

Une différence causée directement par les triplets d'entrée ou leurs composantes connexes est déclarée injectée. La suspension ne peut être levée que si une relation non triviale entre les trois observables survit à ce contrôle.

## Non-identifiabilité du jouet historique

Deux complétions compatibles avec la seule description disponible — huit triplets binaires orientables et `2^8` configurations — seront comparées : huit triplets disjoints et huit triplets cycliques chevauchants. Pour chaque configuration, renverser un triplet renverse ses trois précédences ; `F_T` est le minimum exact de précédences violées. Des distributions différentes démontrent seulement que le texte ne détermine pas les nombres annoncés.
