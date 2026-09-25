import test from 'node:test';
import assert from 'node:assert/strict';
import { artistRelation } from './music-sorting.mjs';
import { buildScoutMixView, consumeMixPage, emptyMixMessage } from './scout-mix-session.mjs';
import { createScoutPatch, setScoutParameter, scoutParameterValue } from './scout-parameters.mjs';
import { createCatalogueEligibility } from '../lib/catalogue.mjs';

const reference = { name: 'Zuukou Mayzie, Osirus Jack', artistIds: ['a', 'b'] };
const select = (items, { exclude }) => items.filter(item => !exclude.includes(item.id));
const unknowns = Array.from({ length: 37 }, (_, i) => ({ id: `video:${i}`, artist: '', title: `Zuukou Mayzie feat Guest — ${i}`, channelTitle: 'Zuukou Mayzie Le Bg 667' }));
const build = (overrides = {}) => buildScoutMixView({ seedId: 'seed', seedArtist: reference.name, seedArtistIds: reference.artistIds, groups: { curator: { items: unknowns } }, directionFilter: 'curator', select, patch: { otherArtistsOnly: true }, ...overrides });

test('quatre classes sans déduire une identité du titre ou de la chaîne Topic', () => {
  for (const channelTitle of ['Artist - Topic', 'Chaîne amateur']) assert.equal(artistRelation({ artist: '', title: 'Zuukou Mayzie feat Guest', channelTitle }, reference), 'unknown');
  assert.equal(artistRelation({ artist: 'Artiste non renseigné' }, reference), 'unknown');
  assert.equal(artistRelation({ artist: 'Alias différent', artistIds: ['a'] }, reference), 'same');
  assert.equal(artistRelation({ artist: 'Zuukou Mayzie & Osirus Jack' }, reference), 'same');
  assert.equal(artistRelation({ artist: 'Zuukou Mayzie & Jolagreen23' }, reference), 'collaboration');
  assert.equal(artistRelation({ artistIds: ['a', 'c'] }, reference), 'collaboration');
  assert.equal(artistRelation({ artist: 'Jolagreen23' }, reference), 'other');
});

test('reproduction des 37 vidéos masquées, récupération sans requête et pagination réversible', () => {
  const before = JSON.stringify(unknowns), strict = build();
  assert.equal(strict.items.length, 0);
  assert.equal(strict.hiddenCandidates, 37);
  assert.equal(strict.hiddenUnknownCandidates, 37);
  assert.match(emptyMixMessage(strict), /Aucune nouvelle recherche/);
  const patch = { otherArtistsOnly: true, includeUnknownArtists: true };
  const opened = build({ patch });
  assert.equal(opened.candidates, 37);
  assert.equal(opened.items.length, 6);
  assert.ok(opened.items.every(item => item.artistRelation === 'unknown' && item.artist === ''));
  let history = consumeMixPage({}, opened);
  assert.equal(build({ history }).hiddenUnknownCandidates, 31);
  const visited = opened.items.map(item => item.id);
  for (let i = 0; i < 6; i++) { const page = build({ patch, history }); visited.push(...page.items.map(item => item.id)); history = consumeMixPage(history, page); }
  assert.equal(new Set(visited).size, 37);
  assert.equal(build({ patch, history }).candidates, 0);
  assert.equal(JSON.stringify(unknowns), before);
});

test('options indépendantes, mêmes règles de collecte et d’affichage', () => {
  const items = [{ id: 'same', artist: 'Zuukou Mayzie' }, { id: 'guest', artist: 'Zuukou Mayzie & Guest' }, { id: 'other', artist: 'Guest' }, { id: 'unknown', artist: '' }];
  for (const includeUnknownArtists of [false, true]) for (const includeCollaborations of [false, true]) {
    const patch = { otherArtistsOnly: true, includeUnknownArtists, includeCollaborations };
    const result = build({ patch, groups: { curator: { items } } });
    const eligible = createCatalogueEligibility({ ...patch, seedId: 'seed', seedArtist: reference.name, seedArtistIds: reference.artistIds });
    assert.deepEqual(result.items.map(x => x.id).sort(), items.filter(eligible).map(x => x.id).sort());
    assert.equal(result.items.some(x => x.id === 'same'), false);
    assert.equal(result.items.some(x => x.id === 'guest'), includeCollaborations);
    assert.equal(result.items.some(x => x.id === 'unknown'), includeUnknownArtists);
  }
});

test('compteurs limités à la direction, sans doubles comptes ni pistes déjà vues', () => {
  const item = unknowns[0], groups = { curator: { items: [item] }, label: { items: [item, { ...unknowns[1], artist: 'Known' }] } };
  assert.equal(build({ groups, directionFilter: '' }).hiddenCandidates, 1);
  assert.equal(build({ groups }).hiddenCandidates, 1);
  assert.equal(build({ groups, history: { seedId: 'seed', seenIds: [item.id] } }).hiddenCandidates, 0);
  const mixed = { curator: { items: [item] }, label: { items: [{ ...item, artist: 'Known' }] } };
  assert.equal(build({ groups: mixed, directionFilter: '' }).hiddenCandidates, 0, 'une piste visible par une autre route ne compte pas comme masquée');
});

test('les options artistes ne contournent ni contenu promotionnel ni lien éloigné', () => {
  const items = [{ id: 'promo', type: 'video', title: 'Grünt #74 ce soir 18h', artist: '' }, { id: 'far', artist: '', relationship: { distant: true } }];
  const result = build({ groups: { curator: { items } }, patch: { otherArtistsOnly: true, includeUnknownArtists: true, includeCollaborations: true } });
  assert.equal(result.items.length, 0);
  assert.equal(result.hiddenCandidates, 2);
});

test('ancien réglage strict préservé, aller-retour des nouvelles options', () => {
  let patch = createScoutPatch({ otherArtistsOnly: true });
  assert.equal(patch.includeUnknownArtists, false); assert.equal(patch.includeCollaborations, false);
  for (const id of ['scope.unknownArtists', 'scope.collaborations']) { patch = setScoutParameter(patch, id, true); assert.equal(scoutParameterValue(patch, id), true); }
  assert.deepEqual(createScoutPatch(JSON.parse(JSON.stringify(patch))), patch);
  assert.equal(build({ seedArtist: '', seedArtistIds: [], patch }).candidates, 37);
});
