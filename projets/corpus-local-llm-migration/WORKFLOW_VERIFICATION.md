# Vérifier le travail effectué

## But

Le menu `…` d’une conversation propose **Vérifier le travail effectué**. Cette
lecture locale répond à une question limitée : le dernier tour de l’exercice
`migration-smoke-v1` laisse-t-il les reçus attendus pour lire, modifier puis
tester une copie de `runtime_limits.py` ?

Elle ne relance jamais le modèle, une commande ou le test. Elle ne conclut pas
non plus que le texte de la réponse est correct.

## Ce qui est lu

- les appels d’outils du dernier tour utilisateur et de ses réponses directes ;
- au plus 100 appels, avec champs bornés ;
- l’empreinte et la structure actuelle de
  `.migration-smoke/runtime_limits.py` ;
- l’empreinte de départ conservée dans `.migration-smoke/scoped-before.json`.

Le résultat distingue donc les reçus du passé de l’état actuel du fichier. Une
chaîne valide exige les trois étapes dans l’ordre, une édition réellement passée
et le test exact terminé avec un code de sortie nul. Un tour interrompu ou une
preuve manquante reste explicitement non vérifié.

## Utilisation

1. Ouvrir le chat concerné puis `…`.
2. Choisir **Vérifier le travail effectué**.
3. Cliquer **Vérifier le dernier tour**.

Le résultat n’est pas enregistré automatiquement : c’est une observation à
interpréter dans le fil de travail. Pour l’instant, le profil est volontairement
fixé à `migration-smoke-v1`, afin de ne pas présenter un contrôle générique qui
ne couvrirait aucun autre projet.

## État de validation

Le routeur HTTP local, le contrôle des données entrantes et l’interface ont été
vérifiés sans inférence. Un historique interrompu doit afficher une chaîne non
vérifiée ; ce résultat confirme l’absence de preuve, pas la réussite de
l’exercice. La prochaine épreuve réelle, quand elle sera nécessaire, devra être
analysée ici sans être relancée par cette interface.
