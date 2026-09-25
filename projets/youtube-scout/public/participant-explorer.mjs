// Selection expresses user intent, never a catalogue identity assertion.
const element = (tag, text) => Object.assign(document.createElement(tag), text === undefined ? {} : { textContent: text });
const button = (text, action) => { const node = element('button', text); node.type = 'button'; node.onclick = action; return node; };
const link = (text, url) => Object.assign(element('a', text), { href: url, target: '_blank', rel: 'noreferrer' });

export function participantDraft(seedId, names, previous) {
  const signature = JSON.stringify(names);
  if (previous?.seedId === seedId && previous.signature === signature) return previous;
  return { seedId, signature, busy: false, message: '', rows: names.map(name => ({ name, query: name, selected: false, candidate: null, candidates: [], revision: 0, status: 'Non identifié', videos: [] })) };
}

export function mountParticipantPicker(host, { draft, search, reference, explore, isCurrent, refresh, compact = false }) {
  const panel = element('section'); panel.className = 'departure-identity-controls';
  panel.dataset.seedId = draft.seedId;
  panel.append(element('h4', compact ? 'Fiches artistes proposées' : 'Participants à explorer'), element('p', compact ? 'La recherche de fiches est automatique. Choisissez les correspondances pour ouvrir les directions catalogue ; les recherches par nom restent disponibles sans fiche.' : 'Sélectionnez les participants, avec ou sans fiche. Une fiche ne sera retenue que par votre choix explicite. Le nom de recherche ne modifie pas les crédits du morceau.'));
  const message = element('p', draft.message); message.role = 'status';
  const launch = button('Explorer les participants sélectionnés', async () => {
    if (draft.busy) return;
    const selected = draft.rows.filter(row => row.selected);
    if (!selected.length) return;
    draft.busy = true; draft.message = 'Préparation de la recherche commune…'; refresh();
    try { await explore(selected); }
    catch (error) { draft.message = error.message; }
    finally { draft.busy = false; if (isCurrent()) refresh(); }
  });
  const update = () => { launch.disabled = draft.busy || !draft.rows.some(row => row.selected) || (compact && !draft.rows.some(row => row.selected && row.candidate)); launch.textContent = compact ? 'Explorer les liens des fiches choisies' : `Explorer les participants sélectionnés (${draft.rows.filter(row => row.selected).length})`; };
  if (!compact) panel.append(button('Tous les participants', () => { for (const row of draft.rows) row.selected = true; refresh(); }), button('Désélectionner tous les participants', () => { for (const row of draft.rows) row.selected = false; refresh(); }));
  for (const row of draft.rows) {
    const field = element('fieldset'); field.append(element('legend', row.name));
    const selected = element('input'); selected.type = 'checkbox'; selected.checked = row.selected;
    selected.onchange = () => { row.selected = selected.checked; update(); };
    const selection = element('label'); selection.append(selected, document.createTextNode(` Explorer ${row.name}, même sans fiche`)); if (!compact) field.append(selection);
    const query = element('input'); query.type = 'search'; query.value = row.query; query.maxLength = 120; query.setAttribute('aria-label', `Nom de recherche pour ${row.name}`);
    query.oninput = () => { row.query = query.value; row.revision++; row.searching = false; row.status = 'Recherche modifiée ; les crédits et la fiche choisie sont conservés.'; };
    const lookup = async (url = '') => {
      const name = row.query.trim(); if (!url && name.length < 2) { row.status = 'Saisissez au moins deux caractères.'; refresh(); return; }
      const revision = ++row.revision; row.searching = true; row.status = 'Recherche de fiches…'; refresh();
      try {
        const data = await (url ? reference(url) : search(name));
        if (!isCurrent() || row.revision !== revision) return;
        row.candidates = [...new Map([...(row.candidate ? [row.candidate] : []), ...(data.candidates || [])].map(item => [item.id, item])).values()];
        row.status = row.candidates.length ? 'Propositions à vérifier — choisissez une fiche, ou continuez sans fiche.' : 'Aucune fiche trouvée. Ce participant reste sélectionnable pour YouTube.';
        const failures = Object.entries(data.sourceStates || {}).filter(([, state]) => state !== 'ok');
        if (failures.length) row.status += ' Sources non consultées : ' + failures.map(([source, state]) => `${source} (${state})`).join(', ');
      } catch (error) { if (row.revision === revision) row.status = error.message; }
      finally { if (row.revision === revision) row.searching = false; if (isCurrent()) refresh(); }
    };
    const needsLookup = !compact || (!row.candidate && !row.searching && !row.candidates.length);
    if (needsLookup) field.append(query, button('Chercher une fiche pour ce participant', () => lookup()));
    if (!compact && /\s+667$/u.test(row.name)) field.append(button('Essayer sans « 667 »', () => { row.query = row.name.replace(/\s+667$/u, ''); return lookup(); }));
    const status = element('p', row.status); status.role = 'status'; field.append(status);
    const choice = element('select'); choice.setAttribute('aria-label', `Identification de ${row.name}`);
    choice.append(new Option('Sans fiche — recherche à vérifier', ''));
    for (const candidate of row.candidates) choice.append(new Option(`${candidate.name}${candidate.context ? ' — ' + candidate.context : ''} (${candidate.source || 'catalogue'})`, candidate.id));
    choice.value = row.candidate?.id || '';
    choice.onchange = () => { row.revision++; row.searching = false; row.candidate = row.candidates.find(item => item.id === choice.value) || null; row.status = row.candidate ? 'Fiche choisie par vous ; enregistrement exact non confirmé.' : 'Sans fiche — identité non confirmée.'; refresh(); };
    field.append(choice);
    if (row.candidate?.sourceUrl && /^https:\/\/(?:www\.)?(?:musicbrainz\.org|discogs\.com)\//.test(row.candidate.sourceUrl)) field.append(link('Vérifier la fiche choisie ↗', row.candidate.sourceUrl));
    const direct = element('details'); direct.append(element('summary', 'Indiquer une fiche pour ce participant'));
    const url = element('input'); url.type = 'url'; url.placeholder = 'URL MusicBrainz ou Discogs'; url.setAttribute('aria-label', `Fiche de ${row.name}`);
    direct.append(url, button('Lire cette fiche', () => lookup(url.value.trim()))); if (needsLookup) field.append(direct);
    panel.append(field);
  }
  panel.append(message, launch); update();
  if (draft.busy) for (const control of panel.querySelectorAll('button,input,select')) control.disabled = true;
  host.append(panel);
}

export function participantCatalogueItems(row, items = []) {
  const id = row.candidate?.id;
  return id ? items.filter(item => item.artistIds?.includes(id) || item.anchor?.id === id || item.path?.some(step => step.from === id || step.to === id)) : [];
}

// Round robin by participant, deduplication by exact result ID only.
export function participantResults(rows, catalogueItems = []) {
  const pools = rows.map(row => {
    const catalogues = participantCatalogueItems(row, catalogueItems);
    return [...catalogues.map(item => ({ item, via: row.name, uncertain: false })), ...row.videos.map(item => ({ item, via: row.name, uncertain: true }))];
  });
  const merged = new Map();
  for (let index = 0; pools.some(pool => index < pool.length); index++) for (const pool of pools) {
    const result = pool[index]; if (!result) continue;
    const prior = merged.get(result.item.id);
    if (prior) { if (!prior.via.includes(result.via)) prior.via.push(result.via); prior.uncertain &&= result.uncertain; }
    else merged.set(result.item.id, { item: result.item, via: [result.via], uncertain: result.uncertain });
  }
  return [...merged.values()];
}

export function renderParticipantResults(host, draft, catalogueItems = [], { renderCard, summaryOnly = false } = {}) {
  if (!draft?.launched) return;
  const panel = element(summaryOnly ? 'details' : 'section'); panel.className = 'participant-search-summary';
  panel.append(element(summaryOnly ? 'summary' : 'h3', 'Sources par participant'), element('p', 'Les pistes rejoignent la liste principale et ses filtres. Une recherche par nom ne confirme pas les crédits.'));
  for (const row of draft.launched) {
    panel.append(element('p', `${row.name} — ${row.candidate ? 'fiche choisie' : 'identité non confirmée'} · ${row.videoStatus || 'recherche en attente'}`));
    panel.append(link(`Chercher ${row.name} sur YouTube ↗`, `https://www.youtube.com/results?search_query=${encodeURIComponent(row.query)}`));
  }
  const results = participantResults(draft.launched, catalogueItems);
  if (summaryOnly) {
    panel.append(element('p', `${results.length} résultat(s) chargé(s) avant filtres. Pour voir les recherches par nom, incluez les artistes inconnus ou désactivez « Autres artistes uniquement ».`));
    host.append(panel); return;
  }
  const list = element('div'); list.className = 'derived-grid';
  for (const result of results) {
    if (renderCard) { list.append(renderCard(result)); continue; }
    const card = element('article'); card.className = 'derived-card';
    card.append(element('h4', result.item.title || result.item.label || 'Piste'), element('p', `Via ${result.via.join(', ')}${result.uncertain ? ' — recherche par nom, à vérifier' : ' — lien catalogue'}`));
    const url = result.item.listen?.url;
    card.append(link('Voir / chercher l’écoute ↗', /^https:\/\/(?:www\.)?youtube\.com\//.test(url || '') ? url : `https://www.youtube.com/results?search_query=${encodeURIComponent(result.item.listen?.query || `${result.item.artist || ''} ${result.item.title || ''}`)}`));
    list.append(card);
  }
  panel.append(element('p', `${results.length} résultat(s) chargé(s) · les crédits du départ ne sont pas modifiés par ces résultats.`), list);
  host.append(panel);
}
