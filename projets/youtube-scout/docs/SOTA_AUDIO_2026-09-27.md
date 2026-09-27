# Audio, empreintes et similarité — audit du 27 septembre 2026

## Place dans le projet

Le `README.md` définit Scout comme exploration d'un graphe de preuves ; il précise que pertinence du lien n'est pas ressemblance sonore. `public/scout-mixer-panel.mjs` conserve cette distinction dans l'interface. `package.json`, les modules `lib/` et `public/` examinés ne montrent pas de moteur Chromaprint/AcoustID, de calcul d'embeddings musicaux ni de décodage Web Audio pour reconnaissance. Le mot « fingerprint » rencontré dans `lib/exploration.mjs` désigne une signature de métadonnées, pas une empreinte acoustique.

**Conclusion : extension audio non implémentée dans le périmètre inspecté. Elle reste hors dénominateur du cœur documentaire actuel.** Elle doit apparaître séparément si l'objectif futur est de rivaliser aussi en reconnaissance/similarité sonore. Une recherche textuelle n'est pas un audit exhaustif de tous les fichiers historiques.

## Trois fonctions à ne pas confondre

| Fonction | Résultat légitime | Ne prouve pas |
| --- | --- | --- |
| Empreinte acoustique | Correspondance avec un enregistrement indexé | Collaboration, crédit, proximité esthétique |
| Embedding / similarité sonore | Voisinage dans une représentation et un protocole donnés | Identité de morceau, goût personnel, raison documentaire |
| Mélodie / reprise | Parenté mélodique ou composition candidate | Même enregistrement, droits identiques |

## Recherche actuelle consultée

