from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse,unquote
from urllib.request import urlopen
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.ids=set();self.base=None
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='base':self.base=d.get('href')
  if d.get('id'):self.ids.add(d['id'])
  if t in ['a','link','script','img','iframe','source']:
   for k in ['href','src']:
    if d.get(k):self.links.append((t,d[k]))
base='http://127.0.0.1:3015/'
queue=[('review/',0)];seen=set();fail=[];count=0
while queue:
 path,depth=queue.pop(0)
 url=urljoin(base,path)
 if url in seen:continue
 seen.add(url)
 try:
  r=urlopen(url,timeout=8);body=r.read();count+=1
 except Exception as e:fail.append((url,str(e)));continue
 if 'html' not in r.headers.get('Content-Type',''):continue
 p=Parser();p.feed(body.decode());rel=urljoin(url,p.base) if p.base else url
 for tag,link in p.links:
  target=urljoin(rel,link);parts=urlparse(target)
  if parts.hostname not in ['127.0.0.1','localhost']:continue
  if parts.port!=3015:fail.append((target,'Stale local server dependency'));continue
  try:
   r=urlopen(target,timeout=8);data=r.read();count+=1
   if parts.fragment and 'html' in r.headers.get('Content-Type',''):
    q=Parser();q.feed(data.decode())
    if unquote(parts.fragment) not in q.ids:fail.append((target,'Missing fragment'))
   if tag=='a' and depth<1:queue.append((parts.path.lstrip('/'),depth+1))
  except Exception as e:fail.append((target,str(e)))
print({'resource_checks':count,'html_pages':len(seen),'failures':fail})
