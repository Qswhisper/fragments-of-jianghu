"""Validate and extract exact signed APK assets into a fresh evidence directory."""
import hashlib, importlib.util, json, pathlib, sys, zipfile
root = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('android_apk', root / 'scripts/android-apk.py')
apk_tools = importlib.util.module_from_spec(spec)
spec.loader.exec_module(apk_tools)
output = (root / sys.argv[1]).resolve()
if not output.is_relative_to(root / 'output' / 'verification'):
    raise ValueError('Evidence must be inside output/verification')
output.mkdir(parents=True, exist_ok=False)
metadata = json.loads((root / 'output/android-package/manifest.json').read_text('utf-8'))
apk = pathlib.Path(metadata['apk'])
actual = hashlib.sha256(apk.read_bytes()).hexdigest()
assert actual == metadata['sha256']
stage = pathlib.Path(metadata['webRoot'])
paths = apk_tools.check_names(apk)
records = []
with zipfile.ZipFile(apk) as archive:
    assert archive.testzip() is None
    # ZipInfo.filename silently converts backslashes to slashes on Windows;
    # orig_filename is the actual name Android looks up in the signed APK.
    names = [entry.orig_filename for entry in archive.infolist()]
    assert 'classes.dex' in names and 'AndroidManifest.xml' in names
    assert not any('test-api.js' in name or 'android-signing' in name or name.endswith('.p12') for name in names)
    for name in names:
        if not name.startswith('assets/game/') or name.endswith('/'):
            continue
        relative = pathlib.PurePosixPath(name.removeprefix('assets/game/'))
        assert '..' not in relative.parts and not relative.is_absolute()
        data = archive.read(name)
        source = stage.joinpath(*relative.parts)
        assert data == source.read_bytes(), name
        target = output / 'extracted' / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        records.append({'file':relative.as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
assert len(records) == sum(1 for f in stage.rglob('*') if f.is_file())
for song in ('journey','combat','nemesis'):
    track = pathlib.Path('assets/audio/music/suno-weathered-v1') / (song+'.ogg')
    assert (root / track).read_bytes() == (output / 'extracted' / track).read_bytes()
report = {'passed':True,'apkSha256':actual,'bytes':apk.stat().st_size,'sourceRevision':metadata['sourceRevision'],
          'sourceDirty':metadata['sourceDirty'],'files':records,'webRoot':str(output/'extracted'),'paths':paths,
          'checks':['Raw APK paths equal exact Android lookup names, including local headers','ZIP CRC and all packaged assets equal final build','No test API or signing material in APK','Three Suno runtime tracks unchanged']}
(output/'summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps({**report,'files':len(records)},ensure_ascii=False,indent=2))
