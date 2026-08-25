# Résultat — campagne SCM binaire v0.2

- Commande : `python3 tests/test_scm_campaign.py`
- Portée : `model_internal`
- Protocole fixé avant exécution : oui.
- Générateur : énumération exhaustive des états exogènes binaires.
- Paramètres : sept équations SCM, DAG, variables observables et étiquette de
  dessin.
- Invariants : oracle `do` exact, même état exogène, critère backdoor,
  exclusion des descendants et positivité par strate.
- Contrôles : confondeurs mesuré/latent, collisionneur, médiateur,
  randomisation, positivité violée et rival d'étiquette.
- Résultat : sept SCM et quatorze sous-ensembles d'ajustement sont exercés.
  L'ajustement sur le confondeur mesuré retrouve l'effet `1/2`; le confondeur
  latent reste non identifié; collisionneur et médiateur sont refusés; la
  positivité violée reste non identifiée; le rival d'étiquette ne change pas le
  verdict du graphe.
- Effet de méthode : le DAG et les exogènes sont entièrement connus; aucune
  causalité extérieure n'est inférée.
- Condition de retrait : divergence entre un ajustement admissible et l'oracle
  `do`, admission d'un descendant, ou verdict dépendant de l'étiquette seule.
