# CCT-EXEC 1.4 candidate — restauration séquencée

Cette couche distincte remplace l'exigence de restauration atomique de 1.3 par
une recherche bornée du plus court ensemble ordonné d'actions couvrant toutes
les dettes ouvertes avant leur première échéance.

Chaque étape doit être publiquement qualifiée comme restauration, rester dans
le budget courant, maintenir les planchers vital et écologique, ne nuire à
aucun axe et protéger chaque axe qu'elle prétend restaurer. Une action ne ferme
jamais une dette : seule une preuve indépendante attestant capacité restaurée,
recours, non-répétition et perte restante peut la fermer.

Le plan est recalculé à chaque tour, car la disponibilité future des actions
n'est pas connue. La candidate ne déduit aucune restauration d'un simple effet
physique. Elle traite le contre-exemple structurel de deux dettes, pas l'absence
de sémantique réparatrice dans Kryos.

Dix tests locaux passent. Une recherche exhaustive compare le planificateur à
un oracle indépendant par masques de bits sur 32 902 catalogues d'actions et
131 464 couples catalogue-échéance, jusqu'à quatre dettes : aucun désaccord.
Ce résultat est complet dans cette abstraction finie seulement. Il n'établit
ni déploiement, ni effet institutionnel, ni transport externe.
