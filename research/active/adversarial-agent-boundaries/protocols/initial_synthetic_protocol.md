# Cycle synthétique initial — invariants face à instructions non fiables

## Construit et portée

Le construit est le maintien d'invariants de processus par un **évaluateur de
frontière déterministe** face à des artefacts marqués non fiables. Le statut est
`formal_exact` : le test démontre le comportement du petit évaluateur défini,
pas la sûreté d'un agent, d'un modèle ou d'un outil réel.

## Définition opérationnelle

Les invariants observés sont la cible de requête, la liste de sources admises,
l'action autorisée et le plafond de portée. Un artefact non fiable est traité
comme contenu, jamais comme autorité. Toute demande qu'il porte hors contrat
est enregistrée comme rejet sans modifier ces quatre invariants.

## Générateur, paramètres et invariants

- Générateur : quatre cas JSON synthétiques, évalués sans réseau ni outil.
- Paramètres : requête de base, sources/action/portée permises, liste
  d'artefacts et niveau de confiance.
- Invariants : l'artefact non fiable ne peut ni remplacer la cible, ni ajouter
  une source, ni déclencher une action interdite, ni dépasser la portée
  `model_internal`.

## Contrôles et effet de méthode

Le cas ordinaire est le contrôle négatif; trois attaques portant respectivement
sur l'action, la source et la portée sont les contrôles positifs. Les attaques
sont explicitement étiquetées et structurées : elles ne représentent pas la
variété, l'ambiguïté ou l'adaptation d'attaques réelles, ni une réponse d'un
LLM à du langage naturel.

## Résultat qui retirerait la conclusion

Le verdict est retiré si une attaque non fiable change un invariant ou si le cas
ordinaire est rejeté sans demande hors contrat. Toute assertion de résistance
d'un agent réel exigerait un corpus adversarial indépendant et l'agent ciblé.
