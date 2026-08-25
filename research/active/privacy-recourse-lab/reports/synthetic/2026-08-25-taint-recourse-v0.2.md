# Résultat — taints et recours v0.2

- Commande : `python3 tests/test_taint_recourse_model.py`
- Portée : `pipeline_verified`
- Protocole fixé avant exécution : oui.
- Générateur : matérialisation de vues, propagation déterministe des taints par
  copie/inclusion textuelle exacte et automate de recours.
- Paramètres : audiences, taints interdits, seuil de token `4`, durées,
  artefacts et transitions.
- Invariants : contenu sensible détecté malgré renommage, artefacts non vides
  et état terminal `remedied`.
- Contrôles : trois profils, identité copiée sous un autre champ sans override
  de taint, artefacts vides et chemin bloqué.
- Résultat : les trois profils et trois attaques fictives passent leur oracle.
  Une identité sous un nom de champ sûr est détectée; des artefacts vides et un
  chemin arrêté ne valent plus recours complet.
- Effet de méthode : menace, taints sources et équivalence par inclusion exacte
  sont définis par la fixture; paraphrases et inférences restent hors portée.
- Condition de retrait : copie exacte d'un token tainté non propagée ou
  automate incomplet accepté.
