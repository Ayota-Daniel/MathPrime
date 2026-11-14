#!/usr/bin/env python3
"""Check portable inventory output with disposable reference bundles."""
import base64
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

SCRIPT = Path(__file__).with_name('audit-visual-assets.py')
PNG = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV1sAAAAASUVORK5CYII='
)


def create_references(root):
    for name in ['MathPrime-interfaces-validees-test', 'MathPrime-v2-test']:
        folder = root / name
        (folder / 'mobile').mkdir(parents=True)
        (folder / 'mobile/screen.png').write_bytes(PNG)
        manifest = {
            'date_du_bundle': '2026-11-06', 'nombre_de_maquettes': 1,
            'ecrans': [{
                'fichier': 'mobile/screen.png', 'titre': 'Test screen',
                'plateforme': 'mobile', 'statut': 'archival test status',
                'source_image': 'original.png', 'sha256': hashlib.sha256(PNG).hexdigest(),
            }],
        }
        (folder / 'manifest.json').write_text(json.dumps(manifest))
        with zipfile.ZipFile(root / (name + '.zip'), 'w') as archive:
            for path in sorted(folder.rglob('*')):
                if path.is_file():
                    archive.write(path, path.relative_to(root))


class PortableInventoryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='mathprime-inventory-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.references = self.root / 'first location'
        create_references(self.references)
        self.project = self.root / 'project'
        media = self.project / 'docs/assets/R4.3A'
        media.mkdir(parents=True)
        (media / 'android-screen.png').write_bytes(PNG)

    def generate(self, references):
        output = self.root / 'inventory.json'
        result = subprocess.run(
            [sys.executable, str(SCRIPT), '--references', str(references),
             '--project', str(self.project), '--revision', 'test-revision', '--out', str(output)],
            capture_output=True, text=True, check=False,
        )
        return result, output.read_bytes(), json.loads(output.read_text())

    def test_relocation_is_deterministic_and_preserves_metadata(self):
        second = self.root / 'another location'
        shutil.copytree(self.references, second)
        first_result, first_bytes, inventory = self.generate(self.references)
        second_result, second_bytes, _ = self.generate(second)
        self.assertEqual(first_result.returncode, 0)
        self.assertEqual(second_result.returncode, 0)
        self.assertEqual(first_bytes, second_bytes)
        self.assertNotIn(str(self.root).encode(), first_bytes)
        self.assertEqual(inventory['references_root'], '@references')
        self.assertEqual(inventory['errors'], [])
        for bundle in inventory['bundles']:
            self.assertTrue(bundle['path'].startswith('@references/'))
            self.assertTrue(all(p.startswith('@references/') for p in bundle['metadata_files']))
            asset = bundle['assets'][0]
            self.assertEqual(asset['sha256'], hashlib.sha256(PNG).hexdigest())
            self.assertEqual((asset['width'], asset['height']), (1, 1))
            self.assertEqual(asset['date'], '2026-11-06')
            self.assertEqual(asset['validation_as_recorded'], 'archival test status')
        self.assertTrue(all(a['path'].startswith('@references/') for a in inventory['archives']))
        self.assertEqual(inventory['repository_assets'][0]['path'],
                         'docs/assets/R4.3A/android-screen.png')

    def test_mismatch_diagnostics_use_aliases(self):
        asset = self.references / 'MathPrime-interfaces-validees-test/mobile/screen.png'
        asset.write_bytes(PNG + b'changed')
        result, encoded, inventory = self.generate(self.references)
        self.assertEqual(result.returncode, 1)
        self.assertNotIn(str(self.root).encode(), encoded)
        self.assertNotIn(str(self.root), result.stdout + result.stderr)
        self.assertTrue(any('Manifest/hash mismatch: @references/' in e
                            for e in inventory['errors']))
        self.assertTrue(any('Archive/directory mismatch: @references/' in e
                            for e in inventory['errors']))

    def test_missing_reference_diagnostic_uses_alias(self):
        asset = self.references / 'MathPrime-interfaces-validees-test/mobile/screen.png'
        asset.unlink()
        result, encoded, inventory = self.generate(self.references)
        self.assertEqual(result.returncode, 1)
        self.assertNotIn(str(self.root).encode(), encoded)
        self.assertTrue(any('Reference missing: @references/' in e
                            for e in inventory['errors']))
        self.assertTrue(any('Expanded file missing: @references/' in e
                            for e in inventory['errors']))

    def test_missing_root_fails_without_disclosing_its_path(self):
        result, encoded, inventory = self.generate(self.root / 'absent references')
        self.assertEqual(result.returncode, 1)
        self.assertNotIn(str(self.root).encode(), encoded)
        self.assertNotIn(str(self.root), result.stdout + result.stderr)
        self.assertTrue(inventory['errors'])


if __name__ == '__main__':
    unittest.main()
