# Scout — vague 3 : récupération réelle et fidélité des découvertes

## Résultat et limite principale

Trois agents spécialisés ont été remobilisés successivement sur génération de candidats, diagnostic, fidélité des chemins, revue croisée, interface et validation. Le coordinateur a ajouté la préparation des jugements à l'aveugle et un oracle indépendant de parcours. L'objectif global « au minimum état de l'art » reste **non démontré**, pas terminé.

Deux corrections touchent le moteur de découverte : suppression des collisions de clés de chemins et conservation des chemins portant le motif recherché. Le nouvel index d'identité est expérimental, **non branché au service** : son léger gain de rappel ne compense pas automatiquement son coût et n'améliore pas la couverture des décisions automatiques dans la sonde.

## Réemplois et créations

| Voie | Réemploi ou création | Preuve et statut |
| --- | --- | --- |
| Identité | Index inversé local, tokens et trigrammes pondérés IDF ; aucune dépendance/modèle | Corpus externe, génération sans référence correcte injectée ; expérimental |
| Motifs catalogue | Parcours tenant compte du nœud **et** de la présence du motif obligatoire | Correctif production sur disque, contre-exemples et oracle indépendant |
| Fidélité des chemins | Encodage structurel des arêtes plutôt que concaténation ambiguë | 16 chemins attendus préservés, contre 8 avant dans la fixture huit directions |
| Interface | Intégration des vrais handlers dans un DOM de test | Recovery identité, filtre vide, arrêt et nouveau départ ; pas navigateur réel |
| Évaluation humaine | Paquet sans méthode/rang, clé séparée, import de notes strict | Contrats testés ; aucun jugement humain encore collecté |

### Un défaut de découverte réel

Un parcours mémorisant seulement « nœud déjà vu » pouvait retenir un crédit ordinaire et ignorer ensuite le chemin atteignant le même artiste par un crédit de remix. À données identiques, l'ordre des arêtes changeait donc les découvertes. Le parcours mémorise désormais l'état du motif pour remix et featuring, avec profondeur inchangée et au plus deux états par nœud. Les autres parcours gardent leur fonctionnement.

Le principe est classique dans les requêtes de chemins : explorer le produit du graphe et de l'état de la requête. Référence primaire vérifiée : [Output-Sensitive Evaluation of Regular Path Queries](https://arxiv.org/abs/2412.07729). Nous réemployons ce principe borné, **pas** l'optimisation OSPG du papier ni ses résultats de performance.

`lib/catalogue-motif-oracle.test.mjs` compare les ancres à une énumération indépendante de toutes les marches de longueur au plus deux sur 256 petits graphes, deux directions et deux ordres : 1 024 comparaisons. Cela vérifie ce périmètre fini, pas tous les graphes ni toutes les explications possibles.

Le même oracle exécuté contre la sauvegarde antérieure échoue dès le graphe `mask=7`, voie remix : artiste `b` attendu, aucune ancre retournée. Il passe contre le correctif. Des tests distincts couvrent 144 permutations et les contrôles négatifs de motif absent, sources exclues, retour au départ et profondeur maximale.

### Récupération sur corpus externe

Même téléchargement autorisé Leipzig CC BY 4.0, aucun nouveau corpus. Mille requêtes de CID distincts, 7 948 références indexées, 815 identités présentes et 185 retirées volontairement. Pas de bon candidat ajouté après recherche.

| Mesure | Clés exactes par champ | Tokens | Hybride tokens/trigrammes |
| --- | ---: | ---: | ---: |
| Référence correcte dans les dix premiers, sur 815 présentes | 366 | 779 | 787 |
| Identifications automatiques correctes, sur 1 000 | 47 | 48 | 48 |
| Fausses acceptations observées | 0 | 0 | 0 |

Hybride : +8 références retrouvées contre tokens, environ 3,7 fois le temps de recherche/décision dans la première mesure, aucune identification automatique supplémentaire. Zéro erreur sur 48 décisions ne prouve pas risque nul. Les corruptions sont synthétiques, le corpus avait déjà été consulté et le catalogue est local ; ce n'est pas une mesure de YouTube en direct. Les 28 références manquées ont été examinées sans ajuster les seuils après résultat.

La revue a aussi corrigé deux défauts de l'index expérimental : mutation des objets après construction et identifiants non textuels. Résultats comparatifs inchangés après correction.

## Dossier reproductible

Validation consolidée incluant les derniers contrôles : **788/788 tests réussis**, zéro échec, ignoré ou annulé ; `npm run check` réussi. Les empreintes des fichiers contrôlés correspondent à la copie testée. Ce résultat remplace les snapshots intermédiaires, sans additionner leurs comptes.

- [Protocole et résultats retrieval](SOTA_RETRIEVAL_W3.md), [diagnostic des erreurs](SOTA_RETRIEVAL_W3_DIAGNOSTIC.md).
- [Fidélité des chemins](SOTA_REUSE_DISCOVERY_W3.md), [parcours d'interface](SOTA_REUSE_UX_W3.md).
- [Préparation des jugements](SOTA_BLIND_EVALUATION_W3.md), [revue croisée](SOTA_REVIEW_W3.md).
- [Validation globale et empreintes](SOTA_VALIDATION_W3.md).
- [Comparateurs externes, licences et incompatibilités](SOTA_NEXT_COMPARATORS_W3.md).

## Conditions restantes avant une revendication SOTA

Les recherches primaires et outils externes fournissent des mécanismes et des comparateurs, pas une victoire par citation. Aucun comparateur externe NAACL/Ditto/RecordLinkage n'a été exécuté dans des conditions identiques. Les domaines, corpus et budgets de leurs publications ne permettent pas de comparer directement leurs chiffres à ceux de Scout.

Il faut encore une comparaison externe exécutée à tâche et budget identiques, un jeu réellement tenu à l'écart pour la promotion, des jugements musicaux indépendants et des parcours observés dans un navigateur. L'extension audio reste distincte et non livrée. Le nombre de tests n'est pas un pourcentage de SOTA.

Pas de service personnel redémarré, pas de page rechargée, pas de bibliothèque ni compte utilisé, aucune dépendance installée. Les correctifs sont présents sur disque ; leur activation dans la session ouverte n'est pas observée.
