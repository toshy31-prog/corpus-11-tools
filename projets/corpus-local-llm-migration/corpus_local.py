#!/usr/bin/env python3
"""Corpus local : moteur et assistant dans un même réseau isolé, sans cloud."""
import argparse
import fcntl
import json
import os
import socket
from pathlib import Path
import subprocess
import sys
import time
import threading
import urllib.request

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
from runtime_limits import CONTEXT_TOKENS, OUTPUT_TOKENS
from corpus_paths import LLM_MODELS_ROOT, LOCAL_RUNTIME_ROOT, MODELS_ROOT, RUNTIME_ROOT, STATE_ROOT, contract_environment
BASE = LOCAL_RUNTIME_ROOT
LOG_ROOT = STATE_ROOT / 'logs/corpus-local'
QWEN36_ROOT = LLM_MODELS_ROOT / 'qwen3.6'
VISION = QWEN36_ROOT / 'mmproj-Qwen3.6-F16.gguf'
LLAMA = BASE / 'versions/llama-b10964/llama-b10964/llama-server'
LLAMA_CPU_LOCAL = BASE / 'versions/llama-b10964-cpu-local/bin/llama-server'
LLAMA_CUDA = BASE / 'versions/llama-b10964-cuda-local/bin/llama-server'
OPENCODE = BASE / 'versions/opencode-v1.18.32/opencode'
MODEL = BASE / 'downloads/Qwen3.8-27B-UD-Q5_K_M.gguf'
PORT = 18741


def receipt_path(path):
    # Receipts are logical identities, not an assertion that every artifact lives under runtime.
    for root in (MODELS_ROOT, BASE):
        try:
            return str(path.relative_to(root))
        except ValueError:
            pass
    return str(path)


def primary_context():
    text = (HERE / 'CONTEXTE_LOCAL.md').read_text()
    start = '\n## Sous-tâches déléguées\n'
    end = '\n## Génération locale d’images et de vidéos\n'
    before, start_separator, remainder = text.partition(start)
    _, end_separator, after = remainder.partition(end)
    if not start_separator or not end_separator:
        raise RuntimeError('Structure de CONTEXTE_LOCAL.md inattendue.')
    return before.rstrip() + '\n' + end + after


