export const SERVICE_ID = "mubi-film-scout";

export async function serverReady(url, fetchImpl = fetch, expected = {}) {
  let response;
  try {
    response = await fetchImpl(`${url}/api/status`, { signal: AbortSignal.timeout(800), redirect: "error" });
  } catch {
    return false;
  }
  const status = await response.json().catch(() => null);
  if (!response.ok || status?.service !== SERVICE_ID) {
    throw new Error(`Le port de ${url} répond, mais le service n’est pas identifié comme MUBI Film Scout. Vérifiez le service existant ou choisissez un autre PORT.`);
  }
  if ((expected.version && status.version !== expected.version) || (expected.instanceId && status.instanceId !== expected.instanceId)) {
    throw new Error(`Le port de ${url} appartient à une ancienne version ou à une autre copie de MUBI Film Scout. Arrêtez cette instance avant de relancer.`);
  }
  return true;
}
