# Candidat — moteur de protocole institutionnel

- Source : `research/active/cct/executable/ops/`.
- Mécanismes apparemment génériques : journal append-only, rôles incompatibles, propositions et décisions motivées, recours, mandats bornés, pouvoirs temporaires, expiration, arrêt, restitution et audit hors ligne.
- Dépendance restante : vocabulaire CCT, schéma d’état monolithique, CLI et règles de rôles codés ensemble.
- Extraction requise : séparer stockage, machine d’état et politique configurable ; fournir un adaptateur CCT ; conserver les refus actuels en non-régression.
- Statut : candidat, non intégré à Corpus. Copier le paquet actuel sous un autre nom créerait seulement une duplication dépendante.
- Condition d’acceptation : une seconde configuration non CCT doit utiliser le moteur sans branche spéciale ni perte des propriétés d’arrêt et de recours.
