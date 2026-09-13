# Arène adverse CCT-POL 1.1 — pré-enregistrement interne

Cette arène prépare quatre mondes adverses correspondant aux obligations de
CCT-POL 1.1. Les scénarios sont `internal_synthetic` : ils peuvent faire perdre
le candidat, mais ne peuvent pas l'accepter ni établir une robustesse externe.

Chaque monde devra être gelé avec son auteur, ses données, ses règles de
transition, ses actions et son verdict vectoriel avant l'exécution. Tous les
concurrents reçoivent la même vue publique, le même budget d'information, le
même budget d'action et la même ontologie publique des actions.

Une campagne admissible doit employer au moins un comparateur non-CCT sérieux,
prévoir une issue où ce comparateur peut être meilleur, conserver séparés les
cinq axes et publier les conditions de retrait. Aucun score global ne désigne
un vainqueur.

```bash
node validate-arena.mjs
node --test test-arena.mjs
node validate-worlds.mjs
node --test test-worlds.mjs
node run-campaign.mjs
```

Une soumission extérieure doit passer par
[`external-scenario-submission-template.json`](external-scenario-submission-template.json).
Le validateur [`validate-external-submission.mjs`](validate-external-submission.mjs)
refuse les placeholders, une provenance d'auteur absente, les entrées d'état
non lisibles par machine et toute comparaison qui ne partage pas les budgets,
les informations et l'ontologie d'action. Une soumission dont la relation de
l'auteur est `unknown` ou `dependent` ne peut être admise qu'au développement
interne ; seule une relation `independent` la rend éligible à une arène
indépendante. Le modèle est illustratif et échoue volontairement tant qu'il
n'est pas remplacé par une soumission réelle.

`run-campaign.mjs` écrit un rapport interne de développement. Il n'est pas un
résultat expérimental indépendant et ne peut désigner aucun gagnant global.

Le résultat interne et sa non-conclusion sont consignés dans
[`internal-campaign-conclusion.md`](internal-campaign-conclusion.md). Le paquet
prêt pour une première soumission indépendante est décrit dans
[`EXTERNAL-NEXT-STEP.md`](EXTERNAL-NEXT-STEP.md).

Un premier cas réel fondé sur des sources, mais encore non observé, est
documenté dans [`real-case-el-nino-mozambique-2026.md`](real-case-el-nino-mozambique-2026.md).
La divergence sur les districts et la demande de données sûre figurent dans
[`real-case-el-nino-mozambique-data-gap.md`](real-case-el-nino-mozambique-data-gap.md).
La formulation directement utilisable est dans
[`CCT-ELNINO-MOZ-2026-note-decision.md`](CCT-ELNINO-MOZ-2026-note-decision.md).
