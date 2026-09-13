# Réobservation Bubblewrap — harnais de réplication indépendante locale

Date : 2026-09-05

## Cadre et hôte observé

Cette passe est exécutée depuis le Terminal Ubuntu normal, hors du sandbox
Codex. Elle concerne cet hôte précis seulement.

- Bubblewrap : `bubblewrap 0.9.0` ;
- noyau : `7.0.0-30-generic` ;
- distribution : `Ubuntu 24.04.4 LTS` ;
- `/proc/sys/kernel/unprivileged_userns_clone=1` ;
- `/proc/sys/user/max_user_namespaces=115491`.

Ces réglages ne généralisent pas la capacité à un autre hôte, ni au sandbox
Codex, qui avait refusé la création des namespaces.

## Empreintes avant et après

Les empreintes suivantes sont identiques avant et après les contrôles et la
reprise FOE-001.

| Artefact | SHA-256 |
| --- | --- |
| harnais `independent_replication.py` | `f8cbf0e510f6b58518e9b8d1f3a87d97b278888ff6f967ac14ec5a9a9a666545` |
| test générique du harnais | `d93f961bd45e2989aaa866152938af441a01ef148357ec7cd3cc40a933e82089` |
| test/adaptateur FOE-001 | `91c7a4f0712cc79c1f106e11df358641398f1a2ae015233abd3ed5e93e718b26` |

Le paquet FOE-001 repris est resté gelé : protocole
`ad523be81c6a4f3478b8d88de41b85b99ee30b368c0f7729942d3cdbabd63711`,
fixture `0fde7cb2e30ee0352ab9f0101666698e485559fede42d7ec5df930daa22d41b1`
et source séparée
`3f1592bd6eb10b948cc0eeb83d73073107b8ab52f5ae4ded8eacd27ff0de7ae3`.

## Contrôles avant reprise

La commande suivante a exécuté les 15 tests génériques depuis le Terminal
Ubuntu normal :

```bash
PYTHONPATH=corpus-11-tools/labs/python python3 -m unittest -v \
  corpus-11-tools/labs/python/tests/test_independent_replication.py
```

Les 15 tests passent. Le test Bubblewrap réel est `ok`, et non
`skipped_unavailable` : il vérifie `process_isolation_exercised`.

L'incident initial est conservé : la première tentative FOE-001 n'a produit
aucune trace exploitable car la capture appelait `_attestation` sans instance,
ce qui a produit `TypeError: ... missing 1 required positional argument:
'self'` après l'exécution mais avant l'émission du verdict. Elle ne compte pas
comme observation. La méthode est désormais statique, et le test unitaire
`test_attestation_helper_is_callable_without_a_test_instance` passe sans
lancer FOE-001.

## Reprise FOE-001 unique et observée

La reprise autorisée a appelé `run_isolated_submission` une seule fois avec le
paquet gelé ci-dessus. La commande Bubblewrap effectivement observée était :

```text
/usr/bin/bwrap --die-with-parent --new-session --unshare-all --unshare-net --clearenv \
  --ro-bind /usr/local /usr/local --ro-bind /usr /usr \
  --ro-bind /usr/lib /lib --ro-bind /usr/lib64 /lib64 \
  --ro-bind /tmp/corpus-independent-replication-isolated-qubfftir/inputs /inputs \
  --ro-bind /tmp/corpus-independent-replication-isolated-qubfftir/implementation /implementation \
  --bind /tmp/corpus-independent-replication-isolated-qubfftir/outputs /outputs \
  --proc /proc --dev /dev --dir /work --chdir /work -- \
  /usr/bin/python3 /implementation/foe001_independent.py \
  --protocol /inputs/protocol --fixture /inputs/fixture \
  --write-report /outputs/foe-001-second-report.json
```

Les chemins temporaires ci-dessus sont ceux de l'exécution et ont été retirés
à sa fermeture. La résolution hôte conserve les destinations invitées
lexicales : `/usr/lib → /lib` et `/usr/lib64 → /lib64`.

Résultats observés :

- `execution_verdict: process_isolation_exercised` ;
- backend : `bubblewrap` ;
- `comparison_verdict: matching_output` ;
- `local_separation_verdict: process_isolation_exercised` ;
- `overall_verdict: isolated_local_replication_agrees` ;
- empreinte de sortie :
  `sha256:c5e9e8492a2f102f8606964a3558883d784a1f962d4c54c0870d314abc0ad35c`.

`--unshare-net` est présent dans la commande observée et l'attestation
enregistre `network: disabled`. Seuls `fixture` et `protocol` sont montés dans
`/inputs`; seule `foe001_independent.py` est montée dans `/implementation`.
Les fichiers de référence sont absents :
`reference_code_present: false` et `reference_code_accessible: false`.

## Limite maintenue

Le verdict reste `independence_unknown`. Cette réobservation établit seulement
une isolation de processus exercée localement sur cet hôte précis ; elle ne
prouve ni indépendance externe, ni indépendance des auteurs, de l'environnement
ou des dépendances.

## États

- **Proposé** : reprise technique bornée après incident de consignation.
- **Écrit** : correction de l'aide d'attestation et ce reçu.
- **Testé** : test unitaire d'attestation et 15 tests génériques, dont le test
  Bubblewrap réel.
- **Exécuté** : une reprise FOE-001 gelée avec
  `process_isolation_exercised`.
- **Intégré** : aucune règle FOE-001 ni adaptation provenance modifiée ; le
  registre de transfert est seulement mis à jour avec cette observation locale.
- **Réobservé** : oui, sur cet hôte Ubuntu précis.
