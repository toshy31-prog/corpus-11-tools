# Implémentation du verrou de protocole expérimental

Date : 2026-08-15  
Statut : couche écrite et testée localement ; non intégrée aux runners scientifiques existants ; non publiée.

## Résultat

Une couche `governance/` indépendante de `core/` impose désormais un manifeste prospectif canonique avant toute exécution qui passe par son point d'entrée.

Le manifeste obligatoire contient :

- identifiant et version du protocole ;
- hypothèse et concurrentes ;
- modèle, version, configuration et hash de contenu ;
- observables et canaux ;
- contrôles et finalités ;
- opérations permises, budget d'accès et seuil ;
- conditions structurées de renversement ;
- graine, règle d'arrêt et plan de comparaison ;
- issues de classification autorisées.

`lockProtocol` valide et normalise le manifeste, puis calcule un SHA-256 sur son contenu canonique. Le verrou est immuable en mémoire et peut être écrit une seule fois par le CLI (`flag: wx`). Toute version modifiée reçoit nécessairement un autre `protocol_hash`.

## Chaîne imposée

```text
manifest.json
    ↓ validation + canonicalisation
protocol.lock.json + protocol_hash
    ↓ préparation liée au hash
execution envelope
    ↓ garde d'accès
raw result + raw_hash
    ↓ conditions verrouillées
classification mécanique
    ↓ artefact séparé
interprétation
```

Les données brutes ne contiennent aucune narration. Classification et interprétation référencent le `raw_hash` sans pouvoir modifier l'artefact brut.

## Refus implémentés

- observable absent ou ensemble d'observables différent ;
- contrôle absent, ajouté ou différent ;
- observateur ou graine modifié ;
- hash du modèle différent ;
- condition de renversement absente ou modifiée ;
- opération d'observation non autorisée ;
- dépassement du nombre maximal d'accès ;
- résultat brut ne contenant pas exactement les observables et contrôles verrouillés ;
- enveloppe d'exécution, données brutes ou classification altérées ;
- issue interprétative non autorisée par le protocole.

## Tests adversariaux

Dix cas passent :

1. verrou déterministe et vérifiable ;
2. modification du manifeste après hash refusée ;
3. contrôle ajouté après résultat refusé ;
4. observateur changé après calcul refusé ;
5. condition de renversement modifiée refusée ;
6. observable, contrôle ou renversement absent bloque le verrouillage ;
7. opérations permises et budget maximal appliqués ;
8. contrôle négatif déclenchant mécaniquement `hypothesis_not_supported` ;
9. données brutes identiques sous deux interprétations distinctes ;
10. réécriture postérieure de la classification refusée.

Le contrôle négatif est synthétique. Il teste la gouvernance, pas une hypothèse scientifique.

## Limites

1. Les trois runners scientifiques historiques ne passent pas encore par cette couche. Le verrou est donc **écrit et testé**, pas **déployé** sur une expérience prospective.
2. Un script peut toujours contourner la gouvernance et appeler directement `core/`. Le statut « expérience verrouillée » doit être réservé aux sorties produites par l'entrée gouvernée et liées à un `protocol_hash` préalablement commité.
3. Un hash garantit l'intégrité et la liaison, pas l'identité de l'auteur ni une horodatation externe. L'ordre des commits locaux fournit la preuve minimale d'antériorité ; une autorité externe demanderait signature ou registre distant.
4. Aucune expérience scientifique nouvelle n'a été exécutée. Les résultats historiques restent inchangés.

## Validation du changement

- proposé : oui ;
- inscrit : oui ;
- tests adversariaux passés : oui ;
- intégré aux modules existants : non, volontairement ;
- déployé sur expérience prospective : non ;
- réobservé indépendamment : non.

## Prochaine étape autorisée

Ne pas ajouter de module. Préparer un manifeste synthétique dans un commit dédié, puis exécuter son contrôle négatif dans un commit ultérieur via la couche gouvernée. Ce test en deux commits doit établir l'antériorité réelle du verrou avant toute intégration scientifique.
