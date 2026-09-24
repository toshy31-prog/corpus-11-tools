// Native OpenCode sessions remain the source of truth, including after restart.
// Keep a single default export: the legacy plugin loader invokes every export.
export default async function planGuard({client} = {}) {
  if (!client?.session?.get || !client.session.messages || !client.session.update) {
    throw new Error('Garde Corpus : API de sessions indisponible.');
  }
  const WORKER = 'corpus-worker';
  const MAX_TASKS = 3;
  const denyTask = {permission:'task',pattern:'*',action:'deny'};
  const isPlan = agent => agent === 'corpus-plan' || agent === 'plan';
  const ruleValid = rule => rule && typeof rule.permission === 'string' &&
    typeof rule.pattern === 'string' && ['allow','ask','deny'].includes(rule.action);
  const response = result => {
    if (result?.error || result?.data === undefined) throw new Error('Garde Corpus : lecture des sessions impossible.');
    return result.data;
  };
  async function session(id) {
    const value = response(await client.session.get({path:{id},throwOnError:true}));
    if (value?.id !== id || typeof value.directory !== 'string' || typeof value.projectID !== 'string') {
      throw new Error('Garde Corpus : session invalide.');
    }
    return value;
  }
  async function messages(id) {
    // Twelve parent steps fit in this bounded window. If the turn is outside it,
    // fail closed instead of resetting its budget or scanning unbounded history.
    const value = response(await client.session.messages({path:{id},query:{limit:100},throwOnError:true}));
    if (!Array.isArray(value)) throw new Error('Garde Corpus : historique invalide.');
    return value;
  }
  function active(part) {
    return part?.type === 'tool' && ['running','pending'].includes(part.state?.status);
  }
  function callContext(rows, callID) {
    for (const row of rows) {
      const part = row.parts?.find(p => p.type === 'tool' && (p.callID === callID || p.id === callID));
      if (!part) continue;
      if (row.info?.role !== 'assistant' || row.info.time?.completed || row.info.error || !active(part)) {
        throw new Error('Garde Corpus : appel terminé ou interrompu.');
      }
      return {row,part};
    }
    throw new Error('Garde Corpus : appel introuvable dans l’historique récent.');
  }
  function validateFamily(child, parent) {
    if (child.parentID !== parent.id || child.agent !== WORKER || parent.parentID ||
        child.directory !== parent.directory || child.projectID !== parent.projectID) {
      throw new Error('Garde Corpus : sous-agent étranger au parent, au projet ou au rôle autorisé.');
    }
  }
  function rejectBusyResume(rows, childID, currentPart) {
    const occupied = rows.flatMap(row => row.parts || []).some(part =>
      part.id !== currentPart.id && part.tool === 'task' && active(part) &&
      (part.state?.metadata?.sessionId === childID ||
        part.state?.input?.task_id === childID && part.id < currentPart.id));
    if (occupied) throw new Error('Garde Corpus : ce sous-agent est déjà actif dans une autre délégation.');
  }
  async function workerContext(child) {
    if (!child.parentID || child.agent !== WORKER) throw new Error('Garde Corpus : sous-agent sans parent autorisé.');
    const parent = await session(child.parentID);
    validateFamily(child,parent);
    const rows = await messages(parent.id);
    const owner = rows.flatMap(row => (row.parts || []).map(part => ({row,part})))
      .find(({row,part}) => row.info?.role === 'assistant' && !row.info.time?.completed && !row.info.error &&
        row.info.agent === 'corpus' && part.tool === 'task' && active(part) &&
        part.state?.input?.subagent_type === WORKER && part.state?.metadata?.sessionId === child.id);
    if (!owner) throw new Error('Garde Corpus : délégation parente absente ou interrompue.');
    return {parent,owner};
  }
  async function inheritPermissions(child) {
    const {parent} = await workerContext(child);
    const permission = parent.permission ?? [];
    if (!Array.isArray(permission) || !permission.every(ruleValid)) throw new Error('Garde Corpus : permissions parentes invalides.');
    // OpenCode's task tool copies denies but drops ask/allow exceptions. Append
    // the COMPLETE ordered parent rules, then prohibit recursion unconditionally.
    const inherited = [...permission.map(rule => ({...rule})),{...denyTask}];
    const tail = (child.permission || []).slice(-inherited.length);
    if (JSON.stringify(tail) !== JSON.stringify(inherited)) {
      response(await client.session.update({path:{id:child.id},body:{permission:inherited},throwOnError:true}));
    }
  }
  async function validateTask(parent, context, rows, args) {
    const {row,part} = context;
    if (parent.parentID || row.info.agent !== 'corpus') throw new Error('Garde Corpus : seule la conversation Corpus principale peut déléguer.');
    if (!args || args.subagent_type !== WORKER || args.background === true) throw new Error('Garde Corpus : seul corpus-worker au premier plan est autorisé.');
    if (typeof args.prompt !== 'string' || !args.prompt.trim() || args.prompt.length > 12000 ||
        typeof args.description !== 'string' || !args.description.trim() || args.description.length > 200) {
      throw new Error('Garde Corpus : mission courte et description requises.');
    }
    // Mirrors ConfigMarkdown.FILE_REGEX. Native @ expansion reads attachments
    // before chat.message and before permission checks: never enter that path.
    if (/(?<![\w`])@(\.?[^\s`,.]*(?:\.[^\s`,.]+)*)/g.test(args.prompt)) {
      throw new Error('Garde Corpus : pas de mention @fichier ou @agent ; fournir un chemin en texte simple, puis utiliser les outils contrôlés.');
    }
    const user = rows.find(message => message.info?.id === row.info.parentID && message.info.role === 'user');
    if (!user || isPlan(user.info.agent)) throw new Error('Garde Corpus : tour parent absent ou en mode Plan.');
    const tasks = rows.filter(message => message.info?.role === 'assistant' && message.info.parentID === user.info.id)
      .sort((a,b) => a.info.id.localeCompare(b.info.id))
      .flatMap(message => (message.parts || []).filter(item => item.type === 'tool' && item.tool === 'task')
        .sort((a,b) => a.id.localeCompare(b.id)));
    const index = tasks.findIndex(item => item.id === part.id);
    if (index < 0 || index >= MAX_TASKS) throw new Error('Garde Corpus : trois délégations maximum par tour utilisateur, reprises et essais inclus.');
    if (part.state?.metadata?.sessionId) throw new Error('Garde Corpus : cet appel a déjà lancé son sous-agent.');
    if (args.task_id !== undefined) {
      if (typeof args.task_id !== 'string' || !/^ses_[A-Za-z0-9]+$/.test(args.task_id)) throw new Error('Garde Corpus : identifiant de reprise invalide.');
      validateFamily(await session(args.task_id),parent);
      rejectBusyResume(rows,args.task_id,part);
    }
    // Recheck after awaited reads (notably task_id) so a recorded cancellation
    // during validation cannot launch a late child. Native abort handles children.
    const latest = await messages(parent.id);
    callContext(latest,part.callID || part.id);
    if (args.task_id) rejectBusyResume(latest,args.task_id,part);
    args.background = false;
  }
  return {
    config: async config => {
      if (!config.agent?.corpus || !config.agent?.[WORKER]) throw new Error('Garde Corpus : profils requis absents.');
      config.subagent_depth = 1;
      config.agent.corpus.permission = {...config.agent.corpus.permission,task:{'*':'deny',[WORKER]:'allow'}};
      config.agent[WORKER].permission = {...config.agent[WORKER].permission,task:'deny'};
      // A session-level task allow can override the primary agent's deny. Keep
      // the target itself absent until this guard has actually loaded.
      config.agent[WORKER].disable = false;
    },
    'chat.message': async ({sessionID,agent}) => {
      const current = await session(sessionID);
      if (current.parentID || agent === WORKER || current.agent === WORKER) {
        if (agent && agent !== WORKER) throw new Error('Garde Corpus : changement de rôle du sous-agent interdit.');
        await inheritPermissions(current);
      }
    },
    'tool.execute.before': async ({sessionID,tool,callID},output) => {
      const current = await session(sessionID);
      const rows = await messages(sessionID);
      const context = callContext(rows,callID);
      if (isPlan(context.row.info.agent)) throw new Error('Mode Plan : exécution des outils interdite.');
      if (current.parentID || current.agent === WORKER) {
        if (tool === 'task' || context.row.info.agent !== WORKER) throw new Error('Garde Corpus : sous-délégation ou changement de rôle interdit.');
        await workerContext(current);
      }
      if (tool === 'task') await validateTask(current,context,rows,output?.args);
    },
  };
}
