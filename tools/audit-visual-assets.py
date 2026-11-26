#!/usr/bin/env python3
"""Read-only MathPrime asset inventory. Originals are never extracted or modified."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import struct
import wave
import zipfile

MEDIA = {
    '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.mp4', '.webm',
    '.wav', '.ogg', '.mp3', '.flac', '.kra', '.ora', '.aseprite',
    '.mmp', '.mmpz', '.mid', '.midi',
}
SOURCES = {'.kra', '.ora', '.aseprite', '.mmp', '.mmpz', '.mid', '.midi'}


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def media_info(path):
    result = {'bytes': path.stat().st_size, 'sha256': sha256(path)}
    if path.suffix.lower() == '.png':
        with path.open('rb') as stream:
            header = stream.read(24)
        if header[:8] == b'\x89PNG\r\n\x1a\n':
            result['width'], result['height'] = struct.unpack('>II', header[16:24])
    if path.suffix.lower() == '.wav':
        with wave.open(str(path)) as sound:
            result.update(seconds=sound.getnframes() / sound.getframerate(), rate=sound.getframerate(),
                          channels=sound.getnchannels(), bits=sound.getsampwidth() * 8)
    return result


def reference_path(path, references):
    relative = path.relative_to(references)
    return '@references' if relative == Path('.') else '@references/' + relative.as_posix()


def check_archive(path, references, errors):
    checked = 0
    with zipfile.ZipFile(path) as archive:
        for item in archive.infolist():
            if item.is_dir():
                continue
            relative = PurePosixPath(item.filename)
            if relative.is_absolute() or '..' in relative.parts or item.file_size > 32_000_000:
                errors.append(f'Unsafe or oversized entry in {reference_path(path, references)}')
                continue
            expanded = path.parent.joinpath(*relative.parts)
            if not expanded.is_file():
                errors.append(f'Expanded file missing: {reference_path(expanded, references)}')
                continue
            with archive.open(item) as stream:
                archived_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
            if archived_hash != sha256(expanded):
                errors.append(f'Archive/directory mismatch: {reference_path(expanded, references)}')
            checked += 1
    return {'path': reference_path(path, references), **media_info(path), 'files_checked': checked}


def reference_bundle(folder, references, previous, errors):
    manifest = json.loads((folder / 'manifest.json').read_text())
    entries = []
    for screen in manifest['ecrans']:
        path = folder / screen['fichier']
        if not path.is_file():
            errors.append(f'Reference missing: {reference_path(path, references)}')
            continue
        info = media_info(path)
        if info['sha256'] != screen['sha256']:
            errors.append(f'Manifest/hash mismatch: {reference_path(path, references)}')
        old = previous.get(screen['fichier'])
        entries.append({
            'name': path.name, 'path': reference_path(path, references), 'type': 'design-reference-png',
            'screen': screen['titre'], 'description': screen.get('description', ''),
            'platform': screen['plateforme'], 'date': manifest['date_du_bundle'],
            'validation_as_recorded': screen['statut'], 'note': screen.get('note', ''),
            'file': screen['fichier'], 'original_name': screen.get('source_image'),
            'original_found_in_directory': (folder.parent / screen.get('source_image', '')).is_file(),
            'change_from_v1': 'not-applicable' if not previous else 'added' if not old else
                              'unchanged' if old == info['sha256'] else 'replaced',
            **info,
        })
    return {'name': folder.name, 'path': reference_path(folder, references),
            'declared_count': manifest['nombre_de_maquettes'],
            'metadata_files': [reference_path(path, references) for path in sorted(folder.glob('*'))
                               if path.is_file()], 'assets': entries}


def repository_asset_type(relative, extension):
    if relative.startswith('docs/assets/R4.3A/'):
        return 'capture-current-audit'
    if relative.startswith('docs/assets/'):
        return 'capture-historical-not-current-evidence'
    if extension == '.wav':
        return 'audio-runtime'
    if extension in SOURCES:
        return 'editable-source'
    return 'branding-or-runtime-image'


def asset_platform(relative, filename):
    if relative.startswith('apps/mobile/') or filename.startswith('android-'):
        return 'android'
    if relative.startswith('apps/web/') or filename.startswith('web-'):
        return 'web'
    return 'shared-reference-or-see-file'


def repository_assets(project):
    assets = []
    for name in ['branding', 'apps/web/public', 'apps/mobile/assets', 'apps/mobile/android/app/src/main/res', 'docs/assets']:
        for path in sorted((project / name).rglob('*')):
            if not path.is_file() or path.suffix.lower() not in MEDIA:
                continue
            relative = path.relative_to(project).as_posix()
            assets.append({'name': path.name, 'path': relative,
                           'type': repository_asset_type(relative, path.suffix.lower()),
                           'platform': asset_platform(relative, path.name),
                           'validation': 'No artistic approval inferred from presence in repository', **media_info(path)})
    return assets


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--references', type=Path, required=True,
                        help='Local reference directory; recorded as @references in the output')
    parser.add_argument('--project', type=Path, default=Path('.'))
    parser.add_argument('--revision', required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    errors = []
    folders = sorted(path.parent for path in args.references.glob('MathPrime-*/manifest.json'))
    previous = {}
    bundles = []
    for folder in folders:
        bundle = reference_bundle(folder, args.references, previous, errors)
        bundles.append(bundle)
        if 'interfaces-validees' in folder.name:
            previous = {asset['file']: asset['sha256'] for asset in bundle['assets']}
    archives = [check_archive(path, args.references, errors)
                for path in sorted(args.references.glob('MathPrime-*.zip'))]
    if not bundles or not archives:
        errors.append('Expected MathPrime manifests and archives were not found at the supplied root')
    output = {'schema_version': 1, 'source_revision': args.revision, 'references_root': '@references',
              'validation_notice': 'Manifest labels are archival evidence, not a new approval. Current user corrections take precedence.',
              'archives': archives, 'bundles': bundles, 'repository_assets': repository_assets(args.project), 'errors': errors}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'bundles': [(bundle['name'], len(bundle['assets'])) for bundle in bundles],
                      'archives': len(archives), 'repository_assets': len(output['repository_assets']), 'errors': errors}, ensure_ascii=False))
    return bool(errors)


if __name__ == '__main__':
    raise SystemExit(main())
