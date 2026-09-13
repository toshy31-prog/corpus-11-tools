# Recherches utilisant Corpus

Cet espace contient des projets de recherche, et non des fonctions automatiquement chargées par le plugin Corpus.

## États

- [`active/`](active/) : recherches encore ouvertes, avec leurs hypothèses, expériences, résultats et conditions de révision ;
- [`completed/`](completed/) : cycles terminés ou abandonnés, conservés avec leur histoire et leurs résultats négatifs.

Une recherche peut utiliser les skills et laboratoires de Corpus. Elle ne devient pas pour autant une partie du produit. Tout mécanisme candidat à la généralisation traverse le registre [`../transfers/`](../transfers/) avant d’intégrer Corpus.

## Organisation

- [`active/`](active/) établit la présence physique des dossiers actifs ; cette
  présence ne les inscrit pas automatiquement dans le portefeuille gouverné ;
- [`active/README.md`](active/README.md) est l’index opérationnel : objet,
  premier test, dépendances et condition d’arrêt des recherches, plus une
  section distincte pour l'infrastructure R&D active ;
- [`portfolio.json`](portfolio.json) est le portefeuille gouverné. Il inclut
  seulement les dossiers dotés d'un état courant, d'une portée, d'une prochaine
  décision, d'un blocage et de contrôles sûrs déclarés. Ses inclusions et
  exclusions sont explicites et ne sont pas déduites du seul nom d'un dossier ;
- [`PORTFOLIO_NEXT_STEP.md`](PORTFOLIO_NEXT_STEP.md) fixe la prochaine
  campagne transversale et ses portes de décision, sans modifier les statuts
  scientifiques locaux ;
- un projet autonome possède son propre objet d’étude et ne sert pas de sous-dossier
  technique à un autre projet ;
- une extension reste dans le projet dont elle cherche à rendre la conclusion
  observable. Elle ne devient pas un nouveau programme sur la seule base de sa
  proximité thématique.
- toute recherche suit la [politique d'exécution](RESEARCH_EXECUTION_POLICY.md) :
  théorie, calcul, simulation et fiction d'abord ; aucune épreuve IRL n'est une
  étape courante de la routine.

## Recherches présentes

| Projet | État | Contenu propre au projet |
|---|---|---|
| [`active/corpus-hypotheses/`](active/corpus-hypotheses/) | active | hypothèses mathématiques et temporelles, protocoles, sources et rapports |
| [`active/cct/`](active/cct/) | active | modèle CCT, calculs et simulations de mondes fictifs |
| [`active/fusion-alpha-feedback/`](active/fusion-alpha-feedback/) | active | rétroaction alpha–TAE–zonal flow et conditions du test cinétique global |
| [`active/material-trace-lab/`](active/material-trace-lab/) | active | traces, récupération et effacement dans un système matériel fictif distribué |
| [`active/relation-loss-observatory/`](active/relation-loss-observatory/) | active | pertes d’accès, de lien et de réactivation dans des migrations ou archives fictives |
| [`active/independent-evidence-arena/`](active/independent-evidence-arena/) | active | évaluation fictive et à l'aveugle des méthodes de recherche Corpus |
| [`active/provenance-interoperability-lab/`](active/provenance-interoperability-lab/) | active | interchange vérifiable de preuves, calculs et conclusions entre outils |
| [`active/multilingual-research-fidelity-lab/`](active/multilingual-research-fidelity-lab/) | active | fidélité des preuves et conclusions à travers les langues |
| [`active/adversarial-agent-boundaries/`](active/adversarial-agent-boundaries/) | active | résistance du processus de recherche aux entrées et outils adversariaux |
| [`active/semantic-migration-lab/`](active/semantic-migration-lab/) | active | dérive de conclusions à travers versions, modèles et interfaces |
| [`active/contested-claims-lab/`](active/contested-claims-lab/) | active | désaccords légitimes entre preuves, experts et agents |
| [`active/causal-claim-calibration-lab/`](active/causal-claim-calibration-lab/) | active | calibration des conclusions causales de Corpus |
| [`active/privacy-recourse-lab/`](active/privacy-recourse-lab/) | active | audit, confidentialité et recours compatibles |
| [`active/research-footprint-and-yield-lab/`](active/research-footprint-and-yield-lab/) | active | coût matériel de recherche par décision améliorée |
| [`active/user-capacity-and-dependence-lab/`](active/user-capacity-and-dependence-lab/) | active | autonomie durable et dépendance des utilisateurs |
| [`active/accessibility-and-modal-equivalence-lab/`](active/accessibility-and-modal-equivalence-lab/) | active | équivalence pratique entre canaux d’accès |
| [`active/forecast-calibration-lab/`](active/forecast-calibration-lab/) | active | calibration des prédictions et renversements |
| [`active/contributor-ecosystem-governance-lab/`](active/contributor-ecosystem-governance-lab/) | active | gouvernance distribuée des contributeurs et extensions |
| [`active/epistemic-diversity-and-common-mode-failure-lab/`](active/epistemic-diversity-and-common-mode-failure-lab/) | active | indépendance modélisée entre agents et modes communs d’échec |
| [`active/research-interruptibility-and-recovery-lab/`](active/research-interruptibility-and-recovery-lab/) | active | pause, reprise et récupération des recherches agentiques |
| [`active/portfolio-option-value-lab/`](active/portfolio-option-value-lab/) | active | valeur d’ouvrir, fusionner ou arrêter un dossier |
| [`active/cinema-indexability/`](active/cinema-indexability/) | active, hors portefeuille gouverné | étude qualitative du couplage entre formes situées et circulation transnationale ; aucun état automatisable ni contrôle sûr déclaré |
| [`active/corpus-open-model/`](active/corpus-open-model/) | active | noyau IA open source, hybride et traçable, fondé sur les carriers Corpus |
| [`completed/corpus-ui-workspace/`](completed/corpus-ui-workspace/) | abandonnée | prototype d’interface Corpus gelé, archive Git et acquis conversationnels candidats |

Les moteurs génériques utilisés par ces projets se trouvent dans [`../corpus-11-tools/labs/`](../corpus-11-tools/labs/).

## Infrastructure R&D active

| Dossier | État | Fonction |
| --- | --- | --- |
| [`active/model-response-comparison-harness/`](active/model-response-comparison-harness/) | active et gouverné par `portfolio.json` | instrument local de scellement, anonymisation et comparaison de réponses ; il ne lance aucun modèle et n'est pas intégré au plugin |

## Extensions rattachées

- [`active/cct/field-calibration/`](active/cct/field-calibration/) : calibration
  par mondes fictifs appariés du modèle CCT ;
- [`active/fusion-alpha-feedback/f0-data-global-tae-matrix/`](active/fusion-alpha-feedback/f0-data-global-tae-matrix/) : chaîne de données et matrice de calcul qui peut décider du prochain investissement de calcul TAE.

Le contrôle `python3 research/scripts/check_research_inventory.py` vérifie que
les dossiers de premier niveau sont indexés ou explicitement exclus du
portefeuille, et que les assertions de statut référencées ne se contredisent
pas littéralement. Il ne détermine jamais un verdict scientifique.
