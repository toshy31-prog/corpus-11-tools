# Recherche active — rétroaction alpha–TAE–zonal flow

Cette recherche vise un verrou de physique des plasmas brûlants, pas une
revendication de « fusion résolue ». Son but final reste une fusion D–T
contrôlable et à puissance électrique nette.

Le premier cycle est volontairement léger : il vérifie si l'approximation qui
remplace une distribution alpha de ralentissement par une Maxwellienne
équivalente conserve au moins le facteur de pente énergétique qui intervient
dans la résonance onde–particule. Ce calcul ne prédit ni un TAE réel, ni le
gain d'un réacteur. Il sert à décider si un calcul gyrocinétique coûteux est
justifié.

**Correction d'antériorité.** Ces écrans ne sont pas présentés comme une
découverte : les comparaisons SD/Maxwellienne, gradients et ZOW/FOW existent
déjà séparément dans la littérature. Ils sont des contrôles reproductibles qui
ont permis d'isoler une question plus étroite encore non trouvée dans l'audit
public : un test contrôlé `{SD, Maxwellienne canonique}` × `{représentation
ZOW, représentation FOW}` dans un même problème TAE à profils, mode et règle
d'appariement explicitement gelés.

Voir `state/current_state.md` pour le statut, `hypotheses/` pour les conditions
de renversement et `experiments/` pour le calcul reproductible.

Le test à plus haute fidélité est isolé dans
[`f0-data-global-tae-matrix/`](f0-data-global-tae-matrix/) : il requiert une
distribution alpha traçable et un solveur TAE global contrôlé. Il ne prolonge
pas les écrans analytiques déjà bornés.

La convention de matching et son pipeline interne sont prêts, mais ne lèvent
pas ces préconditions : voir
[`f0-data-global-tae-matrix/matching-contract.md`](f0-data-global-tae-matrix/matching-contract.md).

La matrice interne est maintenant exécutée sur une distribution et un solveur
linéaire entièrement fictifs. La v1 conserve un échec de raffinement ; la v2
corrige séparément l'opérateur et obtient une interaction SD/M × FOW stable sur
deux noyaux sur trois. Ce résultat est `model_internal`, jamais une stabilité
TAE. Aucune source ou infrastructure extérieure n'est une prochaine dépendance.
