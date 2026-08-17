# Rapport de tranche — Open Experiment Arena

Date : 2026-08-17

## Conclusion

Corpus dispose désormais d'une première procédure exécutable reliant prédiction, action et conséquence dans un monde causal gelé. La procédure empêche plusieurs formes simples d'auto-confirmation : ordres inégaux, mondes différents, identité visible, mutation par l'observateur, verdict composite caché et fausse provenance extérieure.

Le gain reste architectural et local. Un mécanisme causal publié indépendamment de Corpus — le paradoxe de Braess — a été adapté avec provenance `mixed` et reproduit exactement. Une voie déclarative gelée permet maintenant à un auteur de fournir un monde sans adaptateur sémantique écrit par les mainteneurs. Aucun bundle d'auteur indépendant n'a encore été reçu ; aucune capability n'est validée ou invalidée par cette tranche. Une auteure adversariale explicitement fictive, Ilyana Sorel, sert désormais de répétition générale sans être maquillée en source externe.

## Artefacts

- skill `open-experiment-arena` et contrat d'usage ;
- runner aveugle et validation de scénarios/compétiteurs ;
- fixture `thermal-mosaic` avec trois politiques ;
- fixture mixte `braess-network` reproduisant les équilibres 65/80 minutes ;
- démonstration déterministe ;
- interpréteur déclaratif borné, outil de gel SHA-256 et template auteur ;
- fixture déclarative interne gelée ;
- commande synthétique d'Ilyana Sorel : accordage d'une cloche en céramique sur quatre matins ;
- contrôles automatisés ;
- évaluation de routage `open-arena-01` ;
- inventaire et documentation du plugin mis à jour.

## Vérifications

- validation du skill : réussie ;
- validation du paquet : 58 skills, 49 capabilities, 71 évaluations ;
- contrôle du graphe : 49 capabilities, 4 familles, 88 relations, aucun orphelin ;
- tests Corpus Experiment Lab, gouvernance et arène initiale : 13 suites réussies ;
- tests d'arène après ajout de Braess : 2 fichiers de test réussis.
- tests d'arène après admission déclarative : 3 fichiers de test réussis.
- tests d'arène après premier binding de capacité : 4 fichiers de test réussis.

## Répétition générale : Ilyana Sorel

Ilyana Sorel est une accordeuse itinérante fictive de cloches en céramique. Son monde a été généré avant audit et conservé dans son vocabulaire d'atelier : `pitch`, `craze`, `clay`, `sleep`. Son scénario est gelé sous `sha256:31e7a4467dc2fdd4a9b9a20e6d06c9b1760350ca4c08469a68433124d3709e71` et déclaré `internal_synthetic`.

Trois méthodes aveugles produisent des vecteurs incompatibles :

- poursuite de la note : erreur de hauteur 0, 14 craquelures, 3 unités de matière retirées, aucun matin sans intervention ;
- règle « jamais mouiller » : erreur 2, 11 craquelures, 3 unités retirées, 1 matin sans intervention ;
- rituel d'une seule intervention : erreur 12, 11 craquelures, aucune matière retirée, 3 matins sans intervention.

Le cas ne révèle pas quelle méthode gagne. Il révèle l'endroit exact où un évaluateur doit injecter une préférence pour fabriquer un gagnant. Cette absence de réduction est le résultat attendu.

## Premier binding de capacité Corpus

`CAP.HIDDEN_COST_ASSESSMENT`, toujours `candidate_unvalidated`, est maintenant reliée au monde d'Ilyana par un binding explicite. Le compilateur refuse une capacité dépourvue de modèle prédictif, de mapping observable et d'une extension de décision nommée. Il interdit ainsi d'attribuer à la capacité seule une politique qu'elle ne contient pas.

L'extension expérimentale `minimize-next-craze-then-pitch-error` choisit de laisser la cloche intacte pendant les quatre matins. Elle termine avec une erreur de hauteur de 14, 8 craquelures, aucune matière retirée et 4 matins sans intervention. Les champs `time`, `energy`, `attention`, `carrier` et `post-removal trace` restent explicitement non pris en charge. Ce résultat établit l'exécutabilité locale du binding, pas la validité de la capacité.

## Première campagne de sélection

Un binding de `CAP.FIELD_CAPACITY_ASSESSMENT` a évalué chaque action sous sept perturbations d'air contrefactuelles. Il termine avec une erreur de hauteur de 2, 12 craquelures, 4 unités de matière retirées et aucun matin sans intervention. Sous les orientations d'atelier explicitement déclarées, la règle simple `never-wet` le domine strictement : même erreur, 11 craquelures, 3 unités retirées et 1 matin sans intervention. Le binding est donc candidat à la suppression dans ce domaine.

`CAP.REAL_TRANSFORMATION_ASSESSMENT` a été refusée avant compilation : le monde de la cloche ne contient ni acteurs porteurs de capacités dominantes, ni recours, ni contournement, ni voie de réactivation. Inventer ces observables aurait fabriqué artificiellement son objet. La campagne produit ainsi un binding conservé provisoirement, un binding dominé et un refus de transport.

## Première quarantaine appliquée

Le binding dominé de `CAP.FIELD_CAPACITY_ASSESSMENT` est inscrit dans le registre de cycle de vie avec le statut `quarantined_local`. Les campagnes ordinaires du monde d'Ilyana l'excluent désormais avant exécution ; un mode d'audit peut encore le réintroduire pour vérifier ou renverser la décision. La capacité Corpus source n'est pas touchée hors de ce binding et de ce monde.

La condition de retour est écrite : une relance appariée, une correction du modèle du monde ou un changement d'orientation déclaré avant relance doit supprimer la dominance stricte. Le changement est au niveau `tests_passed_local`. Il n'est ni déployé, ni réobservé indépendamment, ni interprétable comme échec global de la capacité.

## Premier test de transport

Le binding survivant de `CAP.HIDDEN_COST_ASSESSMENT` a été reconstruit dans un second monde : trois cellules thermiques couplées, avec énergie, temps dans la bande, dépassements et gradient final. Le profil source/cible constate des mécanismes, unités, interventions et mesures différents, sans preuve de pont indépendante.

Dans la cible, le binding énergie-d'abord reproduit exactement le contrôle négatif `always-hold` : 12 cellules-tours dans la bande, 0 énergie, 0 dépassement et gradient final 2.786. Il ne fournit aucun gain discriminant et est mis en quarantaine dans ce domaine. Verdict : `transport_not_established`. Le binding distinct observé chez Ilyana reste localement non dominé ; ce résultat ne valide ni n'invalide globalement la capacité.

## Gouvernance des décisions de cycle de vie

Les motifs de quarantaine sont désormais fixés dans une politique versionnée : dominance de Pareto stricte ou équivalence exacte d'actions et de résultats avec un contrôle négatif. Un évaluateur pur transforme le rapport aveugle en proposition traçable. Il ne modifie pas le registre et déclare `proposal_only` ; l'autorisation appartient à l'utilisateur ou au mainteneur désigné, puis le runtime applique seulement une entrée autorisée. Le cas thermique reproduit automatiquement la proposition `propose_quarantine_local` avec le déclencheur `exactNegativeControlEquivalence`.

## Premier inconnu utile

La question suivante n'est plus technique. Un monde exécutable peut désormais être fourni et gelé sans code de scénario Corpus. L'inconnu utile devient humain : un auteur réellement indépendant acceptera-t-il ce format sans que ses distinctions soient mutilées, et son monde produira-t-il une anomalie que Corpus ne sait pas absorber ?
