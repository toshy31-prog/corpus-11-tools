# Admission d'une future automatisation d'identité — checklist W5

27 septembre 2026. Protocole proposé, non exécuté ; aucun seuil abaissé ni modification de production. Complément du diagnostic `SOTA_IDENTITY_W5.md`, pas une nouvelle note globale.

## État relu

Le bilan global distingue cinq axes, sources chercheurs/industrie/open source et extension audio hors cœur. Ses 43/80 sont un indice ordinal de maturité démontrée, pas une probabilité d'identification. Les sources et limites spécialisées sont liées par axe ; ce renvoi ne constitue pas une comparaison homogène avec tous les acteurs cités.

Le diagnostic W5 utilise les CID uniquement après génération des candidats et décision. Sa partition exclusive sépare absence catalogue, échec retrieval, classement, score puis acceptation. Les flags métadonnées sont explicitement chevauchants. Labels CID vides/manquants et booléens d'absence manquants sont rejetés. Les classes 0,78 et 0,90 décrivent les seuils actuels, sans optimisation. Si les seuils de production changent ultérieurement, cette instrumentation devra être versionnée : ses constantes ne sont pas une calibration universelle.

## Conditions à cocher avant une admission

1. **Définir l'objet.** Identifier un enregistrement exact, pas seulement une composition, un artiste homonyme ou une release contenant éventuellement le titre. Fixer séparément la politique reprises/live/remix/rééditions et crédits incomplets.
2. **Constituer un jeu neuf autorisé.** Provenance, licence et consentement vérifiés ; aucune réutilisation des requêtes W2–W5 comme preuve aveugle. Vérité indépendante des scores Scout et de la méthode concurrente ; documenter les désaccords d'annotation, pas les supprimer.
3. **Séparer les ensembles avant mesure.** Développement, calibration et test final par groupes d'artistes et familles d'enregistrements ; empêcher les variantes du même morceau et alias d'un artiste de traverser la frontière. Conserver les cas multi-artistes dans le même composant de groupes liés. Publier seed, règles, effectifs et hashes avant le test. Si ce regroupement vide un sous-ensemble, revoir le plan avant toute mesure.
4. **Inclure les cas difficiles.** Artistes absents du catalogue, homonymes, titres courts, scripts non latins, accents, crédits multiples, métadonnées manquantes, versions incompatibles. Publier les effectifs par strate ; une bonne moyenne ne couvre pas une strate vide.
5. **Geler les candidats et ressources.** Pas d'injection du bon candidat. Même catalogue autorisé, mêmes champs visibles et même plafond de sortie top-k ; annoncer séparément les budgets de calcul, mémoire, appels réseau et latence, qui ne sont pas rendus égaux par top-k seul. Une baseline exacte, une classique et un concurrent ouvert doivent recevoir les mêmes informations admissibles.
6. **Mesurer toutes les issues.** Rappel candidat@k conditionnel à sa présence, précision des auto-acceptations, nombre absolu de faux positifs, taux de fausses acceptations quand la référence est absente, couverture automatique et abstention. Ajouter intervalles d'incertitude et analyses par groupe/strate : zéro erreur sur un petit lot ne démontre pas un risque nul.
7. **Auditer score et marge.** Distinguer score élevé, marge entre candidats et probabilité calibrée. Mesurer leur comportement sur calibration uniquement ; aucune sélection de seuil sur le test final. Ne pas transformer une forte marge entre deux mauvais candidats en preuve d'identité. Tester explicitement les gardes crédits et versions.
8. **Fixer la décision d'admission avant le test.** Le responsable produit doit choisir le risque maximum acceptable, une couverture minimale utile et des plafonds de coût/latence. Sans ces exigences arrêtées, publier les résultats mais ne pas annoncer « admissible ». En cas d'échec, conserver le résultat et préparer une nouvelle expérience distincte ; ne pas requalifier le test en validation après coup.
9. **Observer le passage réel sans fusion irréversible.** Après admission hors ligne seulement : mode suggestion ou observation, traçabilité de chaque identité/source, possibilité de refus/correction et annulation. Autorisation séparée pour API, audio ou données privées. Activation et gain utilisateur doivent être re-observés ; un benchmark ne prouve pas le déploiement.

## Conclusion

Le corpus musical à corruptions synthétiques W2–W5 a permis de découvrir des limites et comparer des mécanismes. Il ne calibre pas à lui seul le risque métier de l'identification YouTube. Les 624 bonnes premières références sous le seuil W5 ne justifient pas de l'abaisser : les mêmes règles toucheraient aussi les mauvaises premières et les références absentes. **Seuils actuels conservés ; admission future non acquise.**
