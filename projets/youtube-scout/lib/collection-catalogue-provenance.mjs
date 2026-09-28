import { discogsReleaseGraph } from "./catalogue-release-graph.mjs";

const text = (value, max = 500) => String(value ?? "").slice(0, max);
const id = value => text(value, 120);
const date = value => /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(String(value || "")) ? String(value) : "";

function compactArtist(value = {}) {
  const artistId = id(value.id);
  if (!artistId) return null;
  return { id: artistId, name: text(value.name || value.anv, 500) };
}
function compactLabel(value = {}) {
  const labelId = id(value.id);
  if (!labelId) return null;
  return { id: labelId, name: text(value.name, 500), catno: text(value.catno, 120) };
}
function compactTrack(value = {}) {
  return {
    title: text(value.title, 1000),
    position: text(value.position, 80),
    duration: text(value.duration, 80),
    ...(Array.isArray(value.artists) && value.artists.length ? { artists: value.artists.map(compactArtist).filter(Boolean).slice(0, 32) } : {})
  };
}

export function discogsTrackCatalogueProvenance(video, recording) {
  const resolved = recording?.resolvedDiscogsTrack;
  const release = resolved?.release;
  const releaseId = id(release?.id);
  const match = /^track:discogs:([^:]+):(\d+)$/.exec(String(resolved?.trackEntityId || ""));
  if (!releaseId || !match || match[1] !== releaseId) return null;
  const trackIndex = Number(match[2]);
  if (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex >= (release.tracklist || []).length) return null;
  const track = release.tracklist[trackIndex];
  if (!track?.title) return null;
  return {
    revision: text(video?.departureRevision, 120),
    discogsTrack: {
      releaseId,
      trackIndex,
      release: {
        title: text(release.title, 1000),
        released: date(release.released || release.year),
        masterYear: date(release.master_year),
        artists: (release.artists || []).map(compactArtist).filter(Boolean).slice(0, 32),
        labels: (release.labels || []).map(compactLabel).filter(Boolean).slice(0, 32),
        formats: (release.formats || []).slice(0, 16).map(format => ({
          name: text(format?.name, 120),
          descriptions: (format?.descriptions || []).slice(0, 16).map(value => text(value, 120))
        })),
        track: compactTrack(track)
      }
    }
  };
}


function compactMusicBrainzLabel(value = {}) {
  const labelId = id(value.id), name = text(value.name, 500);
  if (!labelId || !name) return null;
  const catalogueNumber = text(value.catalogueNumber, 120);
  return { id: labelId, name, ...(catalogueNumber ? { catalogueNumber } : {}) };
}
export function musicBrainzRecordingCatalogueProvenance(video, recording) {
  const resolved = recording?.resolved, recordingId = id(resolved?.id);
  if (!recordingId) return null;
  return { revision: text(video?.departureRevision, 120), musicBrainzRecording: { id: recordingId, title: text(resolved.title, 1000), releases: (resolved.releases || []).flatMap(release => {
    const releaseId=id(release?.id); if (!releaseId) return [];
    return [{ id:releaseId, title:text(release.title,1000), date:date(release.date), country:text(release.country,80), labels:(release.labels||[]).map(compactMusicBrainzLabel).filter(Boolean).slice(0,32) }];
  }).slice(0,128) } };
}

