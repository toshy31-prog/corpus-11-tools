# CCT-HO-001 — campagne tenue à l’écart pour la v0.13

## Décision visée

Décider séparément si M13-01, M13-02, M13-03 et M13-04 doivent être conservés, bornés, reconstruits ou retirés. La campagne ne peut pas valider la CCT comme ordre politique réel ; elle peut seulement discriminer les mécanismes dans les mondes gelés admis.

## Séparation des rôles

1. **Mainteneur du gel** — conserve les empreintes de la v0.13 et ne communique pas son contenu aux auteurs de mondes.
2. **Auteurs adverses** — écrivent les dynamiques, seuils, observations et conditions de perte sans accès déclaré à la candidate ni aux identités des concurrents.
3. **Contrôleur d’admission** — vérifie source, gel, budgets, dimensions et non-réemploi des mondes v1 ; il ne modifie jamais un scénario.
4. **Auteurs de concurrents** — reçoivent seulement les vues et actions du monde déjà gelé.
5. **Relecteurs aveugles** — lisent les rapports sans carte d’identité.
6. **Dépositaire des identités** — ouvre la carte seulement après le verdict vectoriel.

Une même personne peut techniquement cumuler des rôles, mais la campagne perd alors le qualificatif d’indépendance correspondant. Ce cumul doit être publié.

## Taille et diversité minimales

- au moins huit mondes admis ;
- au moins deux auteurs ou équipes d’auteurs sans dépendance déclarée entre eux ;
- aucun auteur ne fournit plus de la moitié des mondes ;
- au moins un monde où un rival non-CCT est prédit avant exécution comme plus adapté ;
- au moins un monde où l’information est fiable mais l’action rare, et un monde où l’action est disponible mais l’information dégradée.

Ces exigences diversifient les tests ; elles ne prouvent pas l’indépendance des auteurs.

## Flux irréversible

1. Transmettre aux auteurs uniquement `author-intake-template.json` et le présent protocole, sans la candidate ni ses résultats détaillés.
2. Recevoir un brouillon complet.
3. Le sceller avec le mécanisme déclaratif existant :

   ```bash
   node ../../../../corpus-11-tools/labs/experiment-lab/arena/declarative/freeze-scenario.mjs draft.json frozen.json
   ```

4. Exécuter `node admission.mjs frozen.json`.
5. Rejeter sans corriger tout scénario non admis ; l’auteur produit une nouvelle version et un nouveau gel.
6. Après admission de toute la campagne, enregistrer les concurrents et leurs prédictions.
7. Exécuter aveuglément avec les mêmes mondes, événements, vues, temps et unités d’action.
8. Publier les vecteurs et coûts séparés avant ouverture des identités.
9. Ouvrir la carte, appliquer les conditions de retrait préexistantes et archiver les résultats négatifs.

Chaque axe doit déclarer avant gel son orientation (`min` ou `max`), un opérateur
de franchissement et un seuil numérique non compensable. Le franchissement doit
suivre l'orientation : un axe à minimiser échoue au-dessus du seuil (`gt`/`gte`) ;
un axe à maximiser échoue en dessous (`lt`/`lte`). Une prédiction motivée
sur la possibilité qu'un rival non-CCT soit avantagé est également requise avant
révélation des identités.

## Règles de conclusion

- Aucun score global ne compense une atteinte à un autre axe.
- Une victoire paire par paire n’établit pas un vainqueur général.
- Un mécanisme CCT sans différence observable face au rival minimal est fusionné ou retiré provisoirement selon M13-04.
- Une réussite dans ces mondes établit au plus une performance synthétique tenue à l’écart.
- Une défaite déclenche une nouvelle version ; elle n’autorise pas la modification rétroactive des mondes.

## Blocage actuel

Le protocole, le gel et l’admission sont prêts. La campagne décisive reste en attente de scénarios effectivement fournis par des auteurs distincts. Aucun fichier interne ne peut remplacer cette provenance sans reclasser la campagne `internal_synthetic`.
