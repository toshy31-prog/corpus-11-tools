# Audit des pertes et restes des architectures antérieures

Date de l'audit : 2026-08-17

Statut : récupération inscrite et testée statiquement. Le paquet local reste à distinguer de son activation et de sa réobservation par l'hôte.

Source machine : `docs/legacy-loss-register.csv`.

## Conclusion

Les anciennes versions ont laissé trois restes différents :

1. des sources effectivement absentes ;
2. des sources conservées hors du dépôt ou seulement sous forme aplatie ;
3. des fonctions conservées textuellement dans la provenance mais sans route opérationnelle 11.x.

La priorité n'est pas de restaurer l'ancienne constitution. Elle est de sécuriser les archives manquantes et d'évaluer quelques capacités locales dont la disparition change encore une prise.

## Résultat de récupération

- Les six artefacts disponibles sont maintenant dans `archives/legacy/`, non exécutoires et couverts par `MANIFEST.sha256`.
- Neuf capacités locales ont été ajoutées au graphe comme `recovered_candidate_unvalidated` : commande-effet, présence effective, terminal-récupération, frontière défense-contrôle, pouvoir temporel, perte relationnelle, co-maintenance, confidentialité-recours et découplage fonctionnel.
- Trois règles/procédures compactes ont été récupérées hors du graphe de capabilities : convention de confiance, discipline de conclusion et Expansion puis Audit.
- Le routage obligatoire, la constitution monolithique, l'ordre universel fixe et les interdits fictionnels absolus n'ont pas été restaurés.
- Atlas 2.7, Corpus 9.8, 10.2, la release 10.4 complète et la source éditable du manuel restent explicitement manquants.

## Sens des statuts

- `preserved` : la source ou l'effet discriminant est encore disponible, avec une portée de conservation indiquée.
- `absorbed` : l'ancien objet n'existe plus tel quel, mais son effet principal est représenté par un objet actuel.
- `archived_without_route` : le texte existe, mais aucun objet 11.x ne permet de l'invoquer directement avec le même rôle.
- `source_missing` : une source requise ou explicitement nommée n'a pas été trouvée dans les pièces jointes, le dépôt ou son historique Git.

Un statut d'archive ne prouve pas qu'une fonction mérite d'être restaurée. Un statut absorbé ne prouve pas une équivalence parfaite.

## Sources manquantes prioritaires

| Priorité | Source | Constat | Effet |
|---|---|---|---|
| P0 | Atlas 2.7 | Le dossier de retour de 3.0 ne contient qu'un README demandant d'y placer 2.7. | Rollback et comparaison 2.7 → 3.0 impossibles. |
| P0 | Corpus 9.8 | La migration 9.8 → 10.0 le nomme, mais aucun paquet 9.8 n'a été trouvé. | Le saut de 9.x à 10.0 ne peut pas être audité. |
| P0 | Corpus 10.2 | Le correctif 10.3 affirme conserver 10.2 sans embarquer la release complète. | La non-régression 10.2 → 10.3 reste invérifiable. |
| P0 | Corpus 10.4 | Des fragments et un statut visuel existent, mais pas de release complète. | Impossible de distinguer exactement patch, activation et reconstruction ultérieure. |
| P1 | Source du manuel visuel | Seul le PNG aplati est disponible. | Les composants, textes éditables et la provenance de rendu sont perdus. |

## Sources préservées et limites restantes

- Atlas 3.0 et Sur-modèle 9.2 sont conservés dans `archives/legacy/` avec leurs empreintes.
- Corpus 10.0 a été extrait de l’archive imbriquée du paquet 10.1 et conservé séparément, sans modifier son contenu.
- Corpus 10.1 et le correctif partiel 10.3 sont conservés dans `archives/legacy/`.
- Les deux PDF contextuels sont conservés dans `skills/corpus-context-library/references/` et couverts par `docs/source-integrity.json`.
- Les modules 10.x 01-18 sont conservés comme sources concaténées de provenance. Cette conservation n'est pas équivalente aux releases originales : module 00, manifestes, validations, hashes, archives imbriquées et frontières de paquet ne sont pas tous reproduits.

