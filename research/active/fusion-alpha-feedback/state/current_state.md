# État courant — alpha–TAE–zonal flow

Dernière mise à jour : 2026-08-25 — préparation de la matrice `F0`

## But final

Contribuer à identifier une voie vers une fusion D–T contrôlable à puissance
électrique nette. Une réussite de l'écran ci-dessous ne démontre pas cette
capacité ; elle ne traite qu'un verrou de confinement.

## Décision vivante

Faut-il consacrer un calcul gyrocinétique global coûteux à la rétroaction
alpha–TAE–zonal flow annoncée dans des scénarios de plasma brûlant, ou la
mettre de côté car elle repose déjà sur une approximation cinétique fragile ?

## Hypothèses actives

1. **M — équivalence suffisante :** à moments alpha égaux, une Maxwellienne
   équivalente est assez proche d'une distribution de ralentissement pour ne
   pas rendre le mécanisme résonant manifestement indéterminé au niveau du
   premier écran.
2. **SD — non-équivalence pertinente :** les deux distributions ont des pentes
   énergétiques résonantes matériellement différentes dans une partie du
   domaine admissible ; la prédiction de boucle favorable ne doit pas être
   extrapolée sans le test cinétique complet.

## Observation disponible

- Di Siena et al. (prépublication 2026) obtiennent une boucle favorable dans
  GENE–Tango, mais déclarent employer des distributions d'équilibre
  maxwelliennes dans GENE.
- Vannini et al. (2022) trouvent déjà, pour un autre cas Alfvénique, qu'une
  Maxwellienne équivalente peut modifier une croissance de mode par rapport à
  une distribution de ralentissement.

Ces observations ne disent pas si le mécanisme de plasma brûlant survit.

## Correction d'antériorité — indispensable

Les trois écrans CPU de ce dossier sont des contrôles de cohérence, **pas des
résultats nouveaux de physique** :

- Vannini et al. (2022) ont déjà comparé une Maxwellienne locale et un
  ralentissement dans un calcul d'ondes d'Alfvén ;
- Wilkie et al. (2015) ont déjà montré, pour la microturbulence électrostatique,
  que le remplacement par une Maxwellienne peut fausser les gradients et le
  flux alpha ;
- Fitzgerald et al. (2023) ont déjà confronté ZOW et FOW pour un ralentissement
  alpha dans une étude de stabilité.

Notre apport présent est seulement de rendre leurs hypothèses comparables dans
un protocole de décision léger. Après l'audit, la seule lacune étroite non
trouvée dans la littérature publique est un test contrôlé
`{SD, Maxwellienne canonique}` × `{représentation ZOW, représentation FOW}`
dans le **même** cadre TAE, avec profils, mode et règle d'appariement gelés.
Son absence publique n'est pas une preuve de nouveauté : elle peut être
couverte par des travaux non indexés ou privés.

## Résultat du premier écran léger

Le 2026-08-24, l'écran isotrope apparié en densité et second moment a été
exécuté sur 289 points, avec trois contrôles d'invariants passants. Dans la
fenêtre de sensibilité déclarée `v_c/v_birth ∈ [0.31, 0.53]` et
`v_res/v_birth ∈ [0.50, 0.65]`, le ratio de modules des pentes énergétiques
`|dF_SD/dE| / |dF_M/dE|` va de `0.634882` à `0.925826`.

Observation de ce code : les deux fonds ne sont pas localement interchangeables
pour cet unique facteur de résonance dans cette fenêtre de modèle. Cette
observation est cohérente avec les travaux antérieurs ; elle ne leur ajoute pas
un résultat de plasma brûlant. Inférence autorisée : l'approximation
Maxwellienne ne peut pas être considérée robuste par simple appariement en deux
moments. Inférence interdite : en déduire le signe ou l'amplitude d'un TAE,
d'un gain alpha ou d'un réacteur.

## Résultat du second écran léger : énergie + gradient radial

