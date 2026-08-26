# Solveur structurel CCT v0.1

Ce module remplace la génération répétitive de mondes par des calculs finis
lorsque la question porte sur la logique interne de CCT :

- sélection du plus grand quorum réellement indépendant ;
- diagnostic exact des clauses qui rendent une restauration impossible ;
- recherche du plus court plan de restauration par couverture d'ensemble ;
- génération d'un contre-exemple minimal à l'exigence de restauration atomique ;
- séparation entre questions calculables et questions réellement empiriques.

Le résultat central est déjà déterminé : deux dettes réparables séparément
suffisent à mettre en échec la règle 1.3 qui exige une action unique restaurant
et protégeant simultanément toutes les dettes et tous les risques actifs. Une
séquence de deux actions peut pourtant les réparer dans l'abstraction. Aucun
nouveau monde n'est nécessaire pour établir ce défaut structurel.

Le solveur ne prouve pas le transport externe ni l'effet institutionnel. Ces
deux questions exigent encore une observation indépendante, mais pas une suite
indéfinie de scénarios synthétiques.
