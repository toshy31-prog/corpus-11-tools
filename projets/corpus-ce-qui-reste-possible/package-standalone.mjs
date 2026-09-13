import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("./", import.meta.url);
const outputDirectory = new URL("./dist/", root);
const outputFile = new URL("./dist/CORPUS-Jeu.html", root);

const [html, css, javascript] = await Promise.all([
  readFile(new URL("evolution.html", root), "utf8"),
  readFile(new URL("evolution.css", root), "utf8"),
  readFile(new URL("evolution-browser.js", root), "utf8"),
]);

const safeJavascript = javascript.replaceAll("</script", "<\\/script");
const standalone = html
  .replace(
    '<link rel="stylesheet" href="evolution.css" />',
    `<style>\n${css}\n</style>`,
  )
  .replace(
    '<script defer src="evolution-browser.js"></script>',
    `<script>\n${safeJavascript}\n</script>`,
  )
  .replace(
    '<a href="index.html">Campagne systémique</a>',
    '<span title="Disponible dans le dossier complet du projet">Version autonome</span>',
  );

if (standalone.includes('src="evolution-browser.js"') || standalone.includes('href="evolution.css"')) {
  throw new Error("Le paquet autonome conserve une dépendance externe inattendue.");
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, standalone, "utf8");

console.log(`Paquet autonome créé : ${outputFile.pathname}`);
