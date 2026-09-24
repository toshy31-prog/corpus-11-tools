"""Audio profiles used by the shared, isolated media queue (no separate GPU worker)."""
import secrets

MODELS = {
    'qwen-tts': {'name': 'Voix · Qwen3-TTS VoiceDesign 1.7B', 'kind': 'speech',
                 'license': 'Apache-2.0', 'files': ['qwen-tts-design.gguf'],
                 'runtime': 'audio-runtime/audiocpp_cli'},
    'ace-step': {'name': 'Musique · ACE-Step 1.5 Turbo', 'kind': 'music',
                 'license': 'MIT', 'files': ['ace-step-turbo.gguf'],
                 'runtime': 'audio-runtime/audiocpp_cli'},
}
LANGUAGES = {'fr': 'French', 'en': 'English', 'de': 'German', 'es': 'Spanish',
             'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
             'ja': 'Japanese', 'ko': 'Korean'}


def validate(data):
    model = data['model']
    prompt = data.get('prompt')
    limit = 1200 if model == 'qwen-tts' else 1500
    if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= limit:
        raise ValueError(f'Texte requis, limité à {limit} caractères.')
    if data.get('reference') or data.get('reference_job'):
        raise ValueError('Ce profil audio utilise du texte, sans image de référence.')
    language = data.get('language', 'fr')
    if language not in LANGUAGES:
        raise ValueError('Langue non prise en charge.')
    seed = data.get('seed', secrets.randbelow(2**31))
    if type(seed) is not int or not 0 <= seed < 2**31:
        raise ValueError('Graine invalide.')
    style = data.get('voice_style', 'A warm, clear adult French narrator, natural and calm delivery.')
    lyrics = data.get('lyrics', '')
    if not isinstance(style, str) or not 1 <= len(style.strip()) <= 500:
        raise ValueError('Description de voix : 1 à 500 caractères.')
    if not isinstance(lyrics, str) or len(lyrics) > 3000:
        raise ValueError('Paroles limitées à 3000 caractères.')
    duration = data.get('duration', 30)
    if type(duration) is not int or not 10 <= duration <= 120:
        raise ValueError('Durée musicale : de 10 à 120 secondes.')
    return dict(model=model, prompt=prompt.strip(), language=language, seed=seed,
                voice_style=style.strip(), lyrics=lyrics.strip(), duration=duration)


def command(job, base, directory):
    speech = job['model'] == 'qwen-tts'
    args = [str(base / 'audio-runtime/audiocpp_cli'), '--task', 'vdes' if speech else 'gen',
            '--family', 'qwen3_tts' if speech else 'ace_step', '--model',
            str(base / 'models' / MODELS[job['model']]['files'][0]), '--backend', 'vulkan' if speech else 'cpu',
            '--device', '0', '--threads', '6', '--text', job['prompt'], '--seed', str(job['seed']),
            '--out', str(directory / 'audio.wav'), '--metrics', '--log']
    if speech:
        args += ['--language', LANGUAGES[job['language']], '--instruct', job['voice_style'],
                 '--max-tokens', '2048', '--text-chunk-size', '300']
    else:
        args += ['--task-route', 'text2music', '--lyrics', job['lyrics'] or '[Instrumental]',
                 '--language', job['language'], '--duration-seconds', str(job['duration']),
                 '--num-inference-steps', '8', '--session-option', 'ace_step.mem_saver=true',
                 '--request-option', 'thinking=false', '--request-option', 'use_cot_metas=false',
                 '--request-option', 'use_cot_caption=false', '--request-option', 'use_cot_language=false']
    return args
