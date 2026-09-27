# Quarantaine des notes importées

`memory_quarantine.py` ajoute une frontière avant toute mémoire Corpus issue d’un
import : archive de conversation, fichier, document externe, sortie d’outil ou
export manuel. Le contrat conserve seulement les empreintes de la note et de sa
source, le type de source et le niveau de confiance déclaré. Il ne lit ni ne
stocke le contenu dans son rapport.

Toute note importée reçoit `state: quarantined`, `target_tier: quarantine` et
`automatic_injection: false`, y compris si sa source est déclarée locale. Une
revue déclarée par l’utilisateur peut seulement produire
`manual_recall_selection_required` : elle ne modifie ni fichier, ni index, ni
niveau de mémoire. La promotion au noyau est volontairement absente (`not_supported`).

```bash
python3 memory_quarantine.py MEMORY_QUARANTINE_TEMPLATE.json
python3 -m unittest test_memory_quarantine.py
```

La confiance de provenance n’établit pas la véracité d’une instruction dans une
note. Les archives, documents externes et sorties d’outil restent des données à
examiner, jamais des permissions ou des règles à exécuter.
