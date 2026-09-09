# CCT-EXEC 10.3 — révélation différée des étiquettes tenues à l'écart

Cette candidate ne prétend pas rendre observable tout calcul hors domaine. Elle empêche ce calcul d'acheter directement le critère final : les identités du jeu tenu à l'écart sont engagées sans étiquettes, les artefacts des modèles sont gelés, puis deux gardiens de domaines de défaillance distincts révèlent et signent le même vecteur d'étiquettes avant l'évaluation.

L'ordre vérifié est `engagement du jeu < gel des artefacts < révélation des étiquettes < évaluation`. Toute révélation antérieure au gel, tout gel ne correspondant pas aux artefacts observés en 10.1, toute signature invalide ou tout quorum insuffisant retire la conclusion 10.3.

Ce mécanisme ne démontre ni le secret réel avant révélation, ni l'absence de recherche sur des cibles proxy, ni l'indépendance institutionnelle réelle des gardiens. Il transforme cependant une limite non observable de 10.2 en barrière falsifiable contre la sélection directe sur les étiquettes finales.
