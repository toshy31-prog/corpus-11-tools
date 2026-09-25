import { SCOUT_DIRECTIONS, scoutParameterDefinition } from "./scout-parameters.mjs";
import { enhanceScoutDial } from "./scout-dial.mjs";
import { reconcileDirectionFilter, emptyMixMessage } from "./scout-mix-session.mjs";
import { MUSIC_SORTS } from "./music-sorting.mjs";
import { routeExplanation } from "./discovery-presentation.mjs";

const STATE_TEXT = { idle:"Choisir un départ", muted:"Désactivée", paused:"En pause", confirmation:"Identité à confirmer", loading:"Recherche en cours…", error:"Échec · réessayer", unavailable:"Source indisponible", empty:"Aucun lien trouvé dans les sources consultées", pending:"Pas encore consultée", partial:"Consultée · recherche incomplète", mediated:"Recherche via les crédits", aggregate:"Relations locales", unsupported:"Source manquante pour ce départ", "n/a":"Non applicable à ce départ", ready:"Pistes chargées" };
const ROUTE_HELP = {
  label:"Labels documentés → autres sorties et artistes.",
  remix:"Remixes et remixeurs explicitement crédités.",
  featuring:"Collaborations et co-crédits documentés.",
  compilation:"Compilations où le départ apparaît → autres artistes.",
  alias:"Alias et projets reliés par une source.",
  curator:"Vidéos publiées par les chaînes du départ. Ce lien éditorial ne prouve pas une collaboration musicale.",
  scene:"Voisinage construit par des relations documentées.",
  era:"Même période parmi des pistes déjà reliées par un label, un crédit, un projet ou une chaîne. Jamais une décennie seule."
};
const ROUTE_NAMES = { label: "Labels", remix: "Remixeurs", featuring: "Collaborations", compilation: "Compilations", alias: "Alias et projets", curator: "Chaînes YouTube", scene: "Scènes", era: "Période", participants: "Recherches par nom — à vérifier" };
export function selectionSummary(selection) {
  if (!selection?.applied) return "";
  const reasons = {
    target_reached: "Objectif de pistes admissibles atteint.",
    request_budget: "Budget de cette étape atteint : poursuivez pour consulter les pages restantes.",
    processing_budget: "Lot de pages en cache parcouru : poursuivez pour lire les suivantes.",
    source_unavailable: "Source interrompue : les pages restent reprenables.",
    source_not_configured: "Accès catalogue manquant : les pages sont conservées pour une reprise.",
    needs_confirmation: "Un choix d’identité est nécessaire avant la suite.",
    needs_identity: "Une identité documentée est nécessaire avant la suite.",
    documented_frontier_exhausted: "Fin des liens actuellement documentés, pas de l’ensemble des liens possibles."
  };
  return `${Number(selection.eligible) || 0} piste(s) admissible(s) lors de cette recherche. ${reasons[selection.stopReason] || "Recherche partielle."}`;
}

