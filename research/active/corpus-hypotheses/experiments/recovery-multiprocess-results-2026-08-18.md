# Résultats — transport récupération/désinscription en processus OS séparés

Date : 2026-08-18

Préenregistrement : `recovery-multiprocess-preregistration-2026-08-18.md`

Script : `run_recovery_multiprocess.py`

## Environnement

- Python `3.13.5` ;
- Linux `6.18.35-x86_64`, glibc `2.41` ;
- cinq processus worker persistants via `multiprocessing`/`fork` ;
- état partagé et verrou inter-processus ;
- temporisation `time.sleep` ;
- horodatage `perf_counter_ns()`.

Ce banc reste sur **une seule machine**. Il n'est pas un réseau externe ni du matériel distribué.

## Exécution

Les 120 permutations des nœuds internes ont été visées avec délais `2,4,6,8,10 ms`, deux répétitions par architecture.

Total : `480` runs.

## Architecture A

Reset `{0,2}` :

- `240/240` effacements complets ;
- `0/240` échecs ;
- résidus `{0:240}` ;
- `120` ordres réels distincts ;
- ordre réel = ordre cible dans `231/240` runs ;
- divergences avec le simulateur discret conditionné par l'ordre réel : `0/240`.

Durées :

- min `10.234677 ms` ;
- médiane `10.4447635 ms` ;
- max `16.975938 ms`.

## Architecture B

Reset `{0,1}` :

- `120/240` effacements complets ;
- `120/240` échecs ;
- résidus `{0:120,1:120}` ;
- `120` ordres réels distincts ;
- ordre réel = ordre cible dans `233/240` runs ;
- divergences avec le simulateur discret conditionné par l'ordre réel : `0/240`.

Durées :

- min `10.267347 ms` ;
- médiane `10.5047025 ms` ;
- max `19.462126 ms`.

## Décisions

H1 : PASS — A `240/240`, B échoue `120/240`.

H2 : PASS — zéro divergence sur `480` runs.

Classification : **`multiprocess_transport`**.

## Interprétation

Le résultat transporte la séparation vers cinq processus OS distincts sur le même hôte. Le noyau a réordonné la cible dans 16 runs au total, mais l'état final reste exactement celui prédit par le modèle discret lorsqu'on utilise l'ordre réellement horodaté.

Cela renforce la robustesse **logicielle opérationnelle** du profil sous scheduling réel de processus.

Cela ne fournit toujours pas :

- un dispositif matériel ;
- un réseau externe ;
- une nouvelle quantité irréductible ;
- une mesure énergétique ;
- une irréversibilité physique.

La séparation reste expliquée par la structure de graphe et, dans la famille finie, par la couverture minimale de sommets.

## Condition d'arrêt

Conformément au préenregistrement, ne pas ajouter un autre banc logiciel local du même mécanisme.

La prochaine promotion éventuelle exige un système réellement distinct : plusieurs machines, conteneurs reliés par une pile réseau avec pertes/latences externes, microcontrôleurs ou autre dispositif où les communications et resets sont produits par des composants séparés.
