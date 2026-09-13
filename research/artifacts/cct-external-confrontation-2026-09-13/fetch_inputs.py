#!/usr/bin/env python3
"""Download pinned public inputs into a user-selected local directory; no installation."""
import hashlib,html,http.cookiejar,io,json,pathlib,re,sys,tarfile,urllib.request,zipfile
here=pathlib.Path(__file__).resolve().parent;plan=json.loads((here/'analysis-plan.json').read_text());out=pathlib.Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
def verify(name,data):
    assert hashlib.sha256(data).hexdigest()==plan['input_sha256'][name],f'Upstream input changed: {name}'
    (out/name).write_bytes(data)
sha=plan['epanet_commit'];raw=urllib.request.urlopen('https://codeload.github.com/OpenWaterAnalytics/EPANET/tar.gz/'+sha,timeout=40).read();verify('epanet.tar.gz',raw)
with tarfile.open(fileobj=io.BytesIO(raw)) as tar:tar.extractall(out,filter='data')
op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
op.open('https://services.fsd.tuni.fi/catalogue/FSD3668?lang=en&study_language=en&tab=download',timeout=30).read()
receipt=op.open('https://services.fsd.tuni.fi/catalogue/download?lang=en&study_language=en',timeout=30).read().decode()
url=html.unescape(re.search('content="0;url=([^"]+)"',receipt).group(1))
assert url.startswith('https://services.fsd.tuni.fi/catalogue/dip?')
raw=op.open(url,timeout=30).read()
with zipfile.ZipFile(io.BytesIO(raw)) as z:
    for n in z.namelist():
        name=pathlib.Path(n).name
        if name in plan['input_sha256']:verify(name,z.read(n))
print('Public inputs downloaded and hashes verified. FSD identifier discrepancy remains unresolved.')
