# Génération visuelle locale — sélection du 23 septembre 2026

## Choix pour ce PC

RTX 4070 Laptop, 8 Go de VRAM, 32 Go de RAM. Le service de conversation Qwen reste inchangé. Le moteur visuel est **stable-diffusion.cpp**, binaire Vulkan officiel épinglé à `master-899-28b454b`. Les poids sont quantifiés ; leurs révisions, tailles et SHA-256 sont dans `MEDIA_MODELS_LOCK.json`. Le dossier réel est `.dev-local/corpus-media`.

| Candidat | Intérêt | Décision locale |
| --- | --- | --- |
| [FLUX.2 Klein 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) | Génération et édition dans un modèle compact, distillation 4 étapes, Apache 2.0 | Retenu en Q4, encodeur Qwen3 4B Q4. Bon compromis interactif ; ce choix ne prouve pas une supériorité absolue. |
| [Z-Image](https://github.com/Tongyi-MAI/Z-Image) | Turbo 6B rapide, réalisme et texte ; version de base plus flexible | Alternative pertinente, non installée : priorité à génération + retouche avec un même moteur. L’édition annoncée ne doit pas être confondue avec une capacité déjà distribuée. |
| [Qwen-Image-2512](https://huggingface.co/Qwen/Qwen-Image-2512) | Famille orientée génération d’image et texte complexe, Apache 2.0 | Plus lourde ; pas de test comparatif local, donc aucune affirmation de qualité inférieure. |
| [Qwen-Image-2.1](https://huggingface.co/Qwen/Qwen-Image-2.1) | Nouvelle génération 7B, édition et transparence RGBA | Licence Qwen Research, pas Apache 2.0 : non retenu pour cette demande open source. |
| [HunyuanImage 3.0](https://huggingface.co/tencent/HunyuanImage-3.0) | Modèle très volumineux, licence communautaire Tencent | Non retenu pour la mémoire et le stockage de ce PC. |
| [Wan 2.2 TI2V 5B](https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B) | Texte ou image vers vidéo, Apache 2.0 | Base testée puis écartée du profil actif : artefacts en texte-vers-vidéo. Animation avec référence vérifiée, mais plus lente. Le 720p officiel requiert davantage de VRAM. |
| [FastWan 2.2 TI2V 5B](https://huggingface.co/Green-Sky/FastWan2.2-TI2V-5B-FullAttn-GGUF) | Variante distillée, licence Apache 2.0 annoncée par le distributeur, poids Q6 | Profil actif après observation d’un vrai rendu propre à 832 × 480. Encodeur UMT5 Q4, décodeur TAEHV sous MIT. |
| [LTX-2.5](https://huggingface.co/Lightricks/LTX-2.5) | Audio-vidéo synchronisés, scènes multiples, encodeur Gemma 4 12B | Non retenu : empreinte supérieure, accès sous conditions et licence communautaire spécifique, distincte d’Apache/MIT. |

Ces modèles peuvent produire plusieurs styles raster (photo, illustration, dessin, rendu 3D simulé). « Tous types » ne signifie pas une garantie universelle : pas de SVG natif, de scène 3D éditable, de typographie toujours exacte ni de continuité parfaite entre plans. Aucun classement indépendant exhaustif n’a été reproduit sur ce PC.

## Utilisation et intégration

Dans une conversation : **+ → Créer une image, vidéo, voix ou musique**. Description, format, graine et référence facultative. Les fichiers et paramètres sont persistants côté service. Fermer l’onglet n’arrête pas le calcul ; Quitter Corpus arrête aussi les rendus. Après arrêt du moteur, un rendu commencé est marqué interrompu, les travaux encore en attente reprennent au démarrage.

Qwen dispose des outils MCP `media_models`, `media_generate`, `media_result`. Même API, même file et mêmes fichiers que le studio. Le mode Plan interdit ces outils. Les réponses d’outil sont accompagnées du suivi et de l’aperçu dans le chat. Une image terminée peut servir de référence de retouche ou d’animation via `reference_job`.

« Ajouter au brouillon pour le modèle » joint l’image à Qwen vision. Pour une vidéo, le parcours existant extrait des images horodatées ; il ne prétend pas transmettre une observation exhaustive du mouvement. Le brouillon est relu avant envoi. Le chat express, qui n’utilise pas d’outils, reste un chat texte.

## Exécution et limites

- Une seule génération, quatre travaux maximum en attente/exécution ; délai maximal d’une heure.
- RTX Vulkan pour la diffusion, encodeurs texte sur CPU. Budget GPU de 6 Go, décodeur vidéo léger TAEHV (compromis fidélité/mémoire). Les ressources sont libérées après chaque rendu.
- Images de 128 à 1024 pixels par côté ; vidéos 832 × 480 ou 480 × 832, 17/33/49/65 images, 24 i/s. Valeurs par défaut : image 512², vidéo 832 × 480 et 33 images. Les maxima sont des bornes, pas une preuve de qualité à chaque réglage.
- Vidéos muettes. Voix et musique désormais disponibles séparément : voir AUDIO_GENERATION.md.
- Processus sans réseau dans Bubblewrap, modèles en lecture seule, seul dossier du rendu writable. Aucune installation automatique au cours d’une génération. Références PNG/JPEG/WebP limitées à 4 Mo et 4096 pixels par côté ; pas de chemin arbitraire fourni au moteur par MCP.
- Les prompts et références restent dans l’historique local. Aucun hébergement/publication externe.

## Maintenance

`python3 projets/corpus-local-llm-migration/install_media.py` réinstalle les versions épinglées et vérifie les SHA-256 avant activation. Cette commande télécharge environ 18 Go et doit être lancée explicitement ; elle n’est pas exécutée par le chat. FFmpeg, Bubblewrap, pilote Vulkan NVIDIA et Python sont des dépendances système existantes. Aucun changement de pilote n’a été effectué.

Les journaux sont `.dev-local/corpus-media/jobs/<id>/render.log`. Les sorties sont PNG/MP4. Une erreur reste visible ; un rendu raté n’est pas présenté comme terminé. Les fichiers ne sont pas ajoutés à Git.

Source du moteur : [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp), exemples [FLUX.2](https://github.com/leejet/stable-diffusion.cpp/blob/master/docs/flux2.md) et [Wan](https://github.com/leejet/stable-diffusion.cpp/blob/master/docs/wan.md).

Les générations en attente attendent aussi la fin des réponses Qwen pour limiter la concurrence CPU/RAM. Une réponse démarrée pendant un rendu reste possible et peut ralentir les deux. Le processus de génération possède un verrou inter-processus : pas de second worker GPU accidentel.

## Validation réelle du déploiement

Le 23 septembre 2026 : image photo 512² en 20 s ; retouche rouge → bleu en 22 s ; illustration forêt/lune demandée par Qwen via MCP en 28 s de rendu. Le premier appel Qwen a demandé environ 4 min de préparation CPU avant de lancer le rendu : ces temps de diffusion ne représentent donc pas toujours la latence totale d’une demande conversationnelle.

Vidéo FastWan avec référence : 832 × 480, 65 images à 24 i/s, 2,708 s, calcul en 64,59 s. MP4 décodé dans le studio navigateur (readyState 4, dimensions et durée conformes). Les images de contrôle montrent une déformation transitoire du sujet : la continuité n’est pas parfaite. Texte-vers-vidéo également observé en diagnostic local (33 images, environ 59 s). Le profil Wan de base, insatisfaisant, reste un échec explicite dans l’historique.

69 tests Python, 6 suites JavaScript et test du verrouillage Plan passent. Le parcours Qwen → outil → rendu → aperçu du chat est observé. Le transfert d’image au brouillon et le bloc image MCP sont vérifiés ; l’interprétation effective de cette image par Qwen n’a pas été validée dans ce lot. Un ancien onglet a présenté OpenCode après redémarrage ; une ouverture fraîche par `/corpus/` a permis de vérifier le portail complet, sans modification spéculative du routage.

Preuves structurées : `VALIDATION_MEDIA_2026-09-23.json`. Aucun ajout, commit ou push Git.
