# Correction d'antériorité — ce qui est déjà connu

## Verdict

Les trois écrans légers de ce dossier sont utiles pour vérifier les formules et
pour choisir le prochain test ; ils ne constituent pas une découverte vers la
fusion. Le contrôle de nouveauté a trouvé des travaux antérieurs couvrant leurs
familles séparément.

| Famille vérifiée ici | Antériorité vérifiée | Ce qui reste non trouvé publiquement |
| --- | --- | --- |
| ralentissement alpha contre Maxwellienne locale appariée | Vannini et al. 2022 : simulation Alfvén avec les deux fonds | le même contraste dans la boucle TAE–zonal-flow de plasma brûlant |
| gradients radiaux SD/M | Wilkie et al. 2015 : microturbulence électrostatique et seuil/flux | la même comparaison dans le noyau TAE canonique et orbit-conditionné |
| représentation ZOW contre FOW alpha | Fitzgerald et al. 2023 : les deux formes dans une étude de stabilité | une matrice canonique 2 × 2, avec profils et mode identiques |

L'absence de cette dernière matrice dans un audit public n'est **pas** une
preuve de découverte : des calculs peuvent exister sans publication ou sans
indexation exploitable.

## Ce que l'article de 2026 couvre déjà

Di Siena et al. emploient GENE global 5D en `(x,y,z,v_parallel,mu)` et des
dérives gyrocinétiques. Il serait donc incorrect de prétendre que leur modèle
ignore tout le pitch ou toute largeur d'orbite. Leur fermeture d'équilibre,
en revanche, est explicitement maxwellienne, les profils alpha étant mis à
jour à partir des deux premiers moments d'un ralentissement. La question
ouverte est cette construction de `F0`, non l'existence des coordonnées de
pitch dans le code.

## Limite maintenant identifiée

Les sources publiques ne donnent pas `Falpha(r,E,pitch)` pour la référence
SPARC. Un ratio publié `rho_L/L_palpha≈0.285` est un repère de longueur,
mais ne vaut pas `delta/L_nalpha`. Nous ne devons donc pas transformer le
balayage adimensionné en prédiction SPARC.

## Action qui a réellement de la valeur maintenant

Arrêter les écrans de plus faible fidélité. Le prochain test discriminant
demande soit une sortie de distribution alpha sur un équilibre fixe, soit
l'exécution contrôlée des quatre `F0` dans un solveur TAE global. Cette matrice
doit d'abord déclarer la convention de matching canonique : une Maxwellienne
locale est une limite ZOW et ne définit pas automatiquement sa cellule FOW.
Il faut intégrer le drive résonant du mode gelé ; le zéro local de notre écran
ne vaut pas un seuil de stabilité.

## Sources

- F. Vannini et al. (2022), https://doi.org/10.1088/1741-4326/ac8b1e
- G. Wilkie et al. (2015), https://doi.org/10.1017/S002237781400124X
- M. Fitzgerald et al. (2023), https://doi.org/10.1088/1741-4326/acee14
- A. Di Siena et al. (2026), https://arxiv.org/pdf/2605.10694
- S. Tinguely et al. (2025), https://doi.org/10.1088/1741-4326/adaf40
