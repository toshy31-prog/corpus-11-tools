# Résultat — compatibilité conjointe v0.2

- Commande : `python3 tests/test_joint_compatibility.py`
- Portée : `formal_exact`
- Protocole fixé avant exécution : oui.
- Générateur : trois ensembles finis de mondes et opérations `union`/`intersect`.
- Paramètres : mondes possibles, identifiants, ensembles de vérité et trace de
  révision.
- Invariants : identifiants uniques, aucun monde implicite et recalcul complet
  après révision.
- Contrôles : survivants exclusifs, survivants chevauchants, contradiction
  rouverte et une mutation à identifiant dupliqué.
- Résultat : la survie individuelle, la pluralité et la compatibilité conjointe
  sont séparées dans trois espaces finis; chaque trace de révision est exécutée
  et l'entrée dupliquée est rejetée avant agrégation.
- Conclusion affaiblie : deux survivants n'impliquent pas un monde commun.
- Effet de méthode : les espaces et claims sont entièrement définis par la
  fixture.
- Condition de retrait : intersection/révision incorrecte ou identifiants
  dupliqués écrasés silencieusement.
