# État de l'art ciblé — septembre 2026

## tldraw — document vs session
Le pattern le plus utile est la séparation entre :
- **document** : contenu durable ;
- **session** : état par utilisateur (page courante, caméra, sélection).

Leur exemple de snapshots indique qu'on peut charger le document et la session séparément, ou ignorer la session. C'est exactement la frontière qu'on veut pour Scout.

Référence :
https://github.com/tldraw/tldraw/blob/main/apps/examples/src/examples/editor-api/snapshots/SnapshotExample.tsx

Attention : le SDK tldraw principal n'est pas permissivement open source pour la production. Ici, on vampirise le **pattern**, pas le code du SDK.

## tldraw LocalSync — IndexedDB robuste
Le client local persiste document + session dans IndexedDB avec throttling, retry, sessionId, synchronisation inter-onglets et schéma sérialisé.

Référence :
https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts

## Excalidraw — restauration et sanitation
Excalidraw sépare sérialisation/restauration et nettoie l'app state avant stockage. Pattern : ne pas réinjecter un état sérialisé brut.

Référence :
https://github.com/excalidraw/excalidraw/blob/master/dev-docs/docs/%40excalidraw/excalidraw/api/utils/utils-intro.md

Licence : MIT.

## Session Saver — restore points et selective restore
Projet local-first de récupération de sessions navigateur :
- restore points automatiques,
- selective restore,
- import/export,
- stockage local.

Référence :
https://github.com/BF-GO/session-backups

Licence : MIT.

## AWS Graph Explorer — visualisation séparée
Graph Explorer distingue données du graphe, vue/session, table/schema views et connexions. Pattern : la vue est une projection navigable, pas le graphe lui-même.

Références :
https://github.com/aws/graph-explorer
https://github.com/aws/graph-explorer/blob/main/CONTEXT.md

Licence : Apache-2.0.

## Graph Browser — état par contexte
Le projet `graph-browser` mémorise par repo nœud sélectionné, profondeur, progression tutorial et layout explicite.

Référence :
https://github.com/lambdasistemi/graph-browser

## GBrain — compiled truth + timeline
Pattern fécond :
- compiled truth : état courant synthétisé ;
- timeline : preuves append-only ;
- le focus de l'Explorer reste encore un troisième plan, distinct.

Référence :
https://github.com/laozhong86/gbrain

## Conclusion
Le state of the art converge vers une séparation forte :
- content/knowledge,
- session/view,
- recovery/history,
- explicit user action.

Le bug Kosh est donc un symptôme classique d'un mélange de couches.
