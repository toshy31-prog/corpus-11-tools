# Contrat de sources de recherche locales

`research_source_contract.py` valide les métadonnées d’une source déjà connue :
provenance, dates, type (`primary`, `community`, `secondary`), statut de licence,
statut local et empreinte d’extrait. Il ne télécharge aucune page et exige
`excerpt.stored:false` : le rapport conserve une empreinte et un volume, jamais
le texte cité.

```bash
python3 research_source_contract.py RESEARCH_SOURCE_TEMPLATE.json
python3 -m unittest test_research_source_contract.py
```

Le contrat préserve la différence entre une documentation mainteneur, un retour
communautaire et une source secondaire. Il ne transforme pas une information
locale en preuve actuelle, ni un statut de licence en permission de copie.
