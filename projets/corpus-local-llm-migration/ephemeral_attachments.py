"""Temporary attachment interpretation outside the model filesystem namespace."""
import base64
import io
from pathlib import Path
import tempfile
import subprocess

from PIL import Image
import file_import

MAX_FILE_BYTES = 12 * 1024 * 1024


def decode(data):
    name, encoded = data.get('name'), data.get('data')
    if not isinstance(name, str) or not name.strip() or len(name) > 300:
        raise ValueError('Nom de pièce jointe requis, limité à 300 caractères.')
    if not isinstance(encoded, str) or len(encoded) > ((MAX_FILE_BYTES + 2) // 3) * 4:
        raise ValueError('Pièce jointe limitée à 12 Mo.')
    raw = base64.b64decode(encoded, validate=True)
    if not 0 < len(raw) <= MAX_FILE_BYTES:
        raise ValueError('Pièce jointe vide ou supérieure à 12 Mo.')
    return Path(name).name, raw


def interpret(name, raw, mime=''):
    suffix = Path(name).suffix.lower()
    if suffix in ('.png', '.jpg', '.jpeg', '.webp') or mime in ('image/png', 'image/jpeg', 'image/webp'):
        try:
            with Image.open(io.BytesIO(raw)) as image:
                if image.format not in ('PNG', 'JPEG', 'WEBP') or image.width * image.height > 16_000_000:
                    raise ValueError('Image PNG, JPEG ou WebP limitée à 16 millions de pixels.')
                mime = {'PNG': 'image/png', 'JPEG': 'image/jpeg', 'WEBP': 'image/webp'}[image.format]
                image.verify()
        except (OSError, Image.DecompressionBombError) as exc:
            raise ValueError('Image invalide ou trop volumineuse.') from exc
        return {'kind': 'image', 'mime': mime, 'url': 'data:' + mime + ';base64,' + base64.b64encode(raw).decode(),
                'preview': '', 'characters': 0, 'notice': 'Image temporaire, lisible par le modèle visuel local.', 'truncated': False}
    supported = {'.pdf', '.docx', '.odt', '.ods', '.xlsx', '.pptx', '.odp', '.epub', '.zip',
                 '.txt', '.md', '.csv', '.tsv', '.json', '.jsonl', '.xml', '.html', '.htm',
                 '.yaml', '.yml', '.toml', '.ini', '.log', '.py', '.js', '.mjs', '.css', '.rs', '.c', '.h'}
    if suffix not in supported:
        raise ValueError('Format temporaire non pris en charge. Utiliser une image PNG/JPEG/WebP, un document PDF/Office, du texte ou un ZIP. Audio et vidéo ne sont pas interprétés ici.')
    # The model has its own tmpfs /tmp and PID namespace. These 0700 temporary
    # files belong to the outer portal and disappear on success or failure.
    with tempfile.TemporaryDirectory(prefix='corpus-ephemeral-', dir='/tmp') as tmp:
        directory = Path(tmp)
        if suffix == '.pdf':
            (directory / ('original' + suffix)).write_bytes(raw)
        try:
            text, notice = file_import.extract(raw, suffix, directory)
        except (OSError, subprocess.SubprocessError) as exc:
            raise ValueError('Extraction impossible. Vérifier le format ou fournir un extrait du document.') from exc
    return {'kind': 'document', 'mime': mime if isinstance(mime, str) else '',
            'preview': text[:12000], 'text': text[:12000], 'characters': len(text),
            'notice': notice + (' Extrait limité aux 12 000 premiers caractères.' if len(text) > 12000 else ''),
            'truncated': len(text) > 12000}
