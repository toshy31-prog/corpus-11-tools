// A selected catalogue card carries its own exact identity. This creates no
// equivalence with a local homonym and confirms no recording attribution.
export function selectedCatalogueEntity(seed, existing = null) {
  if (!seed?.id || !["artist", "label"].includes(seed.type)) return null;
  const encoded = seed.id.match(/^(artist|label):(discogs|musicbrainz):(.+)$/);
  const externalIds = {};
  for (const source of ["discogs", "musicbrainz"]) {
    const supplied = seed.externalIds?.[source] || existing?.externalIds?.[source];
    const id = String(encoded?.[2] === source ? encoded[3] : supplied || "");
    if (encoded?.[2] === source && supplied && String(supplied) !== id) return null;
    if ((source === "discogs" ? /^[1-9]\d*$/ : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(id)) externalIds[source] = id;
  }
  if (!Object.keys(externalIds).length || (encoded && encoded[1] !== seed.type)) return null;
  return { ...existing, id: seed.id, type: seed.type, name: seed.name || seed.label || existing?.name || seed.id, externalIds: { ...existing?.externalIds, ...externalIds } };
}
