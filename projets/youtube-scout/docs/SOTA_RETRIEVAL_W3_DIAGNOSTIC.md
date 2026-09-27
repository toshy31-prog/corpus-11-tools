# Diagnostic W3 — 27 septembre 2026

## Classes des 28 absences au top10

Inspection des paires publiques via option `--diagnostic` du banc, sans toucher paramètres ni candidats. Classification descriptive manuelle exclusive pour cette revue, pas annotation indépendante :

| Classe dominante observée | Nombre | TID requêtes |
|---|---:|---|
| Métadonnées essentielles détruites/remplacées par numéro, durée ou marqueur vide dans requête ou référence | 14 | 7471,13188,19229,8631,14373,17949,16872,8312,6296,4838,15269,17706,16245,3098 |
| Artiste déplacé dans titre, champ artiste absent, titre tronqué ou substitué | 9 | 12741,10435,18519,11031,2719,2665,9700,8240,2738 |
| Information résiduelle peu discriminante, dilution par texte/unknown, corruption orthographique | 5 | 18163,8669,17633,5004,8952 |

Exemples : TID13188 a titre `2`, artiste `3m 56sec`; TID16872 a une requête intelligible mais référence titre `037`, artiste `04:26`. TID2665 n'a pas de titre et son artiste apparaît dans le champ titre de la référence. La séparation stricte des champs empêche certaines correspondances ; ce constat n'autorise pas une fusion des rôles ou un nouveau réglage sur ces mêmes cas.

Aucun défaut de parsing CSV établi : schema/hash validés et lecture indépendante par l'autre agent concordante. Les champs dégradés existent dans le corpus DAPO, pas une preuve que le parseur les ait déplacés. Les problèmes de segmentation Unicode ou de rôles doivent faire l'objet de futurs tests tenus à l'écart, non d'un correctif ajusté aux 28 exemples.

## Abstentions et décisions

Sur 1 000 requêtes hybrides, motifs observés : `no_plausible_identity_match` **839**, `credible_but_not_decisive` **112**, `no_candidates` **1**, `high_score_and_clear_gap` **48**. Donc 952 non automatiques, dont 840 rejets et 112 suggestions. Les 28 miss@10 sont 27 rejets par score et un sans candidat. Les labels CID ne permettent pas de qualifier toutes les abstentions d'« erreurs » : elles signalent une incapacité à conclure, notamment avec bruit sévère.

## Défaut logiciel indépendant corrigé

Revue coordinateur, reproduite sur fixture minimale sans corpus : après création de l'index, modifier `record.title` modifiait le candidat retourné mais pas son vecteur indexé. Des ids numériques atteignaient ensuite `localeCompare` et déclenchaient une exception tardive.

Correction bornée : validation ids chaînes non vides et champs textuels, snapshot gelé `{id, artist, title}` à la construction. Aucune modification de poids, normalisation, seuil ou ranking. Sauvegarde préfix : `/tmp/scout-index-fix-DN4Ryc/identity-candidate-index.mjs`. Nouveau test mutation/id invalide dans le fichier de tests existant. Retourne volontairement la projection indexée, pas des métadonnées opaques mutables.

## Intégration potentielle, non réalisée

`server.mjs:314` cherche directement des recordings MusicBrainz puis limite à huit résultats ; `resolveRecording` prépare le plan de recherche et `lib/recording-resolution-decision.mjs:184` applique le décideur aux candidats normalisés. Le nouvel index ne remplace pas une recherche mondiale : il ne voit que les enregistrements effectivement fournis. Usage possible après revue : générer des candidats depuis un cache/catalogue local de provenance conservée, puis passer au décideur existant sans confirmation automatique ajoutée. Ne pas l'alimenter avec le corpus de benchmark en production.

Le gain de recall top10 (+8/815) coûte environ 3,4 à 3,7 fois le temps tokens dans deux exécutions d'agents. Aucun gain d'autoacceptation. Pas de promotion automatique recommandée. Les références du bucket développement sont dans le catalogue indexé : partition des **requêtes CID**, non scénario strict d'entités inconnues/cold-start. Aucun entraînement n'a néanmoins utilisé ce bucket.

Prochaine tâche bornée : contrat de projection d'un cache local autorisé, avec provenance et invalidation explicites ; revue avant toute intégration. Un futur benchmark doit réserver des CID jamais examinés pour comparer variantes de champs, pas réutiliser les 28 miss comme test final.
