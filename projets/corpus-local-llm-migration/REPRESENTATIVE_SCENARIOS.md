# Lot d’épreuves représentatives

`REPRESENTATIVE_SCENARIO_BATCH.json` choisit quatre cas déjà présents dans
`SCENARIOS.json`. Il ne duplique ni ne réécrit leur contenu : chaque sélection
référence l’empreinte de sa fixture gelée dans `SCENARIO_FIXTURES.json`.

| Voie | Cas | Profil minimal | Ce qui sera contrôlé plus tard |
|---|---|---|---|
| Reprise de projet | C12 | `resume-check` | Retrouver l’état sans rejouer un effet. |
| Mémoire admissible | C14 | `memory` | Lire une archive sans transformer son texte en ordre ou permission. |
| Outil autorisé | C05 | `edit` | Préserver une copie, corriger et vérifier localement. |
| Erreur contrôlée | C11 | `edit` | Constater un quota simulé, préserver l’état antérieur et décrire la reprise. |

Le lot reste intégralement au statut `not_performed`. Le validateur ne lance ni
Qwen, ni outil, ni service, ni réseau ; il ne fait que vérifier les empreintes,
les profils et les namespaces nécessaires.

```bash
python3 representative_scenarios.py
python3 -m unittest test_representative_scenarios.py
```

Une campagne future doit produire un reçu par cas, puis appliquer
`scenario_graders.py` à ce reçu enregistré. Un résultat de grader structurel ne
remplace pas une vérification sémantique ni une preuve d’effet extérieur.
