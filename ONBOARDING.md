# Commencer avec Corpus

Ce document est le point d'entrée pour une personne qui découvre le dépôt sans connaître son histoire.

## Corpus en une phrase

Corpus est un écosystème local et versionné qui combine un environnement agentique, un runtime de modèles locaux, mémoire et retrieval persistants, outils bornés, projets applicatifs, une architecture analytique installable (Corpus 11 Tools) et un portefeuille de recherche séparé du produit.

## Les cinq couches à ne pas confondre

1. **Corpus local** — environnement agentique sur la machine : portail, conversations, projets, modèle local, mémoire, outils, reprise et preuves. Point d'entrée : `projets/corpus-local-llm-migration/README.md`.
2. **Corpus 11 Tools** — produit analytique versionné et installable. Point d'entrée : `corpus-11-tools/README.md`.
3. **Applications Corpus** — YouTube Scout, MUBI Film Scout et Corpus 3D, chacune avec ses propres preuves.
4. **Recherche** — `research/` contient expériences et résultats bornés. Une recherche n'entre pas automatiquement dans le produit.
5. **Pilotage et maintenance** — continuité, autonomie bornée, validation et reprise des blocages.

## État au 28 septembre 2026

- Corpus local est en phase `migration_in_progress` : l'infrastructure fonctionne, mais la migration globale et la preuve de workflows agentiques longs restent incomplètes.
- profil conversationnel local observé : Qwen3.6 35B à experts via llama.cpp ;
- Corpus 11 Tools : v1.6.2 est la release publiée attestée par le README racine ;
- les recherches postérieures à une release ne deviennent pas silencieusement des fonctions du produit ;
- les applications ont leurs validations propres : ne pas extrapoler une preuve d'un projet à tout Corpus.

## Où aller

- Environnement local : `projets/corpus-local-llm-migration/README.md`, puis `ETAT_LOCAL_ACTUEL.md`.
- Produit analytique : `corpus-11-tools/README.md`.
- Choisir un projet : `CARTE_DES_PROJETS.md`.
- Pilotage global : `PILOTAGE_CORPUS.md`.
- Autonomie bornée : `AUTONOMIE_INTEGRATION_LOCALE.md`.
- Reprise des blocages : `projets/corpus-local-llm-migration/BLOCKER_RESILIENCE.md`.

## Hiérarchie des sources de vérité

En cas de contradiction, privilégier dans cet ordre : état machine-lisible et validations actuelles ; contrats/README canoniques du sous-système ; documents d'état datés ; audits et preuves historiques ; archives.

Une preuve ancienne reste utile pour la provenance mais ne remplace jamais une réobservation plus récente. Une conclusion de recherche n'entre pas dans le produit sans transfert, validation, release, installation et réobservation.
