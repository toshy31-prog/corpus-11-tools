# Audit de fermeture et de reproductibilité du laboratoire

Date : 2026-08-15

## Périmètre

Expérience auditée : `temporal-negative-control-001`.

L'audit ne modifie ni le cœur scientifique, ni les modules, ni les résultats historiques, ni `research/sources/`. Il teste quatre propriétés : reconstruction, régénération des artefacts, autonomie de la classification et détection d'un changement du moteur.

## Verdict

**Contrat de fermeture incomplet.**

La chaîne est reproductible dans une copie isolée du même environnement logiciel et la classification ne dépend d'aucune interprétation humaine. En revanche, le verrou ne lie pas l'expérience à la version du cœur d'exécution. Une modification de `core/engine.mjs` peut donc rester invisible au protocole.

## Résultats

| Test | Résultat | Observation |
|---|---|---|
| Vérification du manifeste et du `protocol_hash` | Réussi | `sha256:65ea88a77648d8771d56b3ab7aaf7e5e2a62ece0fbdcab149b1d77cadfcc4e6e` |
| Reconstruction dans une arborescence temporaire isolée | Réussi sous même code | Le verrou est accepté et l'expérience s'exécute sans consulter les résultats conservés. |
| Régénération des quatre artefacts | Réussi | `raw_results.json`, `computed_output.json`, `comparison.json` et `classification.json` sont identiques octet par octet aux artefacts committés. |
| Régénération de la classification sans interprétation | Réussi | Les données brutes et les conditions verrouillées reproduisent `reversal_triggered` / `absorbed_by_control`. |
| Détection d'une modification du moteur | Échec | Une copie de `core/engine.mjs` modifiée de `0cc433…` à `81f206…` est acceptée ; l'exécution conserve le même hash de modèle et le même hash de protocole. |

## Empreintes reproduites

- Résultat brut : `sha256:bcc6ed861be9db909d46e308035dc344babd8b13a2f95f2e69b6734064f884f7`.
- Classification : `sha256:0f6f79c99cc64d03b689c4857c908528f9044f9dc4454e3d8970cc5e0b4f030c`.
- Contrôles : renommage `0` écart ; inversion globale `0` écart.
- Budget : `64/64` accès.

## Cause de la lacune

Le champ verrouillé `model.contentHash` couvre l'adaptateur prospectif et le plugin `temporal-frustration`, mais pas les fichiers de `core/`. Le manifeste ne fixe pas non plus une empreinte de l'environnement d'exécution. Le hash prouve donc l'identité du protocole déclaré et de deux composants du modèle, pas celle de toute la chaîne exécutante.

Le manifeste et son hash ne suffisent par ailleurs pas, seuls, à restaurer les exécutables : ils vérifient une copie disponible, mais ne contiennent ni paquet adressable par contenu ni référence immuable permettant de la récupérer.

## Conclusion bornée

Établi :

- la même chaîne logicielle reconstruit exactement les quatre artefacts ;
- la classification est calculable sans narration humaine ;
- l'expérience est transférable dans une arborescence isolée lorsque le même code est fourni.

Non établi :

- la reproductibilité à travers une version différente du moteur ;
- la restauration depuis le seul manifeste et son hash sans archive exécutable ;
- la fermeture complète du laboratoire.

## Condition de fermeture restante

Avant de déclarer le laboratoire fermé, un futur protocole devra lier l'exécution à une empreinte couvrant au minimum le cœur, la gouvernance, l'adaptateur et le plugin, puis refuser une modification de chacun de ces composants. L'environnement d'exécution devra être déclaré ou empaqueté de façon immuable. Cette correction n'est pas réalisée dans le présent audit.
