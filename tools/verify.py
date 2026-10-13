#!/usr/bin/env python3
"""Native acceptance entry. Empty, missing and external-evidence gates never pass."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {"PASS", "FAIL", "NOT_RUN", "BLOCKED", "NOT_IMPLEMENTED"}


def run(command, timeout=90):
    try:
        process = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout)
        return {"command": list(map(str, command)), "exit_code": process.returncode, "stdout": process.stdout, "stderr": process.stderr}
    except subprocess.TimeoutExpired as error:
        return {"command": list(map(str, command)), "exit_code": -1, "stdout": str(error.stdout or ""), "stderr": "TIMEOUT"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--engine", default=os.getenv("DEMO_GODOT_BIN"))
    parser.add_argument("--report-dir", required=True)
    parser.add_argument("--window-probe", action="store_true")
    parser.add_argument("--export-probe", type=Path)
    args = parser.parse_args()
    report_dir = Path(args.report_dir).resolve()
    report_dir.mkdir(parents=True, exist_ok=True)
    commit = run(["git", "rev-parse", "HEAD"])["stdout"].strip()
    dirty = bool(run(["git", "status", "--porcelain"])["stdout"].strip())
    registry = json.loads((ROOT / "docs/acceptance/registry.json").read_text())
    baseline = json.loads((ROOT / "docs/acceptance_baseline.json").read_text())
    result = {"schema_version": 1, "stage_id": "ALL" if args.all else args.stage, "tested_source_commit": commit, "dirty_checkout": dirty, "timestamp": datetime.now(timezone.utc).isoformat(), "acceptance_baseline_hash": hashlib.sha256((ROOT / "docs/acceptance_baseline.json").read_bytes()).hexdigest(), "device_profile": json.loads((ROOT / "docs/device_profile.json").read_text()), "checks": [], "status": "NOT_RUN"}

    def add(id, expected, actual, status, evidence=None):
        assert status in ALLOWED
        result["checks"].append({"id": id, "expected": expected, "actual": actual, "status": status, "evidence": evidence})

    if args.stage != "P00" or args.all:
        for entry in registry["entries"]:
            if args.all or entry["id"].startswith(args.stage or ""):
                add(entry["id"], entry.get("expected_items", entry["expected"]), "No native implementation acceptance attached", "NOT_IMPLEMENTED")
        result["status"] = "NOT_IMPLEMENTED"
    elif not args.engine or not Path(args.engine).is_file():
        add("P00-ENGINE", baseline["godot_version"], "Locked engine executable missing", "BLOCKED")
        result["status"] = "BLOCKED"
    else:
        engine = str(Path(args.engine).resolve())
        version = run([engine, "--version"])
        actual_version = version["stdout"].strip()
        add("P00-ENGINE", baseline["godot_version"], actual_version, "PASS" if version["exit_code"] == 0 and actual_version == baseline["godot_version"] else "FAIL")
        source = json.loads((ROOT / "docs/source_manifest.json").read_text())
        for item in source["documents"]:
            actual = hashlib.sha256((ROOT / item["repository_path"]).read_bytes()).hexdigest()
            add("P00-SOURCE-" + item["id"], item["sha256"], actual, "PASS" if actual == item["sha256"] else "FAIL")
        reference = source["reference"]
        actual_reference = hashlib.sha256((ROOT / reference["supplied_path"]).read_bytes()).hexdigest()
        add("P00-REFERENCE", reference["accepted_sha256"], actual_reference, "PASS" if reference["baseline_status"] == "PASS" and actual_reference == reference["accepted_sha256"] else "BLOCKED")
        for suite, expected_exit, expected_status in [("runner-pass", 0, "PASS"), ("runner-fail", 1, "FAIL"), ("empty", 2, "NOT_IMPLEMENTED")]:
            output_path = report_dir / (suite + ".json")
            process = run([engine, "--headless", "--path", str(ROOT), "--script", "res://tests/run_tests.gd", "--", "--suite", suite, "--report=" + str(output_path)])
            (report_dir / (suite + ".log")).write_text(process["stdout"] + process["stderr"])
            raw = json.loads(output_path.read_text()) if output_path.exists() else {}
            ok = process["exit_code"] == expected_exit and raw.get("status") == expected_status
            add("P00-RUNNER-" + suite, {"exit": expected_exit, "raw_status": expected_status}, {"exit": process["exit_code"], "raw_status": raw.get("status")}, "PASS" if ok else "FAIL", output_path.name)
        if args.window_probe:
            output_path = report_dir / "native-window.json"
            process = run([engine, "--path", str(ROOT), "--rendering-method", "forward_plus", "--rendering-driver", "metal", "--resolution", "1920x1080", "--", "--p00-report=" + str(output_path), "--quit-after-frames=12"], 90)
            (report_dir / "native-window.log").write_text(process["stdout"] + process["stderr"])
            raw = json.loads(output_path.read_text()) if output_path.exists() else {}
            views = raw.get("viewports", [])
            ok = process["exit_code"] == 0 and not raw.get("headless", True) and raw.get("rendering_method") == "forward_plus" and raw.get("rendering_driver") == "metal" and raw.get("independent_worlds") is True and len(views) == 2 and all(view["msaa_samples"] == 4 and view["scaling_3d_scale"] == 1.0 for view in views)
            add("P00-NATIVE-WINDOW", "Actual Forward+/Metal, independent worlds, 4x MSAA / 100%", raw, "PASS" if ok else "FAIL", output_path.name)
        else:
            add("P00-NATIVE-WINDOW", "Actual windowed Metal run", "Not requested; headless cannot establish this", "NOT_RUN")
        if args.export_probe and args.export_probe.is_file():
            raw = json.loads(args.export_probe.read_text())
            ok = raw.get("status") == "PASS" and raw.get("tested_source_commit") == commit
            add("P00-EXPORT", "Clean source export, arm64 standalone Metal run for tested SHA", raw, "PASS" if ok else "FAIL", str(args.export_probe))
        else:
            add("P00-EXPORT", "Clean source export and standalone run", "No matching export evidence", "NOT_RUN")
        add("P00-CLEAN-SOURCE", "Committed source; generated artifacts ignored", not dirty, "PASS" if not dirty else "NOT_RUN")
        statuses = [check["status"] for check in result["checks"]]
        result["status"] = "FAIL" if "FAIL" in statuses else "BLOCKED" if "BLOCKED" in statuses else "PASS" if statuses and all(s == "PASS" for s in statuses) else "NOT_RUN"
    (report_dir / "report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"stage": result["stage_id"], "status": result["status"], "tested_source_commit": commit, "report": str(report_dir / "report.json")}, ensure_ascii=False))
    return 0 if result["status"] == "PASS" else 1 if result["status"] == "FAIL" else 2


if __name__ == "__main__":
    sys.exit(main())
