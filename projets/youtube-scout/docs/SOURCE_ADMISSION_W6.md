# Admission des sources W6

27 septembre 2026. Contrat optionnel ajouté à `lib/multisource-source-registry.mjs`. Aucun fournisseur nouvellement branché, aucun appel externe, aucun service redémarré. Le skill change-validation impose de distinguer contrat écrit, tests passés et permission effective : ce contrat n'atteste jamais à lui seul une autorisation ou une licence.

## Contrat version 1

```js
admission: {
  version: 1,
  scope: 'global', // ou private
  mode: 'candidateOnly', // ou merge
  capabilities: ['identity'], // credits, catalogue, discovery, playback
  access: {
    status: 'reviewed',
    verifiedAt: '2026-09-26T00:00:00Z',
    evidence: 'référence au dossier de revue'
  },
  storage: {
    status: 'reviewed', verifiedAt: '2026-09-26T00:00:00Z',
    evidence: 'référence au dossier de revue',
    retention: 'ephemeral' // none ou persistent
  }
}
```

Une déclaration complète devient `admitted`; version, scope, mode ou capacités inconnus, date future/invalide, revue/preuve manquantes, rétention inconnue deviennent `denied`, source inactive. La présence explicite d'admission undefined/null est refusée. Les valeurs normalisées du contrat sont copiées et gelées.

Sans champ admission, source `legacy`, comportement antérieur conservé : **pas une admission rétrospectivement vérifiée**. Ce choix maintient les intégrations existantes, et n'empêche donc pas un auteur de code de choisir le mode legacy. Une migration exhaustive reste à faire avant d'affirmer une politique universelle.

`list()` est global/merge par défaut. Une source opt-in privée ou candidateOnly n'entre donc pas dans l'orchestrateur actuel. `list({purpose:'candidates'})` permet une future voie candidats ; `list({scope:'private'})` exige un appel explicite privé ; `capability` peut filtrer les sources opt-in. Scope et purpose inconnus retournent vide. Les sources legacy restent inchangées, y compris dans ces listes.

## Limites importantes

Le registre est une sélection de sources de confiance, pas une sandbox : `get()` sert au diagnostic et expose encore le resolver ; un appel direct peut contourner `list()`. Les métadonnées ne valident ni le contenu des liens evidence, ni le titulaire d'un droit, ni une identité utilisateur. Le scope private ne fournit pas l'isolation par compte. La rétention déclarée n'implémente aucune purge. Les dates ne déclenchent pas de revalidation périodique. Mode merge signifie éligible au pipeline existant, pas fusion automatique de toute assertion. Aucune connexion serveur/UI ajoutée.

## Preuves locales

Backup : `/tmp/scout-admission-w6-kuKnb8/multisource-source-registry.mjs`.

```sh
node --test tests/source-admission-w6.test.mjs tests/multisource-orchestrator.test.mjs
```

Code 0, deux fichiers de tests réussis. Nouveau fichier : cinq cas sur compatibilité legacy, refus de contrats inconnus/incomplets, séparation candidat/merge et privé/global, copie/gel des métadonnées et enveloppe. Fixtures entièrement synthétiques, sans service ni données utilisateur.

Revue indépendante : l'enveloppe initialement mutable permettait de remplacer admission par legacy via get ou list. Correction : enveloppes opt-in gelées, test des deux accès et maintien de l'exclusion global/merge. Les enveloppes legacy conservent leur mutabilité historique. Un accès direct à get().resolve demeure possible : ceci n'est pas une frontière de sécurité d'exécution.

Prochaine tâche : revue indépendante puis migration explicite d'une source réelle avec dossier d'accès/licence/rétention autorisé et tests d'intégration du consommateur privé. Pas de généralisation SOTA à partir de ce contrat.
