extends SceneTree
## Native test entry. Future suites remain NOT_IMPLEMENTED until real assertions exist.

var results: Array[Dictionary] = []

func _initialize() -> void:
	call_deferred("_run")

func _record(id: String, condition: bool, expected: String, actual: Variant) -> void:
	results.append({"id": id, "expected": expected, "actual": actual, "status": "PASS" if condition else "FAIL"})

func _run() -> void:
	var suite: String = "core"
	var report_path: String = ""
	var args: PackedStringArray = OS.get_cmdline_user_args()
	for index: int in range(args.size()):
		var argument: String = args[index]
		if argument == "--suite" and index + 1 < args.size():
			suite = args[index + 1]
		elif argument.begins_with("--suite="):
			suite = argument.trim_prefix("--suite=")
		elif argument.begins_with("--report="):
			report_path = argument.trim_prefix("--report=")
	match suite:
		"state-codec":
			results.append_array(preload("res://tests/native/test_state_codec.gd").new().run())
		"geometry":
			results.append_array(preload("res://tests/native/test_geometry_query.gd").new().run())
		"core":
			results.append_array(preload("res://tests/native/test_state_codec.gd").new().run())
			results.append_array(preload("res://tests/native/test_geometry_query.gd").new().run())
		"runner-pass":
			_record("RUNNER-KNOWN-PASS", 2 + 3 == 5, "2 + 3 == 5", 2 + 3)
		"runner-fail":
			_record("RUNNER-INTENTIONAL-FAIL", false, "Deliberate false assertion must fail", false)
		_:
			pass
	var failed: int = results.filter(func(result: Dictionary) -> bool: return result.status == "FAIL").size()
	var status: String = "NOT_IMPLEMENTED" if results.is_empty() else ("FAIL" if failed > 0 else "PASS")
	var report: Dictionary = {"schema_version": 1, "suite": suite, "status": status, "executed": results.size(), "failed": failed, "results": results}
	var text: String = JSON.stringify(report, "\t")
	print(text)
	if not report_path.is_empty():
		var file: FileAccess = FileAccess.open(report_path, FileAccess.WRITE)
		if file == null:
			push_error("Cannot write test report")
			quit(3)
			return
		file.store_string(text + "\n")
	quit(2 if results.is_empty() else (1 if failed > 0 else 0))
