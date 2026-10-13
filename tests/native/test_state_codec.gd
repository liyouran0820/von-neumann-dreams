extends RefCounted
## P01-1 assertions: explicit expectations, no rule or rendering implementation.
const State = preload("res://src/domain/game_state.gd")
const Codec = preload("res://src/domain/state_codec.gd")
var results: Array[Dictionary] = []

func check(id: String, condition: bool, expected: String, actual: Variant) -> void:
	results.append({"id": id, "expected": expected, "actual": actual, "status": "PASS" if condition else "FAIL"})

func fixture() -> Dictionary:
	return {
		"schema_version": 1, "level_id": "fixture", "content_version": "1.0", "content_hash": "a".repeat(64), "rules_version": "night-white-rules-1", "rules_hash": "b".repeat(64), "rule_tick": 12,
		"worlds": {
			"night": {"objects": {"A-night": {"id": "A-night", "world": "night", "position_mm": [3000, 0, 7000], "orientation_mdeg": [0, 0, 0], "local_motion": {"velocity_mm_s": [0, 0, 0]}, "properties": {"movable": true}}}, "doors": {}, "contacts": []},
			"day": {"objects": {}, "doors": {"D": {"open": true, "pending_close": true, "contact_ids": ["contact-1"], "occupant_ids": ["body"]}}, "contacts": [{"id": "contact-1", "world": "day", "provider_id": "plate", "subject_id": "A-day", "active": true}]}
		},
		"body_world": "night", "body": {"foot_mm": [9000, 0, 3000], "vertical_velocity_mm_s": 0, "effective_support": {"id": "floor-9-3", "provider_id": "terrain", "world": "night", "rule_tick": 12}}, "view_world": "day",
		"mapping": {"id": "map-1", "kind": "ghost", "source_id": "B-day", "source_world": "day", "target_id": "ghost-7", "target_world": "night"},
		"ghost": {"runtime_id": "ghost-7", "source_id": "B-day", "source_world": "day", "world": "night", "position_mm": [6000, 0, 2000], "orientation_mdeg": [0, 0, 0], "properties": {"fixed": true, "support_width_mm": 2000}, "lifecycle": {"created_tick": 10, "phase": "active"}},
		"goals": {"night-target": false}, "completed": false,
		"active_transaction": {"id": "tx-1", "command_id": "cmd-1", "input_tick": 12, "phase": "candidate", "candidate_changes": {"night": {"delta_mm": [1000, 0, 0]}}},
		"revision": 3, "audit": {"source": "test"}
	}

