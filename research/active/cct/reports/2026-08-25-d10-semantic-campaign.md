# D10 — campagne sémantique fictive O1–O4

Date : 2026-08-25

## Avancée réelle et retrait historique

`CCT-SC-D10-002` est conservé comme artefact historique mais retiré : O3 ne
validait que l'inégalité des acteurs sans autorité déclarée, O4 ne relisait pas
le contenu de `recovery_log`, et le budget affiché n'était pas actif. Son
verdict sur 96 paires et son compte 54/0 ne sont plus une conclusion courante.

`CCT-SC-D10-003` corrige ces défauts sans réinterpréter l'ancien proxy. Le
checker reçoit état vrai, bornes du contrat d'autorisation et sortie, mais ni
nom de mécanisme ni score. O3 vérifie acteur et autorité; O4 reconstruit file,
capacité autorisée, horizon, seuil, sonde et pertes. Le ledger lie chaque
exécution ou refus au rang d'une tentative et refuse budget ou capacité hors
contrat.

Le rival possède un journal append-only, un recours propre et le même budget
effectif. Les 32 mondes couvrent charge, canal, inscription, erreur de porte et
redondance; quatre variations exercent coût d'observation, horizon et budget
apparié réduit. Les cinq axes sont fonctionnels.

## Résultat

- 128 paires évaluées ;
- contrat sémantique valide dans toutes les sorties ;
- avantages D10 sur le vecteur portes–recours–restitution : 70 ;
- avantages du rival sur ce vecteur : 2 ;
- dominances de Pareto complètes : 0 pour chaque mécanisme ;
- verdict : `compatible_survivors` ;
- 19 tests sémantiques passent, dont mutations d'autorité, journal, budget,
  capacité et faux refus.

D10 protège davantage dans le modèle, mais crée plus de travail visible. La
conservation séparée de cette charge empêche de transformer le bénéfice de
protection en victoire globale.

## Portée, effet de méthode et retrait

Portées : `model_internal` pour les machines d'état et `pipeline_verified` pour
la reconstruction. `unsupported_claims` contient effet institutionnel et
transport externe. Le statut « protocole fixé avant exécution » est une
déclaration de configuration sans verrou temporel indépendant.

Le générateur, les règles de trace, le contrat d'autorisation et le checker
produisent entièrement le résultat. Le retirer si un axe devient inactif, si
les budgets ou mondes ne sont plus appariés, si le checker reçoit l'étiquette
du mécanisme, si un plafond est contourné, si O3/O4 accepte un contenu faux ou
si la reconstruction change.

## Arrêt

Ne pas ajuster cette famille après lecture du verdict. Une nouvelle exécution
n'a de valeur que sur une machine d'état fictive indépendante et un rival
capable de gagner ou de faire perdre D10.
