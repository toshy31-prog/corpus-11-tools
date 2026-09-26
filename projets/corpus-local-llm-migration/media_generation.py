"""Local, persistent and serial image/video rendering. No network in the renderer."""
import base64
import http.client
import fcntl
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import subprocess
import threading
import time
import uuid
import audio_generation
from corpus_paths import MEDIA_JOBS_DATA_ROOT, MEDIA_MODELS_ROOT, MEDIA_RUNTIME_ROOT

BASE = MEDIA_RUNTIME_ROOT
JOBS = MEDIA_JOBS_DATA_ROOT
MODEL_BASE = MEDIA_MODELS_ROOT
LOCK = threading.RLock()
STARTED = False
PROCESS = None
CURRENT = None
WORKER_LOCK = None
MODELS = {
    'flux-klein': {'name': 'FLUX.2 Klein 4B · Q4', 'kind': 'image', 'license': 'Apache-2.0',
                   'files': ['flux-klein.gguf', 'qwen3-4b.gguf', 'flux-vae.safetensors']},
    'wan-5b': {'name': 'FastWan 2.2 TI2V 5B · Q6', 'kind': 'video', 'license': 'Apache-2.0',
               'files': ['fastwan-5b.gguf', 'umt5.gguf', 'wan-tae.safetensors']}}
ACTIVE = {'queued', 'running'}
MODELS.update(audio_generation.MODELS)


def folder(identifier):
    if not isinstance(identifier, str) or not re.fullmatch(r'[a-f0-9]{32}', identifier):
        raise ValueError('Identifiant de génération invalide.')
    return JOBS / identifier


def read(identifier):
    try:
        return json.loads((folder(identifier) / 'job.json').read_text())
    except FileNotFoundError:
        raise ValueError('Génération introuvable.') from None


def save(job):
    dest = folder(job['id']) / 'job.json'
    temp = dest.with_suffix('.tmp')
    temp.write_text(json.dumps(job, ensure_ascii=False, indent=2))
    temp.replace(dest)


def jobs():
    result = []
    for path in JOBS.glob('*/job.json'):
        try:
            job = json.loads(path.read_text())
            if (not isinstance(job, dict) or job.get('id') != path.parent.name
                    or job.get('state') not in ACTIVE | {'completed','failed','cancelled'}
                    or type(job.get('created')) not in (int, float) or job.get('model') not in MODELS):
                continue
            result.append(job)
        except (OSError, ValueError):
            continue
    return sorted(result, key=lambda j: j['created'], reverse=True)


def public(job):
    value = dict(job)
    if job['state'] == 'queued':
        value['notice'] = 'Attend son tour et la fin des réponses du modèle de conversation.'
    value['elapsed'] = round(max(0, (job.get('finished') or time.time()) - job.get('started', job['created'])))
    if job['state'] == 'completed':
        value['url'] = '/corpus/generated/' + job['id'] + '/' + job['output']
    return value


def validate(data):
    model = data.get('model', 'flux-klein')
    if model not in MODELS:
        raise ValueError('Modèle inconnu.')
    if model in audio_generation.MODELS:
        return audio_generation.validate(data)
    prompt = data.get('prompt')
    if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 3000:
        raise ValueError('Décrivez le rendu en 1 à 3000 caractères.')
    video = model == 'wan-5b'
    width, height = data.get('width', 832 if video else 512), data.get('height', 480 if video else 512)
    limit = 832 if video else 1024
    multiple = 32 if video else 64
    if any(type(v) is not int or not 128 <= v <= limit or v % multiple for v in (width, height)):
        raise ValueError('Dimensions : multiples de ' + str(multiple) + ', entre 128 et ' + str(limit) + '.')
    if video and (width, height) not in ((832, 480), (480, 832)):
        raise ValueError('Vidéo : choisissez 832 × 480 ou 480 × 832.')
    frames = data.get('frames', 121)
    if type(frames) is not int or frames not in (17, 33, 49, 65, 81, 97, 121):
        raise ValueError('Choisissez 17, 33, 49, 65, 81, 97 ou 121 images vidéo.')
    seed = data.get('seed', secrets.randbelow(2**31))
    if type(seed) is not int or not 0 <= seed < 2**31:
        raise ValueError('Graine invalide.')
    soundtrack = data.get('soundtrack', '')
    if not isinstance(soundtrack, str) or len(soundtrack) > 1500:
        raise ValueError('Description musicale limitée à 1500 caractères.')
    return dict(soundtrack=soundtrack.strip() if video else '', model=model, prompt=prompt.strip(), width=width, height=height, frames=frames,
                seed=seed, fps=24, steps=3 if video else 4)


