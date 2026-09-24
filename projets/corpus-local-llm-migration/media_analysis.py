"""Bounded video preparation, ffmpeg in a network-free sandbox."""
import base64
import json
import math
import subprocess
import tempfile
import threading
from pathlib import Path
import local_voice
LOCK=threading.Lock()
MAX_BYTES=60*1024*1024

def extract(data):
    if not isinstance(data,dict) or not isinstance(data.get('video'),str): raise ValueError('Vidéo attendue.')
    raw=base64.b64decode(data['video'],validate=True)
    if not 0<len(raw)<=MAX_BYTES: raise ValueError('Vidéo limitée à 60 Mo.')
    if not LOCK.acquire(False): raise ValueError('Une vidéo est déjà en préparation.')
    try:
        with tempfile.TemporaryDirectory(prefix='corpus-video-') as tmp:
            root=Path(tmp);source=root/'input';source.write_bytes(raw)
            def run(args,timeout=45):
                cmd=['bwrap','--unshare-net','--unshare-pid','--die-with-parent','--ro-bind','/','/','--tmpfs','/tmp','--tmpfs','/run','--proc','/proc','--dev','/dev','--bind',tmp,tmp,*args]
                return subprocess.run(cmd,capture_output=True,check=True,timeout=timeout).stdout
            meta=json.loads(run(['/usr/bin/ffprobe','-v','error','-protocol_whitelist','file,pipe','-show_format','-show_streams','-of','json',str(source)]))
            duration=float(meta['format']['duration'])
            if not math.isfinite(duration) or not 0<duration<=600: raise ValueError('Vidéo limitée à dix minutes.')
            if not any(s['codec_type']=='video' for s in meta['streams']): raise ValueError('Piste vidéo absente.')
            count=min(12,max(4,math.ceil(duration/5)))
            frames=[]
            for index in range(count):
                at=duration*(index+.5)/count
                jpg=run(['/usr/bin/ffmpeg','-v','error','-nostdin','-protocol_whitelist','file,pipe','-ss',str(at),'-i',str(source),'-frames:v','1','-vf','scale=960:960:force_original_aspect_ratio=decrease','-threads','2','-f','image2pipe','-vcodec','mjpeg','pipe:1'])
                if not jpg or len(jpg)>2000000: raise ValueError('Image extraite invalide.')
                frames.append({'at':round(at,2),'url':'data:image/jpeg;base64,'+base64.b64encode(jpg).decode()})
            audio={'available':any(s['codec_type']=='audio' for s in meta['streams']), 'text':'','covered_seconds':0}
            if audio['available'] and data.get('transcribe') is True:
                audio['segments']=[]
                for start in range(0,math.ceil(duration),60):
                    length=min(60,duration-start)
                    try:
                        wav=run(['/usr/bin/ffmpeg','-v','error','-nostdin','-protocol_whitelist','file,pipe','-ss',str(start),'-i',str(source),'-t',str(length),'-vn','-ac','1','-ar','16000','-f','wav','pipe:1'])
                        transcript=local_voice.transcribe({'audio':base64.b64encode(wav).decode()})
                        audio['segments'].append({'start':start,'end':round(start+min(length,transcript['seconds']),2),'text':transcript['text']})
                        audio['covered_seconds']+=min(length,transcript['seconds'])
                    except (ValueError,OSError,subprocess.SubprocessError):
                        audio['segments'].append({'start':start,'end':start+length,'error':'Transcription indisponible'})
                        audio['error']='Certains segments audio sont indisponibles.'
                audio['text']='\n'.join('['+str(s['start'])+'–'+str(s['end'])+' s] '+s.get('text',s.get('error','')) for s in audio['segments'])
            return {'duration':duration,'frames':frames,'audio':audio,'sampled':True}
    finally: LOCK.release()

def response(method,body):
    try:
        if method!='POST': raise ValueError('POST requis.')
        result=extract(json.loads(body));code='200 OK'
    except (ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError) as error:
        result={'error':str(error)[:300]};code='400 Bad Request'
    raw=json.dumps(result).encode();return f'HTTP/1.1 {code}\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nContent-Length: {len(raw)}\r\nConnection: close\r\n\r\n'.encode()+raw
