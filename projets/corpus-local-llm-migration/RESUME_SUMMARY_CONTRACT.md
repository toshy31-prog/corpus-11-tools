# Contrat de résumé de reprise

`resume_summary_contract.py` vérifie la structure d’un résumé de continuité sans
lire les notes du projet. Le format impose cinq rubriques distinctes : faits,
hypothèses, preuves, inconnus et références mémoire. Chaque fait ou hypothèse
doit pointer vers au moins une preuve par identifiant ; les références mémoire ne
portent qu’une empreinte et le rôle `context_pointer`.

```bash
python3 resume_summary_contract.py RESUME_SUMMARY_TEMPLATE.json
python3 -m unittest test_resume_summary_contract.py
```

La sortie ne restitue aucun énoncé : seulement des comptes et des états de
séparation. Elle déclare toujours `memory_injection:false` et ne crée ni paquet
de reprise ni contexte modèle. La validation est structurelle : elle ne transforme
pas une affirmation erronée en fait, ni une preuve déclarée en preuve indépendante.
