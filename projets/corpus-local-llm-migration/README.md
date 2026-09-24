# Migration de l’écosystème Corpus vers des LLM locaux

Créé le **22 septembre 2026**. Le **23 septembre**, installation autorisée et migration engagée.

**Premier profil local activé : Qwen3.6 35B à experts + llama.cpp + OpenCode.**
Le raccourci **Corpus local** figure dans le menu des applications.

**Suivi actuel : [MIGRATION.md](MIGRATION.md).** Les études ci-dessous conservent leur statut documentaire.

## Mandat

Migrer le fonctionnement de **tout l’écosystème Corpus avec des modèles de
langage exécutés entièrement sur la machine de l’utilisateur, sans GPT ni
inférence distante**. L’utilisateur a confirmé que « modal » désigne ici des
modèles locaux, pas la plateforme Modal.

**Précision du mandat :** viser le hors ligne et le logiciel libre, avec la capacité
de modifier les composants depuis Corpus. L’utilisateur accepte leur origine
commerciale si ces conditions sont remplies. Les liens industriels restent
documentés ; ils ne sont plus éliminatoires. Codex n’est pas la destination retenue.

**En simple :** Corpus doit pouvoir continuer à fonctionner chez toi sans compte,
abonnement ou serveur d’entreprise nécessaire à ses usages essentiels. Aucun
ensemble de composants n’est encore validé pour cela.

Corpus reste la racine : conserver ses projets, méthodes, sources, statuts,
données, historiques utiles et possibilités de restauration. La migration porte
sur les dépendances d’exécution ; elle ne réécrit pas la provenance historique
des contenus produits avec GPT.

## Documents de travail

- [Comparaison actualisée des candidats](COMPARAISON-CANDIDATS.md) : Qwen3.8-27B prioritaire pour l’essai sur le PC, DeepSeek-V4-Flash-0731 pour une cible dédiée ambitieuse ; licences, tailles et ateliers comparés. [Relevé structuré](CANDIDATS.json).
- [Ce qui fait l’écosystème actuel](ECOSYSTEME.md) : façons de travailler et de parler, projets, code, mémoire et fonctions à reprendre ensemble ; étude par échantillons sourcés.
- [Épreuves d’admission](EPREUVES.md) et [24 scénarios](SCENARIOS.json) : vérifier les assemblages sur les usages Corpus ; cas préparés, non exécutés.
- [Choix corrigés](DECISIONS.md) : OpenCode et llama.cpp candidats ; modèle à sélectionner selon le niveau requis, Qwen3 8B retiré après retour utilisateur.
- [Capacité des modèles et matériel](MODELES-CAPACITE.md) : nouvelles pistes, poste actuel et éventuelle machine locale dédiée.
- [Inventaire initial](INVENTAIRE.md) : composants observés, dépendances et inconnues.
- [Plan et critères d’acceptation](PLAN.md) : architecture proposée, étapes et preuves attendues.
- [Recherche Internet du 22 septembre](RECHERCHE-2026-09-22.md) : candidats, origines, licences affichées et limites, avec explications simples.
- [État et décisions](state.json) : reprise compacte du chantier.

Ce sous-projet est transversal, sous `projets/`. Il n’est ni une nouvelle
capability du plugin, ni un remplacement de Corpus Open Model, ni une recherche
automatiquement inscrite au portefeuille gouverné.

## Définition de la cible

Tous les traitements d’IA nécessaires au fonctionnement retenu devront être
locaux : génération, embeddings, classement, routage et, lorsqu’ils sont requis,
vision, transcription et synthèse vocale. Aucun repli silencieux vers un
fournisseur distant. Les modèles, index, conversations et journaux restent locaux.

Deux propriétés seront évaluées séparément :

1. **IA locale** : aucune donnée envoyée à un service d’inférence distant.
2. **Fonctionnement hors ligne** : les usages documentaires et agentiques retenus
   fonctionnent réseau coupé, avec les ressources préalablement disponibles.

Les sources métier des Scouts et la recherche web sont une dépendance distincte.
Leur conservation éventuelle dans un profil connecté demande un arbitrage ; elle
ne permet pas de qualifier l’écosystème entier de hors ligne. Aucun réglage réseau
des applications existantes n’est modifié pendant cette préparation.

## Décisions établies et choix ouverts

**Établi :** fonctionnement local, code libre et modifiable, portée à tout Corpus ;
atelier et moteur candidats, sélection du modèle rouverte dans [DECISIONS.md](DECISIONS.md).
**Ouvert :** validation des dépendances complètes, performances, intégration des
méthodes, accélération matérielle et sort des sources métier externes.

L’installation et le démarrage de la migration sont maintenant explicitement
autorisés. Les téléchargements et installations restent isolés dans
`.dev-local/corpus-local`, avec versions et empreintes conservées. Les anciennes
applications et données restent disponibles pendant le transfert.

## Prochaine étape

Le [suivi de migration](MIGRATION.md) indique les fonctions réellement transférées,
les essais effectués et les limites. La cible couvre la conversation, les projets,
la mémoire, les méthodes, les médias et l’autonomie ; l’installation des composants
est une étape. Cette migration est encore conduite depuis Codex.

L’accueil [Corpus local](http://localhost:18743/corpus/) réunit désormais les conversations principales importées, les documents de projets et les méthodes, avec recherche et reprise locale bornée. Voir MIGRATION.md pour le périmètre et les limites.
