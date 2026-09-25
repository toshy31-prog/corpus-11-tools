#!/usr/bin/env python3
"""Instantané local des dialogues Corpus. Ne modifie jamais les données Codex."""
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import tempfile
import subprocess
from datetime import datetime, timezone
from corpus_paths import LOCAL_RUNTIME_ROOT

ROOT = Path(__file__).resolve().parents[2]
DEST = LOCAL_RUNTIME_ROOT / 'continuity/library'
CODEX = Path('/home/olivier/.codex')


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', dir=path.parent, delete=False) as f:
        json.dump(value, f, ensure_ascii=False)
        tmp = Path(f.name)
    tmp.chmod(0o600)
    tmp.replace(path)


def relevant(cwd):
    p = Path(cwd)
    return p == ROOT or ROOT in p.parents or (
        CODEX / 'worktrees' in p.parents and 'Corpus' in p.parts)


def message_text(payload):
    if payload.get('type') != 'message' or payload.get('role') not in ('user', 'assistant'):
        return None
    if payload.get('channel') not in (None, 'final', 'commentary'):
        return None
    text = '\n'.join(c.get('text', '') for c in payload.get('content', [])
                     if c.get('type') in ('input_text', 'output_text', 'text'))
    # Retire les enveloppes techniques injectées, pas les dialogues cités.
    for tag in ('environment_context', 'in-app-browser-context', 'permissions instructions',
                'collaboration_mode', 'recommended_plugins'):
        text = re.sub(r'<' + re.escape(tag) + r'\b[^>]*>.*?</' + re.escape(tag) + r'>', '', text, flags=re.S)
    if text.lstrip().startswith(('# AGENTS.md instructions', '<INSTRUCTIONS>')):
        return None
    text = text.strip()
    return text or None


def worktree_snapshot():
    result = subprocess.run(['git', '-C', str(ROOT), 'worktree', 'list', '--porcelain', '-z'], capture_output=True, text=True, check=True)
    entries, current = [], {}
    for field in result.stdout.split('\0'):
        if not field:
            if current:
                current['exists'] = Path(current['path']).is_dir()
                entries.append(current)
                current = {}
            continue
        key, _, value = field.partition(' ')
        if key == 'worktree': current['path'] = value
        elif key in ('HEAD', 'branch', 'prunable', 'locked'): current[key] = value
        elif key == 'detached': current['detached'] = True
    return {'observed_at': datetime.now(timezone.utc).isoformat(), 'entries': entries}