def environment(intel=False, moe=False):
    # Liste positive : aucune clé, proxy ou configuration de fournisseur héritée.
    env = {'PATH': '/usr/local/bin:/usr/bin:/bin', 'LANG': 'C.UTF-8',
           'TERM': os.environ.get('TERM', 'xterm-256color')}
    env.update(contract_environment())
    for key, folder in [('HOME', 'home'), ('XDG_CONFIG_HOME', 'config'),
                        ('XDG_DATA_HOME', 'data'), ('XDG_CACHE_HOME', 'cache'),
                        ('XDG_STATE_HOME', 'state')]:
        path = BASE / folder
        path.mkdir(parents=True, exist_ok=True)
        env[key] = str(path)
    for flag in ['DISABLE_MODELS_FETCH', 'DISABLE_AUTOUPDATE',
                 'DISABLE_PROJECT_CONFIG', 'DISABLE_LSP_DOWNLOAD', 'DISABLE_DEFAULT_PLUGINS']:
        env['OPENCODE_' + flag] = '1'
    env['OPENCODE_TEST_HOME'] = env['HOME']
    env['OPENCODE_AUTH_CONTENT'] = '{}'
    # OpenCode probes an optional plugin SDK at bootstrap even for plain local
    # JS hooks. Do not contact a package registry or wait through network retries.
    env['npm_config_offline'] = 'true'
    env['npm_config_fetch_retries'] = '0'
    if intel:
        env['VK_ICD_FILENAMES'] = '/usr/share/vulkan/icd.d/intel_icd.json'
    model_key = 'qwen3.6-35b-a3b-ud-q4-k-m' if moe else 'qwen3.8-27b-ud-q5-k-m'
    model_ref = 'corpus-local/' + model_key
    env['OPENCODE_CONFIG_CONTENT'] = json.dumps({
        'model': model_ref, 'small_model': model_ref,
        'enabled_providers': ['corpus-local'], 'share': 'disabled',
        'autoupdate': False, 'lsp': False, 'formatter': False,
        'default_agent': 'corpus', 'subagent_depth': 1,
        'plugin': [(HERE / 'plan_guard.mjs').as_uri()],
        'mcp': {'corpus-browser': {'type':'local','command':[sys.executable,str(HERE/'local_tools_mcp.py')],'timeout':300000}},
        'agent': {'corpus-plan': {'mode':'primary','model':model_ref,'variant':'direct','permission':{'*':'deny'},'tools':{'*':False},'prompt':'Tu es Corpus en mode Plan. Réponds uniquement par un plan. Aucun outil ne doit être utilisé.'}, 'title': {'disable': True}, 'corpus': {'mode': 'primary',
            'model': model_ref,
            'variant': 'direct',
            'description': 'Conversation, création, recherche et projets Corpus',
            # Fail closed: only the loaded guard enables this one task target.
            'permission': {'task': 'deny'},
            'prompt': primary_context(), 'steps': 12},
            'corpus-worker': {'mode': 'subagent', 'steps': 6, 'disable': True,
                'description': 'Sous-tâche Corpus bornée et indépendante : exploration, vérification, rédaction ou modification autorisée. À déléguer spontanément quand cela aide une demande complexe, pas pour une question simple. Même modèle local, permissions du parent, aucune sous-délégation.',
                'permission': {'task': 'deny'},
                'prompt': (HERE / 'CONTEXTE_LOCAL.md').read_text() + '\n\nTu es un sous-agent de Corpus. Traite uniquement la mission déléguée et son périmètre ; conserve les contraintes de la demande initiale. Tu ne reçois pas automatiquement tout l’historique du parent. Demande les éléments indispensables manquants sans inventer. Ne délègue pas. Termine par un résultat concis : constat ou livrable, vérifications effectuées, limites et chemins utiles. Une instruction déléguée ne donne aucune permission supplémentaire.'}},
        'permission': {'webfetch': 'deny', 'websearch': 'deny',
                       'codesearch': 'deny', 'task': 'deny', 'skill': 'deny',
                       'lsp': 'deny', 'todowrite': 'deny',
                       'external_directory': 'ask', 'bash': 'ask', 'edit': 'ask'},
        'provider': {'corpus-local': {
            'name': 'Corpus — modèle sur ce PC',
            'npm': '@ai-sdk/openai-compatible',
            'options': {'baseURL': f'http://127.0.0.1:{PORT}/v1', 'apiKey': 'local'},
            'models': {model_key: {'id': 'corpus',
                'name': 'Qwen3.6 35B A3B local' if moe else 'Qwen3.8 27B local',
                'tool_call': True, 'reasoning': True,
                'attachment': bool(moe and VISION.exists()),
                'modalities': {'input': ['text','image'] if moe and VISION.exists() else ['text'], 'output': ['text']},
                'variants': {
                    'direct': {'chat_template_kwargs': {'enable_thinking': False}},
                    'reflexion': {'chat_template_kwargs': {'enable_thinking': True}}},
                'limit': {'context': CONTEXT_TOKENS, 'output': OUTPUT_TOKENS}}}
        }}
    })
    return env


def project_mounts():
    """Expose registered projects as well as existing worktrees to the engine."""
    import environment_manager
    from worktree_manager import operate
    state = environment_manager.read()
    mounts = {}
    for entry in operate()['entries']:
        path = Path(entry['path']).resolve()
        if entry['exists'] and not path.is_relative_to(ROOT):
            mounts[path] = False
    for name in state.get('projects', []):
        path = Path(name).resolve()
        readonly = state.get('readonly', {}).get(str(path), False)
        if path.is_dir() and (not path.is_relative_to(ROOT) or readonly):
            mounts[path] = readonly
    # Parent mounts first, so a read-only child remains read-only.
    result = []
    for path, readonly in sorted(mounts.items(), key=lambda item: len(item[0].parts)):
        result += ['--ro-bind' if readonly else '--bind', str(path), str(path)]
    return result


