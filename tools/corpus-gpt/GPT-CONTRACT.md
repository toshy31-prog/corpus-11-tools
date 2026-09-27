# corpus-gpt

Point d'entrée stable pour piloter/tester l'interface Corpus locale.

## Règles
- Préférer DOM/ARIA aux coordonnées.
- Ne pas réimplémenter CDP, transport ChatGPT, lock ou gestion des pages si `corpus-gpt doctor` passe.
- Chaque job reconstruit ses propres préconditions.
- Les preuves restent sur disque et peuvent être renvoyées vers le fil GPT.
- Côté MCP, `run_job` n'accepte que des noms effectivement listés par `jobs`.
- Si une nouvelle action bornée est nécessaire, utiliser `install_managed_job`
  plutôt qu'un shell ou une écriture directe dans le registre.

## Commandes
- `corpus-gpt status`
- `corpus-gpt doctor`
- `corpus-gpt jobs`
- `corpus-gpt run bb08`
- `corpus-gpt run /chemin/job.sh`
- `corpus-gpt send-text fichier.txt`
- `corpus-gpt send-image image.png [image...]`
- `corpus-gpt evidence`
- `corpus-gpt manifest`

## Surface MCP bornée

- `status`
- `runtime_probe`
- `doctor`
- `jobs`
- `run_job(job)`
- `install_managed_job(name, content)`
- `latest_evidence`

`install_managed_job` impose un nom strict, le registre de jobs Corpus GPT,
une sauvegarde lors d'un remplacement et une validation `bash -n` avant
publication.

## DOM validé
- Quick-menu trigger: `button#corpus-quick-menu-button`
- Quick-menu: `div.corpus-quick-menu[role="menu"]`
- Fichier Révision sélectionné: `button.selected` avec chemin dans `aria-label`
- Précédent: `[aria-label="Fichier précédent"]`
- Suivant: `[aria-label="Fichier suivant"]`
- Refresh: `[aria-label="Actualiser la révision"]`
- Préfixe réel: `projets/`

## Validations
- BB-06: navigation fichier suivant.
- BB-07: navigation fichier précédent.
- BB-08: refresh conserve sélection, navigation et URL.

## Blocages et exécutions longues

Un timeout de l'appelant ne vaut jamais verdict sur le job. Pour les exécutions
longues, start_job retourne un token persistant ; async_jobs et job_status servent
à retrouver et lire le run sans le dupliquer. assess_blocker classe les incidents
déjà observés sans lancer de commande.

La stratégie générale est : préserver, classifier, inspecter, réduire, réparer,
valider, reprendre ; une cause répétitive doit devenir une automatisation ou un
test de régression.
