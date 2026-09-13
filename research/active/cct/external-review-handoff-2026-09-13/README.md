# Dossier de sollicitation extérieure CCT

État : préparé localement, non envoyé. Aucun participant confirmé, aucune collecte commencée. Le pilote conserve `awaiting_external_inputs` et la recherche `independence_unknown`.

## Demande proposée

Exécuter un exercice de table sur une interruption fictive de distribution d’eau de 72 heures. Aucune intervention sur un service réel. Deux équipes distinctes prennent les décisions pour CCT et coordination simple ; une contre-évaluation distincte critique les hypothèses et les conclusions. Une contribution négative est aussi recevable qu’une contribution favorable.

Le premier lot utilise le pilote existant, inchangé et gelé. Il teste des décisions produites ailleurs dans un modèle interne. Il ne suffit pas à rendre le scénario, le rival prescrit ou les conséquences indépendants de Corpus.

## Répartition du travail

| Contribution recherchée | Livrable | Limite |
| --- | --- | --- |
| Équipe CCT extérieure | `cct.json`, décisions et provenance | Aucun remplissage par les auteurs Corpus |
| Équipe rivale extérieure distincte | `simple-rival.json`, décisions et provenance | Le rival simple actuel est prescrit dans le pilote |
| Deux réviseurs séparés | `independence-audit.json`, pièces référencées par empreinte | Déclarations vérifiées dans leur portée, pas indépendance absolue |
| Contre-évaluateur extérieur | Critique motivée des proxys, du moteur, du rival et du verdict | Peut refuser le protocole ou conclure qu’il ne discrimine rien |

L’audit existant exige deux réviseurs avec identifiants, organisations et racines de contrôle distincts ; ils ne sont pas les auteurs des candidats. Les dépendances de financement, emploi, implémentation, collecte et assistance doivent être documentées. Un nom différent ou un changement de modèle IA ne suffit pas. Ne jamais remplacer un inconnu par `false` pour obtenir une admission.

## Déroulement proposé

1. Faire confirmer les participants, leur disponibilité et les conditions de conservation des pièces avant collecte. Aucun coût ou délai n’est promis ici.
2. Transmettre le même paquet gelé aux deux équipes ; vérifier les empreintes avant les décisions. Conserver séparément les traces de réception, d’information et d’assistance.
3. Respecter le scénario, les 12 unités de budget d’information et les 8 actions du protocole. Utiliser le catalogue et les gabarits fournis. Les zéros du gabarit ne sont pas des observations ; les résultats déclarés doivent correspondre au moteur.
4. Recueillir les deux paquets et l’audit sans réécrire leurs décisions pour les rendre admissibles. Conserver les pièces personnelles hors Git ; les paquets ne contiennent que des identifiants non nominatifs et des références autorisées.
5. Vérifier le gel puis exécuter l’évaluation et la sensibilité. Conserver les refus d’admission et résultats croisés. Les cinq axes restent non compensables, sans score global.
6. Faire contre-évaluer la conclusion, les proxys et leurs limites ; conserver cette contre-évaluation avec l’accord de son auteur.

## Deuxième lot : génération réellement distincte

Avant toute nouvelle collecte, demander à une équipe extérieure de proposer elle-même un scénario, un mécanisme rival et un modèle de conséquences, en documentant ses sources et l’assistance reçue. Elle peut rejeter les catégories du pilote. Ce lot aura un préenregistrement et un gel distincts ; il ne doit jamais être injecté dans les fichiers gelés du pilote actuel. Apparier ensuite les informations et ressources, et fixer avant les décisions les observations qui feraient perdre ou retirer la CCT. Aucun générateur extérieur n’est produit ou déclaré acquis dans ce dossier.

## Reproduction du premier lot

Depuis la racine extraite du paquet :

```bash
cd research/active/cct/external-simple-rival-pilot-v0.1
node verify-freeze.mjs
node --test test.mjs test-sensitivity.mjs
node evaluate.mjs submissions/cct.json submissions/simple-rival.json submissions/independence-audit.json
node evaluate-sensitivity.mjs submissions/cct.json submissions/simple-rival.json submissions/independence-audit.json
```

Les deux dernières commandes exigent des soumissions réelles et doivent échouer tant qu’elles manquent. Node.js 18 ou supérieur ; aucun paquet npm à installer. Le premier lot teste des résultats calculés et des décisions, pas des effets institutionnels ou territoriaux.

## Envoi à approuver

Le fichier `invitation.md` contient le texte proposé. Le paquet partageable est limité au pilote, au présent dossier et aux deux sources Markdown Livre blanc / Livre Vert. Il exclut l’historique complet du dépôt, les configurations et dossiers personnels. Vérifier son manifeste avant un éventuel envoi. Aucun envoi ne doit être annoncé comme effectué avant confirmation et exécution.