func run() -> Array[Dictionary]:
	var original: Dictionary = fixture()
	var state: RefCounted = State.new(original)
	original.body.foot_mm[0] = 999
	check("STATE-OWNERSHIP", state.read_snapshot().body.foot_mm[0] == 9000, "constructor owns deep copy; x=9000", state.read_snapshot().body.foot_mm)
	var cloned: RefCounted = state.clone()
	var changed: Dictionary = cloned.read_snapshot()
	changed.worlds.night.objects["A-night"].local_motion.velocity_mm_s[0] = 5
	changed.active_transaction.candidate_changes.night.delta_mm[0] = 9
	cloned.replace_snapshot(changed)
	check("STATE-CLONE-DEEP", state.read_snapshot().worlds.night.objects["A-night"].local_motion.velocity_mm_s[0] == 0 and state.read_snapshot().active_transaction.candidate_changes.night.delta_mm[0] == 1000, "nested object and transaction changes cannot affect original", state.read_snapshot().active_transaction)
	var detached: Dictionary = state.read_snapshot()
	detached.body.foot_mm[0] = 1
	check("STATE-SNAPSHOT-DEEP", state.read_snapshot().body.foot_mm[0] == 9000, "read_snapshot returns detached data", state.read_snapshot().body.foot_mm)
	var encoded: Dictionary = Codec.encode(state)
	var decoded: Dictionary = Codec.decode(encoded.get("json", ""))
	var roundtrip: Dictionary = decoded.state.read_snapshot() if decoded.get("ok", false) else {}
	check("CODEC-INTEGER-ROUNDTRIP", decoded.get("ok", false) and roundtrip == state.read_snapshot() and typeof(roundtrip.body.foot_mm[0]) == TYPE_INT and typeof(roundtrip.rule_tick) == TYPE_INT, "exact state and integer types survive JSON", decoded.get("error", roundtrip))
	var hash: String = Codec.gameplay_hash(state).get("hash", "")
	check("HASH-KNOWN-FIXTURE", hash == "3d20cf0599e3eb5cab49048f53e3f34cef6726a69d2ca95325b2eba76bf1bbce", "fixed fixture SHA-256 independently checked with Python canonical JSON", hash)
	check("CODEC-PENDING-DOOR-ROUNDTRIP", decoded.get("ok", false) and roundtrip.worlds.day.doors.D.pending_close == true and roundtrip.worlds.day.doors.D.occupant_ids == ["body"], "pending door and occupant IDs survive snapshot roundtrip", roundtrip.get("worlds", {}))
	check("CODEC-ROUNDTRIP-HASH", decoded.get("ok", false) and Codec.gameplay_hash(decoded.state).get("hash", "") == hash, "JSON roundtrip preserves gameplay hash", hash)
	var reversed: Dictionary = _reverse(state.read_snapshot())
	check("HASH-ORDER", Codec.gameplay_hash(State.new(reversed)).get("hash", "") == hash, "recursive dictionary insertion order is irrelevant", Codec.gameplay_hash(State.new(reversed)))
	var meta: Dictionary = state.read_snapshot()
	meta.revision = 100
	meta.audit.source = "different audit"
	check("HASH-METADATA", Codec.gameplay_hash(State.new(meta)).get("hash", "") == hash, "revision and audit do not affect gameplay hash", Codec.gameplay_hash(State.new(meta)))
	for field: String in ["body", "mapping", "ghost", "contacts", "active_transaction", "support", "rule_tick", "view_world", "goals", "completed", "objects", "doors", "pending_close", "occupant_ids"]:
		var modified: Dictionary = state.read_snapshot()
		match field:
			"body": modified.body.foot_mm[0] += 1
			"mapping": modified.mapping.id = "map-2"
			"ghost": modified.ghost.runtime_id = "ghost-8"; modified.mapping.target_id = "ghost-8"
			"contacts": modified.worlds.day.contacts[0].active = false
			"active_transaction": modified.active_transaction.candidate_changes.night.delta_mm[0] += 1
			"support": modified.body.effective_support.provider_id = "bridge"
			"rule_tick": modified.rule_tick += 1
			"view_world": modified.view_world = "night"
			"goals": modified.goals["night-target"] = true
			"completed": modified.completed = true
			"objects": modified.worlds.night.objects["A-night"].position_mm[0] += 1
			"doors": modified.worlds.day.doors.D.open = false
			"pending_close": modified.worlds.day.doors.D.pending_close = false
			"occupant_ids": modified.worlds.day.doors.D.occupant_ids = []
		var result: Dictionary = Codec.gameplay_hash(State.new(modified))
		check("HASH-" + field.to_upper(), result.get("ok", false) and result.get("hash", "") != hash, "actual " + field + " change alters gameplay hash", result)
	for problem: String in ["missing", "rules", "float_mm", "fraction_mm", "node", "unknown_field", "bad_world", "bad_hash", "bad_vector", "bad_schema", "nonfinite"]:
		var invalid: Dictionary = fixture()
		match problem:
			"missing": invalid.erase("body")
			"rules": invalid.rules_version = "future-rules"
			"float_mm": invalid.body.foot_mm[0] = 9000.0
			"fraction_mm": invalid.body.foot_mm[0] = 9000.5
			"node": invalid.audit["reference"] = RefCounted.new()
			"unknown_field": invalid["mystery"] = true
			"bad_world": invalid.body_world = "third"
			"bad_hash": invalid.content_hash = "wrong"
			"bad_vector": invalid.body.foot_mm = [1, 2]
			"bad_schema": invalid.schema_version = 2
			"nonfinite": invalid.body.vertical_velocity_mm_s = NAN
		check("REJECT-" + problem.to_upper(), not Codec.encode(State.new(invalid)).get("ok", true), "invalid snapshot rejected: " + problem, Codec.encode(State.new(invalid)))
	for text: String in ["{", "[]", "{}", encoded.get("json", "").replace("9000", "9000.0"), encoded.get("json", "").replace("9000", "9e3"), encoded.get("json", "").replace("9000", "9007199254740993")]:
		check("REJECT-JSON-" + str(results.size()), not Codec.decode(text).get("ok", true), "corrupt or noncanonical numeric JSON rejected", Codec.decode(text))
	var nullable: Dictionary = fixture()
	nullable.mapping = null
	nullable.ghost = null
	nullable.active_transaction = null
	nullable.body.effective_support = null
	var optional_encoded: Dictionary = Codec.encode(State.new(nullable))
	check("CODEC-NULLABLE-STATE", optional_encoded.get("ok", false) and Codec.decode(optional_encoded.get("json", "")).get("ok", false), "no mapping, ghost, support, transaction is representable", optional_encoded.get("ok", false))
	var limits: Dictionary = fixture()
	limits.body.foot_mm = [-9007199254740991, 0, 9007199254740991]
	var limits_decoded: Dictionary = Codec.decode(Codec.encode(State.new(limits)).get("json", ""))
	check("CODEC-INTEGER-BOUNDARY", limits_decoded.get("ok", false) and limits_decoded.state.read_snapshot().body.foot_mm == limits.body.foot_mm, "signed exact JSON integer boundaries survive", limits_decoded.get("ok", false))
	return results

func _reverse(value: Variant) -> Variant:
	if value is Dictionary:
		var result: Dictionary = {}
		var keys: Array = value.keys()
		keys.reverse()
		for key: Variant in keys:
			result[key] = _reverse(value[key])
		return result
	if value is Array:
		var result: Array = []
		for item: Variant in value:
			result.append(_reverse(item))
		return result
	return value
