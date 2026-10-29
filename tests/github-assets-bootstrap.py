"""Exercise extraction boundaries before exposing the bootstrap in a public repository."""
from pathlib import Path
import hashlib,importlib.util,json,tempfile,uuid,zipfile
root=Path(__file__).resolve().parents[1];out=root/'output/verification'/('github-assets-bootstrap-'+uuid.uuid4().hex[:8]);out.mkdir(parents=True)
source=root/'scripts/github-publication/setup-assets.py'
if not source.is_file():source=root/'scripts/setup-assets.py'
spec=importlib.util.spec_from_file_location('setup_assets',source);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def fixture(name,entries):
    archive=out/(name+'.zip')
    with zipfile.ZipFile(archive,'x') as z:
        for p,data in entries.items():z.writestr(p,data)
    return archive,{'archive':{'bytes':archive.stat().st_size,'sha256':sha(archive)},'files':[{'path':p,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()} for p,data in entries.items() if p.startswith('assets/')]}
checks=[]
def rejects(fn):
    try:fn()
    except (ValueError,FileNotFoundError):return
    raise AssertionError('Unsafe input was accepted')
a,manifest=fixture('valid',{'assets/a.txt':b'accepted','assets/nested/b.txt':b'preserved','main.js':b'NOT EXTRACTED'})
checkout=out/'checkout';checkout.mkdir();r=m.install(a,checkout,manifest);assert r['installed']==2 and not(checkout/'main.js').exists();checks.append('Only manifest resources installed; source in full PC archive not extracted')
assert m.install(a,checkout,manifest)['alreadyExact']==2;checks.append('Exact existing resources resume without rewriting')
(checkout/'assets/a.txt').write_bytes(b'local modification');rejects(lambda:m.install(a,checkout,manifest));assert (checkout/'assets/a.txt').read_bytes()==b'local modification';checks.append('User-modified resource is preserved and installation stops')
empty=out/'wrong';empty.mkdir();bad=json.loads(json.dumps(manifest));bad['archive']['sha256']='0'*64;rejects(lambda:m.install(a,empty,bad));assert not list(empty.iterdir());checks.append('Bad archive hash writes nothing')
z,malicious=fixture('traversal',{'../escaped.txt':b'escape','assets/a.txt':b'ok'});rejects(lambda:m.install(z,empty,malicious));assert not (out/'escaped.txt').exists() and not list(empty.iterdir());checks.append('Traversal anywhere in the ZIP rejected before extraction')
bad=json.loads(json.dumps(manifest));bad['files'].append({'path':'main.js','bytes':0,'sha256':'0'*64});rejects(lambda:m.install(a,empty,bad));checks.append('Manifest cannot nominate arbitrary source paths')
(out/'summary.json').write_text(json.dumps({'passed':True,'checks':checks},ensure_ascii=False,indent=2),'utf-8');print(json.dumps({'out':str(out),'passed':True,'checks':len(checks)}))
