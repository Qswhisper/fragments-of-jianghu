"""Bound small Android UI textures by their largest actual display footprint.

Runs only inside a fresh Android staging tree. Backgrounds, portraits, card
illustrations, source assets and fonts are excluded. The second transform is
lossless and starts from the existing quality92 mobile derivative.
"""
import hashlib,json,sys
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
target=Path(sys.argv[1]).resolve()
assert target.is_relative_to((root/'output/android-build').resolve())
manifest_path=target/'android-art-manifest.json'
manifest=json.loads(manifest_path.read_text('utf-8'))
assert manifest['processingVersion'] in (2,3)

def maximum(path):
    p=Path(path)
    if p.parent.as_posix()!='assets/ui':return None
    name=p.name
    if name.startswith('shop_relic_'):return 512
    if 'combat_card_red_stamp' in name:return 192
    if 'combat_health_blood' in name or 'combat_health_bamboo' in name:return 768
    if 'combat_intent_seal' in name or 'map_node_seal_texture' in name:return 256
    if 'combat_end_turn' in name:return 768
    if 'combat_card_torn_rice_paper' in name:return 1152
    return None

changed=0
for row in manifest['images']:
    cap=maximum(row['source'])
    if not cap:continue
    file=target/row['mobile']
    if row.get('uiProfileRevision')==1:
        assert row['uiMaxEdge']==cap,'Changed UI policy requires a fresh source build'
        assert hashlib.sha256(file.read_bytes()).hexdigest()==row['mobileSHA256']
        continue
    before=hashlib.sha256(file.read_bytes()).hexdigest()
    with Image.open(file) as source:
        image=source.convert('RGBA');original=list(image.size)
        image.thumbnail((cap,cap),Image.Resampling.LANCZOS)
        temporary=file.with_suffix('.profile.webp')
        image.save(temporary,'WEBP',lossless=True,exact=True)
    temporary.replace(file)
    row.update(uiProfileRevision=1,uiMaxEdge=cap,uiInputMobileSize=original,
               uiInputMobileSHA256=before,mobileSize=list(image.size),
               mobileSHA256=hashlib.sha256(file.read_bytes()).hexdigest(),bytes=file.stat().st_size)
    changed+=1

manifest.update(processingVersion=3,uiProfileRevision=1,
    processing='Source PNG to WebP quality92/max2560; 28 small UI textures then losslessly resized to display-footprint caps. Backgrounds, portraits and card illustrations retain the original profile.')
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps({'uiProfileRevision':1,'changed':changed,'profiled':sum(r.get('uiProfileRevision')==1 for r in manifest['images'])}))
