# Corpus Builder · format de campagne v2

La source active est `campaigns/sereine.campaign.json`. Elle est lisible par le
studio, le validateur et le moteur de jeu.

## Cycle de travail

1. Ouvrir `studio.html` et modifier un brouillon.
2. Vérifier les diagnostics continus.
3. Exporter le JSON.
4. Remplacer explicitement le fichier source dans `campaigns/`.
5. Exécuter `npm test`.
6. Ouvrir `index.html` pour réobserver la campagne compilée.

Le studio n'écrit jamais directement dans le dépôt. L'export et le remplacement
restent deux opérations distinctes afin qu'un brouillon ne devienne pas une
version active sans décision explicite.

Les identifiants et couleurs sont validés avant compilation, et les textes de
campagne sont échappés lors de leur insertion dans l'interface. Cette frontière
protège l'ouverture locale de campagnes échangées ; elle ne transforme pas un
fichier reçu d'une source inconnue en contenu de confiance.

Les vues permettent de créer, dupliquer et supprimer positions, actions et
seuils. Les champs causaux complexes restent saisis sous forme de petits objets
JSON attachés à chaque action, avec diagnostic immédiat en cas de syntaxe
invalide.

## Parties déclaratives

- `actors` : positions, lieux, couleurs et savoirs initiaux ;
- `knowledge` : faits nommés utilisables par les préconditions ;
- `worldFlags` : états matériels ou institutionnels possibles ;
- `timeline` : seuils, branches conditionnelles, effets et irréversibilité ;
- `actions` : auteur, durée, variantes, préconditions, effets, traces, relais et délais ;
- `outcomeDimensions` : dimensions du bilan, jamais agrégées.

## Diagnostics actuels

Le validateur contrôle les identifiants, références, durées, seuils, effets
imbriqués, traces, relais, fuites de savoir entre positions et réintroduction
d'un score global — y compris une jauge cachée nommée `pressure`.

Une validation réussie établit seulement la cohérence statique du fichier. Elle
n'établit ni l'intérêt ludique, ni l'équilibre, ni la robustesse d'une campagne
auprès de joueuses et joueurs différents.

## Frontière actuelle

Les conséquences jouables sont interprétées depuis la campagne. Les textes de
résultat propres à Sereine, ses quatre illustrations et le bilan final restent
spécialisés. L'analyse d'accessibilité explore les branches, les conditions
négatives, les effets différés et le temps. Elle annonce explicitement si sa
limite de calcul est atteinte au lieu de déclarer les actions restantes
impossibles.
