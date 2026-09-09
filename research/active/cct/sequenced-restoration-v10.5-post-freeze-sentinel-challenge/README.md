# CCT-EXEC 10.5 — sentinelles fraîches après gel

Cette candidate distingue une adaptation tardive d’une simple fuite d’étiquettes préexistantes. Deux témoins engagent les prédictions des artefacts gelés sur 32 entrées sentinelles. Ensuite seulement, deux gardiens d’un autre couple de domaines produisent et signent 32 bits-cibles frais. Un artefact qui en égale au moins 28 déclenche `post_freeze_adaptation_signal` et retire la conclusion 10.5.

Le seuil, la taille du lot et l’ordre `gel < engagement des prédictions < génération des cibles` sont préengagés. Le résultat propre signifie uniquement « aucune concordance sentinelle au seuil dans ce protocole ». Il ne prouve ni l’absence d’adaptation sous le seuil, ni une génération réellement aléatoire, ni l’absence d’optimisation sur une cible proxy. Les sentinelles modifient aussi l’objet mesuré : elles testent l’intégrité temporelle du pipeline, pas la performance substantielle du modèle.
