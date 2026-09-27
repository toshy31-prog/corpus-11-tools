# Comparaison descriptive des épreuves durables

`durable_run_comparison.py` lit deux reçus déjà obtenus et produit uniquement
une comparaison de durée, d’état terminal déclaré et de profil d’appels d’outils
agrégé. La sortie ne contient ni texte de conversation, ni argument d’outil, ni
identifiant de session.

La comparaison ne cherche pas à expliquer un écart. Pour attribuer une cause,
il faudrait au minimum documenter et contrôler le prompt, la fixture, le modèle,
la configuration, le profil d’outils et l’environnement. Ces éléments restent
`not_recorded` si aucune déclaration explicite n’est fournie. Une différence
visible de nombre ou de noms d’outils invalide même une déclaration de profil
identique.

Exemple local, sans lancer Corpus ni Qwen :

```bash
python3 durable_run_comparison.py \
  .migration-smoke/durable-e2e-20260927.json \
  .migration-smoke/durable-e2e-v2-result.json
```

Le résultat est une observation pour préparer une éventuelle épreuve contrôlée ;
il ne recommande aucun réglage, ne modifie pas le runtime et ne vaut ni une
régression ni une amélioration démontrée.
