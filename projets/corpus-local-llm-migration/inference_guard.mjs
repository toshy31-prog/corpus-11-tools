// Check persisted step evidence before contacting the local provider. No model
// calls, transcript rewriting, event races, or process-lifetime retry counters.
// Single export required by the legacy OpenCode plugin loader.
export default async function inferenceGuard({client} = {}) {
  if (!client?.session?.messages) throw new Error('Corpus : garde des étapes indisponible.');
  const stop = reason => {
    // Keep this message free of retryable provider/network error patterns.
    throw new Error('CORPUS_STEP_STOP : '+reason+' Reprise automatique bloquée ; examine le fil puis envoie une nouvelle consigne.');
  };
  return {
    'chat.params': async input => {
      if (input.model?.providerID !== 'corpus-local' ||
          !['corpus','corpus-worker','corpus-plan'].includes(input.agent)) return;
      let result;
      try {
        result = await client.session.messages({path:{id:input.sessionID},query:{limit:100},throwOnError:true});
      } catch {
        stop('Historique des étapes inaccessible.');
      }
      const rows = result?.data;
      if (result?.error || !Array.isArray(rows) || !input.message?.id ||
          !rows.some(row => row.info?.id === input.message.id && row.info.role === 'user')) {
        stop('Tour courant absent de l’historique récent.');
      }
      const turn = rows.filter(row => row.info?.role === 'assistant' &&
        row.info.parentID === input.message.id && !row.info.summary);
      const active = turn.filter(row => !row.info.time?.completed);
      if (active.length !== 1 || !active[0].info.id) stop('Étape courante ambiguë.');
      for (const row of turn) {
        if (row.info.error || ['unknown','other','error'].includes(row.info.finish) ||
            (row.parts || []).some(part => part.type === 'step-finish' &&
              ['unknown','other','error'].includes(part.reason))) {
          stop('Une étape de ce tour s’est terminée anormalement.');
        }
        if (row !== active[0] && row.info.time?.completed && !row.info.finish) {
          stop('Une étape de ce tour est incomplète.');
        }
      }
      if ((active[0].parts || []).some(part =>
        ['step-start','step-finish','text','reasoning','tool'].includes(part.type))) {
        stop('Cette étape a déjà commencé ; elle ne sera pas rejouée.');
      }
    },
  };
}
