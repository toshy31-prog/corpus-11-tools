# État courant

- **Phase :** laboratoire dérivé : réseau neuronal local, graphe statué,
  partitions et comparaisons internes.
- **Preuve disponible :** tests locaux du snapshot, des statuts du graphe, de
  l'absence de fuite entre partitions et du routage multi-étiquette.
- **Ce que le projet n'établit pas :** compréhension sémantique,
  robustesse conversationnelle, sécurité générale ou déploiement.
- **Décision locale :** `CorpusNet-Router v0` est `experimental_not_preferred`
  après l'évaluation interne gelée ; la baseline lexicale demeure la référence.
- **Benchmark v1 :** signal interne favorable à v0 sur paraphrases synthétiques,
  mais jeu observé et non indépendant ; aucune sélection modifiée.
- **Architecture suivante :** `GraphCorpusNet v1`, embeddings de requêtes et
  propagation sur 73 relations déclarées, `not_selected` après validation.
- **Supervision candidate v1 :** l'ajout de 14 familles train au routeur
  bag-of-words est `not_selected` sur cinq familles validation ; son test final
  de quatre familles demeure intact.
- **DoctrineCorpusNet v1 :** entraînement auto-supervisé local achevé sur 964
  documents textuels et 1,38 M tokens ; prototypes de capability non
  discriminants, récupération `not_selected` malgré l'entraînement réel.
- **ContrastiveDoctrineRouter v1 :** 233 passages produit étiquetés, mais
  `not_selected` sur validation ; benchmark contrastif gelé non lu.
- **TinyDoctrineEncoder v1 :** architecture Transformer compacte (≈23,2 M
  paramètres) préparée pour 8 Go de VRAM ; non entraînée dans ce runtime car le
  pilote NVIDIA/CUDA et PyTorch ne sont pas disponibles ici.
- **Exécution locale v1 :** checkpoint produit sur RTX 4070, mais perte MLM
  instable (`81,47`) ; v1.1 remplace l'initialisation et ajoute clipping avant
  toute poursuite d'entraînement.
- **Exécution locale v1.1 :** entraînement stable (perte `9,70 → 9,06`) et
  checkpoint sauvegardé ; v1.2 sépare train/validation/test avant tout run plus
  long.
- **Exécution locale v1.2 :** validation MLM `9,06` pour une perte train finale
  `8,83` après 200 pas ; v1.3 préenregistre 1 000 pas et cinq lectures
  validation, test toujours réservé.
- **Exécution locale v1.3 :** meilleur checkpoint validation au pas 800
  (`8,3463`), retenu pour une ouverture unique du test MLM ; le checkpoint pas
  1 000 est moins bon en validation.
- **Test local v1.3 :** perte MLM `8,1179` sur 78 documents non vus, meilleure
  que validation ; généralisation de token prédiction établie dans cette portée,
  test désormais observé et non réutilisable pour régler v1.3.
- **Membrane écologique v0 :** `EcologicalTinyEncoder v1.4` est préparé, sans
  entraînement ni test observé. Il sépare document, surface, statut déclaré et
  degré de relation déclarée ; son protocole exclut les 78 documents du test
  v1.3 de toutes les partitions v1.4.
- **Exécution locale v1.4 :** entraînement achevé à 1 000 pas ; checkpoint
  pas 800 sélectionné sur validation MLM `8,2143` (pas 1 000 : `8,5414`). Son
  test unique est observé à `8,4223` sur 90 documents et ne doit plus régler
  v1.4. Angle mort : aucun des 90 documents test ne porte de relation déclarée,
  donc l’effet du signal relationnel n’est pas identifié.
- **Ablation relationnelle v1.5 :** protocole exécuté et test observé une fois.
  Les tests v1.3/v1.4 étaient exclus ; cinq documents relationnels étaient
  réservés en validation et cinq en test pour comparer signal déclaré et signal
  neutralisé sur les mêmes données.
- **Sélection locale v1.5 :** les deux branches ont été entraînées ; `ablated`
  est sélectionnée sur validation relationnelle (`8,1918` contre `8,2365` pour
  `declared`, soit 5 documents). Test unique observé : `ablated` demeure
  légèrement meilleure avec relation (`8,2358` contre `8,2787`). v1.5 est clos
  et n’établit aucun gain du compteur relationnel.
- **Triplets déclarés v1.6 :** test unique négatif : BCE `0,8052`, exactitude
  `57,1 %` sur 56 triplets équilibrés, après sélection validation BCE `0,6026`.
  Le scoreur textuel de triplets est `not_selected`; le graphe déclaré actuel
  est trop petit et synthétique pour établir cette discrimination.
- **Prochain seuil :** jeu indépendant pré-enregistré de requêtes ambiguës,
  adversariales et multilingues ; audit de licence avant toute diffusion.
