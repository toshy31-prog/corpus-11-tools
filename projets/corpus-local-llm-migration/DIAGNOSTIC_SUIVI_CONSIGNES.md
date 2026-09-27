# Diagnostic du suivi des consignes — 26 septembre 2026

## Faits établis

L’épreuve complète a dépassé sa borne (1219,51 secondes), avec deux lectures, une recherche glob, une lecture supplémentaire et un appel edit encore pending. Aucune édition exécutée ni test réussi. Le cache fonctionnait : 4353 puis 6858 tokens réutilisés. Les entrées nouvelles des étapes suivantes comptaient respectivement 2427 et 2989 tokens. L’élargissement des recherches a donc augmenté le travail de préremplissage malgré ce cache.

Un diagnostic direct court, sans OpenCode dans la boucle du modèle et sans outils, distingue correctement trois extraits (interdiction, autorisation, citation non autorisante) : 41,842 secondes, 164 tokens d’entrée, 39 de sortie. Le modèle ajoute cependant des balises Markdown au JSON demandé : conformité de format stricte non acquise. Ce petit contrôle ne valide ni le raisonnement général ni une tâche autonome.

## Contrôle de réception du travail

workflow_receipt.py lit les traces et exige des lectures explicites des deux fichiers, une édition terminée dans la copie autorisée, puis la commande de test exacte avec code de sortie zéro et marqueur MIGRATION_SMOKE_PASS. Il refuse une session seulement terminée, un edit pending, un marqueur produit par une autre commande et un test antérieur à l’édition. L’examen sémantique de la réponse et une vérification indépendante des fichiers restent séparés.

Validation : `python3 test_workflow_receipt.py` dans ce dossier : 5 tests réussis. Le verdict de l’ancienne épreuve est conservé dans .migration-smoke/compact-execution-verdict.json. Le contrôleur est un utilitaire de diagnostic ; il n’est pas connecté au runtime de conversation.

## Recherche et hypothèses

Source primaire consultée : [fiche officielle Qwen3.6-35B-A3B](https://huggingface.co/Qwen/Qwen3.6-35B-A3B/blob/main/README.md), sections Sampling Parameters et Instruct mode. Pour le mode direct, elle préconise temperature=0.7, top_p=0.8, top_k=20, min_p=0, presence_penalty=1.5 et repetition_penalty=1. La configuration Corpus ne fixe pas ces paramètres ; une capture historique /tmp/corpus-v4-provider-payloads/04-files.json n’en transmet aucun. Cela laisse les valeurs par défaut du serveur agir : ce n’est ni leur mesure, ni une preuve que ces valeurs expliquent l’échec. Aucun changement de sampling n’a été activé.

Les hypothèses encore ouvertes concernent la taille et la composition du contexte, les outils exposés, la trajectoire multi-étapes et les paramètres de génération. Une réussite hors outils ne permet pas d’attribuer le défaut à OpenCode ; plusieurs variables changent ensemble. Le routeur V5.5 et les descriptions originales restent en place.

## Incident du diagnostic

Le premier envoi du fichier complet via la commande shell native a interprété les backticks du contenu. Les messages command not found correspondent à cette erreur du banc de diagnostic, pas à des appels d’outils de Qwen. La comparaison exacte est invalidée. Le nouvel envoi transporte le programme encodé en Base64 ; la requête renvoyée sera comparée au contenu original avant admission de la mesure.

## Résultat du fichier complet, transport vérifié

La requête effectivement envoyée contient à l’identique le résultat de lecture original (assertion réussie). Qwen retrouve correctement l’interdiction des modèles distants et du contournement réseau, lignes 17–18 : 174,852 secondes, 2356 tokens d’entrée, 38 de sortie, préremplissage à 13,65 tokens/s. Il paraphrase au lieu de citer exactement : fidélité du sens acquise sur ce cas, contrainte de citation exacte non respectée. Preuve : .migration-smoke/comprehension-full.json.

Conclusion : le modèle sait retrouver cette décision dans le fichier complet lors d’une question directe. L’échec de la tâche avec outils ne démontre donc pas une incapacité générale de lecture ; il demeure à qualifier dans la combinaison contexte, instructions et trajectoire d’outils. Prochaine comparaison utile : une tâche complète avec les seules capacités nécessaires et les descriptions originales, sans modifier simultanément modèle, sampling et contexte. Aucun gain de qualité global ni activation nouvelle n’est déclaré.
