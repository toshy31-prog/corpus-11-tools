# Transfert accepté — moteur de protocole institutionnel

- Source : `research/active/cct/executable/ops/`.
- Destination : `corpus-11-tools/labs/python/corpus_labs/event_store.py` et
  `institutional_protocol.py`.
- Extrait : journal append-only vérifiable et récupérable, état matérialisé,
  propositions, décisions motivées, séparations de rôles, recours suspensifs,
  mandats bornés, pouvoirs temporaires, expiration, extinction et audit.
- Retiré : schéma CCT, métadonnées d'export CCT, politique de rôles CCT, durées
  CCT et CLI CCT. Ces éléments vivent dans l'adaptateur
  `research/active/cct/executable/ops/cct_ops/`.
- Frontière d'appel : le constructeur générique exige explicitement la liste des
  rôles, les incompatibilités et les deux plafonds de durée. Il ne fournit aucun
  repli qui reconstruirait silencieusement la politique CCT.
- Vérification produit : scénario non-CCT d'atelier communautaire, politique de
  rôles incompatible propre, plafonds de 30 heures et 3 heures effectivement
  exercés, chaîne d'événements, décision, recours et récupération ; le test
  n'importe aucun module de recherche.
- Non-régression CCT : les 21 tests historiques de CCT Ops passent via
  l'adaptateur, complétés par une régression de l'audit sans dépôt ; la suite
  couvre notamment refus de cumul, bornes et messages historiques 366
  jours/168 heures, recours, extinction, audit, CLI et récupération.
- Condition de retrait : branche CCT introduite dans le moteur, politique de
  recherche réimportée par Corpus, perte d'un refus historique ou impossibilité
  d'utiliser une seconde configuration sans modifier le cœur.
