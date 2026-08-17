# Open Experiment Arena v1 — protocole candidat

Date : 2026-08-17
Statut : écrit, exécutable et testé sur une fixture synthétique interne

## Question

Peut-on confronter plusieurs méthodes à des conséquences causales rejouables sans laisser leur récit, leur identité ou l'ordre d'inscription déterminer le verdict ?

## Tranche réalisée

L'arène candidate étend Corpus Experiment Lab avec :

- un monde initial et une séquence exogène identiques pour chaque méthode ;
- une projection partielle séparée de l'état causal ;
- une action admissible et des prédictions obligatoires avant chaque transition ;
- un rapport public aveugle et une table d'identités séparée ;
- des résultats vectoriels sans score global ni vainqueur caché ;
- une déclaration de provenance du scénario ;
- un refus mécanique de présenter la fixture interne comme preuve extérieure ;
- une invariance du rapport à l'ordre d'inscription des méthodes.
- une clé d'aveuglement absente du rapport public et une table d'identités retournée séparément.

## Fixture initiale

`thermal-mosaic` suit trois cellules thermiques couplées, six transitions exogènes et sept actions admissibles. Trois politiques inspectables y sont comparées. Cette fixture a été conçue par les mainteneurs de Corpus et reste explicitement `internal_synthetic`.

Son rôle est de tester le contrat d'exécution, pas de départager Corpus d'une méthode extérieure.

## Première causalité extérieure adaptée

Une seconde fixture encode le réseau à quatre nœuds du paradoxe de Braess, publié indépendamment de Corpus en 1968. Elle reproduit les équilibres canoniques du cas à 4 000 conducteurs :

- réseau sans liaison : partage 2 000 / 2 000, trajet de 65 minutes ;
- liaison gratuite : 4 000 conducteurs sur la route traversante, trajet de 80 minutes.

La provenance est `mixed`, non `external_supplied`. Le mécanisme de congestion et le paradoxe viennent d'une source indépendante ; l'encodage, les politiques comparées et les dimensions de résultat viennent des mainteneurs Corpus.

Références de provenance : Dietrich Braess, 1968, DOI `10.1007/BF01918335`; traduction anglaise, DOI `10.1287/trsc.1050.0127`.

## Admission déclarative sans adaptateur sémantique

Le laboratoire accepte désormais un document JSON dans lequel l'auteur nomme lui-même :

- état initial ;
- événements exogènes ;
- vue accessible ;
- actions et mutations ;
- transitions ;
- observations ;
- cibles de prédiction ;
- dimensions finales ;
- conditions de renversement.

Le document est gelé en SHA-256 avant exposition aux compétiteurs. L'interpréteur n'exécute ni JavaScript fourni, ni expression libre : seulement un arbre arithmétique borné et des mutations `set`/`add` sur l'état déclaré.

Une fixture interne gelée vérifie l'exécution. Un template non gelé est fourni pour un futur auteur indépendant. Une empreinte valide prouve la stabilité des octets, jamais à elle seule l'indépendance de l'auteur.

## Résultats établis

- exécution déterministe sur la fixture ;
- mondes et chocs appariés ;
- vue du compétiteur isolée de l'état causal ;
- identités absentes du rapport public ;
- permutation des compétiteurs sans changement du rapport ;
- refus de la fausse externalité ;
- coexistence de plusieurs dimensions de résultat.
- reproduction exacte des deux équilibres canoniques du scénario de Braess ;
- conservation de deux interventions distinctes donnant le même temps moyen sans les fusionner en vainqueur unique.
- exécution d'un monde déclaratif sans adaptateur de scénario écrit en code ;
- rejet des mutations postérieures au gel, opérateurs non autorisés et chemins de prototype ;
- distinction publique entre gel vérifié et indépendance d'auteur non vérifiée.

## Non établi

- réception effective d'un bundle écrit par un auteur indépendant ;
- équité substantielle des espaces d'action entre théories sociales ;
- validité du monde par rapport à un terrain ;
- amélioration d'une capability Corpus ;
- robustesse à plusieurs auteurs, interfaces ou populations ;
- utilité pour une décision humaine ;
- supériorité de Corpus, de la CCT ou d'une méthode rivale.

## Prochaine expérience discriminante

Demander à une personne ou une équipe ne connaissant pas l'architecture Corpus de fournir un petit monde fermé comportant :

1. état initial et transitions ;
2. informations accessibles aux compétiteurs ;
3. actions admissibles ;
4. dimensions de résultat ;
5. séquence exogène ou générateur gelé ;
6. condition de retrait du scénario.

Le scénario doit être gelé avant que son auteur voie les méthodes candidates. L'équipe Corpus adaptera seulement le format ; toute modification sémantique sera tracée. Si cette adaptation réintroduit notre ontologie, le régime deviendra `mixed`, jamais `external_supplied`.

## Condition de renversement

Abandonner ou refondre l'arène si l'une de ces observations persiste :

- l'interface d'une méthode lui donne un espace d'action plus riche ;
- les dimensions sélectionnent implicitement un vainqueur doctrinal ;
- une reformulation narrative change les conséquences ;
- l'identité d'une méthode peut être reconstruite avant l'évaluation ;
- les scénarios extérieurs doivent être réécrits dans le vocabulaire Corpus pour devenir exécutables ;
- les anomalies sont systématiquement absorbées comme nouvelles capabilities.
