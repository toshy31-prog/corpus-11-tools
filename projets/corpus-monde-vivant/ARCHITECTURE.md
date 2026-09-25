# Architecture 3D

Godot possède entrées, corps physique, caméra, modèles et rendu.
Rust possède l’état causal. `corpus-cli --serve` garde le monde en mémoire et
échange des lignes JSON par tubes locaux, sans réseau.

Le déplacement est animé à 60 pas physiques/seconde. Franchir une cellule envoie
`EXPLORE x y`, sans avancer le temps. L’horloge envoie `WAIT_1` environ toutes
les 1,2 secondes. Interagir/construire ajoute aussi un cycle. Le noyau ne redémarre
pas à chaque mouvement. Les commandes sont sérialisées, confirmées après sauvegarde.
La fermeture normale attend les réponses en cours.

Commandes spatiales : USE, PLACE, DISMANTLE, DEPOSIT. Godot prédit la traversabilité
pour les collisions ; Rust valide les transitions et reste l’autorité. Cette
duplication bornée exige des tests lors de l’ajout de terrains/ouvrages.

La scène reçoit les objets à dessiner ; profondeur et distance limitent leur
perception. Le système d’observations analytiques reste distinct. Recevoir la
géométrie n’établit pas un savoir omniscient du personnage.

Sauvegarde base + commandes v2 ; position subcellulaire/caméra dans un fichier
.view. Verrou système gardé par le serveur ; remplacement par renommage après
écriture temporaire. Pas de réseau, de WASM ou d’IA générative au runtime.

Le paquet autonome contient un lanceur Linux, Godot, le noyau et les sources
de scène. Aucun compilateur ni dossier de développement requis pour jouer.
