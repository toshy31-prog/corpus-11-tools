# UX et accessibilité W5 — revue documentaire, 27 septembre 2026

## Conclusion

Le code actuel offre une sortie au cas des captures : une identité non confirmée bloque les directions catalogue sans bloquer par principe YouTube ; les pistes masquées peuvent être réaffichées sans nouvelle recherche. Ce sont des capacités présentes dans le code et partiellement testées, pas une preuve d'utilisation réussie dans le service ni une certification WCAG. Aucun code modifié pendant ce lot.

## Références primaires vérifiées

- [Microsoft Research, Guidelines for Human-AI Interaction, CHI 2019](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/) : 18 recommandations évaluées auprès de professionnels ; cadre de conception, pas certification produit.
- [Google PAIR, Explainability + Trust](https://pair.withgoogle.com/chapter/explainability-trust/) : expliquer les limites et relier les explications aux actions pour calibrer la confiance. Transfert : dire « fiche manquante » ou « pistes masquées », non « aucune musique trouvée ».
- [W3C, explication de WCAG 2.2 SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) : les messages de statut doivent pouvoir être annoncés sans déplacement du focus. Cette page explicative n'est pas elle-même le texte normatif complet.
- [axe-core](https://github.com/dequelabs/axe-core), [MPL-2.0](https://github.com/dequelabs/axe-core/blob/develop/LICENSE) : moteur ouvert de contrôles automatiques. Non installé ni exécuté ici ; un scan ne remplacerait pas une revue clavier et lecteur d'écran.

## État local et paliers

| Parcours | Preuve actuelle | Palier restant |
|---|---|---|
| Sans fiche | `scout-mix-session.mjs` explique la fiche attendue et les options nom/URL ; `participant-explorer.mjs` maintient une option sans fiche et n'assimile pas sélection à enregistrement confirmé | Observer le parcours réel avec source indisponible et absence de candidat, sans assistance du développeur |
| Zéro résultat filtré | `scout-mixer-panel.mjs` propose « Afficher les artistes inconnus — à vérifier » ; action change uniquement `scope.unknownArtists` | Vérifier dans navigateur réel que les cartes réapparaissent et que le focus reste utilisable |
| Résolution guidée | Test monté ouvre le détail et place le focus sur la fiche sans confirmer automatiquement ; un nouveau départ ne vise pas l'ancien sélecteur | Clavier seul, zoom 200 %, lecteur d'écran ; aucun piégeage ni saut de contexte inattendu |
| Statuts accessibles | Compteur avec `role=status`, plusieurs zones `aria-live=polite` dans `index.html` | Vérifier les annonces réelles : quantité, répétitions et imbrication de zones live ; présence d'attributs seule insuffisante |

`public/ux-journey-integration.test.mjs` a été relu et exécuté seul : test DOM simulé, pas navigateur ni API réelle. Il couvre récupération locale, déplacement du focus, arrêt visible et changement de départ. Il ne prouve pas l'annulation des requêtes serveur.

## Risques à contrôler, non défauts démontrés

1. Le bouton de réaffichage disparaît lors du rafraîchissement : vérifier où se retrouve le focus dans un navigateur réel.
2. Les zones live larges et imbriquées peuvent produire trop d'annonces : mesure assistive nécessaire, pas déduction certaine depuis les attributs.
3. Une explication techniquement exacte mais longue peut rester incomprise. Mesurer réussite sans aide sur quatre scénarios gelés : sans fiche, source indisponible, tout filtré, arrêt puis autre départ. Seuil proposé avant étude : aucun choix d'identité involontaire, aucun appel catalogue pour simple défiltrage, aucune perte de focus empêchant la suite. Temps et compréhension à mesurer, pas à inventer.

Les captures historiques ne démontrent pas l'état runtime de la version 0.21.0. L'activation et son observation restent au responsable d'intégration. Aucun niveau « SOTA UX » ni pourcentage global n'est déduit de cette revue.
