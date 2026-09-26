"""Approved host-side research worker: SearXNG discovery + Crawl4AI acquisition."""
import asyncio,json,os,subprocess,sys,time,urllib.parse,urllib.request
from corpus_paths import CACHE_ROOT

def ensure_searx():
    subprocess.run(['podman','start','corpus-searxng'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(40):
        try:
            with urllib.request.urlopen('http://127.0.0.1:18820/',timeout=1):return
        except Exception:time.sleep(.5)
    raise RuntimeError('SearXNG local indisponible')
def discover(q,limit):
    ensure_searx();url='http://127.0.0.1:18820/search?'+urllib.parse.urlencode({'q':q,'format':'json','language':'all'})
    with urllib.request.urlopen(url,timeout=20) as r:d=json.load(r)
    out=[]
    for x in d.get('results',[]):
        u=x.get('url')
        if isinstance(u,str) and u.startswith(('http://','https://')):out.append({'url':u,'title':x.get('title',''),'snippet':x.get('content','')})
        if len(out)>=limit:break
    return out
async def crawl(urls):
    from crawl4ai import AsyncWebCrawler,BrowserConfig,CrawlerRunConfig
    out=[]
    async with AsyncWebCrawler(config=BrowserConfig(headless=True)) as crawler:
        for u in urls:
            try:
                r=await crawler.arun(url=u,config=CrawlerRunConfig());md=str(getattr(r,'markdown','') or '');out.append({'url':u,'ok':bool(getattr(r,'success',True)),'markdown':md[:60000]})
            except Exception as e:out.append({'url':u,'ok':False,'error':str(e)[:1000]})
    return out
def main():
    a=json.load(sys.stdin);q=a['query'];limit=max(1,min(8,int(a.get('limit',5))));found=discover(q,limit);os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(CACHE_ROOT/'crawl4ai/playwright');print(json.dumps({'query':q,'discovery':found,'pages':asyncio.run(crawl([x['url'] for x in found]))},ensure_ascii=False))
if __name__=='__main__':main()
