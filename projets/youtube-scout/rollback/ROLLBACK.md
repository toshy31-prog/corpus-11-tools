# Rollback

Le script affiche un backup :
`/tmp/app.before-explorer-neutral-v2-YYYYMMDD-HHMMSS.js`

Pour restaurer :

```bash
cd ~/Documents/ChatGPT/Corpus/projets/youtube-scout
cp /tmp/app.before-explorer-neutral-v2-YYYYMMDD-HHMMSS.js public/app.js
node --check public/app.js
npm test
```