def reference(data):
    if data.get('reference_job'):
        job = read(data['reference_job'])
        if job['state'] != 'completed' or MODELS[job['model']]['kind'] != 'image':
            raise ValueError('La référence doit être une image terminée.')
        return (folder(job['id']) / job['output']).read_bytes()
    value = data.get('reference')
    if not value:
        return None
    if not isinstance(value, str) or not re.match(r'^data:image/(png|jpeg|webp);base64,', value):
        raise ValueError('Référence PNG, JPEG ou WebP requise.')
    try:
        raw = base64.b64decode(value.split(',', 1)[1], validate=True)
    except ValueError:
        raise ValueError('Image de référence invalide.') from None
    if not 1 <= len(raw) <= 4_000_000:
        raise ValueError('Référence limitée à 4 Mo.')
    if not (raw.startswith(b'\x89PNG\r\n\x1a\n') or raw.startswith(b'\xff\xd8\xff') or (raw[:4] == b'RIFF' and raw[8:12] == b'WEBP')):
        raise ValueError('Contenu image invalide.')
    return raw


def create(data):
    config = validate(data)
    raw = reference(data)
    if config.get('soundtrack') and not ready('ace-step'):
        raise ValueError('Le moteur musical ACE-Step doit être installé pour sonoriser la vidéo.')
    if not ready(config['model']):
        raise ValueError('Le modèle est encore indisponible ou en cours d’installation.')
    if shutil.disk_usage(JOBS.parent).free < 2 * 1024**3:
        raise ValueError('Au moins 2 Go libres sont nécessaires.')
    start()
    with LOCK:
        if sum(j['state'] in ACTIVE for j in jobs()) >= 4:
            raise ValueError('Quatre rendus sont déjà en cours ou en attente.')
        revision = 'audio.cpp-v0.8.1' if config['model'] in audio_generation.MODELS else '28b454b'
        job = dict(config, id=uuid.uuid4().hex, created=time.time(), state='queued', has_reference=bool(raw), engine_revision=revision)
        folder(job['id']).mkdir(parents=True, mode=0o700)
        if raw:
            directory = folder(job['id'])
            (directory / 'reference.img').write_bytes(raw)
            try:
                probe = subprocess.run(sandbox(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', str(directory / 'reference.img')], directory), capture_output=True, check=True, timeout=10)
                stream = json.loads(probe.stdout)['streams'][0]
                if not all(0 < stream[k] <= 4096 for k in ('width', 'height')):
                    raise ValueError('La référence est limitée à 4096 pixels par côté.')
            except (subprocess.SubprocessError, KeyError, IndexError, ValueError) as exc:
                shutil.rmtree(directory)
                raise ValueError('Référence illisible ou trop grande (4096 pixels maximum).') from exc
        save(job)
    return public(job)


def command(job):
    models = MODEL_BASE
    directory = folder(job['id'])
    if job['model'] in audio_generation.MODELS:
        return audio_generation.command(job, BASE, directory, MODEL_BASE)
    video = job['model'] == 'wan-5b'
    cmd = [str(BASE / 'runtime/sd-cli'), '--diffusion-model', str(models / ('fastwan-5b.gguf' if video else 'flux-klein.gguf')),
           '--tae' if video else '--vae', str(models / ('wan-tae.safetensors' if video else 'flux-vae.safetensors')),
           '--t5xxl' if video else '--llm', str(models / ('umt5.gguf' if video else 'qwen3-4b.gguf')),
           '--prompt-file', str(directory / 'prompt.txt'), '-W', str(job['width']), '-H', str(job['height']),
           '--seed', str(job['seed']), '--steps', str(job['steps']), '--sampling-method', 'euler',
           '--cfg-scale', '1', '--backend', 'diffusion=Vulkan0,vae=Vulkan0,te=CPU',
           '--max-vram', '6', '--offload-to-cpu', '--diffusion-fa', '-t', '6',
           '-o', str(directory / ('render.avi' if video else 'image.png'))]
    if video:
        cmd += ['-M', 'vid_gen', '--video-frames', str(job['frames']), '--fps', str(job['fps']), '--flow-shift', '3', '--auto-fit', 'off', '--vae-conv-direct', '--scheduler', 'lcm']
    else:
        cmd += ['--vae-tiling']
    if job['has_reference']:
        cmd += ['-i' if video else '-r', str(directory / 'reference.img')]
    return cmd


def sandbox(args, directory):
    # Keep GPU device nodes, hide user data and runtime sockets, writable output only.
    return ['bwrap', '--unshare-net', '--unshare-pid', '--die-with-parent', '--ro-bind', '/', '/',
            '--tmpfs', '/home', '--tmpfs', '/tmp', '--tmpfs', '/run', '--proc', '/proc',
            '--dev-bind', '/dev', '/dev', '--ro-bind', str(BASE), str(BASE),
            '--ro-bind', str(MODEL_BASE), str(MODEL_BASE),
            '--bind', str(directory), str(directory), '--chdir', str(directory), *args]


def execute(job):
    global PROCESS, CURRENT
    directory = folder(job['id'])
    try:
        (directory / 'prompt.txt').write_text(job['prompt'])
        with (directory / 'render.log').open('wb') as log:
            with LOCK:
                if read(job['id'])['state'] != 'queued':
                    return
                job.update(state='running', started=time.time()); save(job)
                PROCESS = subprocess.Popen(sandbox(command(job), directory), stdout=log, stderr=subprocess.STDOUT,
                                           start_new_session=True, env={'PATH': '/usr/bin:/bin', 'HOME': '/tmp', 'LANG': 'C.UTF-8'})
                CURRENT = job['id']
            PROCESS.wait(timeout=3600)
            if PROCESS.returncode:
                raise ValueError('Le moteur a échoué (code ' + str(PROCESS.returncode) + '). Consultez le journal local.')
            output = 'audio.wav' if job['model'] in audio_generation.MODELS else 'image.png'
            if job['model'] == 'wan-5b':
                output = 'video.mp4'
                audio_input = []
                if job.get('soundtrack'):
                    audio_job = audio_generation.validate({'model':'ace-step', 'prompt':job['soundtrack'],
                        'duration':10, 'seed':job['seed']})
                    with LOCK:
                        if read(job['id'])['state'] == 'cancelled': return
                        job['phase'] = 'Génération de la musique'; save(job)
                        PROCESS = subprocess.Popen(sandbox(audio_generation.command(audio_job, BASE, directory, MODEL_BASE), directory),
                            stdout=log, stderr=log, start_new_session=True,
                            env={'PATH':'/usr/bin:/bin','HOME':'/tmp','LANG':'C.UTF-8'})
                    PROCESS.wait(timeout=3600)
                    if PROCESS.returncode: raise ValueError('La génération de la musique a échoué.')
                    audio_input = ['-i', str(directory / 'audio.wav'), '-map', '0:v:0', '-map', '1:a:0',
                                   '-c:a', 'aac', '-af', 'afade=t=out:st=' + str(max(0, job['frames']/job['fps']-.5)) + ':d=0.5', '-shortest']
                subprocess.run(sandbox(['ffmpeg', '-v', 'error', '-y', '-i', str(directory / 'render.avi'),
                                        *audio_input, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                                        str(directory / output)], directory), check=True, timeout=180, stdout=log, stderr=log)
            if not (directory / output).is_file() or not (directory / output).stat().st_size:
                raise ValueError('Le moteur n’a pas produit de fichier.')
            if output == 'audio.wav':
                probe = subprocess.run(sandbox(['ffprobe', '-v', 'error', '-show_entries',
                    'format=duration:stream=sample_rate,channels', '-of', 'json', str(directory / output)], directory),
                    capture_output=True, check=True, timeout=15)
                info = json.loads(probe.stdout)
                job.update(audio_seconds=round(float(info['format']['duration']), 3),
                           sample_rate=int(info['streams'][0]['sample_rate']), channels=info['streams'][0]['channels'])
                if job['audio_seconds'] <= 0:
                    raise ValueError('Le moteur a produit un audio vide.')
            with LOCK:
                if read(job['id'])['state'] != 'cancelled':
                    job.update(state='completed', output=output, finished=time.time()); save(job)
    except Exception as exc:
        with LOCK:
            if PROCESS and PROCESS.poll() is None:
                os.killpg(PROCESS.pid, signal.SIGKILL); PROCESS.wait()
            if read(job['id'])['state'] != 'cancelled':
                job.update(state='failed', error=str(exc), finished=time.time()); save(job)
    finally:
        with LOCK:
            PROCESS = None; CURRENT = None


def conversation_busy():
    connection = http.client.HTTPConnection('127.0.0.1', 18743, timeout=2)
    try:
        connection.request('GET', '/session/status')
        reply = connection.getresponse()
        states = json.loads(reply.read(65536))
        return reply.status != 200 or not isinstance(states, dict) or any(
            not isinstance(state, dict) or state.get('type') != 'idle'
            for state in states.values())
    except (OSError, ValueError):
        return True
    finally:
        connection.close()


def worker():
    while True:
        with LOCK:
            pending = [j for j in reversed(jobs()) if j['state'] == 'queued']
        if pending and not conversation_busy():
            execute(pending[0])
        else:
            time.sleep(1)


def start():
    global STARTED, WORKER_LOCK
    with LOCK:
        if STARTED:
            return
        BASE.mkdir(parents=True, exist_ok=True)
        JOBS.mkdir(parents=True, exist_ok=True)
        WORKER_LOCK = (BASE / 'worker.lock').open('a')
        try:
            fcntl.flock(WORKER_LOCK, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            WORKER_LOCK.close()
            raise ValueError('Le service de génération tourne déjà dans un autre processus.') from None
        for job in jobs():
            if job['state'] == 'running':
                job.update(state='failed', finished=time.time(), error='Rendu interrompu par l’arrêt du moteur. Relancez-le explicitement.'); save(job)
        STARTED = True
        threading.Thread(target=worker, daemon=True, name='corpus-media').start()


def ready(model):
    profile = MODELS[model]
    return (BASE / profile.get('runtime', 'runtime/sd-cli')).is_file() and all((MODEL_BASE / f).is_file() for f in profile['files'])


def operate(data=None):
    start()
    data = {} if data is None else data
    if not isinstance(data, dict):
        raise ValueError('Objet JSON requis.')
    action = data.get('action', 'list')
    if action == 'create':
        return create(data)
    if action == 'retry':
        old = read(data.get('id'))
        if old['state'] in ACTIVE:
            raise ValueError('Ce rendu est encore actif.')
        values = dict(old)
        if old['has_reference']:
            raw = (folder(old['id']) / 'reference.img').read_bytes()
            values['reference'] = 'data:image/png;base64,' + base64.b64encode(raw).decode()
        return create(values)
    if action == 'status':
        return public(read(data.get('id')))
    if action == 'cancel':
        with LOCK:
            job = read(data.get('id'))
            if job['state'] in ACTIVE:
                job.update(state='cancelled', finished=time.time()); save(job)
                if CURRENT == job['id'] and PROCESS and PROCESS.poll() is None:
                    os.killpg(PROCESS.pid, signal.SIGKILL)
            return public(job)
    if action != 'list':
        raise ValueError('Action inconnue.')
    return {'models': [dict(value, id=key, ready=ready(key)) for key, value in MODELS.items()],
            'jobs': [public(j) for j in jobs()[:50]], 'local': True, 'audio': True}


def response(method, body):
    try:
        if method not in ('GET', 'POST'):
            raise ValueError('Méthode non autorisée.')
        value = operate(json.loads(body) if method == 'POST' else None)
        status = '200 OK'
    except (ValueError, TypeError, OSError, KeyError) as exc:
        value, status = {'error': str(exc)}, '400 Bad Request'
    raw = json.dumps(value, ensure_ascii=False).encode()
    return f'HTTP/1.1 {status}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode() + raw


def asset(path):
    match = re.fullmatch(r'/corpus/generated/([a-f0-9]{32})/(image\.png|video\.mp4|audio\.wav)', path)
    if match:
        try:
            job = read(match[1])
            if job['state'] == 'completed' and job['output'] == match[2]:
                raw = (folder(job['id']) / job['output']).read_bytes()
                mime = {'image.png': 'image/png', 'video.mp4': 'video/mp4', 'audio.wav': 'audio/wav'}[job['output']]
                return f'HTTP/1.1 200 OK\r\nContent-Type: {mime}\r\nX-Content-Type-Options: nosniff\r\nContent-Length: {len(raw)}\r\nCache-Control: private, max-age=31536000, immutable\r\nConnection: close\r\n\r\n'.encode() + raw
        except (ValueError, OSError):
            pass
    return b'HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n'
