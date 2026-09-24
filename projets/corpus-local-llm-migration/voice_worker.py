"""Transcription hors réseau d'un fichier temporaire, exécutée dans Bubblewrap."""
import json
import subprocess
import sys
from pathlib import Path
from faster_whisper import WhisperModel
import numpy as np

base = Path(__file__).resolve().parents[2] / '.dev-local/corpus-local'
# Décode au plus 60 secondes. ffmpeg s'exécute dans le même espace sans réseau.
raw = subprocess.run(['/usr/bin/ffmpeg', '-v', 'error', '-nostdin', '-i', sys.argv[1],
                      '-t', '60', '-f', 'f32le', '-ac', '1', '-ar', '16000', 'pipe:1'],
                     stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20, check=True).stdout
samples = np.frombuffer(raw, dtype=np.float32)
if not len(samples):
    raise ValueError('Audio vide')
model = WhisperModel(str(base / 'voice-model-small'), device='cpu', compute_type='int8',
                     cpu_threads=4, local_files_only=True)
segments, info = model.transcribe(samples, beam_size=3, vad_filter=True,
                                  condition_on_previous_text=False)
print(json.dumps({'text': ' '.join(s.text.strip() for s in segments),
                  'language': info.language, 'seconds': len(samples)/16000}, ensure_ascii=False))
