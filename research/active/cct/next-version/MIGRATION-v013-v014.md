# Migration CCT v0.13 → v0.14 candidate

La v0.13 gelée reste inchangée. La v0.14 ne prétend pas corriger les résultats
de CCT-HO-001 : elle remplace la compilation lexicale mise en échec par une
interface institutionnelle exécutable et testable.

## Différence matérielle

- M13-01 devient M14-01 : détection par domaines de panne distincts, double clé,
  échéance, révocation, restitution et renouvellement sont des transitions d'état.
- M13-02 devient M14-02 : la portabilité s'active hors veto local et interdit
  explicitement toute action dont les droits dépendent de la permission locale.
- M13-03 devient M14-03 : la divergence est une entrée publique structurée ;
  l'effacement, la coercition non attribuée et l'ordre durable monocanal sont
  des sémantiques interdites pendant l'activation.
- M13-04 reste une règle de gouvernance expérimentale. Elle n'est pas compilée
  dans le décideur, car elle juge la rétention du décideur après campagne.

## Nouvelle frontière d'information

Chaque monde futur doit publier et geler `view.cct.actionOntology`. Tous les
concurrents reçoivent exactement cette même sémantique. Le runtime refuse une
action autorisée non documentée et n'infère rien depuis son nom.

## Statut

Les mondes de CCT-HO-001 sont désormais contaminés par observation des résultats
et ne valent que comme régressions de développement. Une éventuelle promotion
exige de nouveaux mondes gelés, des rivaux appariés et un verdict vectoriel
aveugle. Tests locaux réussis ne signifie ni autorisation, ni déploiement, ni
effet institutionnel, ni robustesse.