## Capacités locales dont la perte est discriminante

### P0 - Évaluer une restauration

1. **Contrat commande-exécution**
   - Reste : demande, recommandation, ordre, réception, exécution, effet vérifié et interruption ne sont plus un même objet routable.
   - Risque actuel : attribuer un effet aval à un ordre seulement émis ou à une action seulement déclarée.
   - Frontière : ne pas le fusionner avec le simple traçage de transmission.

2. **Présence effective D-PKG-CTX-EXE-VER**
   - Reste : la validation du cycle de vie d'un patch ne couvre pas exactement la présence d'un fichier, outil ou module dans l'environnement courant.
   - Risque actuel : confondre ressource décrite, empaquetée, accessible, exécutée et vérifiée.

3. **Terminal et récupération**
   - Reste : aucune capacité actuelle ne réunit seuil d'échec, acteur capable, options perdues, porteur de perte, terminal et récupération testée.
   - Risque actuel : appeler une suspension « sûre » sans prise terminale effective.

4. **Frontière défense-contrôle**
   - Reste : la cartographie coercitive actuelle n'impose pas la séparation entre secrets opérationnels et preuves non sensibles de légalité, du contrôle et de la réparation.
   - Risque actuel : choisir entre transparence dangereuse et opacité incontrôlée.

5. **Pouvoir temporel et limites de cadence**
   - Reste : les coûts cachés ne couvrent pas à eux seuls le retard comme pouvoir, la pause nominale, les pertes inégales sous délai identique ou la vitesse qui détruit les traces.
   - Risque actuel : traiter le temps comme contexte neutre.

### P1 - Candidats compacts

- convention de confiance numérique ;
- devoir positif de conclure ;
- charge de la poursuite ;
- perte relationnelle sans disparition d'objet ;
- topologie des rôles de co-maintenance ;
- distinction de confidentialité entre témoignage pour recours et autorisation de diffusion ;
- découplage fonctionnel avant une décision globale de conservation ou d'arrêt.

Ces objets ont été récupérés sous forme de skills bornés et testés. Leur réobservation locale ne les promeut pas comme robustes : les neuf facultés récupérées restent `recovered_candidate_unvalidated`.

## Éléments à ne pas restaurer comme autorité globale

- routage obligatoire par mots-clés ;
- constitution monolithique gouvernant toute réponse ;
- ordre historique « majorité d'abord » hors contexte discriminant ;
- ordre universel fixe de réponse ;
- interdits absolus de motifs fictionnels ;
- corpus utilisé comme graine de génération pour une fiction demandée comme extérieure.

Leur fonction utile est soit absorbée par le routage minimal 11.x, soit conservée comme garde contextuelle. Leur restauration globale recréerait le risque que la méthode remplace la scène.

## État des actions

1. Atlas 3.0, Sur-modèle 9.2, Corpus 10.0, 10.1 et le correctif 10.3 sont importés comme archives non exécutoires avec empreintes.
2. Les neuf facultés récupérées disposent d’une provenance, de dépendances et de tests discriminants.
3. Leur invocation et leur cohabitation avec 11.x ont été réobservées localement sans promotion de robustesse.
4. Atlas 2.7, Corpus 9.8, Corpus 10.2, la release 10.4 complète et la source éditable du manuel restent à récupérer si des originaux authentifiables réapparaissent.

## Condition de renversement

Une entrée `source_missing` doit être reclassée si un paquet complet authentifiable apparaît dans une archive non inspectée. Une entrée `archived_without_route` doit être reclassée si un objet 11.x existant reproduit son effet, son type sémantique, ses conditions d'échec et ses recours sans reste discriminant.
