# Pilote externe minimal CCT–rival simple v0.1

Ce dossier prépare une comparaison capable de désavantager la CCT. Il ne crée
pas de donnée externe et n'autorise aucun essai territorial.

Le rival est une coordination territoriale simple : un opérateur local, une
autorité d'appel séparée et une règle publique de rationnement, sans collèges
fonctionnels ni niveau confédéral permanent. Les deux mécanismes reçoivent le
même scénario gelé et le même budget d'information et d'action.

Les cinq axes sont non compensables : accès vital perdu, violations de droits,
charge administrative, délai de récupération et concentration irréversible.
Une architecture ne gagne que si elle n'est pire sur aucun axe et est meilleure
sur au moins un. Toute provenance incomplète, identité d'auteur commune ou
différence de scénario produit `inadmissible`; des résultats croisés produisent
`inconclusive`.

État courant : `awaiting_external_inputs`. Les fichiers d'exemple sont des
fixtures de test et ne doivent jamais être déposés comme observations.

```bash
node --test test.mjs
node evaluate.mjs submissions/cct.json submissions/simple-rival.json submissions/independence-audit.json
node evaluate-sensitivity.mjs submissions/cct.json submissions/simple-rival.json submissions/independence-audit.json
```

La seconde commande échoue fermé tant que les deux soumissions externes et leur
audit séparé ne sont pas présents. Le scénario exact est gelé dans
`scenario.json`; `submission-template.json` et `independence-audit-template.json`
définissent les paquets attendus. Même un audit admis établit seulement une
séparation documentée dans son périmètre, jamais l'indépendance réelle complète.

`freeze-v0.1.json` et `freeze-v0.2.json` conservent les deux gels antérieurs,
remplacés avant toute collecte. `freeze.json` lie cette histoire et engage
désormais les fichiers de collecte, le catalogue, les trois profils et toute la
chaîne d'évaluation. `node verify-freeze.mjs` refuse leur modification silencieuse.

## Sensibilité au modèle

`engine-profiles.json` gèle trois interprétations plausibles : prudente,
nominale et perturbation prolongée. Une domination n'est dite robuste que si
elle garde le même sens dans les trois. Une divergence produit `model_dependent`
ou `contradiction_across_engines`. Ces variantes testent la dépendance aux
hypothèses enregistrées ; elles ne valident pas les construits. Le registre
marque explicitement les cinq résultats comme des proxys non validés sur terrain.
