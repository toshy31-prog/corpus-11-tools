# Livraison locale 0.16 — 13 septembre 2026

Périmètre : les trente évolutions demandées, regroupées dans l’application
existante. Pas de publication, pas d’abonnement, pas de nouvelle clé obligatoire.
Le site reste un moteur déterministe documenté ; l’adaptateur LLM est facultatif.

## Où trouver les fonctions

| Nº | Évolution réalisée | Accès / comportement |
|---|---|---|
| 1 | Lanceur avec identité et version | `./launch.sh` réutilise uniquement l’instance de ce projet et de cette version ; il refuse un autre occupant du port. |
| 2 | Films avant les critiques | Le navigateur demande une recherche progressive, puis `/api/enrich` séparément. Un échec des critiques n’efface pas les films. |
| 3 | Cache persistant | Catalogue/offres 15 min, configuration 24 h, critiques 7 j, absence de critique 24 h ; erreurs non persistées comme résultats. |
| 4 | Compositeur compact | Bouton sous les trois questions ; après recherche, résumé et bouton « Modifier la soirée ». |
| 5 | Cartes allégées | Affiche, titre, cinéaste, durée, synopsis court et actions ; critiques déplacées dans la fiche. |
| 6 | Fiche latérale | Dialogue natif : clavier, Échap, focus restauré, grille laissée sur place ; distribution et sources. |
| 7 | Critères retirables | Bandeau séparant critères de la prochaine recherche et résumé des résultats affichés. Les retraits ne prétendent pas avoir déjà relancé la recherche. |
| 8 | Contraintes / préférences | Années, durée, genres et seuils contraignants ; ambiance/détour indicatifs. Préréglages sans dépassement de durée, avec annulation. |
| 9 | Élargissements chiffrés | Comptages TMDB réels pour époque, genres ou seuils ; application explicite et durée conservée. Totaux avant exclusions locales/vérification, clairement signalés. |
| 10 | Catalogue autonome | Entrée depuis l’accueil, sans filtre de genre/note/époque/durée ; un seul bouton pour afficher et charger davantage. |
| 11 | Disponibilité honnête | Offre d’abonnement FR et date du relevé ; disponibilité signalée ≠ vérifiée. Audio/sous-titres inconnus, langue originale séparée. |
| 12 | Texte assisté | « Décoder en critères », brouillon retirable, texte non interprété indiqué, application explicite ; pas de faux chat. |
| 13 | Contre-choix élargi | Une partie de la réserve provient de candidats éloignés de la tête de classement ; contraste documenté, sous les mêmes contraintes. |
| 14 | Verrouillage/remplacement | Conserver un film et renouveler les autres ; remplacer une seule carte. Aucun résultat admissible disponible : message, pas de film inventé. |
| 15 | « Pas ce soir » | Dans la fiche : motif facultatif et exclusion de session ; réintégration possible. Le motif ne devient pas automatiquement une règle de goût. |
| 16 | Cinq angles documentés | Huis clos, récit fragmenté, film choral, documentaire hybride, ville-personnage. Indices TMDB et annotations sourcées explicitement distingués. |
| 17 | Explications différentielles | Langue originale, écart d’années, genres, durée, cinéaste comparés au point d’ancrage ; absence de contraste déclarée. |
| 18 | Banc différentiel | `npm run benchmark`, 792 cas, renouvellement, diversité, têtes par effet et effet propre des lentilles ; assertions contre les lentilles inertes. |
| 19 | Notes contextualisées | TMDB/votes, IMDb/public, Metacritic/presse, RT/proportion positive ; aucune moyenne universelle. |
| 20 | Réceptions contrastées | Filtre documentaire conservateur : IMDb ≥ 1 000 votes, orientations opposées IMDb/Metacritic selon seuils affichés ; RT non comparé comme moyenne. |
| 21 | Enrichissement à la demande | Fiche de n’importe quel film chargé ou importé ; critiques sur demande ; mêmes files et caches que le programme. |
| 22 | Identité des critiques | Titres FR/original/alternatifs internationaux ; année et réalisateur comme éléments de rapprochement. |
| 23 | Collections importables | Fichier JSON avec IDs TMDB et sources ; aucun scraping des liens. Consultation des fiches et intersection avec les offres MUBI. |
| 24 | « Semblable sur quoi ? » | Fiche → cinéaste, mots-clés, forme annotée, époque ou réception. Recherche dans les films chargés, portée affichée. |
| 25 | Bibliothèque étendue | Plus de plafond de huit titres ; recherche, trois listes usuelles, comparaison, export/import de l’ensemble. |
| 26 | Profil de goûts explicite | J’ai aimé/pas aimé ; genres privilégiés/exclus modifiables. Hypothèses seulement après trois avis positifs concordants et validation manuelle. |
| 27 | Choix à deux | Deux jeux locaux de préférences/vetoes, budget commun, explication du compromis ; aucun veto relâché automatiquement. |
| 28 | Double séance | Deux films vérifiés, durées connues, entracte de dix minutes compris ; contraste ou écho documenté. |
| 29 | Parcours | Trois étapes suivant l’ordre d’une collection ; films non vérifiés/indisponibles exclus, parcours partiel déclaré. |
| 30 | Adaptateur LLM local | Configuration facultative `SCOUT_LLM_URL`/`SCOUT_LLM_MODEL`, validation des champs et application du brouillon. Désactivé en l’absence de modèle. |