- [MERT, article et implémentation officielle](https://github.com/yizhilll/MERT) : représentations musicales auto-supervisées, avec renvoi au protocole MARBLE. Ce n'est pas une base d'identités de morceaux ni une preuve de qualité de recommandation dans Scout. La page MARBLE n'a pas été récupérable lors de cette session : aucun rang de leaderboard n'est revendiqué.
- [CMI-Bench, ISMIR 2025, version du 27 juin 2025](https://arxiv.org/abs/2506.12285) : évalue plusieurs tâches musicales avec métriques comparables aux modèles supervisés ; rapporte des limites et biais des modèles audio-texte. À reprendre : évaluations par tâche/culture/période, pas un score conversationnel unique.
- [AudioRAG, prépublication de février 2026](https://arxiv.org/abs/2602.10656) : benchmark de raisonnement et récupération audio. Sert à préparer des évaluations de récupération, mais ne démontre pas que Scout devrait devenir un assistant audio généraliste ni qu'un modèle y domine toutes les tâches musicales.

## Acteurs industriels mondiaux

- [Apple ShazamKit](https://developer.apple.com/shazamkit/) : signatures acoustiques et catalogue Shazam ou personnalisé, SDK natifs. Source officielle de capacité, pas comparaison indépendante avec Scout. Une intégration exigerait plateforme adaptée, activation développeur et examen contractuel ; aucun appel réalisé.
- [Google Hum to Search](https://research.google/blog/the-machine-learning-behind-hum-to-search/) : représentation apprise pour retrouver des chansons à partir d'une mélodie fredonnée. Reprendre la séparation composition/enregistrement ; la publication ne fournit pas ici un service ouvert à brancher gratuitement au projet.
- [ACRCloud, API officielle](https://docs.acrcloud.com/reference/identification-api/identification-api) : reconnaissance à partir d'extraits ou empreintes, authentification signée. Fournisseur commercial mondial supplémentaire aux GAFAM ; pas une dépendance ouverte, pas de clé ni d'audio envoyé.

Les fonctions documentées sont vérifiées ; leur performance relative, couverture mondiale et coûts effectifs pour ce projet ne sont pas mesurés. Ce panorama n'est pas un classement exhaustif de toutes les sociétés.

## Réutilisation open source et licences observées

| Candidat | Ce qui est réutilisable | Licence / limite vérifiée |
| --- | --- | --- |
| [Chromaprint v1.6.0](https://github.com/acoustid/chromaprint/releases/tag/v1.6.0) | Empreinte locale pour audio quasi identique ; candidat premier pour fichiers fournis légalement | [Licence de ce tag](https://github.com/acoustid/chromaprint/blob/v1.6.0/LICENSE.md) : code propre MIT, ensemble incluant FFmpeg LGPL-2.1 ; dépendances FFT à examiner. Ne pas inférer licence d'un binaire depuis un seul fichier source. |
| [LAION CLAP](https://github.com/LAION-AI/CLAP) | Embeddings audio/texte, prototype futur de recherche descriptive | [LICENSE du dépôt](https://github.com/LAION-AI/CLAP/blob/main/LICENSE) CC0-1.0. Ce constat ne vaut pas licence universelle des poids/données : le README signale les restrictions de copyright des jeux audio ; auditer le checkpoint retenu séparément. |
| [MERT code](https://github.com/yizhilll/MERT) / [poids MERT-v1-330M](https://huggingface.co/m-a-p/MERT-v1-330M) | Représentations musicales pour comparaison contrôlée | Code Apache-2.0 ; fiche des poids **CC-BY-NC-4.0**. Ne pas transporter automatiquement la licence du code vers les poids. Usage commercial non présumé autorisé. |
| [MusicBrainz Picard](https://github.com/metabrainz/picard) | Référence de workflow séparant scan acoustique et lookup métadonnées | GPL-2.0-or-later ; principes adoptables, copie de code soumise à compatibilité. |

Aucune installation, aucun poids ou audio téléchargé. Les licences sont des constats documentaires datés, non une validation juridique exhaustive d'un produit redistribué.

## Quatre critères d'acceptation, extension seulement

Barème partagé : 0 absent ; 1 code partiel ; 2 validation locale historique ; 3 tests locaux actuels ; 4 comparaison indépendante comparable.

| Critère mesurable | État local | Niveau |
| --- | --- | ---: |
| Fichier audio consenti → empreinte versionnée et résultat traçable, sans upload implicite | Aucun chemin identifié | 0 |
| Récupération acoustique robuste aux transformations sur jeu tenu à l'écart | Aucun benchmark ni moteur identifié | 0 |
| Recherche de similarité audio distincte des liens catalogue avec évaluation humaine aveugle | Aucun embedding identifié | 0 |
| Comparaison avec référence sur même audio autorisé, faux positifs et coût/latence publiés | Non réalisée | 0 |

**0/16 pour cette extension audio**, pas « projet à 0 % ». Ajouter artificiellement un calcul de vecteurs ou un compteur de tests n'atteindrait aucun de ces critères.

## Adoption réaliste proposée

1. Choisir explicitement si la priorité est identifier des fichiers personnels ou découvrir des sons proches. Garder les directions documentaires existantes intactes.
2. Pour identité : pilote hors service personnel, fichiers que l'utilisateur est autorisé à fournir, Chromaprint version figée, pas de récupération YouTube. L'appel AcoustID éventuel est une autorisation distincte ; commencer par comparaison locale sur corpus autorisé.
3. Pour similarité : seulement après accord d'installation et disponibilité d'audio licite, comparer une baseline acoustique simple et CLAP/MERT compatible avec l'usage prévu. Mesurer rappel@k, jugements aveugles, diversité, latence et taille mémoire ; conserver désaccords entre métriques.
4. Seuil proposé avant intégration : aucun upload implicite ; erreurs identitaires comptées séparément des voisins stylistiques ; test indépendant reproductible ; amélioration face à la baseline sans perte cachée de couverture. Les seuils numériques de performance doivent être fixés après choix du corpus et de la tâche, pas inventés après résultats.

Statut du lot : rapport vérifié par consultation des sources et lecture du code, aucune capacité audio implémentée ou déclarée activée. Aucun test audio artificiel ajouté.

## Actualisation W5 — sources figées au 27 septembre 2026

Consultation renouvelée des pages primaires MERT (code et fiche MERT-v1-330M), licences CLAP/Chromaprint v1.6.0, Apple ShazamKit, Google Hum to Search, CMI-Bench et AudioRAG. Cette vérification confirme les distinctions précédentes ; elle ne garantit pas un inventaire exhaustif des publications 2026 ni un leadership mesuré. La documentation d'un industriel n'est pas une évaluation indépendante.

La chaîne des droits doit rester explicite :

| Ressource | Code | Poids | Audio et données |
|---|---|---|---|
| Chromaprint v1.6.0 | MIT propre ; ensemble LGPL-2.1 avec parties FFmpeg ; licence FFT dépend du build | Pas de checkpoint neuronal à obtenir pour cet algorithme | Aucun droit sur les morceaux ni sur un catalogue distant conféré par la licence du code |
| MERT-v1-330M | Apache-2.0 du dépôt | CC-BY-NC-4.0 affichée par la fiche exacte | Licence du corpus d'entraînement non assimilable à celle des poids ; redistribution audio non autorisée par déduction |
| LAION CLAP | CC0-1.0 du fichier LICENSE consulté | Aucun checkpoint exact sélectionné/audité dans ce lot | Droits du corpus à vérifier morceau par morceau ou selon son contrat ; aucune autorisation générale déduite |
| ShazamKit / Hum to Search | Capacités documentées, pas code ouvert réutilisable établi ici | Aucun poids ouvert établi ici | Accès catalogue/conditions SDK ou service séparés ; aucun appel réalisé |

Réemplois concrets possibles, **non livrés** : (1) comparer des empreintes locales de fichiers consentis avec Chromaprint, journaliser version/build et faux rapprochements ; (2) préparer des triplets de similarité musicale annotés à l'aveugle avant tout choix d'embedding ; (3) pour MERT, auditer aussi l'exécution de code personnalisé signalée `trust_remote_code=True` par la fiche, figer la révision et examiner ce code avant installation. Le dépôt signale une contrainte de compatibilité Transformers 4.38 : ne pas promettre un simple branchement à l'environnement courant.

CMI-Bench et AudioRAG donnent des idées de tâches/contrôles, pas une licence implicite de leurs enregistrements ni un comparatif Scout déjà exécuté. Aucun téléchargement de modèle/audio, installation ou accès à un fichier privé dans cette actualisation. Score audio inchangé **0/16**, toujours hors cœur **80 points**.
