# Audit de gouvernance du protocole expérimental

Date : 2026-08-15  
Périmètre : `corpus-experiment-lab/`, ses trois modules et leur historique Git.  
Nature : audit documentaire et statique uniquement ; aucun module, résultat historique, fichier `core/` ou source n'est modifié.

## Conclusion

Le contrat actuel est **suffisant comme moteur d'exécution et banc de non-régression**, mais **insuffisant comme dispositif de préenregistrement prospectif**.

Les expériences originales de frustration temporelle et de factorisation disposent d'un précédent manuel correct : les familles, observables, contrôles et issues négatives ont été inscrits au commit `1e7ebc1` avant leur exécution au commit `349a5ad`. Les migrations dans le moteur sont ensuite des réobservations assumées de résultats connus.

La plateforme ne garantit toutefois pas elle-même cet ordre. Un futur module peut encore modifier observables, contrôles, conditions de renversement ou interprétation dans le même changement qui produit ses résultats.

## Vérifications

| Exigence | Observation | Verdict |
|---|---|---|
| Observables déclarés avant exécution | Les registres existent au chargement du module. Aucun artefact verrouillé ne prouve qu'ils précèdent un nouveau résultat. | Partiel |
| Contrôles enregistrés avant résultat | Les contrôles sont du code exécutable. Fixtures, module, runner et sorties ont été ajoutés ensemble lors des migrations. | Insuffisant pour le prospectif |
| Conditions de renversement présentes | `validatePlugin` exige une liste non vide et les sorties recopient le manifeste. | Présence assurée |
| Conditions de renversement exécutables | Le cœur ne vérifie ni leur forme observable ni leur correspondance avec les métriques du classificateur. | Non assuré |
| Protocole effectivement validé | `experiment.schema.json` existe, mais aucun runner ne le charge ni ne valide un manifeste d'expérience. | Non |
| Protocole lié cryptographiquement au résultat | `resultHash` couvre contrôle, entrée et résultat, mais pas le code du module, l'observateur, les contrôles, l'analyse ni le renversement. | Non |
| Budget de l'observateur appliqué | `allowedOperations` et `maxSteps` sont déclarés mais non imposés pendant l'exécution. | Non |
| Interprétation figée avant observation | Classificateur et texte du rapport restent modifiables dans le runner après accès au résultat. | Non |
| Reproductibilité après coup | Fixtures, résultats déterministes, journaux et empreintes du cœur permettent le rejeu exact. | Oui |
| Antériorité historique disponible | Pour les tests de déblocage, Git sépare préenregistrement `1e7ebc1` et exécution `349a5ad`. | Oui, manuellement |

## Risques de biais restants

1. **Sélection postérieure des observables** : ajouter ou retirer une mesure après inspection du résultat.
2. **Contrôle accommodant** : choisir un contrôle qui conserve le résultat plutôt qu'un contrôle fixé avant calcul.
3. **Déplacement du renversement** : garder une phrase générale tout en changeant la métrique qui la déclenche.
4. **Interprétation mobile** : modifier le classificateur ou le rapport sans versionner une nouvelle hypothèse.
5. **Arrêt optionnel et multiplicité** : aucune règle commune ne fixe nombre d'essais, espace de recherche ou correction des comparaisons.
6. **Budget adversarial nominal** : les accès interdits ou le nombre maximal d'étapes ne provoquent pas automatiquement l'échec de l'exécution.
7. **Fixture rétrospective prise pour préenregistrement** : une attente issue d'un résultat déjà connu garantit une non-régression, pas une prédiction.
8. **Validation non indépendante** : module, contrôle, résultat et interprétation peuvent être produits par le même acteur dans le même commit.

## Extension minimale nécessaire

Ne pas ajouter de quatrième module. Ajouter d'abord une couche de gouvernance séparée du cœur scientifique, avec deux phases irréversibles dans l'ordre Git local :

### 1. Préenregistrer et verrouiller

Un manifeste prospectif doit fixer au minimum :

- identifiant et version du protocole ;
- hypothèse et concurrentes ;
- état/configuration et graines ;
- identifiants exacts des observables et contrôles ;
- classe d'observateur et budgets applicables ;
- plan d'analyse, espace de recherche et règle d'arrêt ;
- issues discriminantes, négatives et inconnues ;
- prédicats mécaniques de renversement ;
- hash du module, des fixtures d'entrée et du manifeste ;
- commit parent antérieur à toute sortie.

Le verrou produit un `protocol_hash`. Toute modification ultérieure crée une nouvelle version ; elle ne remplace jamais l'original.

### 2. Exécuter contre le verrou

Le runner doit refuser l'exécution si le code, les identifiants, les budgets ou le plan diffèrent du manifeste verrouillé. Toute sortie doit contenir `protocol_hash`, hash du module, entrée, résultat brut et journal. L'interprétation est un artefact séparé qui ne peut pas modifier le résultat brut.

## Condition de reprise

La prochaine expérience scientifique prospective ne doit commencer qu'après démonstration des quatre propriétés suivantes sur un cas volontairement négatif :

1. le commit du protocole précède le commit de résultat ;
2. une modification d'observable ou de contrôle après verrou est refusée ;
3. une condition de renversement déclenchée produit mécaniquement un statut négatif ;
4. les données brutes restent identiques si seule l'interprétation change.

## Décision

- contrat d'exécution : **suffisant pour les trois modules actuels** ;
- contrat de non-régression : **suffisant localement** ;
- gouvernance prospective : **lacunaire** ;
- prochaine extension nécessaire : **verrou de préenregistrement et liaison protocole–résultat** ;
- ajout d'un quatrième module : **arrêt jusqu'à validation de ce verrou**.