Le 2026-08-24, un second écran a été exécuté sur `17 × 17 × 17 = 4913`
points. Il emploie la relation énergie–moment canonique rappelée par Todo
(2018, équations 11–13), dans sa réduction locale déclarée : la distribution
varie à la fois avec l'énergie et avec un rayon normalisé. La densité alpha et
la vitesse critique décroissent ensemble vers le bord, tandis que la
Maxwellienne reste appariée en nombre et second moment **à chaque rayon**.

Dans `c ∈ [0.31,0.53]`, `s ∈ [0.50,0.65]`, et pour un rapport de gradients
co-décroissants `k ∈ [0,2]` :

- le ratio `|∂ρF_SD| / |∂ρF_M|` va de `0.582349` à `2.00542` ; sa médiane est
  `1.16636` ;
- aucun des 4913 points ne renverse le signe de ce gradient radial ;
- le coefficient adimensionné qui annulerait la somme locale
  `E∂E F + λ∂ρF` diffère jusqu'à `0.994571` entre les deux fonds.

Observation de ce code : dans cette famille locale, ajouter le gradient radial
ne restaure pas l'interchangeabilité cinétique. Wilkie et al. ont déjà établi
le même problème de principe dans un autre régime ; ce code ne revendique pas
de nouvelle physique. Inférence autorisée : l'approximation Maxwellienne n'est
toujours pas justifiée par ses deux premiers moments pour les dérivées qui
entrent dans le drive. Inférence interdite : que le TAE est nécessairement
déstabilisé, ou que l'effet est favorable à la fusion. `λ` n'est pas le
coefficient d'un tokamak réel sans géométrie, mode et profil donnés.

## Test actif

`experiments/low_compute_resonance_screen.py` compare exactement les pentes
énergétiques d'une distribution de ralentissement isotrope et d'une
Maxwellienne appariée en nombre et énergie moyenne. Il explore les paramètres
adimensionnés `v_c/v_birth` et `v_res/v_birth`.

`experiments/low_compute_fow_screen.py` complète maintenant ce contrôle par
une borne ZOW/FOW dérivée de la forme en invariants `(E, μ, Pφ)` de Fitzgerald
et al. (2023). Il compare `SD` et `M` via le zéro local normalisé d'un noyau
de gradient inspiré de `K = ω∂E F − n∂Pφ F`; il ne calcule ni l'intégrale
résonante de `K`, ni un taux de croissance, ni un seuil de stabilité TAE.

La simulation GENE–Tango de 2026 est déjà globale et 5D, en `(x,y,z,v∥,μ)` :
elle contient la dynamique gyrocinétique de pitch et les dérives de
centre-guide à son ordre de modèle. Son point non vérifié ici est différent :
elle construit l'équilibre alpha comme une Maxwellienne locale à partir des
deux premiers moments du ralentissement, plutôt que comme un
`F0(E, μ, Pφ)` orbit-conditionné. La borne FOW est donc un **test de
robustesse de la fermeture F0**, pas l'affirmation que GENE aurait omis toute
physique d'orbite.

## Résultat du troisième écran léger : borne ZOW/FOW

Le 2026-08-24, la matrice CPU `{SD, M} × {ZOW, FOW}` a été balayée sur 29 282
points. Le pitch intervient par le moment magnétique et le signe co/counter,
pas par une loi angulaire inventée. Les bornes `c`, `s` restent celles des
écrans précédents ; le décalage d'orbite `δ/Lnα ∈ [0,1]` et le pitch
`μB0/W ∈ [0,0.9]` sont explicitement **adimensionnés**, non attribués à une
machine.

- l'écart SD/M du seuil ZOW va de `0.00598222` à `0.457378` ;
- le déplacement FOW maximal du seuil est `1.02774` ;
- dans `15 576/29 282` points, ce déplacement FOW est au moins aussi grand
  que l'écart SD/M ;
