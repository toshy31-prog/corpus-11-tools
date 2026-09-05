# Harnais de réplication indépendante locale

`corpus_labs.independent_replication` compare une implémentation de référence
et une soumission séparée sans connaître leur modèle scientifique.

## Contrat minimal

Une recherche fournit :

- un paquet d’entrée gelé, avec identifiants, chemins relatifs, SHA-256 et
  liste blanche exhaustive ;
- une attestation par implémentation : rôle, environnement, entrées déclarées
  et observées, dépendances déclarées et observées, sortie et son empreinte ;
- un contrat de chemins JSON comparables ;
- pour la soumission séparée, un relevé de projection locale.

Le harnais vérifie les empreintes d’entrée, refuse les entrées et dépendances
observées sans déclaration, vérifie l’empreinte de sortie, compare seulement
les chemins demandés et publie les différences, sorties incomplètes,
dépendances communes et divergences d’empreinte pour un même identifiant.

`run_projected_submission` construit un répertoire temporaire qui ne contient
que les entrées autorisées et les fichiers déclarés de la soumission. Il peut
attester que les fichiers de référence indiqués n’ont pas été projetés. Il
n’est pas un bac à sable : le même compte local peut toujours potentiellement
atteindre des fichiers hors projection. Son résultat reste donc
`independence_unknown`, même quand `local_projection_tested` et les sorties
convergent.

## Isolation de processus optionnelle

`run_isolated_submission` est une API distincte, optionnelle et fermée par
défaut. Elle ne change pas le comportement de `run_projected_submission`.
Quand l'hôte le permet, elle utilise Bubblewrap avec `--unshare-all` et
`--unshare-net`, sans environnement hérité. Elle ne monte que :

- les entrées gelées dans `/inputs`, en lecture seule ;
- les fichiers de la soumission dans `/implementation`, en lecture seule ;
- le répertoire de sortie temporaire dans `/outputs`, en écriture ;
- les chemins de runtime passés explicitement dans `runtime_mounts`, en lecture
  seule. Leur source hôte est résolue pour les contrôles, mais leur destination
  invitée conserve le chemin lexical déclaré : `/lib` et `/lib64` restent donc
  montés vers `/lib` et `/lib64`, même lorsqu'ils sont des liens hôte vers
  `/usr/lib` et `/usr/lib64`.

Ni racine hôte, ni répertoire utilisateur, ni dépôt, ni racine de paquet, ni
racine de sources, ni fichier de référence déclaré ne peut être un montage de
runtime. Un fichier de référence fourni parmi `source_files` est une erreur de
contrat. La commande doit viser les chemins du bac, par exemple
`/implementation/main.py`, `{input:fixture}` et `{output}` ; les deux derniers
sont substitués dans le bac.

L'appel retourne soit `execution_verdict: process_isolation_exercised`, soit
`execution_verdict: isolation_unavailable`. Le second cas couvre Bubblewrap
absent ou le refus de créer les namespaces. Il n'y a jamais de fallback
silencieux vers `run_projected_submission`. Un paquet, un montage ou une sortie
invalide reste une `ReplicationError`, donc une erreur de contrat et non un
résultat d'isolation.

Lorsqu'une attestation issue de ce backend est comparée,
`execution_context` distingue la projection locale, l'isolement de processus
exercé et le backend. Même alors, `independence_verdict` reste
`independence_unknown` : un namespace local n'établit ni indépendance
externe, ni absence de dépendance commune, ni indépendance des auteurs ou de
l'environnement.

## Limites et retrait

Le module ne prouve ni indépendance externe, ni absence de dépendance cachée,
ni validité scientifique, ni équivalence générale des résultats. Les traces
d’accès et dépendances restent les déclarations de l’exécution appelante ; une
isolation de processus devrait être apportée et vérifiée par un mécanisme
distinct, si une recherche en avait besoin.

Les traces d'adoption, de transfert et de réobservation restent hors de la
documentation distribuée : elles ne font pas partie du contrat du produit et
ne peuvent pas être généralisées d'un hôte à un autre. Un hôte peut toujours
refuser les namespaces. Une réussite locale ne permet ni généralisation à
d'autres environnements ni conclusion d'indépendance externe.

Retirer ou réduire le module s’il impose une sémantique scientifique, si les
recherches doivent contourner ses déclarations, ou si une seconde recherche ne
peut pas l’adopter sans branche de domaine.

## Vérification

```bash
PYTHONPATH=corpus-11-tools/labs/python \
  python3 corpus-11-tools/labs/python/tests/test_independent_replication.py
```

Le test Bubblewrap réel est conditionnel : un refus de namespace est signalé
`skipped_unavailable`, jamais converti en succès.
