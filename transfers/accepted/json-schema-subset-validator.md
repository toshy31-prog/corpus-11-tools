# Transfert accepté — validateur JSON Schema borné

- Source : premier étage structurel de
  `research/active/cct/executable/constitution/validate.py`.
- Destination :
  `corpus-11-tools/labs/python/corpus_labs/json_schema_subset.py`.
- Extrait : types JSON, propriétés obligatoires ou fermées, références locales,
  constantes, vocabulaires, motifs, minimums, tailles de tableaux, unicité et
  dates-heures ISO 8601 pour un sous-ensemble déclaré.
- Retiré : acteurs, invariants, dispositions, habilitations, séparation des
  pouvoirs, délais, cycles de vie et toute conclusion constitutionnelle CCT.
- Vérification produit : document d'atelier non-CCT, erreurs structurelles
  attribuées, distinction booléen/entier et refus explicite d'un mot-clé
  `oneOf` hors sous-ensemble.
- Non-régression CCT : la constitution, la décision valide, le contre-exemple et
  les contraintes sémantiques continuent de passer par l'adaptateur CCT.
- Condition de retrait : mot-clé non pris en charge silencieusement accepté,
  dépendance de Corpus envers un schéma CCT ou divergence des validations CCT.
