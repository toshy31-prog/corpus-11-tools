# Réobservation distincte — harnais de réplication indépendante locale

Date : 2026-09-05

## Cadre

Cette passe a commencé depuis un nouvel état de travail après les deux
adoptions. Elle n’a modifié ni
`corpus_labs.independent_replication`, ni les adaptateurs FOE-001 ou
provenance, ni les sources séparées. Les empreintes suivantes ont été relevées
avant et après les exécutions ; elles sont identiques :

| Artefact | SHA-256 |
| --- | --- |
| `corpus_labs/independent_replication.py` | `9bafdff2e73713295c5598aef11f14995260f44cea3ccb6f11b69c36bd3479f9` |
| test générique du harnais | `f931deaa865e4e0ef99292e32437519fcda6960969cc82ddc6e8319a7cdc1688` |
| adaptateur FOE-001 | `c61117612550864f21a476037297541008a4c5901bdfbaae5233fd2177666ba2` |
| adaptateur de référence provenance | `5440fb8bfa7a06b4dd668324aecb72e0cea94d5fefac7c3b37f18317d316530b` |
| seconde implémentation provenance | `6e1eadc946ba92349a7ffc717ae1c58a7b49e51bc02b31bfb8c5b5dab039d999` |

Les modifications non liées déjà présentes dans `research/active/cct/` ont été
laissées intactes et ne font pas partie de cette passe.

## Réexécution observée

- `PYTHONPATH=corpus-11-tools/labs/python python3 -m unittest discover -s corpus-11-tools/labs/python/tests -v` : 32 tests passent, dont les 7 contrôles du harnais ;
- `python3 research/scripts/test_foundations_of_evidence.py` : 4 contrôles
  FOE-001 passent ;
- `python3 research/scripts/test_foe_001_independent_replication.py` : la
  réplication FOE-001 passe ;
- les suites provenance initiale, mutations v0.2 et réplication séparée
  passent (`2/2`, `2 × 15`, puis 2 tests).

## Frontières et limites vérifiées

- aucun `import research` ni chemin `research/` n’est présent dans
  `corpus_labs.independent_replication` ;
- la primitive et ses deux adaptateurs restent séparés : le harnais ne contient
  ni FOE-001 ni règle de provenance ;
- la documentation conserve que la projection « n’est pas un bac à sable » ;
- le code et les deux adoptions produisent encore
  `independence_verdict: independence_unknown` ; aucune projection locale n’est
  qualifiée d’isolement de processus, d’auteur, d’environnement ou externe.

## Conclusion de réobservation

La réobservation est conforme dans sa portée locale. Elle réobserve les deux
adoptions sans modifier leur code et satisfait la condition restante du
candidat : une passe distincte après intégration. Elle ne change aucune
conclusion scientifique ni la limite d’indépendance.

## États

- **Proposé** : clôture de la condition de réobservation du candidat.
- **Écrit** : ce reçu de réobservation.
- **Testé** : suites listées ci-dessus.
- **Intégré** : aucune modification de code ; promotion du mécanisme par le
  registre de transfert seulement.
- **Réobservé** : oui, dans cette passe distincte.
