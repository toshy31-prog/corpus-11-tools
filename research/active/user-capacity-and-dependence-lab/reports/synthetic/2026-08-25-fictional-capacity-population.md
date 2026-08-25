# Résultat — population fictive de capacité

- Portée : `model_internal`.
- Protocole fixé avant exécution : oui.
- Générateur : trois profils, quatre tâches calculatoires et cinq phases.
- Paramètres : opérations apprises, procédures indexées par template, opérandes,
  réponses exactes, disponibilité de l'aide et de l'enregistrement.
- Invariants : aucune aide au transfert, templates nouveaux, calcul explicite et
  classe autonome fondée sur retrait plus deux transferts.
- Succès assisté : 3/3, donc non discriminant seul.
- Transfert sans support : seul le profil à opération apprise réussit les deux
  tâches nouvelles.
- Reprise par enregistrement : le profil procédural récupère la tâche familière
  sans réussir le transfert.
- Classification : une capacité autonome du modèle, une dépendance procédurale,
  une dépendance à l’assistance.
- Mutations : 5/5 discriminées. Changer l'oracle ou l'opération requise fait
  échouer l'opération apprise; l'ancien flag `general_rule` ne force plus rien;
  la procédure consulte réellement le template.

- Effet possible du protocole : opérations et oracles sont co-définis dans la
  population fictive; aucune capacité externe n'est mesurée.
- Condition de retrait : toute fuite d’aide, réutilisation des templates, succès
  forcé par un label latent ou accès du classifieur au type de profil annule le
  discriminant.
