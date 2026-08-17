# Constitution exécutable candidate — CCT 0.1.0

Ce module transforme le noyau constitutionnel CCT v0.12 en objets contrôlables par machine. Il ne transforme pas le modèle en droit applicable : son statut maximal est **écrit et testé statiquement**. Il n’est ni autorisé, ni déployé, ni réobservé sur un territoire indépendant.

## Ce qui est livré

- `constitution.json` : registre de 14 acteurs, 15 invariants et 12 dispositions ;
- `constitution.schema.json` : schéma JSON de la constitution ;
- `decision.schema.json` : schéma d’une décision candidate ;
- `validate.py` : validateur Python sans dépendance externe ;
- `examples/decision-valid.json` : allocation temporaire d’eau conforme au contrat écrit ;
- `examples/decision-invalid.json` : contre-exemple syntaxiquement recevable mais constitutionnellement rejeté ;
- `test_validate.py` : tests de structure, références, séparation des clés et discipline de statut.

## Contrat d’une disposition

Chaque disposition nomme obligatoirement :

1. les acteurs qui proposent, décident, exécutent, contrôlent, arrêtent, relancent, certifient, réparent, collectent, évaluent et sanctionnent ;
2. un déclencheur observable avec canal, fenêtre, seuil et limite de détection ;
3. les invariants protégés ;
4. les traces attendues, leur producteur, délai, conservation, publicité et copie hors ligne ;
5. un recours accessible et son effet suspensif borné ;
6. le seuil d’arrêt, les acteurs capables, les dépendances, l’état sûr et les pertes ;
7. la restitution, ses preuves, son certificateur indépendant, la dette restante et la garde anti-réactivation ;
8. l’état de cycle de vie et ce qui n’est pas encore établi.

Une décision ne passe pas parce que ses champs sont remplis. Le second étage du validateur vérifie les références croisées, l’habilitation des acteurs, la couverture de tous les invariants et traces, les délais, ainsi que la séparation entre arrêt, relance et certification.

## Utilisation

Depuis ce dossier :

```bash
python3 validate.py constitution.json
python3 validate.py examples/decision-valid.json
python3 validate.py examples/decision-invalid.json
python3 validate.py examples/decision-valid.json --json
python3 -m unittest -v
```

Le contre-exemple doit sortir avec le code `1`. Il est rejeté notamment parce qu’il omet deux invariants et la trace D02, concentre arrêt et relance, choisit des acteurs non habilités et dépasse les délais d’arrêt et de restitution.

## Deux étages de validation

Le premier étage applique le sous-ensemble de JSON Schema utilisé par les deux schémas : types, propriétés obligatoires ou interdites, références locales, vocabulaires fermés, motifs, bornes, unicité et dates ISO 8601.

Le second étage applique les relations constitutionnelles :

- tous les acteurs et invariants référencés doivent exister ;
- les quinze invariants doivent être couverts par au moins une disposition ;
- règle, données, évaluation et sanction ne peuvent être cumulées par un acteur ;
- exécution et contrôle doivent rester distincts ;
- arrêt, relance et certification doivent être détenus par des acteurs disjoints ;
- chaque décision doit fournir les déclencheurs, invariants, traces et recours de chaque disposition invoquée ;
- une décision urgente, coercitive ou secrète doit invoquer D04 ;
- un prototype sans effet juridique ne peut s’auto-déclarer autorisé, actif ou déployé.

## Portée exacte

Un résultat `VALIDE` signifie seulement : « cet objet respecte la forme et les relations déclarées dans cette version candidate ». Il ne prouve ni détectabilité suffisante sur le terrain, ni indépendance matérielle des acteurs, ni restauration réussie, ni acceptabilité démocratique.

Le prochain niveau de validation devrait varier canal, charge, langue, disponibilité du réseau et équipe opératrice, puis faire certifier une restauration représentative par une équipe qui ne détient aucune clé d’activation.
