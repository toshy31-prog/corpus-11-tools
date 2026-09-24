"""Synthèse eSpeak NG locale, sortie WAV sur stdout, aucun périphérique audio."""
import ctypes
import io
import json
import sys
import wave

request=json.load(sys.stdin)
text=request['text'][:4000]
engine=ctypes.CDLL('libespeak-ng.so.1')
engine.espeak_Initialize.argtypes=[ctypes.c_int,ctypes.c_int,ctypes.c_char_p,ctypes.c_int]
rate=engine.espeak_Initialize(2,0,None,0)
if rate<=0:raise RuntimeError('Synthèse indisponible')
chunks=[]
callback_type=ctypes.CFUNCTYPE(ctypes.c_int,ctypes.POINTER(ctypes.c_short),ctypes.c_int,ctypes.c_void_p)
@callback_type
def receive(samples,count,events):
    if samples and count:chunks.append(ctypes.string_at(samples,count*2))
    return 0
engine.espeak_SetSynthCallback.argtypes=[callback_type]
engine.espeak_SetSynthCallback(receive)
engine.espeak_SetVoiceByName.argtypes=[ctypes.c_char_p]
engine.espeak_SetVoiceByName(b'fr' if request.get('voice')!='en' else b'en')
engine.espeak_Synth.argtypes=[ctypes.c_void_p,ctypes.c_size_t,ctypes.c_uint,ctypes.c_int,ctypes.c_uint,ctypes.c_uint,ctypes.c_void_p,ctypes.c_void_p]
encoded=text.encode()+b'\0';buffer=ctypes.create_string_buffer(encoded)
if engine.espeak_Synth(buffer,len(encoded),0,1,0,1,None,None)!=0:raise RuntimeError('Synthèse échouée')
engine.espeak_Synchronize()
output=io.BytesIO()
with wave.open(output,'wb') as wav:
    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(rate);wav.writeframes(b''.join(chunks))
sys.stdout.buffer.write(output.getvalue())
