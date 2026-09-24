# Éprouver un ensemble capable de continuer Corpus

Protocole proposé le 22 septembre 2026. **Aucun run effectué.** Les cas de
[SCENARIOS.json](SCENARIOS.json) sont une grille de préparation, pas un runner.

## Règles communes

- Tester l'assemblage complet : modèle, moteur, hôte, contexte, mémoire et outils.
  Enregistrer versions/hachages, paramètres, budget de contexte, machine et droits.
- Utiliser une copie sans données sensibles. Fournir les mêmes fixtures, historique,
  temps maximal et possibilités d'action aux assemblages comparés.
- Construire et figer les fixtures nécessaires avant le run. Chaque tour utilisateur
  arrive après la réponse/action précédente ; ne pas envoyer toute la conversation
  comme une seule consigne. Les attentes ne sont pas données au candidat.
- Écrire les traces d'outils, réponses, diff, observations et erreurs dans un dossier
  de run distinct. Conserver l'état avant/après et le lien aux sources.
- Pas de connexion cloud, y compris pour les juges, résumés, embeddings, vision,
  titres ou complétions. Observer les tentatives de trafic et tester le blocage des
  sous-processus ; une absence de requête dans le texte du modèle n'est pas une preuve.
- Les contrôles de fichier/contrat peuvent être automatisés ; l'utilité, la justesse
  d'une explication ou d'une création exigent une lecture. Un jugement humain est
  déclaré comme tel ; aucun modèle ne s'auto-décerne une équivalence à Corpus.

## Séquence praticable

1. **Premier lot transversal : C01, C03, C04, C07, C10, C19.** Vérifier dès le début
   contexte, ton, nuance, code et hors ligne. Un seul test de code ne décide pas.
2. Réaliser les autres cas, notamment restauration, interruption et reconstruction.
   Toute capacité manquante reçoit `blocked` avec cause précise, pas `passed`.
3. Séparer résultat sur cas connu et résultat sur variante nouvelle. Geler les
   variantes avant exécution ; après correction du candidat, recommencer un nouveau
   run versionné. Ne pas effacer les échecs initiaux.
4. Vérifier un usage prolongé sur plusieurs tâches, fermeture/réouverture comprise.
   Relever le temps jusqu'au résultat utile, RAM maximale, erreurs, pertes et actions
   nécessaires de l'utilisateur. Les seuils de confort sont fixés avant ce run.
5. Présenter la couverture par usage. Un périmètre manquant ou une perte ne devient
   acceptable que par un arbitrage explicite ; ne pas appeler la migration complète
   parce qu'un sous-ensemble fonctionne.

## Décision et compte rendu

Quatre axes distincts : **continuité de conversation**, **travail réellement livré**,
**maîtrise locale des composants et données**, **coût/confort d'usage**. Aucun score
moyen ne compense un envoi distant interdit, des données perdues ou une réussite
inventée. Le code libre et la reconstruction demandent une vérification de la chaîne
logicielle, distincte de la qualité du modèle à poids ouverts.

Pour chaque scénario : `not_run`, `blocked`, `failed`, `partial` ou `passed`, avec
observations, preuves et limites. Les attentes sont des critères d'acceptation à
examiner, pas des preuves que le comportement existe. Ajouter le retour utilisateur
sur ton/utilité quand il a réellement eu lieu ; sinon `not_observed`.

Le rapport final explique simplement : « cela fonctionne sur ces usages ; voici
ce qui manque ; voici ce que la reprise conserve ou perd ». La bascule reste un
acte distinct de l'étude et des essais.
