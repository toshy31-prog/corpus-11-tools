# Candidat de surface conversationnelle native

Ce candidat prend uniquement un paquet analytique Corpus déjà scellé. Il ne
reçoit ni demande libre à router, ni catalogue de skills, ni instruction de
raisonnement. Sa restitution déterministe garde mot pour mot la conclusion
matérielle, les incertitudes utiles et les conditions de renversement.

Il reste dans `research/` : il n'est pas un skill installé et ne modifie pas le
runtime Corpus.

`corpus-native-conversation/` est le skill-orchestrateur de développement. À
partir d'une question libre, Codex effectue le routage et l'analyse Corpus dans
le même contexte, puis utilise `seal_analytic_packet.py` et ce renderer. Le
script de scellement ne raisonne pas : il ne fait qu'envelopper les conclusions
que Codex vient d'établir. Cette séparation est nécessaire car Corpus est un
ensemble de skills exécutés par Codex, et non une API locale que Python pourrait
appeler de lui-même.

`tools/conversation_run.py` ajoute le journal d'usage du candidat. Avant toute
analyse, il vérifie que l'espace de scellement est inscriptible et réserve une
tentative immuable. Une tentative vérifiée est reprise sans nouvelle analyse ;
une tentative interrompue est conservée et une nouvelle tentative est créée.
Il peut relire un rendu vérifié lorsque le client Codex a perdu l'affichage
final. Le journal n'effectue aucun routage ni raisonnement Corpus.

```bash
python3 native_surface/tools/conversation_surface.py render \
  --packet native_surface/fixtures/strong-conclusion.packet.json \
  --detail compact
```

Niveaux admis : `compact`, `standard`, `inspectable`. Aucun niveau ne peut
retirer un élément critique ; `inspectable` ajoute seulement la scène brute et
le paquet de routage déjà scellé.

Vérifier une restitution produite :

```bash
python3 native_surface/tools/conversation_surface.py verify \
  --packet native_surface/fixtures/strong-conclusion.packet.json \
  --rendered /chemin/vers/restitution.json
```
