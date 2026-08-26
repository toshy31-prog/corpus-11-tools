# Campagne CCT tenue à l’écart

Ce dossier fige la candidate v0.13 et prépare l’admission de scénarios adverses écrits séparément. Il ne contient volontairement aucun nouveau monde décisif.

- `candidate-freeze.json` : empreintes de la candidate et du modèle politique ;
- `author-intake-template.json` : dossier à remettre aux auteurs ;
- `admission.mjs` : refus des scénarios non gelés, non appariés, incomplets ou dérivés des identités v1 ;
- `campaign-manifest-template.json` : composition minimale de la campagne ;
- `validate_campaign.py` : contrôle du nombre de mondes, de la pluralité des auteurs et des stress requis ;
- `protocol.md` : séparation des rôles, taille minimale et règles de verdict.

Vérifications locales :

```bash
python3 verify_candidate_freeze.py
node --test test_admission.mjs
python3 -m unittest -v test_campaign_manifest.py
```

Une déclaration d’indépendance et un gel valide ne prouvent pas à eux seuls une provenance réellement indépendante. Cette limite reste affichée dans toute admission.
