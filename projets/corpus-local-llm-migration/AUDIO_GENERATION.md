# Voix et musique locales — 23 septembre 2026

## Choix et comparaison

La sélection vise une génération réellement utilisable sur ce PC (RTX 4070 Laptop 8 Go, 32 Go de RAM), avec des licences permissives sur les poids. Elle ne constitue pas un classement universel, ni un benchmark indépendant de tous les modèles.

| Modèle | Sources et intérêt | Décision |
| --- | --- | --- |
| Qwen3-TTS 1.7B VoiceDesign | [Modèle officiel](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign), [code](https://github.com/QwenLM/Qwen3-TTS), Apache 2.0, 10 langues dont français, voix décrite et expressivité | Installé en GGUF Q8, Vulkan/NVIDIA. Permet une voix fictive sans enregistrement de référence. |
| Chatterbox | [Poids officiels](https://huggingface.co/ResembleAI/chatterbox), MIT, famille orientée voix expressive et référence vocale | Alternative pertinente ; non installée, pas de comparaison d’écoute locale entre les deux. |
| OmniVoice | [Projet](https://github.com/k2-fsa/OmniVoice), très large couverture linguistique | Alternative à étudier si les langues hors Qwen deviennent prioritaires. Non testé localement. |
| MOSS-TTS | [Projet](https://github.com/OpenMOSS/MOSS-TTS), [poids](https://huggingface.co/OpenMOSS-Team/MOSS-TTS), Apache 2.0, famille de voix et dialogues longs | Non installé ; priorité au français et au contrôle de voix avec un profil compact déjà validé. |
| Fish Audio S2 | [Explication de licence par l’éditeur](https://fish.audio/ko/blog/what-we-mean-by-open-source-for-s2/?articleLocale=en) | Licence de recherche spécifique : pas retenu comme équivalent Apache/MIT. |
| ACE-Step 1.5 Turbo | [Projet officiel](https://github.com/ACE-Step/ACE-Step-1.5), [poids](https://huggingface.co/ACE-Step/Ace-Step1.5), MIT, instrumental et chant | Installé en GGUF Q8, 8 étapes, CPU. Le profil Vulkan a échoué par manque de VRAM ; le CPU est le profil validé, sans toucher aux pilotes. |
| ACE-Step 1.5 XL | Même projet, variante DiT 4B plus lourde | Non installé : le projet annonce au moins 12 Go de VRAM avec déchargement, au-delà de cette carte. |
| HeartMuLa | [Projet officiel](https://github.com/HeartMuLa/heartlib), Apache 2.0, contrôle des paroles, génération autoregressive | Candidat crédible, non comparé localement ; ACE-Step est retenu pour le parcours simple durée/style/paroles. |
| MusicGen | [Poids officiels](https://huggingface.co/facebook/musicgen-large) | CC-BY-NC : restriction non commerciale, non retenu pour cette demande. |
| Stable Audio Open | [Poids officiels](https://huggingface.co/stabilityai/stable-audio-open-1.0) | Licence communautaire spécifique, distincte d’une licence permissive ; non installé. |

Moteur natif [audio.cpp](https://github.com/0xShug0/audio.cpp), version officielle `v0.8.1`, licence Apache 2.0. Archive Linux Vulkan portable vérifiée contre son SHA-256 publié. Les deux GGUF sont des conversions distribuées par le mainteneur du moteur, épinglées au commit `406756ee8e3b16e902ce40112986c1010775f888`. Voir `AUDIO_MODELS_LOCK.json` et `media_licenses/`.

## Dans Corpus

- **+ → Créer une image, vidéo, voix ou musique** ouvre le studio commun. Lecteur WAV, téléchargement, relance, annulation et lien vers le brouillon.
- **Voix** : texte exact, description du timbre/de l’expression, langue et graine. Maximum 1200 caractères. Le profil synthétise une voix décrite ; il ne clone pas une personne.
- **Musique** : style/instruments/ambiance, paroles originales facultatives, langue, durée de 10 à 120 secondes et graine. Paroles vides = instrumental. Sortie stéréo 48 kHz.
- **Réponse → Plus d’options → Créer une lecture expressive** prépare le texte dans le studio. Les réponses longues sont présentées comme extrait éditable (1200 caractères).
- **Paramètres → Voix** : choix « Français expressif (Qwen3-TTS) », ou voix rapide eSpeak existante. Arrêter annule aussi la tâche vocale en attente/en cours ; une requête tardive ne reprend pas la lecture.
- **Qwen** utilise `media_generate` avec `model=qwen-tts` ou `model=ace-step`, les mêmes travaux et le même suivi. `media_result` décrit le fichier terminé. Le modèle de conversation ne reçoit pas le signal sonore et ne doit pas prétendre l’avoir écouté. Le lien, la consigne et les paroles peuvent être ajoutés au brouillon.

Les quatre familles partagent une seule file persistante, sans nouvelle consommation GPU simultanée. Les travaux attendent la fin des réponses de conversation avant de commencer. Fermer le studio ou la page laisse le rendu continuer ; quitter le moteur Corpus l’interrompt. Aucun service réseau supplémentaire ni publication externe. Mode Plan : les appels d’outil du modèle restent bloqués.

## Profil mémoire et limites

Qwen3-TTS utilise Vulkan sur la RTX. ACE-Step utilise six threads CPU : le chargement des composants du moteur audio.cpp dépasse la VRAM de ce PC en Vulkan, même en Q8 et avec `mem_saver`. Le planificateur musical interne est désactivé (options `thinking` et `use_cot_*`) : les consignes et paroles sont fournies directement par l’utilisateur ou Qwen. Cela évite aussi la branche de planification quantifiée signalée comme instable dans la documentation du moteur. Les éventuels effets de la quantification sur la qualité n’ont pas été comparés au BF16 localement.

La durée 120 s est une borne de travail, pas une preuve de qualité validée sur deux minutes. Pas de diffusion audio en direct, clonage vocal, pistes séparées, retouche musicale ni synchronisation automatique avec les vidéos dans cette intégration. La qualité, l’accent, la prosodie et la fidélité des paroles peuvent varier selon le texte et la graine.

## Installation reproductible

`python3 projets/corpus-local-llm-migration/install_audio.py`

Téléchargement explicite d’environ 9 Go de poids, reprise des fichiers partiels, validation taille/SHA-256 avant activation, extraction sûre du moteur. Runtime installé dans `.dev-local/corpus-media`, sans changement de pilote ni dépendance Python lourde. L'archive de reconstruction vit sous `CORPUS_CACHE_ROOT/downloads/corpus-media`. Aucun téléchargement déclenché par Qwen pendant la génération. Exécution Bubblewrap sans réseau, modèles en lecture seule, seul dossier du travail inscriptible. Sorties sous `CORPUS_DATA_ROOT/corpus-media/jobs/<id>/audio.wav`, journal dans `render.log`.

## Validation

Synthèse française de 7,12 s créée en 9,45 s ; transcription locale Whisper fidèle au texte demandé. Deuxième voix féminine expressive : 5,84 s créée en 13 s via l’API déployée. Instrumental jazz de 15 s stéréo 48 kHz produit en 59,28 s sur CPU. Chanson française de 30 s produite en 119,86 s via le service Corpus.

75 tests Python passent, ainsi que les six suites JavaScript préexistantes, le verrouillage Plan et la nouvelle vérification JavaScript des courses de lecture vocale (arrêt pendant création et double clic). Le formulaire studio a créé puis annulé une voix en attente avec succès. La sortie GPU musicale en échec est conservée dans `diagnostics/`, elle n’est pas annoncée comme fonctionnelle.

### Contrôles complémentaires

Le parcours réel Qwen → MCP → file → Qwen3-TTS → WAV est terminé : session `ses_f32e3d40bffeaIpFSsm6dg1B6O`, travail `6498ee1b03a3457c9e443f468a72a83d`, 3,6 s de voix créées en 13,01 s. Le modèle a appelé le bon outil avec le texte exact et un style chaleureux.

**Chant expérimental** : le fichier français de 30 s est valide, mais Whisper ne retrouve pas les paroles demandées. Un second essai avec planificateur activé produit 30 s en 157,14 s, mais la transcription détecte du coréen. Ce réglage n’est donc pas activé. La fidélité des paroles et la qualité musicale ne sont pas validées par une écoute humaine ; la création de WAV ne suffit pas à les démontrer.

Le studio, les champs conditionnels, les lecteurs affichés et l’annulation ont été observés. Le navigateur intégré de test a ensuite planté lors d’un clic de lecture ; sa page de récupération est bloquée par la politique URL de l’outil. La lecture audible de bout en bout reste non confirmée. Aucune attribution de ce plantage au portail n’est établie. Le service Corpus reste actif.

Revalidation finale : 75 tests Python passent hors restriction de socket du bac à sable ; test Plan et test des courses de lecture vocale passent. Aucun ajout/commit/push Git.
