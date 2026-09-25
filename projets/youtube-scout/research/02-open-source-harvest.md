# Briques à vampiriser

## Priorité A — maintenant

### Selective restore
Inspiration : Session Saver (MIT).
Le snapshot existe indépendamment de son activation.

### Document/session split
Inspiration : tldraw.
Pour Scout :

```js
{
  knowledge: {...},
  recovery: {...},
  active: {...}
}
```

### Restore sanitation
Inspiration : Excalidraw (MIT).
- valider schemaVersion,
- filtrer clés,
- migrer avant utilisation,
- ne jamais réinjecter un vieux timestamp comme "now".

## Priorité B — plus tard

### Scoped session keys
- `youtube-scout:knowledge`
- `youtube-scout:recovery:last`
- `youtube-scout:session:<tab-id>`

### Append-only exploration history
Enregistrer des événements au lieu d'écraser systématiquement l'historique.

### Per-context view state
Mémoriser layout/profondeur/direction sans réactiver un seed.

## Priorité C — UI
Carte non bloquante :
> Une fouille précédente est disponible.
> [Reprendre] [Ignorer]

## À ne pas vampiriser
- tldraw SDK directement sans traiter sa licence.
- une state machine lourde uniquement pour ce problème.
- de l'auto-restore silencieux.
