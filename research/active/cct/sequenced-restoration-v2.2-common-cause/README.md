# CCT-EXEC 2.2 — confrontation des causes communes (candidat)

## Lacune traitée

Les versions 2.0 et 2.1 retirent une voie à la fois. Deux voies apparemment distinctes peuvent pourtant dépendre du même service, fournisseur, source de données ou mécanisme de contrôle et tomber ensemble.

## Gain concret

Chaque voie doit déclarer ses `dependencyRoots`. Le candidat regroupe les voies par racine, perturbe chaque racine sur une fenêtre bornée, désactive ensemble toutes les voies qui en dépendent et exige que chaque dette ouverte reste supportée et observée à chaque tick. Une lignée absente donne `independence_unknown`, jamais un succès par défaut.

Le verdict positif `bounded_common_cause_candidate` reste limité aux dépendances déclarées : il n'établit ni l'exhaustivité de l'inventaire, ni l'absence de causes communes inconnues, ni un déploiement réel.

## Vérification

```bash
node --test research/active/cct/sequenced-restoration-v2.2-common-cause/test.mjs
node research/active/cct/sequenced-restoration-v2.2-common-cause/held-out/run-confrontation.mjs
```