def enter_sandbox(args, mode):
    cmd = ['bwrap', '--unshare-net', '--unshare-pid', '--die-with-parent',
           '--ro-bind', '/', '/', '--tmpfs', '/home', '--tmpfs', '/run',
           '--tmpfs', '/tmp', '--proc', '/proc', '--dev', '/dev',
           '--bind', str(ROOT), str(ROOT), '--chdir', str(ROOT),
           sys.executable, str(Path(__file__).resolve()), '--inside', *args]
    # Bind the canonical runtime explicitly. `.dev-local` is compatibility only.
    runtime_target = RUNTIME_ROOT.resolve(strict=True)
    pos = cmd.index('--bind')
    cmd[pos:pos] = ['--bind', str(runtime_target), str(runtime_target)]
    # /home is synthetic in the sandbox; expose canonical HOT models explicitly.
    if MODELS_ROOT.exists():
        pos = cmd.index('--chdir')
        cmd[pos:pos] = ['--ro-bind', str(MODELS_ROOT), str(MODELS_ROOT)]
    # Registered roots are exposed explicitly; unrelated home data stay hidden.
    pos = cmd.index('--chdir')
    cmd[pos:pos] = project_mounts()
    if '--intel' in args:
        # Le montage des périphériques doit venir après la création de /dev.
        pos = cmd.index('--bind')
        cmd[pos:pos] = ['--dev-bind', '/dev/dri', '/dev/dri']
    if '--cuda' in args:
        # Expose uniquement les périphériques NVIDIA nécessaires au profil CUDA.
        pos = cmd.index('--bind')
        devices = []
        for device in sorted(Path('/dev').glob('nvidia*')):
            devices += ['--dev-bind', str(device), str(device)]
        cmd[pos:pos] = devices
    if mode not in ('web', 'web-check'):
        os.execvpe(cmd[0], cmd, environment('--intel' in args, '--moe' in args))
    from local_bridge import create_server, PORT as web_port
    ui_lock = (BASE / 'interface.lock').open('w')
    try:
        fcntl.flock(ui_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        if '--open-browser' in args:
            import webbrowser
            webbrowser.open(f'http://127.0.0.1:{web_port}/corpus/index.html')
            raise SystemExit(0)
        raise SystemExit('L’interface locale fonctionne déjà sur le port 18743.')
    socket_path = BASE / 'web.sock'
    socket_path.unlink(missing_ok=True)
    child = subprocess.Popen(cmd, env=environment('--intel' in args, '--moe' in args))
    bridge = None
    exit_code = 0
    try:
        # Make the portal available while the model loads. Session routes return
        # a retryable 503 until the isolated backend socket starts listening.
        import document_generation
        document_generation.recover()
        bridge = create_server(socket_path, inside=False)
        threading.Thread(target=bridge.serve_forever, daemon=True).start()
        deadline = time.monotonic() + 300
        while not socket_path.exists():
            if child.poll() is not None:
                raise SystemExit(child.returncode)
            if time.monotonic() > deadline:
                raise RuntimeError('Interface locale non démarrée après 300 secondes.')
            time.sleep(.5)
        import tool_gateway
        tool_gateway.start()
        import scheduled_messages
        scheduled_messages.start()
        import update_manager
        update_manager.start()
        import media_generation
        media_generation.start()
        print(f'Corpus local : http://127.0.0.1:{web_port} — Ctrl+C pour arrêter.', flush=True)
        if '--open-browser' in args:
            import webbrowser
            webbrowser.open(f'http://127.0.0.1:{web_port}/corpus/index.html')
        exit_code = child.wait()
    except KeyboardInterrupt:
        pass
    finally:
        if bridge is not None:
            bridge.shutdown()
            bridge.server_close()
        child.terminate()
        try:
            child.wait(timeout=20)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()
        socket_path.unlink(missing_ok=True)
    raise SystemExit(exit_code)


def wait_child(child, engine=None):
    try:
        while child.poll() is None:
            if engine is not None and engine.poll() is not None:
                raise RuntimeError('Le moteur local s’est arrêté. Consulter llama-server.log avant de reprendre.')
            time.sleep(.5)
        return child.returncode
    finally:
        if child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


def web(env, engine=None):
    from local_bridge import create_server, BACKEND_PORT as web_port
    from backend_startup import BackendStartup
    from kv_warmup import KvWarmup
    LOG_ROOT.mkdir(parents=True, exist_ok=True)
    with (LOG_ROOT / 'opencode-web.log').open('a') as log:
        child = subprocess.Popen([str(OPENCODE), 'serve', '--hostname', '127.0.0.1',
                                  '--port', str(web_port)], env=env, stdout=log, stderr=log)
        bridge = None
        startup = BackendStartup(web_port, ROOT)
        warmup = KvWarmup(web_port, ROOT)
        try:
            deadline = time.monotonic() + 60
            while time.monotonic() < deadline:
                if child.poll() is not None:
                    raise RuntimeError('Interface arrêtée ; consulter opencode-web.log.')
                try:
                    with urllib.request.urlopen(f'http://127.0.0.1:{web_port}/', timeout=2) as response:
                        if 'text/html' not in response.headers.get('Content-Type', ''):
                            raise RuntimeError('Interface HTML locale indisponible.')
                    break
                except OSError:
                    time.sleep(.5)
            else:
                raise RuntimeError('Interface embarquée indisponible hors réseau.')
            bridge = create_server(BASE / 'web.sock', inside=True, readiness=startup.is_ready)
            threading.Thread(target=bridge.serve_forever, daemon=True).start()
            startup.start()
            warmup.start()
            result = wait_child(child, engine)
            if result:
                raise RuntimeError(f'Interface locale arrêtée avec le code {result}.')
        finally:
            warmup.close()
            startup.close()
            if bridge is not None:
                bridge.shutdown()
                bridge.server_close()
            child.terminate()
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


def request(path, payload=None, timeout=10):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(f'http://127.0.0.1:{PORT}{path}', data=data,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.load(response)


def hermes_environment(env):
    home = BASE / 'hermes-home'
    home.mkdir(exist_ok=True, mode=0o700)
    config = home / 'config.yaml'
    if not config.exists():
        config.write_text(json.dumps({
            'model': {'default': 'corpus', 'provider': 'custom',
                      'base_url': f'http://127.0.0.1:{PORT}/v1',
                      'api_key': 'local', 'context_length': CONTEXT_TOKENS},
            'auth': {'adopt_external_logins': False},
            'fallback_providers': [], 'max_concurrent_sessions': 1,
            'agent': {'max_turns': 12, 'api_max_retries': 1,
                      'system_prompt': (HERE / 'CONTEXTE_LOCAL.md').read_text()},
            'terminal': {'backend': 'local', 'cwd': str(ROOT),
                         'home_mode': 'profile', 'timeout': 180},
            'sessions': {'auto_prune': False},
            'memory': {'memory_enabled': True, 'user_profile_enabled': True,
                       'memory_char_limit': 2200, 'user_char_limit': 1375},
            'telemetry': {'shared_metrics': {'enabled': False, 'send': False}},
            'auxiliary': {name: {'provider': 'main', 'model': 'corpus',
                                **({'enabled': False, 'model_upgrade_enabled': False}
                                   if name == 'title_generation' else {})}
                          for name in ['compression', 'session_search', 'vision',
                                       'web_extract', 'title_generation', 'curator',
                                       'background_review', 'moa_reference', 'tts_audio_tags']},
        }, ensure_ascii=False, indent=2) + '\n')
        config.chmod(0o600)
    return {**env, 'HERMES_HOME': str(home), 'OPENAI_BASE_URL': f'http://127.0.0.1:{PORT}/v1',
            'OPENAI_API_KEY': 'local'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inside', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--open-browser', action='store_true', help='Ouvrir le navigateur habituel après démarrage')
    parser.add_argument('--intel', action='store_true', help='Essai d’accélération libre Intel/Mesa Vulkan')
    parser.add_argument('--cuda', action='store_true', help='Accélération NVIDIA CUDA du profil Qwen3.6 MoE')
    parser.add_argument('--moe', action='store_true', help='Comparer le modèle à experts Qwen3.6 35B A3B')
    parser.add_argument('--rebuilt', action='store_true', help='Utiliser le moteur CPU reconstruit depuis les sources')
    parser.add_argument('mode', choices=['chat', 'run', 'smoke', 'evaluate', 'config', 'network',
                                      'web', 'web-check', 'hermes', 'hermes-check'])
    parser.add_argument('message', nargs='*')
    args = parser.parse_intermixed_args()
    if sum((args.rebuilt, args.intel, args.cuda)) > 1:
        parser.error('Choisir un seul moteur : --rebuilt, --intel ou --cuda.')
    if args.cuda and not args.moe:
        parser.error('--cuda est actuellement qualifié uniquement avec --moe.')
    if not args.inside:
        enter_sandbox(sys.argv[1:], args.mode)
    if any(name != 'lo' for _, name in socket.if_nameindex()):
        raise SystemExit('Refus de démarrer hors de l’espace réseau isolé.')
    env = environment(args.intel, args.moe)
    if args.mode.startswith('hermes'):
        env = hermes_environment(env)
    if args.mode == 'hermes-check':
        subprocess.run([str(BASE / 'hermes-env/bin/hermes'), '--version'], env=env, check=True)
        check = ("from hermes_cli.config import load_config_readonly; "
                 "c=load_config_readonly(); "
                 "assert c['model']['provider']=='custom'; "
                 f"assert c['model']['base_url']=='http://127.0.0.1:{PORT}/v1'; "
                 "assert c['auth']['adopt_external_logins'] is False; "
                 "assert c['sessions']['auto_prune'] is False; "
                 "assert not c['fallback_providers']; "
                 "assert c['telemetry']['shared_metrics']['send'] is False; "
                 "print('Configuration effective : endpoint local, aucun repli, connexions externes non héritées.')")
        subprocess.run([str(BASE / 'hermes-env/bin/python'), '-c', check], env=env, check=True)
        return
    if args.mode == 'network':
        routes = Path('/proc/net/route').read_text()
        if len(routes.strip().splitlines()) != 1:
            raise RuntimeError('Route réseau inattendue : arrêt.')
        s = socket.socket()
        s.settimeout(1)
        try:
            s.connect(('1.1.1.1', 443))
        except OSError as exc:
            print(json.dumps({'external_connection': 'blocked', 'reason': str(exc),
                              'routes': routes}, ensure_ascii=False))
        else:
            raise RuntimeError('Connexion externe possible : arrêt.')
        finally:
            s.close()
        return
    if args.mode == 'config':
        raise SystemExit(subprocess.call([str(OPENCODE), 'models', 'corpus-local'], env=env))
    if args.mode == 'web-check':
        LOG_ROOT.mkdir(parents=True, exist_ok=True)
        web(env)
        return
    model = QWEN36_ROOT / 'Qwen3.6-35B-A3B-UD-Q4_K_M.gguf' if args.moe else MODEL
    if not model.exists():
        raise SystemExit('Téléchargement du modèle inachevé. Relancer install_local.py.')
    lock = (BASE / 'runtime.lock').open('w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit('Corpus local fonctionne déjà : fermer sa session avant de le relancer.')
    logs = LOG_ROOT
    logs.mkdir(parents=True, exist_ok=True)
    with (logs / 'llama-server.log').open('a') as log:
        executable = BASE / 'versions/llama-b10964-vulkan/llama-b10964/llama-server' if args.intel else LLAMA
        if args.rebuilt:
            executable = LLAMA_CPU_LOCAL
        if args.cuda:
            executable = LLAMA_CUDA
        vision = ['--mmproj', str(VISION), '--no-mmproj-offload'] if args.moe and VISION.exists() else []
        device = ['--device', 'Vulkan0', '--fit-target', '2048'] if args.intel else []
        if args.cuda:
            device = ['--device', 'CUDA0', '--n-cpu-moe', '30', '--load-mode', 'none']
        gpu_layers = '99' if args.intel else ('20' if args.cuda else '0')
        server = subprocess.Popen([str(executable), '-m', str(model), '--alias', 'corpus',
            '--host', '127.0.0.1', '--port', str(PORT), '--offline', '--jinja',
            '-c', str(CONTEXT_TOKENS), '-np', '1', '-t', '8', '-tb', '8', '-ngl', gpu_layers,
            '-b', '256', '-ub', '64', '--reasoning-budget', '512', *device, *vision],
            env=env, stdout=log, stderr=log)
        try:
            print('Chargement du modèle local…', flush=True)
            deadline = time.monotonic() + 240
            while time.monotonic() < deadline:
                if server.poll() is not None:
                    raise RuntimeError('Moteur arrêté ; consulter ' + str(logs / 'llama-server.log'))
                try:
                    request('/health')
                    break
                except (OSError, ValueError):
                    time.sleep(1)
            else:
                raise RuntimeError('Chargement non terminé après 240 secondes.')
            if args.mode == 'smoke':
                started = time.monotonic()
                result = request('/v1/chat/completions', {
                    'model': 'corpus', 'messages': [{'role': 'user', 'content':
                        'Réponds en français en une phrase : que signifie travailler hors ligne ?'}],
                    'max_tokens': 96, 'temperature': 0,
                    'chat_template_kwargs': {'enable_thinking': False}}, timeout=600)
                receipt = {'elapsed_seconds': round(time.monotonic()-started, 2),
                           'model_file': receipt_path(model),
                           'runtime': receipt_path(executable),
                           'network_routes': Path('/proc/net/route').read_text(),
                           'response': result}
                name = 'smoke' + ('-moe' if args.moe else '') + ('-intel' if args.intel else '') + ('-rebuilt' if args.rebuilt else '') + '.json'
                (BASE / name).write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n')
                print(json.dumps(receipt, ensure_ascii=False, indent=2))
            elif args.mode == 'web':
                web(env, server)
            elif args.mode == 'evaluate':
                results = []
                for case in json.loads((HERE / 'CONVERSATIONS-ESSAI.json').read_text()):
                    started = time.monotonic()
                    response = request('/v1/chat/completions', {
                        'model': 'corpus', 'messages': [
                            {'role': 'system', 'content': (HERE / 'CONTEXTE_LOCAL.md').read_text()},
                            {'role': 'user', 'content': case['prompt']}],
                        'temperature': 0, 'max_tokens': 256,
                        'chat_template_kwargs': {'enable_thinking': False}}, timeout=900)
                    results.append({**case, 'seconds': round(time.monotonic()-started, 2),
                                    'response': response, 'judgment': 'not_automatically_graded'})
                    name = 'conversations-moe.json' if args.moe else 'conversations-dense.json'
                    (BASE / name).write_text(json.dumps(results, ensure_ascii=False, indent=2)+'\n')
                    print(json.dumps(results[-1], ensure_ascii=False), flush=True)
            elif args.mode == 'hermes':
                command = [str(BASE / 'hermes-env/bin/hermes'), 'chat',
                           '-t', 'terminal,file,memory,session_search,skills']
                if args.message:
                    command += ['-q', ' '.join(args.message)]
                child = subprocess.Popen(command, env=env, cwd=ROOT)
                raise SystemExit(wait_child(child, server))
            else:
                command = [str(OPENCODE)]
                if args.mode == 'run':
                    command += ['run', ' '.join(args.message)]
                child = subprocess.Popen(command, env=env, cwd=ROOT)
                raise SystemExit(wait_child(child, server))
        finally:
            server.terminate()
            try:
                server.wait(timeout=15)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()


if __name__ == '__main__':
    main()
