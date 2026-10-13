#!/usr/bin/env python3
"""Export a committed source archive; retain actual package and standalone evidence."""
import argparse
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
from prepare_arm64_template import prepare

ROOT = Path(__file__).resolve().parents[1]


def command(args, cwd, timeout=180):
    result = subprocess.run(list(map(str, args)), cwd=cwd, capture_output=True, text=True, timeout=timeout)
    return {"command": list(map(str, args)), "exit_code": result.returncode, "stdout": result.stdout, "stderr": result.stderr}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preset", default="macOS Demo")
    parser.add_argument("--engine", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve(); output.parent.mkdir(parents=True, exist_ok=True)
    report_path = output.with_suffix('.report.json')
    commit = command(["git", "rev-parse", "HEAD"], ROOT)["stdout"].strip()
    report = {"schema_version": 1, "tested_source_commit": commit, "status": "NOT_RUN", "stage": "P00-EXPORT", "timestamp": datetime.now(timezone.utc).isoformat(), "commands": []}
    try:
        if command(["git", "status", "--porcelain"], ROOT)["stdout"].strip():
            raise RuntimeError("Source checkout is dirty; commit implementation before formal export")
        engine = args.engine.resolve()
        archive = subprocess.check_output(["git", "archive", "--format=tar", commit], cwd=ROOT)
        with tempfile.TemporaryDirectory(prefix="night-white-clean-") as folder:
            checkout = Path(folder)
            with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
                tar.extractall(checkout, filter="data")
            stamp = {"tested_source_commit": commit, "engine_version": "4.7.2.stable.official.ed1daf0bf", "baseline_hash": hashlib.sha256((checkout / 'docs/acceptance_baseline.json').read_bytes()).hexdigest(), "reference_hash": json.loads((checkout / 'docs/acceptance_baseline.json').read_text())['reference_sha256'], "package_stage": "P00 bootstrap only"}
            template_source = Path.home() / 'Library/Application Support/Godot/export_templates/4.7.2.stable/macos.zip'
            template_target = checkout / '.native-tools/macos-arm64.zip'
            report['template_provenance'] = prepare(template_source, template_target)
            (template_target.parent / '.gdignore').touch()
            (checkout / "build_info.json").write_text(json.dumps(stamp, ensure_ascii=False, indent=2) + '\n')
            for args_list in [[engine, "--headless", "--editor", "--path", checkout, "--import", "--quit"], [engine, "--headless", "--path", checkout, "--export-debug", args.preset, output]]:
                result = command(args_list, checkout); report['commands'].append(result)
                if result['exit_code'] != 0:
                    raise RuntimeError("Clean import/export failed")
        if not output.is_file():
            raise RuntimeError("Exporter did not produce archive")
        report['package_sha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
        # A non-synced directory avoids File Provider injecting FinderInfo into .app.
        unpacked = Path(tempfile.mkdtemp(prefix='night-white-validated-' + commit[:8] + '-'))
        result = command(['ditto', '-x', '-k', output, unpacked], ROOT); report['commands'].append(result)
        if result['exit_code'] != 0: raise RuntimeError('Cannot unpack candidate')
        app = next(unpacked.glob('*.app'))
        binary = next((app / 'Contents/MacOS').iterdir())
        architecture = command(['lipo', '-archs', binary], ROOT); report['commands'].append(architecture)
        if architecture['exit_code'] != 0 or architecture['stdout'].strip() != 'arm64':
            raise RuntimeError('Candidate architecture is not arm64 only')
        signature = command(['codesign', '--verify', '--deep', '--strict', app], ROOT); report['commands'].append(signature)
        if signature['exit_code'] != 0: raise RuntimeError('Candidate code signature invalid')
        runtime_path = output.with_suffix('.runtime.json')
        result = command([binary, '--resolution', '1920x1080', '--', '--p00-report=' + str(runtime_path), '--quit-after-frames=12'], ROOT, 90)
        report['commands'].append(result)
        runtime = json.loads(runtime_path.read_text()) if runtime_path.is_file() else {}
        ok = result['exit_code'] == 0 and not runtime.get('headless', True) and runtime.get('rendering_method') == 'forward_plus' and runtime.get('rendering_driver') == 'metal' and runtime.get('build_info', {}).get('tested_source_commit') == commit and not runtime.get('errors', ['Missing runtime report'])
        if not ok: raise RuntimeError('Standalone run does not match source/Metal requirements')
        report.update({'status': 'PASS', 'app_path': str(app), 'binary_path': str(binary), 'runtime_report': str(runtime_path), 'engine_version': runtime['engine_version'], 'architecture': 'arm64', 'clean_source_archive': True})
    except (RuntimeError, OSError, subprocess.TimeoutExpired, StopIteration) as error:
        report.update({'status': 'FAIL', 'error': str(error)})
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': report['status'], 'report': str(report_path), 'package': str(output), 'error': report.get('error')}, ensure_ascii=False))
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
