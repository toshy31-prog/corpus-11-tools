# Archive du prototype alimentaire

`continuite-alimentaire-locale.bundle` est une sauvegarde Git complète du dépôt local du prototype au moment de la clôture du cycle 001.

Elle contient la branche `main`, ses cinq commits et tous les fichiers suivis. Elle n'inclut pas `node_modules`, les caches, les secrets ni les sorties de construction.

## Vérifier

```sh
sha256sum -c continuite-alimentaire-locale.bundle.sha256
git bundle verify continuite-alimentaire-locale.bundle
```

## Restaurer

```sh
git clone continuite-alimentaire-locale.bundle continuite-alimentaire-locale
```

Cette archive préserve une trace technique récupérable. Elle ne transforme pas le prototype clôturé en service actif et ne constitue pas une validation d'effet bénéficiaire.
