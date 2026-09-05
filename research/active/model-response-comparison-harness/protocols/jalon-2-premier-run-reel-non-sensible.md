# Protocole — jalon 2, premier prompt réel non sensible

## Autorisation et portée

Ce jalon suit la validation humaine du jalon synthétique. Il autorise un seul
prompt réel dont l'utilisateur a explicitement confirmé le caractère non
sensible. Il n'établit pas une propriété générale des deux environnements.

## Exécution

1. Créer le run avec `purpose=real_non_sensitive` et la confirmation explicite.
2. Poser la demande brute, sans reformulation, dans deux contextes séparés.
   Les bras sont `chatgpt_custom_gpt` et `codex_corpus` : leurs contextes
   distincts sont déclarés dans le manifest, sans supposer leur équivalence.
3. Importer et sceller chaque réponse séparément ; ne pas montrer la première
   sortie à l'autre environnement ou au comparateur avant les deux scellements.
4. Produire un paquet A/B sans note opérateur ni correspondance d'exécutant.
5. Réviser humainement le paquet et consigner au plus une divergence observée.

Une limite de quota produit une attente ou un état terminal journalisé. Elle ne
permet ni clé API, ni achat de crédits, ni changement de protocole.
