"""Assemble APK entries with Android-compatible, exact POSIX names on Windows."""
import copy
import json
import pathlib
import struct
import sys
import zipfile


def check_names(apk):
    """Check both ZIP name records without Windows ZipInfo.filename conversion."""
    with zipfile.ZipFile(apk) as archive, pathlib.Path(apk).open('rb') as raw:
        names = set()
        for entry in archive.infolist():
            name = entry.orig_filename
            parts = name.rstrip('/').split('/')
            if '\\' in name or '\0' in name or name.startswith('/') or any(p in ('', '.', '..') for p in parts):
                raise ValueError('Android-incompatible APK path: ' + repr(name))
            if name in names:
                raise ValueError('Duplicate APK path: ' + name)
            names.add(name)
            raw.seek(entry.header_offset)
            header = raw.read(30)
            if header[:4] != b'PK\x03\x04':
                raise ValueError('Invalid ZIP local header: ' + name)
            flags = struct.unpack_from('<H', header, 6)[0]
            length = struct.unpack_from('<H', header, 26)[0]
            local = raw.read(length).decode('utf-8' if flags & 0x800 else 'cp437')
            if local != name:
                raise ValueError('ZIP local/central path mismatch: ' + repr((local, name)))
        for required in ('AndroidManifest.xml', 'resources.arsc', 'classes.dex', 'assets/game/play.html'):
            if required not in names:
                raise ValueError('APK entry missing by exact name: ' + required)
        if archive.testzip() is not None:
            raise ValueError('APK CRC verification failed')
        return {'passed': True, 'entries': len(names),
                'gameFiles': sum(n.startswith('assets/game/') and not n.endswith('/') for n in names),
                'entry': 'assets/game/play.html', 'checks': ['Raw central/local paths equal; forward slashes only', 'Exact entry names and ZIP CRC']}


def assemble(source, dex, target):
    if pathlib.Path(target).exists():
        raise ValueError('APK destination must be new')
    with zipfile.ZipFile(source) as old, zipfile.ZipFile(target, 'w') as new:
        names = set()
        for entry in old.infolist():
            name = entry.orig_filename.replace('\\', '/')
            if name in names or name == 'classes.dex':
                raise ValueError('Duplicate APK path: ' + name)
            names.add(name)
            clean = copy.copy(entry)
            clean.filename = clean.orig_filename = name
            clean.extra = b''  # Recompute offsets/sizes; do not carry ZIP64 or alignment padding.
            new.writestr(clean, old.read(entry))
        new.write(dex, 'classes.dex', compress_type=zipfile.ZIP_DEFLATED)
    return check_names(target)


if __name__ == '__main__':
    if len(sys.argv) == 5 and sys.argv[1] == 'assemble':
        result = assemble(*sys.argv[2:])
    elif len(sys.argv) == 3 and sys.argv[1] == 'check':
        result = check_names(sys.argv[2])
    else:
        raise SystemExit('Usage: android-apk.py assemble input.apk classes.dex output.apk | check signed.apk')
    print(json.dumps(result, indent=2))