export function mountScoutMixerPanel({ parent, read, onParameter, onNext, onDig, onBack, onStop, onReset, onRewind, renderCard }) {
  const doc=parent.ownerDocument;
  const make=(tag,className="",text="")=>{ const n=doc.createElement(tag); n.className=className; n.textContent=text; return n; };
  if (!doc.querySelector('link[data-scout-mixer-css]')) { const l=doc.createElement("link"); l.rel="stylesheet"; l.href="/scout-mixer-panel.css"; l.dataset.scoutMixerCss="1"; doc.head.append(l); }
  const host=make("section","scout-mixer-rack"); host.id="scout-mixer-rack"; host.setAttribute("aria-labelledby","scout-mixer-title");
  const heading=make("div","mix-heading");
  const titleBlock=make("div","mix-title-block"), title=make("h2","","Vos découvertes"), departure=make("strong","mix-source-name");
  title.id="scout-mixer-title"; titleBlock.append(make("p","mix-bank-title","2 · EXPLORER LES LIENS"),title);
  const sourceReadout=make("div","mix-source-readout"), sourceNav=make("div","mix-source-nav"), backDeparture=make("button","mix-source-back"), journeyTrail=make("small","mix-source-trail"), departureMode=make("small","mix-source-mode");
  backDeparture.type="button"; backDeparture.hidden=true; backDeparture.onclick=()=>invoke(()=>onBack?.());
  sourceNav.append(departure,backDeparture);
  sourceReadout.append(make("span","mix-source-label","SOURCE"),sourceNav,journeyTrail,departureMode);
  heading.append(titleBlock,sourceReadout);
  const help=make("p","mix-caption","Écoutez une piste, gardez-la ou continuez depuis elle. Chaque carte explique son lien avec ce départ.");
  const settings=make("details","mix-settings"), settingsSummary=make("summary"), settingsTitle=make("strong"), settingsScope=make("span","mix-settings-scope");
  settings.id="scout-settings"; settingsSummary.append(settingsTitle,settingsScope); settings.append(settingsSummary);
  const routeBank=make("section","mix-bank mix-bank-routes"); routeBank.append(make("h3","mix-section-title","Directions à explorer"), make("p","mix-route-help","Ces directions servent à la recherche et au mélange des pistes. Les réglages ne lancent aucune requête. À zéro, une direction est exclue ; ses données restent conservées.")); const controls=make("div","mix-controls"); routeBank.append(controls);
  const shapeBank=make("section","mix-bank mix-bank-shape"); shapeBank.append(make("header","mix-bank-title","SHAPE · forme de la fouille")); const shapeControls=make("div","mix-shape-controls"); shapeBank.append(shapeControls);
  const knobs=new Map(), depthButtons=new Map(); let spreadControl; const depthState=make("small","mix-shape-state");
  const actions=make("div","mix-actions"), status=make("p","mix-status"), outputBank=make("section","mix-bank mix-bank-output"), grid=make("div","mix-grid"), resultCount=make("p","mix-result-count"), filterScope=make("p","mix-filter-scope");
  const localTransport=make("div","mix-transport-group mix-transport-local"), expandTransport=make("div","mix-transport-group mix-transport-expand"), resetTransport=make("div","mix-transport-group mix-transport-reset");
  localTransport.append(make("span","mix-transport-label","LOCAL")); expandTransport.append(make("span","mix-transport-label","EXPAND")); resetTransport.append(make("span","mix-transport-label","UTILITY"));
  const digPlan=make("small","mix-dig-plan"), armedDepth=make("small","mix-transport-note");
  status.setAttribute("role","status"); grid.setAttribute("aria-label","Pistes du mix"); resultCount.setAttribute("role","status"); outputBank.append(resultCount,filterScope,grid);
  let frame=0, stopped=false, localMessage="", renderedSeedId="", directionFilter="";
  const schedule=()=>{ if (!frame && !stopped) frame=doc.defaultView.requestAnimationFrame(()=>{ frame=0; update(); }); };
  const invoke=async action=>{ try { localMessage=""; await action(); } catch(e){ localMessage=e?.message||"Action interrompue."; } finally { update(); } };
  function actionButton(action,text,callback,target=actions){ const n=make("button","",text); n.type="button"; n.dataset.action=action; n.onclick=()=>invoke(callback); target.append(n); return n; }
  const collisionKey=item=>`${String(item?.title||item?.label||"").trim().toLocaleLowerCase("fr")}\u0000${String(item?.artist||"").trim().toLocaleLowerCase("fr")}`;
  function outputCollisions(items=[]){ const groups=new Map(); for(const item of items){ const key=collisionKey(item); if(!key.replace("\u0000","").trim())continue; const values=groups.get(key)||[]; values.push(item); groups.set(key,values); } return new Map([...groups].filter(([,values])=>new Set(values.map(item=>item.id)).size>1)); }
  function dial(parameterId,label,parentNode,describedBy="") {
    const d=scoutParameterDefinition(parameterId), box=make("div","mix-route"), name=make("label","",label), safe=parameterId.replace(/[^a-z0-9]+/gi,"-"); name.htmlFor=`scout-param-${safe}`;
    const input=doc.createElement("input"); input.type="range"; input.id=name.htmlFor; input.min=String(d.min); input.max=String(d.max); input.step=String(d.step); input.value=String(d.defaultValue); if (describedBy) input.setAttribute("aria-describedby",describedBy);
    const output=make("output","",Number(d.defaultValue).toFixed(2)); output.htmlFor=input.id;
    box.append(name,input,output); parentNode.append(box);
    const control=enhanceScoutDial(input,{
      output,
      defaultValue:d.defaultValue,
      format:number=>Number(number).toFixed(2),
      getContextKey:()=>renderedSeedId,
      onChange:q=>{ onParameter(parameterId,q); localMessage=""; schedule(); }
    });
    return {box,input,svg:control.svg,paint:control.paint,set:control.set};
  }
  for (const {id,label} of SCOUT_DIRECTIONS) {
    const state=make("small","mix-route-state"), stateLabel=make("span","mix-route-status"), meter=make("span","mix-route-meter");
    state.id=`scout-route-state-${id}`; state.append(stateLabel,meter);
    const c=dial(`direction.${id}.weight`,ROUTE_NAMES[id] || label,controls,state.id);
    const toggle=make("button","mix-route-toggle"); toggle.type="button"; toggle.dataset.routeToggle=id;
    toggle.setAttribute("aria-label",`Activer ou désactiver : ${ROUTE_NAMES[id] || label}`);
    toggle.onclick=()=>{ const route=read().routes.find(r=>r.id===id); onParameter(`direction.${id}.weight`,route.enabled ? 0 : 1); localMessage=""; update(); };
    const details=make("details","mix-route-details"), info=make("p");
    const dose=make("div","mix-route-dose");
    dose.append(c.input,c.svg,c.box.querySelector("output"));
    details.append(make("summary","","Dosage et sources"),dose,make("p","",ROUTE_HELP[id]),info);
    c.box.prepend(toggle); c.box.append(state,details);
    Object.assign(c,{state,stateLabel,meter,toggle,info}); knobs.set(id,c);
  }
  const spreadWrap=make("div","mix-shape-unit"); spreadControl=dial("shape.spread","DIVERSITÉ",spreadWrap); spreadWrap.append(make("small","mix-shape-state","0 = approfondir les mêmes liens · 1 = varier les artistes et les chemins disponibles")); shapeControls.append(spreadWrap);
  const depthWrap=make("div","mix-shape-unit mix-depth-unit"); depthWrap.append(make("p","mix-shape-label","DISTANCE DU PARCOURS")); const depthSwitch=make("div","mix-depth-switch"); depthSwitch.setAttribute("role","group"); depthSwitch.setAttribute("aria-label","Distance de la prochaine recherche");
  for(const depth of [3,6,9]){ const b=make("button","",String(depth)); b.type="button"; b.onclick=()=>{onParameter("shape.depth",depth); localMessage=`La prochaine recherche pourra suivre jusqu’à ${depth} relations.`; schedule();}; depthSwitch.append(b); depthButtons.set(depth,b); } depthWrap.append(depthSwitch,depthState); shapeControls.append(depthWrap);
  const next=actionButton("next","Page suivante →",()=>onNext(directionFilter),localTransport);
  next.title="Autres pistes chargées, sans nouvelle recherche";
  const rewind=actionButton("rewind","Recommencer les pages de ce départ",onRewind,localTransport);
  rewind.title="Effacer l’historique d’affichage de ce départ, sans toucher au carnet ni aux écoutes";
  const resultsToolbar=make("div","mix-results-toolbar"), filterLabel=make("label","","Voir les pistes");
  const filter=make("select"); filter.id="scout-result-direction"; filterLabel.htmlFor=filter.id;
  filter.append(Object.assign(make("option","","Toutes les directions actives"),{value:""}));
  for (const {id} of SCOUT_DIRECTIONS) filter.append(Object.assign(make("option","",ROUTE_NAMES[id]),{value:id}));
  filter.onchange=()=>{directionFilter=filter.value; localMessage=""; update();};
  const clearFilter=actionButton("clear-filter","Retirer le filtre",()=>{directionFilter="";},resultsToolbar);
  resultsToolbar.prepend(filterLabel,filter); resultsToolbar.append(localTransport);
  outputBank.prepend(resultsToolbar);
  const viewTools=make("div","mix-view-tools"), sortLabel=make("label","","Trier les pistes"), sort=make("select");
  sort.id="scout-result-sort"; sortLabel.htmlFor=sort.id;
  for(const [value,label] of MUSIC_SORTS) sort.append(Object.assign(make("option","",label),{value}));
  sort.onchange=()=>{onParameter("view.sort",sort.value); localMessage=""; update();}; sortLabel.append(sort);
  const reshuffle=make("button","mix-reshuffle","Remélanger"); reshuffle.type="button";
  reshuffle.onclick=()=>{onParameter("view.shuffle",`${Date.now()}:${Math.random()}`);localMessage="Nouvel ordre aléatoire des pistes chargées. Les pages précédentes restent conservées.";update();};
  function viewToggle(id,text,parameter){ const label=make("label","mix-view-toggle"), input=make("input"); input.type="checkbox"; input.id=id; input.onchange=()=>{onParameter(parameter,input.checked); localMessage=""; update();}; label.append(input,doc.createTextNode(text)); viewTools.append(label); return input; }
  viewTools.append(sortLabel,reshuffle);
  const otherArtists=viewToggle("scout-other-artists","Autres artistes uniquement","scope.otherArtists");
  const unknownArtists=viewToggle("scout-unknown-artists","Inclure les artistes inconnus — à vérifier","scope.unknownArtists");
  const collaborations=viewToggle("scout-artist-collaborations","Inclure les collaborations avec d’autres participants","scope.collaborations");
  const distant=viewToggle("scout-distant-relations","Inclure les liens éloignés","scope.distant");
  const editorial=viewToggle("scout-editorial","Inclure les entretiens / documentaires probables","scope.editorial");
  const promotional=viewToggle("scout-promotional","Inclure les annonces / extraits promotionnels probables","scope.promotional");
  const viewHelp=make("p","mix-view-help"); viewHelp.id="scout-view-help";
  sort.setAttribute("aria-describedby",viewHelp.id); otherArtists.setAttribute("aria-describedby",viewHelp.id); distant.setAttribute("aria-describedby",viewHelp.id);
  unknownArtists.setAttribute("aria-describedby",viewHelp.id); collaborations.setAttribute("aria-describedby",viewHelp.id);
  resultsToolbar.after(viewTools,viewHelp);
  const dig=actionButton("dig","Rechercher des pistes",onDig,expandTransport), stop=actionButton("stop","Arrêter la recherche",onStop,expandTransport);
  expandTransport.append(digPlan,armedDepth);
  const reset=actionButton("reset","Activer toutes les directions",onReset,resetTransport);
  actions.append(expandTransport); routeBank.append(resetTransport);
  const tuning=make("details","mix-tuning");
  tuning.append(make("summary","","Affiner la diversité et la profondeur"),shapeBank);
  const nextStep=make("div","departure-next-step");
  settings.append(routeBank,tuning);
  host.append(heading,help,nextStep,actions,settings,status,outputBank);

  let sourceInspector=doc.querySelector("#scout-source-inspector"), sourceSummary=sourceInspector?.querySelector(".mix-source-summary");
  if(!sourceInspector){
    const activeSeed=doc.querySelector("#active-seed"), sessionActions=doc.querySelector(".workspace-session-actions"), seedAction=doc.querySelector("#seed-action"), lineage=doc.querySelector("#exploration-lineage");
    sourceInspector=make("details","mix-source-inspector"); sourceInspector.id="scout-source-inspector"; sourceSummary=make("summary","mix-source-summary","SOURCE & PREUVES");
    if(activeSeed?.parentElement===parent) parent.insertBefore(sourceInspector,activeSeed); else parent.append(sourceInspector);
    sourceInspector.append(sourceSummary); for(const node of [activeSeed,sessionActions,lineage]) if(node) sourceInspector.append(node);
    if (seedAction) nextStep.append(seedAction);
  }

  if(sourceInspector?.parentElement===parent) parent.insertBefore(host,sourceInspector); else parent.append(host);
  function update(){
    if(stopped)return;
    const initial=read();
    if(renderedSeedId!==initial.seedId || initial.workflow==="identify"){ localMessage=""; directionFilter=""; settings.open=false; }
    const validFilter=reconcileDirectionFilter(directionFilter,initial.routes);
    if(validFilter!==directionFilter){ directionFilter=validFilter; localMessage="La direction affichée a été désactivée : retour à toutes les directions actives. Ses pistes sont conservées."; }
    const view=directionFilter ? read({directionFilter}) : initial, active=Boolean(view.seedId);
    const participantRoute=view.routes.find(r=>r.id==='participants');
    let participantOption=[...filter.options].find(o=>o.value==='participants');
    if(participantRoute && !participantOption){ participantOption=Object.assign(make('option','',ROUTE_NAMES.participants),{value:'participants'});filter.append(participantOption); }
    if(!participantRoute) participantOption?.remove();
    renderedSeedId=view.seedId; host.hidden=!active;
    if(sourceInspector) sourceInspector.hidden=!active;
    departure.textContent=view.seedLabel||"";
    const identityBlocked=view.workflow==="identify", identifying=view.guidance?.state==="loading" && !view.items.length;
    host.dataset.workflow=view.workflow || "search";
    settings.hidden=identityBlocked || identifying;
    routeBank.hidden=identityBlocked || identifying;
    tuning.hidden=identityBlocked || identifying;
    outputBank.hidden=identityBlocked || identifying;
    actions.hidden=identityBlocked || identifying;
    status.hidden=identityBlocked || identifying;
    title.textContent=identityBlocked?"Confirmer le point de départ":identifying?"Vérification du morceau…":"Vos découvertes";
    const sourceNeedsAction=Boolean(active && doc.querySelector("#seed-action") && !doc.querySelector("#seed-action").hidden);
    if(sourceSummary){ sourceSummary.textContent="Fiche du départ et historique"; sourceInspector.dataset.attention=String(sourceNeedsAction); }
    const previous=view.previousDeparture;
    backDeparture.hidden=!previous; backDeparture.disabled=!previous;
    backDeparture.textContent=previous?`← ${previous.label}`:"";
    backDeparture.title=previous?`Revenir à ${previous.label}`:"";
    const trail=(view.journeyTrail||[]).map(item=>item.label).filter(Boolean);
    journeyTrail.hidden=trail.length<2;
    journeyTrail.textContent=trail.length>1?`PARCOURS · ${trail.join(" → ")}`:"";
    departureMode.textContent=view.seedContext||""; departureMode.hidden=!departureMode.textContent;
    for(const route of view.routes){
      const reasons = { request_budget: "Lecture à poursuivre · limite par recherche", processing_budget: "Lecture à poursuivre · pages en cache", needs_identity: "Départ à identifier", needs_confirmation: "Fiche artiste à confirmer", source_not_configured: "Source non configurée", source_unavailable: "Source indisponible · réessayer", documented_frontier_exhausted: "Liens documentés parcourus" };
      const k=knobs.get(route.id), stateLabel=route.state === "partial" && reasons[route.stopReason] || STATE_TEXT[route.state]||route.state;
      if(!k) continue;
      const blocked=["n/a","unsupported"].includes(route.state);
      k.box.dataset.state=route.state; k.box.dataset.enabled=String(route.enabled);
      k.input.disabled=!active || blocked; k.svg.setAttribute("aria-disabled",String(!active || blocked)); k.set(route.weight);
      k.toggle.disabled=!active || blocked; k.toggle.setAttribute("aria-pressed",String(route.enabled));
      k.toggle.textContent=route.state==='confirmation' && route.weight>0?"En attente":route.enabled?"Activée":"Activer";
      k.stateLabel.textContent=route.loading ? STATE_TEXT.loading : stateLabel;
      k.meter.textContent=route.loaded ? `${route.loaded} chargées · ${!route.enabled ? "exclues du mélange" : directionFilter && directionFilter!==route.id ? "masquées par le filtre" : `${route.eligible} encore à parcourir`}` : "";
      if (route.loaded && route.enabled && (!directionFilter || directionFilter===route.id) && route.artistHidden) k.meter.textContent+=` · ${route.artistHidden} chargée${route.artistHidden>1?"s":""} masquée${route.artistHidden>1?"s":""} par le filtre d’artistes`;
      k.meter.hidden=!route.loaded;
      k.info.textContent=route.message || (blocked ? route.plan?.reason || stateLabel : route.hasMore ? "D’autres pages restent à consulter." : route.loaded ? "Les preuves sont accessibles dans chaque piste." : "Aucun résultat chargé. Cela ne signifie pas qu’aucun lien existe.");
      const selectionText=selectionSummary(route.selection);
      if(selectionText) k.info.textContent+=` ${selectionText}`;
      const frontierInfo = route.frontierTargets
        ? ` Frontière: ${route.frontierTargets} cibles, ${route.frontierBranches} premières branches, profondeur observée ${route.frontierMaxDepth}.`
        : "";
      k.state.title=`${ROUTE_HELP[route.id]||""} ${stateLabel}. ${route.loaded} chargés, ${route.eligible} éligibles, ${route.presented} sorties.${frontierInfo}${route.loadKind?` Prochain DIG: ${route.loadKind}.`:""}`;
    }
    const targetDepth=Number(view.patch?.shape?.depth||6);
    const observedDepth=Math.max(0,Number(view.discovery?.maxObservedDepth||0));
    for(const [d,b] of depthButtons)b.setAttribute("aria-pressed",String(d===targetDepth));
    depthState.textContent=`Cible · ${targetDepth} relations · atteinte observée ${observedDepth}`;
    armedDepth.textContent=`NEXT DIG · CIBLE ${targetDepth}${observedDepth<targetDepth?" · FRONTIÈRE OUVERTE":" · PORTÉE ATTEINTE"}`;
    expandTransport.dataset.armed=String(observedDepth<targetDepth);
    spreadControl.input.disabled=!active; spreadControl.svg.setAttribute("aria-disabled",String(!active)); spreadControl.set(Number(view.patch?.shape?.spread??1));
    const loadableRoutes=view.routes.filter(r=>r.canLoad), opens=loadableRoutes.filter(r=>r.loadKind==="open").length, continues=loadableRoutes.filter(r=>r.loadKind==="continue").length, retries=loadableRoutes.filter(r=>r.loadKind==="retry").length;
    const digParts=[]; if(opens)digParts.push(`${opens} à ouvrir`); if(continues)digParts.push(`${continues} à poursuivre`); if(retries)digParts.push(`${retries} à réessayer`); const loadable=loadableRoutes.length;
    const selected=view.routes.filter(r=>r.enabled), selectedNames=selected.map(r=>ROUTE_NAMES[r.id]).join(", ");
    const catalogueSelected=selected.filter(r=>r.id!=='participants');
    const identityWaiting=view.routes.filter(r=>r.weight>0 && r.state==='confirmation').length;
    settingsTitle.textContent=`Directions et réglages · ${catalogueSelected.length} activée${catalogueSelected.length>1?"s":""}`;
    settingsScope.textContent=catalogueSelected.map(r=>ROUTE_NAMES[r.id]).join(', ') || "Aucune direction : ouvrez pour en choisir une";
    dig.textContent=view.busy?"Recherche en cours…":!loadable && identityWaiting?"Fiche artiste nécessaire":!selected.length?"Choisissez une direction":!loadable?"Sources consultées":`Chercher dans ${loadable} direction${loadable>1?"s":""}`;
    dig.title=`Consulter les sources : ${selectedNames || "aucune direction activée"}`;
    digPlan.textContent=`${catalogueSelected.length} activée${catalogueSelected.length>1?"s":""} · ${loadable} à consulter${digParts.length ? ` (${digParts.join(" · ")})` : ""}. Les autres données restent chargées.${participantRoute ? ' Les recherches par nom sont incluses dans la même liste, selon les filtres.' : ''}`;
    dig.disabled=!active||!loadable||view.busy;
    if(identityWaiting) digPlan.textContent+=` ${identityWaiting} direction(s) en attente d’une fiche artiste, non consultée(s).`;
    next.disabled=!active||!view.hasNextPage;
    stop.hidden=!view.busy; reset.disabled=!active||selected.length===view.routes.filter(r=>!["n/a","unsupported"].includes(r.state)).length;
    localTransport.hidden=!view.items.length && !view.canRewind; rewind.hidden=!view.canRewind;
    filter.value=directionFilter;
    sort.value=view.patch.sort; otherArtists.checked=view.patch.otherArtistsOnly; distant.checked=view.patch.includeDistant;
    unknownArtists.checked=view.patch.includeUnknownArtists; collaborations.checked=view.patch.includeCollaborations;
    unknownArtists.parentElement.hidden=collaborations.parentElement.hidden=!view.artistFilterApplied;
    editorial.checked=view.patch.includeEditorial; promotional.checked=view.patch.includePromotional;
    otherArtists.disabled=false;
    reshuffle.hidden=view.patch.sort!=="random";
    const omissions=selected.reduce((sum,r)=>sum+r.artistHidden,0), far=selected.reduce((sum,r)=>sum+r.distantHidden,0);
    viewHelp.textContent=[
      "Tri sur les pistes chargées restant à parcourir ; aucun appel aux catalogues.",
      view.patch.shape?.spread > 0 ? "En sélection équilibrée, une page peut être plus courte : au plus deux pistes par artiste ou partenaire, une par album et session repérée. Diversité à zéro ou une direction ciblée permet de tout parcourir." : "",
      view.diversityLimited ? "Choix chargé peu varié : page volontairement réduite. Chargez d’autres directions ou poursuivez les catalogues pour élargir le choix." : "",
      selected.some(r=>r.contentHidden) ? `${selected.reduce((sum,r)=>sum+(r.contentHidden||0),0)} observations de contenus éditoriaux ou promotionnels masquées selon les marqueurs du titre. Ces indications restent à vérifier ; les filtres ci-dessus permettent de les revoir.` : "",
      view.patch.sort.startsWith("release-") ? "Date de sortie musicale connue, jamais l’upload YouTube. Dates inconnues en fin de liste." : view.patch.sort==="relation" ? "Pertinence du lien : crédits et projets, compilations, labels, contexte, chaînes, puis grands catalogues. À niveau égal : chemin le plus court. La diversité évite de remplir la page d’un seul album. Ce n’est pas une similarité sonore." : view.patch.sort==="random" ? "Ordre aléatoire stable : Remélanger change l’ordre, sans effacer les pages déjà parcourues." : "",
      !view.canFilterArtists ? (view.patch.otherArtistsOnly ? "Filtre autres artistes en attente : ce départ n’a pas d’artiste de référence. Aucune piste n’est masquée par ce filtre ; vous pouvez le décocher." : "Autres artistes : applicable depuis un morceau ou un artiste identifié, pas depuis un label ou une playlist entière.") : view.patch.otherArtistsOnly ? `Filtre d’artistes : ${omissions} observations de routes masquées. ${view.patch.includeUnknownArtists ? "Artistes inconnus inclus à vérifier, sans identité confirmée." : "Artistes inconnus masqués ; cochez leur option pour les revoir."} ${view.patch.includeCollaborations ? "Collaborations incluant un participant extérieur au départ incluses." : "Collaborations avec un artiste du départ masquées ; cochez leur option pour les revoir."} Un participant extérieur n’est pas nécessairement une découverte nouvelle pour vous.` : "",
      far ? `${far} observations de liens éloignés masquées : label avec au moins 500 sorties, sans autre crédit reliant la piste au départ.` : ""
    ].filter(Boolean).join(" ");
    for(const option of [...filter.options].slice(1)){
      const route=view.routes.find(r=>r.id===option.value);
      option.textContent=`${ROUTE_NAMES[route.id]} · ${route.enabled ? `${route.eligible} à parcourir` : "désactivée"}`;
      if (route.enabled && route.artistHidden) option.textContent+=` · ${route.artistHidden} chargée${route.artistHidden>1?"s":""} masquée${route.artistHidden>1?"s":""} (artistes)`;
      option.disabled=!route.enabled;
    }
    const waiting=selected.filter(r=>["pending","mediated","aggregate"].includes(r.state));
    const issues=selected.filter(r=>["error","unavailable","confirmation","partial"].includes(r.state));
    status.textContent=localMessage || view.searchProgress || (view.busy
      ? `Recherche : ${selectedNames}. Vous pouvez parcourir les pistes déjà chargées.`
      : issues.length ? `${issues.length} direction(s) avec une recherche incomplète ou une source indisponible. Détails dans « Directions et réglages ».`
        : waiting.length ? `${waiting.length} direction(s) activée(s) pas encore consultée(s). Lancez la recherche pour les charger.` : "");
    status.hidden=identityBlocked || identifying || !status.textContent;
    resultCount.textContent=`${view.items.length} piste${view.items.length>1?"s":""} affichée${view.items.length>1?"s":""} · ${Math.max(0,view.candidates-view.items.length)} autre${view.candidates-view.items.length>1?"s":""} à parcourir`;
    if (view.hiddenCandidates) resultCount.textContent+=` · ${view.hiddenCandidates} piste${view.hiddenCandidates>1?"s":""} masquée${view.hiddenCandidates>1?"s":""} par les filtres${view.hiddenUnknownCandidates ? ` (dont ${view.hiddenUnknownCandidates} aux artistes inconnus)` : ""}`;
    clearFilter.hidden=!directionFilter;
    filterScope.hidden=!directionFilter;
    const hiddenRoutes=selected.filter(r=>r.id!==directionFilter && r.eligible);
    filterScope.textContent=directionFilter ? `Filtre d’affichage uniquement.${hiddenRoutes.length ? ` Autres pistes disponibles : ${hiddenRoutes.map(r=>`${ROUTE_NAMES[r.id]} (${r.eligible})`).join(", ")}.` : ""}` : "";
    // Keep a stable card (and keyboard focus / expanded proof) while a source
    // updates an unrelated route. Replace only cards whose rendered data change.
    const previousCards=new Map([...grid.children].filter(n=>n.dataset.itemId).map(n=>[n.dataset.itemId,n]));
    const nextCards=[];
    const collisions=outputCollisions(view.items);
    for(const item of view.items){ const route=item.routing.selectedVia, obs=item.routing.observations, original=obs.find(o=>o.direction===route)?.item; if(!original)continue; const card=renderCard(original,route); card.classList.add("mix-output-card"); const names=obs.map(o=>SCOUT_DIRECTIONS.find(v=>v.id===o.direction)?.label||o.direction); card.prepend(make("p","mix-origin",`Via ${obs.map(o=>ROUTE_NAMES[o.direction] || o.direction).join(" + ")}`));
      if(view.artistFilterApplied && item.artistRelation==="unknown" && !original.participantNameSearch) card.prepend(make("p","mix-artist-status","Artistes inconnus — à vérifier. Cette piste n’est pas confirmée comme venant d’un autre artiste."));
      if(view.artistFilterApplied && item.artistRelation==="collaboration") card.prepend(make("p","mix-artist-status","Collaboration : artiste du départ et autre participant."));
      const collision=collisions.get(collisionKey(item)); if(collision){ const ids=[...new Set(collision.map(value=>value.id))], videoIds=[...new Set(collision.map(value=>value.listen?.videoId).filter(Boolean))], sameVideo=videoIds.length===1&&collision.every(value=>value.listen?.videoId); const badge=make("span","mix-output-collision",sameVideo?"MÊME VIDÉO · CANDIDATS DISTINCTS":"CANDIDATS DISTINCTS"); badge.title=ids.join("\n"); card.querySelector(".derived-copy")?.prepend(badge); }
      if(obs.length>1){ const det=make("details","mix-proof"); det.append(make("summary","","Chemins et sources")); for(const o of obs){ det.append(make("p","",`${ROUTE_NAMES[o.direction] || o.direction} : ${routeExplanation(o.item, o.direction, view.seedLabel)}`)); } card.append(det); }
      if(item.presentation?.variants?.length>1){
        const variants=make("details","mix-proof");
        variants.append(make("summary","",item.presentation.basis === "same_reference" ? "Même enregistrement · sources et écoutes" : "Versions possiblement identiques · comparer les sources"));
        variants.append(make("p","","Regroupement d’affichage uniquement. Les fiches sources restent distinctes."));
        for(const variant of item.presentation.variants){ const option=renderCard(variant,variant.direction || route); variants.append(option); }
        card.append(variants);
      }
      const signature=card.outerHTML, previousCard=previousCards.get(item.id);
      if(previousCard?._scoutSignature===signature){ nextCards.push(previousCard); }
      else { card.dataset.itemId=item.id; card._scoutSignature=signature; if(previousCard) [...card.querySelectorAll("details")].forEach((d,i)=>{d.open=Boolean(previousCard.querySelectorAll("details")[i]?.open);}); nextCards.push(card); }
    }
    for(const node of [...grid.children]) if(!nextCards.includes(node)) node.remove();
    nextCards.forEach((node,i)=>{if(grid.children[i]!==node)grid.insertBefore(node,grid.children[i]||null);});
    if(!view.items.length){
      grid.append(make("p","mix-empty",emptyMixMessage(view)));
      if(view.hiddenUnknownCandidates){ const show=make("button","mix-empty-action","Afficher les artistes inconnus — à vérifier"); show.type="button"; show.onclick=()=>{onParameter("scope.unknownArtists",true);update();}; grid.append(show); }
      if(loadable && !view.hiddenCandidates){ const retry=make("button","mix-empty-action",issues.length?"Reprendre la recherche":"Rechercher des pistes"); retry.type="button"; retry.disabled=view.busy; retry.onclick=()=>invoke(onDig); grid.append(retry); }
      if(!selected.length){ const choose=make("button","mix-empty-action","Choisir les directions"); choose.type="button"; choose.onclick=()=>{settings.open=true; settingsSummary.focus();}; grid.append(choose); }
    }
  }
  update(); return {update,destroy(){stopped=true;if(frame)doc.defaultView.cancelAnimationFrame(frame);host.remove();}};
}
