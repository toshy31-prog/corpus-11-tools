# Résultat — mutations adversariales v0.2

- Commande : `python3 tests/test_structural_mutations.py`
- Portée : `formal_exact`
- Protocole fixé avant exécution : oui.
- Générateur : mutations de `kind`, nesting, alias et fragmentation.
- Paramètres : contrat de cible, action, sources, registre de quatre portées,
  marqueur de confiance booléen strict et onze cas.
- Invariants : canonisation indépendante du `kind`, composition des fragments
  et absence de faux positif sur la cible identique.
- Contrôles : preuve ordinaire, instruction directe, mutations structurelles,
  portée inconnue, portée de base inconnue, chaîne truthy dans `trusted` et
  instruction de politique déclarée fiable et action interdite pourtant marquée
  fiable.
- Résultat : 11/11 cas; l'action interdite reste détectée sous mauvais `kind`,
  nesting, alias et fragmentation; portées inconnues et confiance mal typée
  échouent fermées.
- Effet de méthode : classifieur de structures fictives, pas sûreté d'un agent
  ni compréhension de texte libre.
- Condition de retrait : exception ou passage silencieux sur portée inconnue,
  confiance non booléenne ignorée, confiance dispensant du contrat,
  contournement déclaré ou faux positif sur le
  contrôle autorisé.