export function validateCatalogueProvenance(value) {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Provenance catalogue invalide.");
  const allowedRoot = new Set(["revision", "discogsTrack", "musicBrainzRecording"]);
  if (Object.keys(value).some(key => !allowedRoot.has(key))) throw new Error("Champ de provenance catalogue inconnu.");
  if (typeof value.revision !== "string" || value.revision.length > 120) throw new Error("Révision de provenance catalogue invalide.");
  const d = value.discogsTrack;
  if (d !== undefined) {
    if (!d || typeof d !== "object" || Array.isArray(d) || Object.keys(d).some(key => !["releaseId","trackIndex","release"].includes(key))) throw new Error("Piste Discogs de provenance invalide.");
    if (!id(d.releaseId) || !Number.isInteger(d.trackIndex) || d.trackIndex < 0 || d.trackIndex > 9999) throw new Error("Identifiant de piste Discogs invalide.");
    const r=d.release;
    if (!r || typeof r !== "object" || Array.isArray(r) || Object.keys(r).some(key => !["title","released","masterYear","artists","labels","formats","track"].includes(key))) throw new Error("Release Discogs de provenance invalide.");
    if (typeof r.title !== "string" || r.title.length > 1000) throw new Error("Titre de release invalide.");
    for (const key of ["artists","labels","formats"]) if (!Array.isArray(r[key]) || r[key].length > 32) throw new Error("Liste de provenance catalogue invalide.");
    if (!r.track || typeof r.track.title !== "string" || r.track.title.length > 1000) throw new Error("Piste de provenance invalide.");
  }
  const mb=value.musicBrainzRecording;
  if (mb !== undefined) {
    if (!mb || typeof mb !== "object" || Array.isArray(mb) || Object.keys(mb).some(key => !["id","title","releases"].includes(key)) || !id(mb.id) || typeof mb.title !== "string" || !Array.isArray(mb.releases) || mb.releases.length > 128) throw new Error("Recording MusicBrainz de provenance invalide.");
    for (const release of mb.releases) {
      if (!release || typeof release !== "object" || Array.isArray(release) || Object.keys(release).some(key => !["id","title","date","country","labels"].includes(key)) || !id(release.id) || typeof release.title !== "string" || !Array.isArray(release.labels) || release.labels.length > 32) throw new Error("Release MusicBrainz de provenance invalide.");
      for (const label of release.labels) if (!label || typeof label !== "object" || Array.isArray(label) || Object.keys(label).some(key => !["id","name","catalogueNumber"].includes(key)) || !id(label.id) || typeof label.name !== "string") throw new Error("Label MusicBrainz de provenance invalide.");
    }
  }
  if (!d && !mb) throw new Error("Provenance catalogue vide.");
  return structuredClone(value);
}

export function catalogueProvenanceGraph(video) {
  const value=validateCatalogueProvenance(video?.catalogueProvenance);
  if (!value || value.revision !== String(video?.departureRevision || "")) return { entities: [], edges: [], claims: [] };
  const entities=new Map(), edges=new Map();
  const addGraph=graph => { for (const entity of graph.entities || []) entities.set(entity.id,{...(entities.get(entity.id)||{}),...entity}); for (const edge of graph.edges || []) edges.set(edge.id || [edge.from,edge.kind,edge.to].join(":"),edge); };
  if (value.discogsTrack) {
    const d=value.discogsTrack,r=d.release,tracklist=Array.from({length:d.trackIndex+1},()=>({type_:"heading"})); tracklist[d.trackIndex]={...r.track};
    const graph=discogsReleaseGraph({id:d.releaseId,title:r.title,released:r.released,master_year:r.masterYear,artists:r.artists,labels:r.labels,formats:r.formats,tracklist});
    graph.edges.push({from:"video:youtube:"+video.id,to:"track:discogs:"+d.releaseId+":"+d.trackIndex,kind:"embodies",status:"resolved",source:"discogs",evidence:["discogs_release_tracklist","video:youtube:"+video.id],departureRevision:value.revision}); addGraph(graph);
  }
  if (value.musicBrainzRecording) {
    const mb=value.musicBrainzRecording,recordingId="recording:musicbrainz:"+mb.id,graph={entities:[{id:recordingId,type:"recording",title:mb.title,externalIds:{musicbrainz:mb.id}}],edges:[]};
    graph.edges.push({from:"video:youtube:"+video.id,to:recordingId,kind:"embodies",status:"resolved",evidence:["musicbrainz","video:youtube:"+video.id],departureRevision:value.revision});
    for (const release of mb.releases) { const releaseId="release:musicbrainz:"+release.id; graph.entities.push({id:releaseId,type:"release",title:release.title,date:release.date,country:release.country,externalIds:{musicbrainz:release.id}}); graph.edges.push({from:recordingId,to:releaseId,kind:"appears_on",status:"observed",evidence:["musicbrainz"]}); for (const label of release.labels) { const labelId="label:musicbrainz:"+label.id; graph.entities.push({id:labelId,type:"label",name:label.name,externalIds:{musicbrainz:label.id}}); graph.edges.push({from:releaseId,to:labelId,kind:"issued_by",status:"observed",evidence:["musicbrainz"],...(label.catalogueNumber?{catalogueNumber:label.catalogueNumber}:{})}); } } addGraph(graph);
  }
  return {entities:[...entities.values()],edges:[...edges.values()],claims:[]};
}

export function collectionProvenanceGraph(library = []) {
  const entities=new Map(), edges=new Map();
  for (const video of library) {
    const graph=catalogueProvenanceGraph(video);
    for (const entity of graph.entities) entities.set(entity.id, { ...(entities.get(entity.id)||{}), ...entity });
    for (const edge of graph.edges) edges.set(edge.id || `${edge.from}:${edge.kind}:${edge.to}`, edge);
  }
  return { entities:Object.fromEntries(entities), edges:Object.fromEntries(edges) };
}
