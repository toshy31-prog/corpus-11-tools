# Cible produit : surface conversationnelle native Codex

## But

Le produit visé est une surface conversationnelle native dans Codex : une
question entre une seule fois, Corpus analyse et route, puis la surface restitue
en langage ordinaire. Le harness conserve son rôle de contrôle R&D ; il n'est
pas l'interface produit.

```text
question unique → surface Codex native → routage et analyse Corpus
                                        ↓
                            restitution claire et inspectable
```

## Séparation non négociable

La surface conserve la demande brute et ne constitue ni un pré-routeur ni un
second cerveau. Elle ne peut pas résumer la demande avant Corpus, choisir les
skills, supprimer une incertitude ou changer une conclusion matérielle. Elle
peut seulement ajuster la formulation, le niveau de détail et les contrôles
d'inspection après le travail analytique.

Le candidat existant
[`transfers/candidates/conversational-corpus-surface.md`](../../../transfers/candidates/conversational-corpus-surface.md)
porte ce contrat. Il reste candidat : son contrôle de fixtures est utile mais
ne prouve pas encore une surface native utilisée par des personnes.

## Décision d'architecture

1. Construire la surface native au-dessus du routage Corpus existant, sans
   changer le paquet analytique.
2. Rendre la méthode et la taxonomie inspectables sur demande, pas envahissantes
   par défaut.
3. Utiliser le harness pour rejouer les mêmes paquets analytiques et détecter
   une perte d'incertitude, de condition de renversement ou de conclusion.
4. Garder le pont `chatgpt_custom_gpt` en pause : aucune API, automatisation de
   navigateur ou synchronisation manuelle n'est une dépendance du produit.

## Rôle secondaire du harness

Le harness peut comparer un paquet analytique scellé et plusieurs restitutions
conversationnelles. Il ne déclare pas une restitution meilleure : il signale
seulement si une présentation a modifié un élément interdit par le contrat de
non-interférence.

## Critère du premier incrément produit

Le premier incrément est acceptable seulement s'il prend une demande brute,
conserve le paquet analytique à l'identique sous variations de présentation et
produit une réponse courte sans masquer ses incertitudes. Toute surface qui
modifie le routage ou la conclusion retourne au statut candidat.

Le deuxième incrément fournit le candidat de skill
`native_surface/corpus-native-conversation/` : Codex devient l'orchestrateur
de la question brute, du routage, du paquet scellé et de la restitution. Il ne
devient actif qu'après installation de développement et ré-observation.
