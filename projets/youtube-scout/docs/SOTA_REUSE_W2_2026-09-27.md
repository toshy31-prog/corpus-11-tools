# Scout — réemplois et confrontation, vague 2

## Conclusion

Des améliorations concrètes sont écrites et testées ; le minimum « état de l'art » demandé n'est **pas encore démontré**. Les agents ont été remobilisés sur stockage, corpus externe, revue croisée et validation après leurs premières missions. Aucun résultat synthétique n'est assimilé à une qualité musicale réelle.

| Voie | Livré dans cette vague | Limite de preuve |
| --- | --- | --- |
| Identité | Abstention automatique en présence d'une version explicitement contradictoire | Trois régressions ciblées ; le corpus externe ne contient pas les versions |
| Sources | Annulation du transport, des files et attentes lors de la fermeture d'une exploration | Tests isolés ; expiration détectée à l'accès, pas par minuteur |
| Stockage | Synchronisation fichier et répertoire, temporaire privé, distinction échec avant/après publication | Pas de coupure électrique réelle ni garantie multi-écrivains |
| Interface | Accès explicite au choix/recherche de fiche du départ courant | Pas de choix automatique ; rendu utilisateur non observé |
| Classement | Contrats de diversité et exclusions vérifiés ; mécanisme existant conservé | Pas de jugements humains de pertinence musicale |
| Évaluation | Corpus externe sous licence, baseline exacte, contrôle du biais d'ordre | Bon candidat injecté ; pas de récupération de candidats de bout en bout |

Rapports : [identité](SOTA_REUSE_IDENTITY_W2.md), [fiabilité](SOTA_REUSE_RELIABILITY_W2.md), [stockage](SOTA_REUSE_STORAGE_W2.md), [interface](SOTA_REUSE_UX_W2.md), [découverte](SOTA_REUSE_DISCOVERY_W2.md), [revue croisée](SOTA_REVIEW_W2.md), [validation finale](SOTA_VALIDATION_W2.md).

## Première confrontation externe

MusicBrainz20K du laboratoire de Leipzig : 2 170 333 octets téléchargés dans un dossier temporaire isolé, CC BY 4.0, hash et attribution documentés. Aucun modèle, audio, compte ou donnée personnelle utilisé.

Sur 1 000 requêtes, Scout accepte automatiquement 80 correspondances correctes, contre 49 pour égalité normalisée artiste/titre. Zéro erreur automatique observée ne signifie pas risque nul : **couverture seulement 8 %**, et 92 % des cas restent non automatiques. Cette capacité était déjà présente avant le correctif de versions ; elle ne doit pas lui être attribuée.

Le top-1 initial de 94,1 % était favorisé par la position du bon candidat et des égalités de score. Un ordre déterministe différent le ramène à 71,4 %, sans modifier les 80 décisions automatiques. Les deux mesures sont conservées, sans réglage opportuniste du moteur. Voir [protocole, sources et reproduction](SOTA_EXTERNAL_IDENTITY.md).

## Ce qui reste nécessaire

1. Évaluer la véritable génération de candidats, y compris quand le bon candidat est absent, avec séparation par identité et versions annotées.
2. Confronter les huit directions et le classement à des jugements musicaux à l'aveugle et des baselines comparables.
3. Observer les parcours d'interface, accessibilité et récupération dans une instance de test, puis seulement distinguer l'effet sur le service personnel.
4. Traiter l'audio comme une extension non acquise ; licences des modèles, données et ressources restent des conditions distinctes.

Le score historique de maturité de 54 % n'est pas recalculé artificiellement à partir du nombre de tests supplémentaires. Il n'est ni une fraction de SOTA ni un pourcentage du travail restant. Aucun service personnel n'a été redémarré ou page rechargée ; les modifications sur disque ne prouvent pas leur activation dans la session ouverte.
