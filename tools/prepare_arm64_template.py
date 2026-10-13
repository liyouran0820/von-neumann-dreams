"""Derive an arm64-only export template from locked official Universal binaries."""
import copy
import hashlib
from pathlib import Path
import subprocess
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED


def prepare(source: Path, destination: Path) -> dict:
    destination.parent.mkdir(parents=True, exist_ok=True)
    binaries = []
    with tempfile.TemporaryDirectory(prefix='godot-template-arm64-') as folder:
        with ZipFile(source) as incoming, ZipFile(destination, 'w', compression=ZIP_DEFLATED, compresslevel=6) as outgoing:
            for entry in incoming.infolist():
                data = incoming.read(entry.filename)
                target = copy.copy(entry)
                if '/Contents/MacOS/godot_macos_' in entry.filename and entry.filename.endswith('.universal'):
                    original = Path(folder) / Path(entry.filename).name
                    thinned = original.with_suffix('.arm64')
                    original.write_bytes(data)
                    subprocess.run(['lipo', str(original), '-thin', 'arm64', '-output', str(thinned)], check=True, capture_output=True)
                    data = thinned.read_bytes()
                    target.filename = entry.filename.removesuffix('.universal') + '.arm64'
                    binaries.append({'source': entry.filename, 'derived': target.filename, 'sha256': hashlib.sha256(data).hexdigest()})
                outgoing.writestr(target, data)
    if len(binaries) != 2:
        raise RuntimeError('Expected locked debug and release Universal binaries')
    return {'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'derived_sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'binaries': binaries, 'transformation': 'lipo -thin arm64; original installed template untouched'}
