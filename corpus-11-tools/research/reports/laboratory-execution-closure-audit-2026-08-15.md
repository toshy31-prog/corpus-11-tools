# Audit de fermeture de l'exécution du laboratoire

Date : 2026-08-15

## Verdict

**Laboratoire fermé au niveau du contrat d'exécution prospectif.**

Le défaut structurel identifié lors de l'audit précédent est corrigé : une nouvelle exécution gouvernée est désormais liée à son protocole, aux fichiers effectivement exécutés, au module scientifique, au runtime, aux dépendances et aux paramètres système pertinents.

Cette conclusion porte sur le mécanisme écrit et testé. Son usage prospectif avec antériorité en deux commits n'est pas encore réobservé ; les anciens verrous restent des objets historiques de génération antérieure et ne sont pas réécrits.

## Architecture obtenue

Le `protocol_hash` continue de figer l'intention expérimentale. Un verrou d'exécution distinct ajoute :

- une empreinte du chemin de calcul effectivement importé ;
- une empreinte et une version du module scientifique ;
- une empreinte de l'environnement d'exécution ;
- une liste explicite des dépendances nécessaires ;
- un `experiment_fingerprint` global ;
- une attestation reliant ce fingerprint aux données brutes, à la classification et aux quatre artefacts.

Formule :

```text
experiment_fingerprint = SHA-256(
  protocol_hash,
  engine_fingerprint,
  module_fingerprint,
  environment_hash
)
```

## Périmètre de l'empreinte

L'empreinte ne couvre pas tout le dépôt. Pour l'expérience temporelle gouvernée, elle inclut seulement :

- `core/contracts.mjs` ;
- `core/engine.mjs` ;
- `core/reproducibility.mjs` ;
- l'adaptateur temporel exécuté ;
- le verrou de protocole ;
- le verrou d'exécution ;
- le runner fermé ;
- `plugins/temporal-frustration.mjs` comme module distinct.

`core/classifier.mjs`, `core/control-runner.mjs`, les rapports, les sources et les autres modules sont exclus parce qu'ils ne participent pas à ce chemin de calcul.

## Empreintes du test intégré

- Protocole : `sha256:65ea88a77648d8771d56b3ab7aaf7e5e2a62ece0fbdcab149b1d77cadfcc4e6e`.
- Moteur : `sha256:f344aea861c3d35cf5dca20214a1b28ad8a365991baf9007a0b497bbecdf510a`.
- Module : `sha256:ae1677e0d94e9d454c8f5ebd4cb0ac6f7ce5f01e1a9ef7496a5087521be92f61`.
- Environnement : `sha256:4eaf178f1d103a6895a6b476a2a89647ea9c8d3ff32f7b8cc240bb0ba8334111`.
- Expérience globale : `sha256:a167658eeedb0447a58facc543368154ee2aabea865ffde2dc06e25b45071758`.

Environnement déclaré : Node `18.19.1`, V8 `10.2.154.26-node.28`, ABI `109`, N-API `9`, libuv `1.48.0`, Unicode `15.1`, Linux `x64`, little-endian. La seule dépendance nécessaire déclarée est la bibliothèque standard Node, versionnée avec le runtime ; aucune dépendance tierce n'est utilisée par cette chaîne.

## Tests adversariaux

| Variation après verrou | Verdict |
|---|---|
| Ajout d'une ligne à une copie de `core/engine.mjs` | Refusé : `Engine differs from the locked execution` |
| Changement de version déclarée du module | Refusé : divergence du module |
| Changement de version du runtime et de la dépendance standard | Refusé : divergence de l'environnement |
| Modification d'un fichier explicitement non exécuté | Acceptée : fingerprint inchangé |
| Altération du verrou ou de son fingerprint | Refusée par cohérence interne |

Les sept suites de tests du laboratoire passent.

## Non-régression

- Les quatre artefacts existants sont régénérés identiques octet par octet.
- Le hash brut reste `sha256:bcc6ed861be9db909d46e308035dc344babd8b13a2f95f2e69b6734064f884f7`.
- La classification reste `reversal_triggered / absorbed_by_control`.
- Aucun module scientifique n'est modifié.
- Aucun résultat historique n'est modifié.
- `research/sources/` et les sources 10.x restent intacts.

## Limite de statut restante

La capacité est **écrite et testée**, pas encore **réobservée prospectivement**. Le prochain run réellement nouveau devra committer le verrou d'exécution avec le manifeste avant tout résultat, puis produire l'attestation dans un second commit. Ce test futur ne demande aucun changement architectural supplémentaire.
