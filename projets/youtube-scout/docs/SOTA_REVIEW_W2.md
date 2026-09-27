# Revue croisée — vague 2 — 27 septembre 2026

## Stockage

La revue plateforme a relevé que le mode `open(..., 0600)` ne resserre pas un temporaire préexistant. Correction ajoutée par le propriétaire : `FileHandle.chmod(0600)` avant écriture, test avec `.tmp` initialement 0666 et injection d'échec chmod. Suite ciblée de cinq fichiers passée après correction. La revue distingue toujours ancien contenu préservé **avant** rename et publication incertaine **après** rename. Pas de preuve de résistance réelle à une panne électrique.

## Corpus identité : contrôle indépendant du chargement

Relecture du script `scripts/evaluate-external-musicbrainz.mjs` et du rapport `SOTA_EXTERNAL_IDENTITY.md`, sans modifier leur protocole ou leurs seuils. Le parseur Python standard `csv.DictReader`, distinct du parseur JavaScript du benchmark, confirme sur le même fichier déjà téléchargé : 19 375 lignes, 10 000 CID, 19 375 TID distincts, aucun CID vide, 9 375 lignes supplémentaires après première référence de chaque CID, douze colonnes attendues.

La reproduction JavaScript locale, code 0, retrouve 80 auto-acceptations / 80 correctes, 134 suggestions, 786 rejets, baseline exacte 49 correctes. Identique SHA256 `527a94f24f7e813a9bc3fef35a635f13e195516966b308140a0dd2926afbb97d`. Les CID sont transportés dans `cluster` pour la mesure mais le scorer ne consulte pas ce champ. Les négatifs appartiennent à d'autres CID selon la vérité du fournisseur; cela n'en fait pas une annotation audio humaine indépendante.

## Biais et portée

- Le bon candidat est injecté dans les dix candidats : rappel de récupération non évalué. Source `unknown`, aucune API consultée pendant mesure.
- Le corpus MusicBrainz/DAPO est extérieur au projet mais ses duplications perturbées sont artificielles. Ce n'est ni une population de recherches YouTube réelles ni un corpus de versions sonores.
- Les 1 000 requêtes ne représentent pas nécessairement 1 000 clusters indépendants. Aucune incertitude statistique naïve binomiale ajoutée.
- Le classement trie uniquement le score, donc conserve l'ordre d'entrée en cas d'égalité. L'ordre initial gold-first a 252 top scores ex aequo : **941/1000 top-1 ne doit pas être présenté seul comme performance robuste**. La sonde d'ordre hash demandée par coordination est une analyse de sensibilité supplémentaire, pas un remplacement opportuniste du protocole initial.
- Le garde de version W2 ne change pas cette mesure, faute de champ version; le différentiel avec égalité exacte appartient au moteur antérieur, pas au correctif W2.

Sonde hash reproduite séparément, code 0 : top-1 **714/1000** contre 941/1000 gold-first; 252 ex aequo inchangés. Auto-acceptations 80/80 correctes, suggestions 134, rejets 786 et baseline 49 restent identiques. Le biais d'ordre atteint le top-1, pas les décisions automatiques observées dans ce jeu.

Conclusion : mesure extérieure conditionnelle reproductible; aucune preuve de palier SOTA ni de rappel bout en bout. Les chiffres d'auto-acceptation et couverture peuvent être cités avec ces bornes, non comme précision future de 100 %.
