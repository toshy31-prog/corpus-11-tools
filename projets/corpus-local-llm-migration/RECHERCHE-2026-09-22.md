# Recherche de solutions pour un Corpus indépendant

> Recherche initiale conservée. Les choix actuels sont dans [DECISIONS.md](DECISIONS.md) :
> le mandat accepte désormais les origines commerciales si le logiciel est libre,
> modifiable et utilisable hors ligne. Les non-sélections et préférences ci-dessous
> décrivent l’étape antérieure, pas la décision actuelle.

Sources consultées le **22 septembre 2026**. Recherche documentaire, sans
installation, téléchargement de poids, inscription, acceptation de conditions
ou test d’inférence. Les pages et versions peuvent évoluer.

## Résultat en langage simple

Il existe des pièces pour construire un atelier Corpus local : un logiciel pour
travailler sur les fichiers, un moteur pour faire tourner l’IA et un modèle pour
répondre. Aucun assemblage étudié ici n’est déjà prouvé équivalent à ton usage
actuel. Une origine publique ou une licence libre ne mesure pas sa qualité.

La direction la plus cohérente à explorer est **un outil communautaire + un moteur
local libre + un modèle de recherche ouvert**. Certains composants gardent des
liens avec des entreprises : ils sont indiqués, sans les transformer en choix
accepté par l’utilisateur.

## Outils de travail : les mains et l’interface

