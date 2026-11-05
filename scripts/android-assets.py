"""Create mobile WebP derivatives; never alter source artwork or its records."""
import hashlib, json, pathlib, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

root, target = map(pathlib.Path, sys.argv[1:3])
files = list((target / 'assets').rglob('*.png'))
def convert(file):
    source = root / file.relative_to(target)
    with Image.open(file) as image:
        original_size = list(image.size)
        image.thumbnail((2560, 2560), Image.Resampling.LANCZOS)
        image.save(file.with_suffix('.webp'), 'WEBP', quality=92, method=5, exact=True)
        size = list(image.size)
    result = {'source': source.relative_to(root).as_posix(), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'mobile': file.with_suffix('.webp').relative_to(target).as_posix(), 'originalSize': original_size, 'mobileSize': size,
              'bytes': file.with_suffix('.webp').stat().st_size}
    file.unlink()
    return result
with ThreadPoolExecutor(max_workers=4) as pool:
    records = sorted(pool.map(convert, files), key=lambda x: x['source'])
for file in target.rglob('*'):
    if file.suffix in ('.js', '.css', '.html'):
        relative = file.relative_to(target)
        # Preserve full license/source snapshots byte-for-byte in fresh builds too.
        if relative.parts[0] == 'assets' and ('licenses' in relative.parts or 'sources' in relative.parts):
            continue
        file.write_text(file.read_text('utf-8').replace('.png', '.webp'), encoding='utf-8')
(target / 'android-art-manifest.json').write_text(json.dumps({'processingVersion':2,'processing':'WebP quality 92, maximum 2560 pixels; native scene resolution and alpha preserved. Original source files unchanged.', 'images':records},ensure_ascii=False,indent=2), 'utf-8')
print(f'Mobile images: {len(records)}, {sum(x["bytes"] for x in records)/1048576:.1f} MiB')
