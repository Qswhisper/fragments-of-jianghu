"""Restore exact runtime resources from the complete PC game Release, not a sound library."""
from pathlib import Path, PurePosixPath
import argparse, hashlib, json, os, re, subprocess, tempfile, urllib.request, zipfile

def digest(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def checked_path(root,name):
    p=PurePosixPath(name)
    if '\\' in name or p.is_absolute() or '..' in p.parts or not p.parts or ':' in name:
        raise ValueError('Unsafe resource path: '+name)
    target=root.joinpath(*p.parts)
    for item in [root,*reversed(target.parents),target]:
        if item.exists() or item.is_symlink():
            if item.is_symlink() or getattr(item.lstat(),'st_file_attributes',0)&1024:
                raise ValueError('Resource path passes through a link: '+name)
    if not target.resolve().is_relative_to(root.resolve()):raise ValueError('Resource escaped checkout')
    return target

def install(archive,root,manifest):
    if archive.stat().st_size!=manifest['archive']['bytes'] or digest(archive)!=manifest['archive']['sha256']:
        raise ValueError('Archive identity mismatch; no files installed')
    rows=manifest['files'];seen=set();targets={};existing=set()
    for row in rows:
        name=row['path']
        if not (name.startswith('assets/') or name=='systems/music-library.js'):raise ValueError('Not an external resource: '+name)
        if name.casefold() in seen:raise ValueError('Duplicate resource: '+name)
        seen.add(name.casefold());target=checked_path(root,name);targets[name]=target
        if target.exists():
            if not target.is_file() or target.stat().st_size!=row['bytes'] or digest(target)!=row['sha256']:
                raise ValueError('Existing resource differs; refusing to overwrite: '+name)
            existing.add(name)
    with zipfile.ZipFile(archive) as z:
        names=set();folded=set()
        for info in z.infolist():
            checked_path(root,info.orig_filename)
            if info.orig_filename!=info.filename or info.filename in names or info.filename.casefold() in folded:
                raise ValueError('Ambiguous ZIP entry')
            names.add(info.filename);folded.add(info.filename.casefold())
        for row in rows:
            if row['path'] not in names or z.getinfo(row['path']).file_size!=row['bytes']:
                raise ValueError('Missing or wrong-size resource: '+row['path'])
        installed=0
        for row in rows:
            name=row['path'];target=targets[name]
            if name in existing:continue
            target.parent.mkdir(parents=True,exist_ok=True);checked_path(root,name)
            fd,temp=tempfile.mkstemp(prefix='.kgame-resource-',dir=target.parent)
            try:
                h=hashlib.sha256()
                with os.fdopen(fd,'wb') as dest,z.open(name) as source:
                    for block in iter(lambda:source.read(1024*1024),b''):dest.write(block);h.update(block)
                if h.hexdigest()!=row['sha256']:raise ValueError('Resource SHA mismatch: '+name)
                checked_path(root,name)
                if target.exists():raise ValueError('Resource appeared during install: '+name)
                os.replace(temp,target);installed+=1
            finally:
                if Path(temp).exists():Path(temp).unlink()
            if installed%200==0:print('Installed',installed,'resources',flush=True)
    return {'passed':True,'installed':installed,'alreadyExact':len(existing),'verified':len(rows),'archiveSHA256':manifest['archive']['sha256']}

def repository(root,explicit):
    if explicit:repo=explicit
    else:
        remote=subprocess.check_output(['git','remote','get-url','origin'],cwd=root,text=True,stderr=subprocess.DEVNULL).strip()
        match=re.fullmatch(r'(?:https://github\.com/|git@github\.com:)([\w.-]+/[\w.-]+?)(?:\.git)?',remote)
        if not match:raise ValueError('Use --repo OWNER/REPOSITORY or --archive PATH')
        repo=match.group(1)
    if not re.fullmatch(r'[\w.-]+/[\w.-]+',repo) or '..' in repo.split('/'):raise ValueError('Invalid repository identity')
    return repo

def download(root,repo,manifest):
    info=manifest['archive'];cache=checked_path(root,'.cache/runtime-'+info['sha256']+'.zip');cache.parent.mkdir(parents=True,exist_ok=True)
    if cache.exists():return cache
    url='https://github.com/'+repo+'/releases/download/'+manifest['tag']+'/'+info['fileName']
    fd,temp=tempfile.mkstemp(prefix='download-',suffix='.part',dir=cache.parent)
    try:
        h=hashlib.sha256();count=0
        with os.fdopen(fd,'wb') as f,urllib.request.urlopen(url,timeout=30) as response:
            for block in iter(lambda:response.read(1024*1024),b''):
                count+=len(block)
                if count>info['bytes']:raise ValueError('Download exceeds pinned archive size')
                f.write(block);h.update(block)
        if count!=info['bytes'] or h.hexdigest()!=info['sha256']:raise ValueError('Downloaded archive identity mismatch')
        os.replace(temp,cache);return cache
    finally:
        if Path(temp).exists():Path(temp).unlink()

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--archive',type=Path);parser.add_argument('--repo');a=parser.parse_args()
    root=Path(__file__).resolve().parents[1];manifest=json.loads((root/'runtime-assets.json').read_text('utf-8'))
    archive=a.archive.resolve() if a.archive else download(root,repository(root,a.repo),manifest)
    print(json.dumps(install(archive,root,manifest),ensure_ascii=False),flush=True)

if __name__=='__main__':main()
