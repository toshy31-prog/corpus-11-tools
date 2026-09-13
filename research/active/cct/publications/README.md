# Publications CCT

Le livre blanc existe sous deux formes éditoriales coordonnées.

Le [mode d’emploi opérationnel candidat](mode-emploi-operationnel-cct.md)
relie compétence, arbitrage, moyens, exécution, recours et réparation. Il fournit
trois exercices fictifs résolus et réutilise le protocole de pré-adoption existant.
Ses règles complémentaires restent proposées à ratification. Ce document Markdown
autonome n’est pas intégré aux rendus DOCX/PDF existants.

Le [`livre-vert-cct.md`](livre-vert-cct.md) est le document de consultation :
il transforme l'architecture et les résultats de recherche en choix ouverts,
options rivales, questions et conditions de retrait. Il ne vaut ni adoption ni
autorisation. `build_cct_green_book.py` produit son rendu DOCX.

- `livre-blanc-cct.md` est la version narrative concise et la source de son
  résumé d'ouverture.
- `modele-gouvernance-ecosocialiste-libertaire.md` reste le corps détaillé
  historique. Le générateur y insère les apports CCT-POL 1.1 et l'état de la
  lignée CCT-EXEC sans modifier ce fichier gelé.
- `livre-blanc-annexes.md` porte les résultats, le programme expérimental et la
  carte de validation courante.
- `livre-blanc-frontmatter.md` conserve une ouverture longue utilisable
  séparément ; elle ne pilote pas le rendu principal.

`build_cct_whitepaper.py` assemble ces sources dans
`output/docx/CCT-livre-blanc.docx`. Le PDF est produit depuis ce DOCX. Les
statuts `écrit`, `testé localement`, `gelé`, `autorisé`, `déployé` et
`réobservé` restent distincts dans tous les formats.

La version éditoriale courante décrit CCT-POL 1.1 et la lignée CCT-EXEC jusqu'à
la candidate 10.35. Le gel vérifié reste CCT-EXEC 1.4 ; cette synchronisation
éditoriale ne promeut aucune candidate et n'ajoute aucune preuve empirique.