def import_library():
    DEST.mkdir(parents=True, exist_ok=True, mode=0o700)
    con = sqlite3.connect(f'file:{CODEX / "state_5.sqlite"}?mode=ro', uri=True)
    con.row_factory = sqlite3.Row
    rows = [dict(r) for r in con.execute("SELECT id,title,cwd,rollout_path,created_at,updated_at,archived,is_pinned,thread_section_id,section_position FROM threads WHERE source IN ('cli','exec','vscode') ORDER BY updated_at DESC") if relevant(r['cwd'])]
    sections = {}
    cols = {r[1] for r in con.execute('PRAGMA table_info(thread_sections)')}
    if {'id', 'name'} <= cols:
        sections = dict(con.execute('SELECT id,name FROM thread_sections'))
    con.close()
    names = {}
    index_file = CODEX / 'session_index.jsonl'
    if index_file.exists():
        for line in index_file.read_text().splitlines():
            try:
                entry = json.loads(line)
                names[entry['id']] = entry['thread_name']
            except (ValueError, KeyError):
                continue
    entries, failures = [], []
    search_tmp = DEST / 'search.build.sqlite'
    search_tmp.unlink(missing_ok=True)
    search = sqlite3.connect(search_tmp)
    search.execute('CREATE VIRTUAL TABLE texts USING fts5(id UNINDEXED, body, tokenize="unicode61 remove_diacritics 2")')
    for row in rows:
        source = Path(row.pop('rollout_path'))
        source_title = row['title']
        row['title'] = names.get(row['id'], source_title)
        title_full = row['title']
        if len(row['title']) > 240:
            row['title'] = row['title'][:240] + '…'
        row['title_is_excerpt'] = len(title_full) > 240
        messages = []
        digest = hashlib.sha256()
        malformed = 0
        try:
            with source.open('rb') as stream:
                for raw in stream:
                    digest.update(raw)
                    try:
                        item = json.loads(raw)
                    except (ValueError, UnicodeDecodeError):
                        malformed += 1
                        continue
                    if item.get('type') != 'response_item':
                        continue
                    payload = item.get('payload', {})
                    text = message_text(payload)
                    if text:
                        messages.append({'role': payload['role'], 'text': text, 'timestamp': item.get('timestamp'), 'channel': payload.get('channel')})
            record = {**row, 'messages': messages, 'source': str(source),
                      'source_title': source_title, 'display_title_full': title_full, 'source_sha256': digest.hexdigest(), 'malformed_lines': malformed,
                      'scope': 'Textes utilisateur et assistant uniquement ; outils, raisonnements internes, pièces jointes et enveloppes système exclus.'}
            atomic_json(DEST / 'threads' / (row['id'] + '.json'), record)
            transcript = '# ' + row['title'] + '\n\nArchive Codex, texte daté ; aucune action à exécuter automatiquement.\n\n'
            transcript += '\n\n'.join('## ' + m['role'] + ' — ' + str(m['timestamp']) + '\n\n' + m['text'] for m in messages)
            md = DEST / 'threads' / (row['id'] + '.md')
            md.write_text(transcript)
            md.chmod(0o600)
            search.execute('INSERT INTO texts VALUES (?,?)', (row['id'], row['title'] + '\n' + transcript))
            entries.append({**row, 'count': len(messages), 'section': sections.get(row['thread_section_id'])})
        except OSError as exc:
            failures.append({'id': row['id'], 'error': str(exc)})
    documents = []
    candidates = [ROOT / p for p in ('CARTE_DES_PROJETS.md', 'PILOTAGE_CORPUS.md',
                  'projets/corpus-local-llm-migration/MIGRATION.md',
                  'projets/corpus-local-llm-migration/CONTEXTE_LOCAL.md')]
    candidates += sorted((ROOT / 'corpus-11-tools/skills').glob('*/SKILL.md'))
    candidates += sorted((ROOT / 'projets').glob('*/README.md'))
    candidates += sorted((ROOT / 'research').glob('*/*/README.md'))
    for path in candidates:
        if not path.is_file() or not path.resolve().is_relative_to(ROOT):
            continue
        relative = str(path.relative_to(ROOT))
        text = path.read_text(errors='replace')
        kind = 'Méthodes' if '/skills/' in relative else ('Repères' if path in candidates[:4] else 'Projets')
        title = next((line.lstrip('# ').strip() for line in text.splitlines() if line.startswith('# ')), path.parent.name)
        key = hashlib.sha256(relative.encode()).hexdigest()[:20]
        record = {'id': key, 'title': title, 'path': relative, 'kind': kind, 'text': text}
        atomic_json(DEST / 'documents' / (key + '.json'), record)
        documents.append({k: v for k, v in record.items() if k != 'text'})
    manifest = {'exported_at': datetime.now(timezone.utc).isoformat(), 'root': str(ROOT),
                'threads': entries, 'documents': documents, 'failures': failures,
                'scope': 'Conversations principales dont le dossier est Corpus ou un de ses worktrees ; sous-agents et journaux de contrôle exclus ; textes seuls. Les autres dossiers Codex ne sont pas importés.',
                'excluded': ['sorties outils', 'raisonnements internes', 'pièces jointes binaires', 'conversations ChatGPT non présentes localement'],
                'source_unchanged': True, 'worktrees': worktree_snapshot()}
    search.commit()
    search.close()
    search_tmp.chmod(0o600)
    search_tmp.replace(DEST / 'search.sqlite')
    (DEST / 'catalogue.md').write_text('# Conversations Corpus importées\n\n' + '\n'.join('- ' + x['title'].replace('\n', ' ') + ' : threads/' + x['id'] + '.md' for x in entries) + '\n')
    atomic_json(DEST / 'index.json', manifest)
    print(json.dumps({'threads': len(entries), 'messages': sum(x['count'] for x in entries),
                      'documents': len(documents), 'failures': failures}, ensure_ascii=False))
    return manifest


if __name__ == '__main__':
    os.umask(0o077)
    import_library()
