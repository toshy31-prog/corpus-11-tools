# Préparer une comparaison musicale à l'aveugle

## Livré, pas encore une étude humaine

`scripts/blinded-discovery-evaluation.mjs` prépare un paquet de jugement sans nom de méthode, score interne, rang ni identifiant original. Les titres et artistes restent visibles pour identifier les morceaux. Le coordinateur garde séparément la correspondance des jetons avec les listes classées. Aucun jugement humain n'a été collecté ou inventé.

Réemploi de principes, sans code tiers ni dépendance : [Microsoft Research, Evaluating Recommender Systems](https://www.microsoft.com/en-us/research/publication/evaluating-recommender-systems/) distingue évaluation hors ligne et expérience utilisateur ; [RecBole, paramètres d'évaluation](https://www.recbole.io/docs/user_guide/config/evaluation_settings.html) rend explicites regroupement, ordre, séparation et périmètre comparatif. Cet outil ne reproduit pas une expérience industrielle ni une méthode SOTA.

## Utilisation locale par import

```js
import { prepareBlindEvaluation, evaluateBlindJudgments } from './scripts/blinded-discovery-evaluation.mjs';
const { packet, key } = prepareBlindEvaluation({
  salt: 'identifiant-experimentation-choisi-avant-jugement',
  queries: [{
    id: 'depart-1', departureTitle: 'Titre du départ',
    items: [{ id: 'piste-a', title: 'Titre A', artists: ['Artiste A'] }],
    rankings: [{ method: 'scout', ids: ['piste-a'] }, { method: 'baseline', ids: [] }]
  }]
});
// Fournir seulement packet aux juges consentants, jamais key.
// Une ligne par couple (queryToken, itemToken), grade entier 0–3 ou null.
// Un appel par juge : ne pas écraser leurs désaccords.
const result = evaluateBlindJudgments({ key, rows: [], k: 10 });
```

Les `items` doivent représenter le catalogue admissible figé, pas seulement l'union commode des résultats : autrement les métriques ne décrivent que ce sous-ensemble. Toutes les méthodes reçoivent les mêmes items. Le budget d'appels, la date et l'échantillonnage doivent être figés en amont : ce module ne les garantit pas à lui seul. Préparer les familles développement/test avant les jugements, sans déplacer les cas après observation.

Le paquet ordonne les jetons hachés avec un sel explicite, indépendamment de l'ordre des listes d'entrée. Cela réduit les indices liés au rang et au système ; ce n'est ni une anonymisation cryptographique ni un double aveugle garanti. Le hash du paquet est un repère de traçabilité, **pas une signature, un scellement ni un contrôle automatique contre la falsification de la clé**. Ne pas communiquer la clé aux juges.

## Protections testées

- Notes absentes ou nulles restent inconnues ; pas de nDCG/recall artificiel sur un catalogue incomplètement jugé.
- Lignes de jugement répétées refusées plutôt qu'écrasées par des clés JSON.
- Identifiants, jetons et méthodes uniques contrôlés à la préparation et à l'import de la clé.
- Classement hors catalogue refusé ; mêmes méthodes exigées pour chaque départ.
- Résultats par juge et par départ, sans moyenne cachant les désaccords.

La revue croisée a trouvé qu'une clé importée pouvait réutiliser un jeton pour deux items et propager une note aux deux. Validation et test de non-régression ajoutés avant livraison. Six cas synthétiques dans `tests/blinded-discovery-evaluation.test.mjs` ; exécution ciblée code 0. La validation globale est documentée séparément.

Limites : ce module est une API hors ligne sans interface de collecte ; aucune personne sollicitée, aucun fichier de bibliothèque lu, aucun réseau. L'intérêt musical, la validité documentaire, la nouveauté pour un auditeur et la similarité acoustique demeurent des dimensions distinctes. Le protocole général demeure dans `SOTA_EVALUATION_2026-09-27.md`.
