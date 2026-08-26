# CCT v0.13 — candidate préparée

Cette version traduit les pertes de l'arène adverse v1 en quatre modifications bornées : continuité d'urgence à double clé, portabilité des droits hors capture locale, continuité informationnelle contradictoire et porte de suppression des mécanismes sans effet distinctif.

La candidate est **écrite et testée statiquement**. Elle n'est ni validée par les mondes qui ont motivé ses changements, ni autorisée, ni déployée. Sa prochaine confrontation doit être gelée par une personne ou équipe distincte, avec un rival et des budgets appariés.

```bash
python3 validate_v013.py
python3 -m unittest -v test_v013.py
```

Le fichier [`v0.13-candidate.json`](v0.13-candidate.json) est la source exécutable de cette préparation. Le modèle narratif principal conserve les principes et documente la transition de version.

## v0.14 — interface institutionnelle exécutable

La v0.14 candidate compile M13-01 à M13-03 en machines d'état : activation
observable, clés distinctes, échéance, révocation, restitution, renouvellement,
portabilité et conservation des divergences. Le décideur lit des sémantiques
d'action publiques gelées ; il n'utilise plus les noms d'action comme substitut
de mécanisme.

```bash
node --test test-v014.mjs
node validate-v014.mjs
node verify-v014-freeze.mjs
```

Le plafond de statut est `locally_tested`. Cette version n'est ni autorisée,
ni déployée, ni réobservée, ni validée par une campagne indépendante.
Le dossier `v0.14-validation.json` conserve les commandes, résultats, empreintes
et limites de cette validation locale.
Le manifeste `v0.14-freeze.json` fixe les octets du bundle avant toute nouvelle
campagne d'acceptation, sans promouvoir son statut.