| Candidat | Faits documentés | Appréciation pour Corpus |
| --- | --- | --- |
| **Aider** | Dépôt public sous Apache-2.0 ; travail sur code, intégration Git et modèles locaux. [Dépôt officiel](https://github.com/Aider-AI/aider). | Premier candidat pour un petit essai de modification contrôlée. Interface terminal ; ne remplace pas à lui seul toute l’application Codex. Gouvernance et financement non audités. |
| **Emacs + gptel + gptel-agent** | gptel et son extension agent affichent GPL-3.0. gptel documente llama.cpp local et les conversations dans des fichiers texte ; l’agent accède aux fichiers et à Bash, avec confirmations pour les actions autres que lectures et accès web. [gptel](https://github.com/karthink/gptel), [gptel-agent](https://github.com/karthink/gptel-agent). | Piste communautaire à étudier pour un atelier extensible. Prise en main d’Emacs et intégration à prévoir. Une confirmation n’est pas un confinement ; désactiver les outils web pour l’essai hors ligne. Le nom gptel n’impose pas GPT. |
| **OpenCode** | Projet MIT, application de bureau Linux en bêta documentée ; support d’Ollama local. [Dépôt](https://github.com/anomalyco/opencode), [fournisseurs](https://opencode.ai/docs/providers/#ollama). Les [conditions du service](https://opencode.ai/legal/terms-of-service) identifient Anomaly. | Option d’ergonomie à garder en comparaison, mais son rattachement commercial doit rester visible. Le fournisseur local ne prouve pas à lui seul un fonctionnement totalement hors ligne. |
| **Goose** | Agent initialement apporté par Block à l’Agentic AI Foundation, sous la Linux Foundation. Une procédure hors ligne sur DGX Spark est publiée. [Fondation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation), [procédure](https://aaif.io/blog/running-goose-fully-offline-on-a-dgx-spark). | Point de comparaison pour les fonctions agentiques ; ne pas le présenter comme sans liens industriels. La procédure sur un autre matériel ne valide pas le poste Corpus. |

Pour Aider, les [options officielles](https://aider.chat/docs/config/options.html)
prévoient la désactivation des statistiques, vérifications de mise à jour et
commits automatiques. Un futur profil devra aussi fixer tous les modèles
auxiliaires en local et examiner les dépendances réseau. Son support des
[API compatibles locales](https://aider.chat/docs/llms/openai-compat.html)
ne nécessite pas par principe un appel à OpenAI.

**En simple :** Aider est un atelier surtout centré sur le code ; gptel permet
un atelier plus personnalisable. Leur utilité réelle pour toi reste à essayer.

## Moteur : ce qui fait tourner le modèle

**llama.cpp** constitue un candidat technique : code sous MIT, exécution sur CPU
et plusieurs types de GPU, avec réduction de précision pour limiter la mémoire.
[Dépôt](https://github.com/ggml-org/llama.cpp),
[licence](https://github.com/ggml-org/llama.cpp/blob/master/LICENSE).

**Lien industriel explicite :** le 20 février 2026, Hugging Face a annoncé
l’arrivée de l’équipe ggml/llama.cpp. L’annonce affirme conserver la direction
technique et le caractère ouvert du projet. C’est la déclaration de l’organisation,
pas un audit indépendant de sa gouvernance.
[Annonce officielle](https://huggingface.co/blog/ggml-joins-hf).

**En simple :** un moteur qu’on peut conserver localement est intéressant, mais
je ne le qualifie pas de « sans entreprise derrière ». Sa place dans la cible
reste à arbitrer. Ollama déjà présent sur le poste reste un point d’appui possible,
sans être automatiquement retenu.

## Modèles : le cerveau

### Apertus — origine publique suisse

Développé par ETH Zurich, EPFL et CSCS ; le site mentionne aussi Swisscom comme
partenaire stratégique. Cette origine publique ne signifie donc pas une absence
de partenaires commerciaux. [Présentation](https://apertus-ai.org/pages/about/),
[site du projet](https://www.apertus-ai.org/).

- **Apertus-8B-Instruct-2509** : fiche officielle affichant Apache-2.0, modèle
  multilingue et usage d’outils. Candidat à éprouver en français ; téléchargement
  effectif et compatibilité de la conversion locale non testés.
  [Fiche de cette version](https://huggingface.co/swiss-ai/Apertus-8B-Instruct-2509).
- **Apertus-v1.5-8B** : version plus récente, mais la page officielle exige
  connexion, acceptation d’une politique d’usage et partage d’email/nom de compte
  avec les auteurs pour accéder aux fichiers. Aucune condition acceptée ici.
  Cela concerne l’obtention via ce canal ; aucune obligation de connexion à chaque
  exécution locale n’en a été établie. La portée de la politique complémentaire
  n’est pas analysée dans cette recherche.
  [Conditions affichées](https://huggingface.co/swiss-ai/Apertus-v1.5-8B).

**En simple :** une piste publique intéressante, mais il faut vérifier la version
exacte. « Plus récent » ne veut pas automatiquement dire « plus indépendant ».

### OLMo — institut de recherche à but non lucratif

**Olmo-3-7B-Instruct** affiche Apache-2.0 et une cible linguistique anglaise dans
sa fiche. Ai2 publie un ensemble ouvert de modèles, données et méthodes.
[Fiche exacte](https://huggingface.co/allenai/Olmo-3-7B-Instruct),
[programme OLMo](https://allenai.org/olmo).

Ai2 se présente comme un institut à but non lucratif fondé par Paul Allen,
cofondateur de Microsoft ; sa page institutionnelle montre également des liens
industriels dans le conseil scientifique. Cela ne permet pas de l’assimiler à un
service Microsoft, ni de le présenter comme historiquement extérieur aux grandes
entreprises. [Présentation d’Ai2](https://allenai.org/about).

**En simple :** une piste ouverte pour le cerveau local. Son français et sa
capacité à travailler sur Corpus doivent être mesurés, pas supposés.

## Proposition de suite, sans sélection automatique

1. Qualifier le matériel disponible et les poids déjà présents, sans rien installer.
2. Préparer deux candidats de modèle : Apertus 8B Instruct (version 2509) et
   Olmo 3 7B Instruct. Vérifier fichiers exacts, provenance de conversion, licence,
   taille, modèle de dialogue et support par le moteur avant toute demande de téléchargement.
3. Comparer d’abord leur lecture de documents français ; ensuite seulement un
   petit changement de fichier et un test. Aider est proposé pour le premier
   essai borné ; gptel-agent reste candidat pour l’atelier complet.
4. Présenter le lot exact et ses dépendances avant installation. Tester ensuite
   démarrage à froid et reprise avec trafic externe bloqué, pas seulement un chat.

Ce sont des recommandations de préparation. Aucun achat de matériel, entraînement,
modèle retenu ou équivalence avec GPT n’en découle. Le relevé matériel précédent
ne permet toujours pas de promettre accélération GPU ou vitesse d’exécution.

## Les indépendances à vérifier séparément

- **Usage :** pas de compte, abonnement ou serveur distant requis au quotidien.
- **Copies :** sources, poids, dépendances, licences et formats conservables localement.
- **Gouvernance :** qui décide du projet et finance ses mainteneurs ; liens à documenter.
- **Approvisionnement :** GitHub, Hugging Face et registres peuvent encore être des
  passages de téléchargement ; prévoir archives locales et reconstruction hors ligne.
- **Écosystème :** les API métier des Scouts et les services de publication doivent
  faire l’objet d’une migration distincte ; remplacer l’IA ne les remplace pas.
- **Matériel :** les fabricants et pilotes restent une dépendance ; aucune indépendance
  industrielle totale n’est établie par les choix logiciels.

**Où nous en sommes :** une première liste argumentée est prête. Nous avons
cherché les pièces ; nous ne les avons ni installées ni assemblées.
