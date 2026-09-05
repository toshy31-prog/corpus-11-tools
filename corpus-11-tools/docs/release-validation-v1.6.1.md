# Validation de release candidate v1.6.1

| Surface | Contrôle | Attendu |
| --- | --- | --- |
| Collecte Python | `PYTHONPATH=corpus-11-tools/labs/python pytest -q corpus-11-tools` | produit seulement ; aucun `torch` de recherche |
| Identités | comportemental et inventaire de tests | état courant attesté ; 90 surfaces / 113 modules |
| Contenu | `check_release_content.py` | manifeste v1.6.1 concordant, hors auto-référence |
| Liens/frontières | docs et boundaries | liens Git valides ; aucun runtime vers `research/` |
| CCT | `verify_candidate_freeze.py` | SHA-256 du modèle `6f6953dc…e52` ; reçu inchangé |
| Runtimes | Python, Node, CCT, portefeuille, métavalidation | PASS depuis checkout propre |
| Évaluations | `python3 tools/check_evals.py` | 77/77 contrats ; 49/49 capabilities couvertes |
| Installation | clean-room | requiert autorisation distincte ; non exécutée avant elle |
| Identité taguée | identité et organisme | `not_executable_before_tag` |

La candidate n'est ni taguée, ni publiée, ni installée. Le harnais est inchangé
et `independence_unknown` demeure obligatoire.