- le facteur de densité FOW/ZOW va de `0.522046` à `1.91554` dans ce balayage.

Hard test : l'interaction différentielle `SD/M × FOW` vaut zéro à l'erreur
flottante près (`4.44e-16`) sur les 29 282 points. C'est attendu : dans cette
construction séparée, FOW translate les deux fonds par le même terme. Le test
s'effondre donc comme source d'un couplage nouveau ; le grand déplacement FOW
absolu ne change pas le contraste SD/M. Fitzgerald et al. ont déjà posé la
sensibilité FOW/ZOW ; le calcul n'est pas une nouveauté. La seule inférence
autorisée est que toute interaction physique exigerait des profils `vc/Te`, un
matching canonique explicite et une pondération de mode. Il est interdit
d'attribuer ce résultat à SPARC, ITER, ou une future centrale.

## Limites et détectabilité

- La sortie détecte seulement une non-équivalence cinématique dans ce modèle.
- Elle ne contient ni géométrie tokamak, ni saturation non linéaire, ni pertes
  alpha, ni amortissement.
- Le fond de ralentissement de naissance est isotrope ; inventer un profil de
  pitch serait donc un faux progrès. La dépendance en pitch pertinente vient
  des invariants d'orbite et du finite-orbit-width (FOW), qui doivent être
  paramétrés ou mesurés.
- La formule FOW analytique est elle-même fragile près des alphas profondément
  piégés ; ce domaine est masqué ici. Un seuil près de l'énergie de naissance
  exigerait aussi un cutoff lissé.
- Absence d'écart dans cet écran ne prouverait donc pas l'équivalence complète.
- Les données publiques SPARC donnent un ancrage distinct, non substituable :
  pour un profil de pression alpha publié, `rho_L/L_palpha ≈ 0.285` vers
  `r/a≈0.5`. Cela ne permet pas d'inférer `δ/L_nalpha` : il faudrait au
  minimum `Falpha(r,E,pitch)`, ou `nalpha(r)` et `T_eff,alpha(r)` sur le même
  équilibre.

## Condition de renversement

- Si l'écran montre un ratio de pente proche de l'unité sur le domaine qui
  deviendra physiquement pertinent après paramétrage du scénario, il ne
  justifie pas à lui seul de rejeter l'approximation Maxwellienne.
- Si l'écran montre des écarts de facteur important là où une résonance est
  possible, M est affaiblie : le prochain calcul doit porter explicitement sur
  `F0_alpha`, pas sur une nouvelle architecture de réacteur.

## Prochaine action

L’état de l'art est maintenant suffisamment borné : les données publiques ne
permettent pas de calibrer `δ/Lnα`, GENE couvre déjà la dynamique
gyrocinétique d'orbite mais pas une construction orbit-conditionnée de `F0`
dans l'article de 2026, et le dernier écran n'a trouvé **aucune** interaction
FOW×forme dans sa version séparée. La prochaine action qui peut réellement
changer la décision est donc l'une des deux suivantes :

1. obtenir un `Falpha(r,E,pitch)` pour un équilibre donné (sortie
   NUBEAM/ASCOT/TRANSP), puis faire le post-traitement léger de `δ/Lnα` et
   construire quatre `F0` avec une règle de matching **canonique** déclarée ;
2. exécuter ces quatre `F0` dans un même solveur TAE global avec mode et
   profils gelés, puis intégrer le drive plutôt que de lire un zéro local.

Sans l'une de ces entrées, continuer à raffiner les écrans analytiques ne
produirait plus de connaissance susceptible de faire basculer la conclusion.

La convention de matching de la future matrice et ses contrôles de pipeline
sont désormais prêts (`f0-data-global-tae-matrix/matching-contract.md`). Ils
garantissent seulement que le futur traitement ne modifie pas silencieusement
les moments appariés ou la conservation de l'opérateur fourni. Ils ne créent
aucune donnée alpha, aucune géométrie et aucune conclusion de plasma.
