"""Create a fresh named PC package without resetting any existing output directory."""
import hashlib,json,subprocess,zipfile,re,argparse
from pathlib import Path

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--output-parent',default='output/offline-package');args=parser.parse_args()
package=json.loads((root/'package.json').read_text('utf-8'))
version=package['version']
release_version=package.get('releaseVersion',version)
assert re.fullmatch(r'1\.\d+(?:\.\d+)?',release_version) or release_version==version
tag=version.removeprefix('1.0.0-')
assert (tag.startswith('playtest.') and tag[9:].isdigit()) or re.fullmatch(r'1\.\d+\.\d+',version)
parent=(root/args.output_parent).resolve();assert parent.is_relative_to(root/'output');parent.mkdir(parents=True,exist_ok=True)
name='江湖残卷_'+release_version+'正式版_PC' if re.fullmatch(r'1\.\d+\.\d+',version) else 'KGame-offline-'+tag
bundle=parent/name
archive=parent/(name+'.zip')
metadata=parent/('release-'+tag+'.json')
assert not any(p.exists() for p in [bundle,archive,metadata]),'Version output already exists; never overwrite a delivery'
subprocess.run(['node',str(root/'scripts/build-release.mjs'),'--output',str(bundle.relative_to(root))],cwd=root,check=True)
release=json.loads((bundle/'release.json').read_text('utf-8'))
assert release['version']==version and release['entry']=='play.html' and release['includesTestApi'] is False
assert not any((bundle/name).exists() for name in ['index.html','test-api.js','PLAYTEST.md'])
metadata.write_text(json.dumps(release,ensure_ascii=False,indent=2),'utf-8')
# No playtest questionnaire in the formal package.
(bundle/'README-OFFLINE.txt').write_text('江湖残卷 '+release_version+' 正式版\n解压完整目录后，用Chrome或Edge打开play.html。无需服务器。\n继续时保持相同浏览器、用户配置及文件路径；请勿在压缩包或隐私窗口内运行。清除浏览器数据会清除进度，PC与安卓不自动同步。\n素材署名与许可见THIRD_PARTY_NOTICES.md及assets/audio/ATTRIBUTION.md。\n','utf-8')
with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(bundle.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(bundle).as_posix())
h=hashlib.sha256()
with archive.open('rb') as f:
 for block in iter(lambda:f.read(4*1024*1024),b''):h.update(block)
print(json.dumps(dict(zip=str(archive),bytes=archive.stat().st_size,sha256=h.hexdigest(),release=release),ensure_ascii=False))
