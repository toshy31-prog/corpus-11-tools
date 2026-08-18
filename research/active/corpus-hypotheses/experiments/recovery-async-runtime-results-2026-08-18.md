# Résultats — banc runtime asynchrone récupération/désinscription

Date : 2026-08-18

Préenregistrement : `recovery-async-runtime-preregistration-2026-08-18.md`

Script : `run_recovery_async_runtime.py`

Provenance brute compressée : `recovery-async-runtime-provenance-2026-08-18.json.gz.b64`

## Environnement observé

- Python `3.13.5` ;
- Linux `6.18.35-x86_64`, glibc `2.41` ;
- temporisation via `asyncio.sleep` ;
- horodatage via `perf_counter_ns()`.

Ce banc est une **émulation logicielle runtime**, pas un dispositif matériel.

## Exécution

Les 120 permutations des cinq nœuds internes ont été visées avec des délais `1,2,3,4,5 ms`, répétées trois fois sur chacune des deux architectures.

Total : `720` runs.

Dans cette exécution :

- A : `120` ordres runtime distincts ;
- B : `120` ordres runtime distincts ;
- l'ordre réellement horodaté a correspondu à l'ordre cible dans `360/360` runs A et `360/360` runs B.

## Architecture A

Reset gelé : `{0,2}`.

Résultat :

- `360/360` effacements complets ;
- `0/360` échecs ;
- distribution des traces résiduelles : `{0: 360}` ;
- divergence avec le simulateur discret alimenté par l'ordre runtime : `0/360`.

Durées murales observées :

- min : `5.056392 ms` ;
- médiane : `5.554227 ms` ;
- max : `39.154561 ms`.

## Architecture B

Reset gelé : `{0,1}`.

Résultat :

- `180/360` effacements complets ;
- `180/360` échecs ;
- distribution des traces résiduelles : `{0: 180, 1: 180}` ;
- divergence avec le simulateur discret alimenté par l'ordre runtime : `0/360`.

Durées murales observées :

- min : `5.070463 ms` ;
- médiane : `5.536438 ms` ;
- max : `35.959429 ms`.

## Décisions préenregistrées

### H1 runtime

A devait réussir `100 %` des runs et B échouer au moins une fois.

PASS : A `360/360`, B échoue `180/360`.

### H2 cohérence mécaniste

Tolérance : zéro divergence entre runtime et simulateur discret conditionné par l'ordre réellement horodaté.

PASS : `0/720` divergence.

## Classification

**`runtime_transport`**.

La séparation opérationnelle exacte du modèle fini se transporte donc vers cette event loop réelle : sous le même budget de deux resets, A efface toujours la trace pour les 120 ordres réalisés, alors que B en conserve une dans exactement la moitié des ordres réalisés.

## Portée

Le résultat renforce uniquement la robustesse **opérationnelle logicielle** du profil de désinscription sous deadline/passe bornée.

Il n'établit pas :

- un résultat matériel ;
- une nouvelle mesure fondamentale ;
- un coût énergétique ;
- une irréversibilité physique ;
- une indépendance par rapport aux invariants standards.

La cohérence parfaite avec le modèle discret confirme au contraire que l'effet observé dans ce banc est celui attendu de la structure de graphe et de l'ordre d'activation.

## Prochaine étape

La prochaine montée d'échelle pertinente n'est plus une nouvelle émulation du même mécanisme. Elle doit utiliser un dispositif ou une pile réseau dont les latences, pertes et opérations de reset sont effectivement produites par des composants distincts, tout en conservant le même contrat de mesure préenregistré.

À défaut de matériel accessible, suspendre la promotion empirique plutôt que multiplier les émulations logicielles.
