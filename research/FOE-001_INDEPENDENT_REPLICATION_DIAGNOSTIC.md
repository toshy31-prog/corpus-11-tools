# Diagnostic d’extraction — FOE-001

Date : 2026-09-05

## Observé

FOE-001 possède un protocole et un fixture gelés, quatre adaptateurs locaux,
un orchestrateur de contrôles, puis une seconde implémentation séparée. Les
deux chemins produisent des résultats comparables pour les variantes gelées.
Ils partagent toutefois un dépôt, un environnement local et au moins la
bibliothèque d’exécution déclarée. L’attestation existante de non-lecture est
une déclaration utile, non une preuve d’isolement d’exécution ou
d’indépendance externe.

## Extractible sans importer FOE-001

- empreinter et vérifier un paquet d’entrées gelées ;
- borner les entrées autorisées et refuser une entrée observée mais non
  déclarée ;
- recevoir deux attestations (référence et soumission séparée) avec
  environnement, dépendances et empreinte de sortie ;
- comparer seulement des chemins de sortie explicitement déclarés ;
- conserver les écarts, les sorties incomplètes et les dépendances communes ;
- tester une projection locale qui omet les fichiers de référence, tout en
  laissant le verdict d’indépendance à `independence_unknown` sans isolement
  démontré.

## Non extractible

Les règles de lignage, le noyau de provenance, les classes de migration, les
sept variantes et leurs conclusions restent FOE-001. Les injecter dans une
primitive générique centraliserait une sémantique scientifique qui appartient
aux quatre laboratoires.

## Condition de retrait proposée

Retirer ou réduire le harnais si une recherche doit falsifier ses dépendances,
ses sorties ou son isolement pour l’utiliser, si l’outil impose des chemins de
sortie scientifiques, ou si une seconde recherche ne peut pas l’employer sans
branche de domaine.

## Statut

- **Proposé** : ce diagnostic et le contrat minimal ci-dessus.
- **Écrit** : après ajout de `corpus_labs.independent_replication`.
- **Testé** : seulement après les contrôles génériques et FOE-001 listés dans
  le rapport d’exécution.
- **Intégré** : jamais confondu avec une intégration produit ; un éventuel
  transfert reste candidat.
- **Réobservé** : requis avant toute acceptation du transfert, sur au moins
  une recherche supplémentaire.
