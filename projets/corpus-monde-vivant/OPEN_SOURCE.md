# Composants et provenance

- Rendu, physique, fenêtres, entrées : Godot 4.7.2 officiel, licence MIT.
  Sources : https://github.com/godotengine/godot/tree/4.7.2-stable
  Texte et notices des dépendances conservés dans `third-party/`.
- Noyau : Rust, bibliothèque standard et crates locales du projet. Pas de JVM,
  pas de serveur web, pas d’API distante nécessaire pour jouer.
- Modèles, terrain et shader d’eau de la version 3D : sources procédurales locales,
  modifiables dans `game-3d/`. Aucun asset commercial extrait d’un jeu.
- L’atlas de la version 2D reste dans les archives ; il n’est pas utilisé en 3D.

Godot est effectivement intégré, pas seulement cité comme une piste. Aucun autre
projet n’est présenté comme intégré sans code repris et provenance vérifiée.
L’archive Linux embarque le binaire officiel Godot complet : elle est plus lourde
qu’un export optimisé, mais ne dépend pas du dossier de compilation pour jouer.
Cette livraison reste locale, sans publication ni installation globale.
