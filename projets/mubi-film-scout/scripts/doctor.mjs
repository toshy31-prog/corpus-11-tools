const port = Number(process.env.PORT || 4180);
const root = `http://127.0.0.1:${port}`;
const live = process.argv.includes("--live");

function date(value) {
  return value ? new Date(value).toLocaleString("fr-FR") : "jamais";
}

let status;
try {
  const response = await fetch(`${root}/api/status`, { signal: AbortSignal.timeout(1500) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  status = await response.json();
} catch (error) {
  console.error(`✗ Serveur local indisponible (${error.message}). Lancez : npm run launch`);
  process.exitCode = 2;
}

if (status) {
  if (live) {
    const response = await fetch(`${root}/api/diagnostics/run`, { method: "POST", signal: AbortSignal.timeout(15_000) });
    const payload = await response.json();
    status.diagnostics = payload.diagnostics || status.diagnostics;
    if (!response.ok) console.error(`✗ Test TMDB : ${payload.message}`);
  }

  const optional = ["guardian", "nyt", "trakt", "omdb"].filter((id) => status.connections[id]?.configured).length;
  console.log("✓ Serveur local : en ligne");
  console.log(`${status.connections.tmdb?.configured ? "✓" : "✗"} Jeton TMDB : ${status.connections.tmdb?.configured ? "configuré" : "manquant"}`);
  console.log(`• Sources facultatives préparées : ${optional}/4`);
  console.log(`• Dernier test TMDB : ${date(status.diagnostics?.lastTmdbCheckAt)}${status.diagnostics?.lastTmdbCheckOk === true ? " — réussi" : status.diagnostics?.lastTmdbCheckOk === false ? " — échoué" : ""}`);
  console.log(`• Dernière recherche réussie : ${date(status.diagnostics?.lastSuccessfulSearchAt)}`);
  if (!status.connections.tmdb?.configured) process.exitCode = 1;
}
