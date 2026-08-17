# État opérationnel

Dernière mise à jour : 2026-08-17

## Conclusion courante — cycle clôturé

La piste **Manger aujourd’hui à Paris** est abandonnée. Le logiciel a été construit, testé et déployé en privé, mais aucun effet bénéficiaire n’a été réobservé et sa valeur distincte face à Soliguide n’est pas établie.

Le service intègre directement 34 solutions parisiennes. Sa couche de décision produit au plus trois options prévues aujourd’hui selon le besoin, la proximité et les moyens d’accès disponibles ; elle privilégie l’accès libre et exclut fermetures et données périmées. La liste complète conserve horaires, conditions, publics, contacts, dates de révision et sources. Aucune identité ni situation personnelle n’est collectée. L’accès reste privé au propriétaire du site.

Le déploiement prouve seulement la disponibilité technique. Il ne constitue ni une aide obtenue, ni une capacité robuste, ni une raison de poursuivre.

## Fait

- mission et règle de preuve définies ;
- quatre familles d’intervention comparées ;
- intervention 001 ouverte ;
- fiche de besoin prête à l’emploi ;
- critères de clôture fixés avant l’action.
- sources opérationnelles vérifiées au 17 août 2026 ;
- site construit et contrôlé ;
- version 1 déployée en production après reprise d’un échec TLS temporaire ;
- version 2 déployée avec 24 fiches locales, filtres, état du jour et péremption explicite ;
- carte de partage ramenée d’environ 1,2 Mo à 68 Ko, soit plus de 94 % de transfert évitable supprimé.
- batterie reproductible de 50 tests-limites réussie ; quatre défauts corrigés : fuseau parisien, tri numérique, recherche tolérante et numéros `+33 (0)`.
- vérification interactive de production réussie : 24 fiches initiales, 2 résultats pour `etudiant`, 7 fiches pour le 18e, aucune erreur console.
- version 4 validée localement : 34 fiches, dont 10 restaurants solidaires municipaux issus du dépliant officiel de juin 2026 ; expiration différenciée, accès libre priorisé et deux lieux aux informations contradictoires exclus.
- version 5 déployée : trois recommandations du jour calculées par besoin, arrondissement et condition d’accès ; demande d’intégration officielle Soliguide rédigée pour la couverture nationale.

## Transfert vers Corpus

Les fonctions réutilisables sont transférées à Corpus 11 Tools : porte de rendement sans score, vérificateur déterministe, cinq tests unitaires et cas de non-régression. Leur amélioration réelle des décisions de Corpus reste à réobserver.

## État terminal

Le prototype privé reste gelé comme trace. Aucune demande ne sera envoyée à Solinum, aucune extension nationale ne sera développée et aucun retour bénéficiaire ne sera collecté dans ce cadre.

## Condition de clôture du cycle 001

Le cycle n’est réussi que si une rupture d’accès est effectivement évitée ou raccourcie, et que cette utilité est confirmée par la personne ou l’organisation concernée. Une prise de contact, un document produit ou une quantité distribuée ne suffit pas à eux seuls.