## Limites à ne pas masquer

- TMDB/JustWatch est la source du catalogue, pas un inventaire garanti et
  instantané de MUBI. L’API expose au plus 500 pages ; le compte source peut
  différer du nombre restant après masquage local.
- Le catalogue direct n’impose pas de filtre de durée. Le programme, les
  doubles séances et les accords ne sélectionnent pas de durée inconnue.
- La réserve détaillée d’une recherche reste limitée à 24–32 candidats pour
  borner les appels ; les autres films sont parcourables et leurs fiches peuvent
  enrichir la réserve. On ne prétend pas avoir classé exhaustivement tout MUBI.
- Le petit corpus fourni contient **cinq annotations**, pas des milliers de
  jugements automatiques. « Documentaire hybride » n’assimile pas animation et
  fiction. Les sources des cinq fiches ont été consultées pendant ce travail.
- Les collections importées sont des annotations de leur auteur, non des faits
  certifiés. Leur vérification démarre par lots de vingt ; les fiches restantes
  sont ouvrables individuellement. La source et la note restent visibles.
- Les avis absents, quotas atteints et erreurs réseau restent possibles. Les
  notes et critiques ne participent pas clandestinement au score du moteur.
- Les préférences et la bibliothèque restent dans le navigateur. « Sans limite »
  signifie sans plafond applicatif de titres, pas stockage physique infini.
  Un échec d’écriture déclenche un avertissement invitant à exporter.
- Les mots non compris du champ assisté sont conservés dans le retour ; ce
  parseur limité ne possède pas de compréhension générale. Les exclusions
  de genre non prises en charge ne sont pas transformées en inclusions.
- Le modèle local n’a pas été installé ni configuré pendant ce lot. Son
  adaptateur est testé avec une réponse simulée ; aucune inférence réelle
  n’est annoncée.

## Vérification

Commandes locales : `npm run check`, `npm test`, `npm run benchmark`,
`git diff --check`. Les tests de services utilisent des fixtures locales sans
clés réelles. Ils couvrent notamment séparation recherche/enrichissement,
quotas, durée inconnue, verrous, vetoes, import, provenance des annotations,
cache/reprise/expiration et validation des réponses du modèle.

Résultat de la passe finale : **71 tests réussis**, vérifications syntaxiques
et diff sans erreur. `npm run launch -- --no-open` a rejoint l’instance active
de la bonne version sans lancer un second serveur.

Parcours réels observés dans le navigateur : recherche MUBI, enrichissement
progressif, fiche latérale, verrouillage et renouvellement des trois autres
films, double séance et parcours issu des cinq annotations fournies. Les
réponses critiques sont partielles, ce que l’interface affiche.
Le catalogue direct et sa pagination ont été essayés : 489 titres / 25 pages
annoncés par la source au moment du contrôle. Le décodage a bien isolé
« science-fiction après 2010 » et signalé « qui sent la pluie » comme non
interprété. L’accueil a été capturé et inspecté à 390 × 844 pixels avec un
profil Firefox de test distinct ; cela ne remplace pas un test sur téléphone
physique de tous les parcours.

Mesure historique de la version 0.16, remplacée par les contrôles de
[la consolidation 0.16.1](./CONSOLIDATION-0.16.1.md) :
le banc synthétique produisait 679 programmes distincts pour 792
combinaisons ; les quatre films sont renouvelables dans chaque cas. Les quatre
lentilles modifient chacune au moins deux films par rapport au cas témoin.
Ces chiffres décrivent la fixture, pas l’expérience future de l’utilisateur.

## Suite utile après cette livraison

Accumuler des retours explicites sur de vraies soirées, enrichir le corpus
éditorial avec des collections choisies, et mesurer les comportements sur
plusieurs instantanés réels du catalogue. Installer un modèle local ne vient
qu’ensuite si le besoin de formulation libre le justifie.
