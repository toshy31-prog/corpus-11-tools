# Demande d’intégration officielle Soliguide — abandonnée, ne pas envoyer

Statut : trace d’une trajectoire arrêtée le 17 août 2026. Cette demande ne doit pas être envoyée.

## Objet

Intégrer les données vivantes de Soliguide dans « Maintenant » sans les recopier.

## Message prêt à envoyer

Bonjour,

Nous développons « Maintenant », une couche de dernier kilomètre pour l’accès à l’aide alimentaire. Le prototype parisien ne cherche pas à recréer Soliguide : il transforme une recherche en trois options prioritaires selon le besoin, les conditions d’accès, le jour et la proximité, sans compte ni collecte d’identité.

Nous souhaitons étendre cette interface à toutes les villes à partir des données Soliguide maintenues à la source. Pourrions-nous utiliser votre widget officiel ou convenir d’un accès API pour un pilote d’intérêt général ?

Le pilote respecterait les principes suivants : aucune copie durable de la base, lien visible vers la fiche source, date de mise à jour affichée, remontée des erreurs et fermetures vers Soliguide, et publication d’indicateurs agrégés centrés sur l’obtention effective d’une aide plutôt que sur le trafic.

Nous pouvons vous transmettre le prototype et le schéma précis des données nécessaires.

Bien cordialement,

## Données minimales demandées

- Identifiant stable du lieu et URL de sa fiche.
- Catégorie de service alimentaire.
- Adresse et coordonnées géographiques.
- Horaires structurés et fermetures exceptionnelles.
- Conditions d’accès, publics et modalités d’inscription.
- Date de dernière vérification.
- Canal officiel de signalement/correction.

## Critère de réussite du pilote

Une personne obtient en moins d’une minute trois options encore plausibles aujourd’hui, dont au moins une sans orientation lorsqu’elle existe, puis peut signaler anonymement « obtenu », « fermé », « refusé » ou « information incorrecte ». Ces retours ne seront activés qu’avec une infrastructure de stockage et une procédure de correction convenues.
