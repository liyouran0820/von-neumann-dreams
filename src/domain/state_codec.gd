extends RefCounted
## P01-1 structural codec only. Geometry-derived consistency belongs to later
## rule services; this codec never invents contacts, support, or goal results.
## Validation is structural; cross-object reference resolution is not performed.
const State = preload("res://src/domain/game_state.gd")
const RULES_VERSION: String = "night-white-rules-1"
const MAX_JSON_INTEGER: int = 9007199254740991
const ROOT_FIELDS: Array[String] = ["schema_version", "level_id", "content_version", "content_hash", "rules_version", "rules_hash", "rule_tick", "worlds", "body_world", "body", "view_world", "mapping", "ghost", "goals", "completed", "active_transaction", "revision", "audit"]

static func _failure(message: String) -> Dictionary:
	return {"ok": false, "error": message}

static func encode(state: RefCounted) -> Dictionary:
	if not state is State:
		return _failure("Expected GameState")
	var data: Dictionary = state.read_snapshot()
	var error: String = validate_snapshot(data)
	if not error.is_empty():
		return _failure(error)
	return {"ok": true, "json": JSON.stringify(data, "", true)}

static func decode(text: String) -> Dictionary:
	var token_error: String = _validate_number_tokens(text)
	if not token_error.is_empty():
		return _failure(token_error)
	var parser: JSON = JSON.new()
	var parse_error: Error = parser.parse(text)
	if parse_error != OK:
		return _failure("Invalid JSON at line %s: %s" % [parser.get_error_line(), parser.get_error_message()])
	if not parser.data is Dictionary:
		return _failure("Snapshot root must be an object")
	var normalized: Dictionary = _restore_integers(parser.data)
	var error: String = validate_snapshot(normalized)
	if not error.is_empty():
		return _failure(error)
	return {"ok": true, "state": State.new(normalized)}

static func gameplay_hash(state: RefCounted) -> Dictionary:
	if not state is State:
		return _failure("Expected GameState")
	var data: Dictionary = state.read_snapshot()
	var error: String = validate_snapshot(data)
	if not error.is_empty():
		return _failure(error)
	data.erase("revision")
	data.erase("audit")
	return {"ok": true, "hash": JSON.stringify(data, "", true).sha256_text()}

static func validate_snapshot(data: Dictionary) -> String:
	var error: String = _pure(data, "state")
	if not error.is_empty():
		return error
	if not _fields(data, ROOT_FIELDS):
		return "Snapshot fields are missing or unknown"
	if not _integer(data.schema_version) or data.schema_version != 1:
		return "Unsupported schema_version"
	if data.rules_version != RULES_VERSION:
		return "Unsupported rules_version"
	for field: String in ["level_id", "content_version"]:
		if not _id(data[field]):
			return "Invalid " + field
	for field: String in ["content_hash", "rules_hash"]:
		if not _hash(data[field]):
			return "Invalid " + field
	if not _integer(data.rule_tick) or data.rule_tick < 0 or not _integer(data.revision) or data.revision < 0:
		return "Ticks and revision must be nonnegative integers"
	if not _world(data.body_world) or not _world(data.view_world):
		return "Invalid body/view world"
	if not _fields(data.worlds, ["night", "day"]):
		return "Both world snapshots are required"
	for world: String in ["night", "day"]:
		error = _validate_world(data.worlds[world], world)
		if not error.is_empty():
			return error
	if not _fields(data.body, ["foot_mm", "vertical_velocity_mm_s", "effective_support"]):
		return "Invalid body fields"
	if not _vector(data.body.foot_mm) or not _integer(data.body.vertical_velocity_mm_s):
		return "Body position and velocity must use integer millimetres"
	var support: Variant = data.body.effective_support
	if support != null:
		if not _fields(support, ["id", "provider_id", "world", "rule_tick"]):
			return "Invalid support fields"
		if not _id(support.id) or not _id(support.provider_id) or support.world != data.body_world or not _integer(support.rule_tick) or support.rule_tick < 0:
			return "Invalid effective support"
	if not data.goals is Dictionary or not data.completed is bool or not data.audit is Dictionary:
		return "Invalid goals/completion/audit"
	for goal: Variant in data.goals:
		if not _id(goal) or not data.goals[goal] is bool:
			return "Goal results must be named booleans"
	if data.mapping != null:
		if not _fields(data.mapping, ["id", "kind", "source_id", "source_world", "target_id", "target_world"]):
			return "Invalid mapping fields"
		for field: String in ["id", "source_id", "target_id"]:
			if not _id(data.mapping[field]):
				return "Invalid mapping identity"
		if not _world(data.mapping.source_world) or not _world(data.mapping.target_world) or data.mapping.source_world == data.mapping.target_world or data.mapping.kind not in ["real_pair", "ghost"]:
			return "Invalid mapping worlds/kind"
	if data.ghost != null:
		if not _fields(data.ghost, ["runtime_id", "source_id", "source_world", "world", "position_mm", "orientation_mdeg", "properties", "lifecycle"]):
			return "Invalid ghost fields"
		var ghost: Dictionary = data.ghost
		if not _id(ghost.runtime_id) or not _id(ghost.source_id) or ghost.runtime_id == ghost.source_id or not _world(ghost.world) or not _world(ghost.source_world) or ghost.world == ghost.source_world:
			return "Invalid independent ghost identity/world"
		if not _vector(ghost.position_mm) or not _vector(ghost.orientation_mdeg) or not ghost.properties is Dictionary:
			return "Invalid ghost position/properties"
		if not _fields(ghost.lifecycle, ["created_tick", "phase"]) or not _integer(ghost.lifecycle.created_tick) or ghost.lifecycle.created_tick < 0 or ghost.lifecycle.phase not in ["candidate", "active", "retiring"]:
			return "Invalid ghost lifecycle"
	if data.active_transaction != null:
		var transaction: Variant = data.active_transaction
		if not _fields(transaction, ["id", "command_id", "input_tick", "phase", "candidate_changes"]):
			return "Invalid transaction fields"
		if not _id(transaction.id) or not _id(transaction.command_id) or not _integer(transaction.input_tick) or transaction.input_tick < 0 or transaction.phase not in ["candidate", "validated", "committing"] or not transaction.candidate_changes is Dictionary:
			return "Invalid unsettled transaction"
	return ""

static func _validate_world(value: Variant, world: String) -> String:
	if not _fields(value, ["objects", "doors", "contacts"]):
		return "Invalid world fields: " + world
	if not value.objects is Dictionary or not value.doors is Dictionary or not value.contacts is Array:
		return "Invalid world collections: " + world
	for key: Variant in value.objects:
		var object: Variant = value.objects[key]
		if not _fields(object, ["id", "world", "position_mm", "orientation_mdeg", "local_motion", "properties"]):
			return "Invalid real object fields"
		if not _id(key) or object.id != key or object.world != world or not _vector(object.position_mm) or not _vector(object.orientation_mdeg) or not object.local_motion is Dictionary or not object.properties is Dictionary:
			return "Invalid real object state"
	for key: Variant in value.doors:
		var door: Variant = value.doors[key]
		if not _id(key) or not _fields(door, ["open", "pending_close", "contact_ids", "occupant_ids"]):
			return "Invalid door fields"
		if not door.open is bool or not door.pending_close is bool or not door.contact_ids is Array or not door.occupant_ids is Array:
			return "Invalid door values"
		for id: Variant in door.contact_ids + door.occupant_ids:
			if not _id(id):
				return "Invalid door contact/occupant ID"
	for contact: Variant in value.contacts:
		if not _fields(contact, ["id", "world", "provider_id", "subject_id", "active"]):
			return "Invalid contact fields"
		if not _id(contact.id) or not _id(contact.provider_id) or not _id(contact.subject_id) or contact.world != world or not contact.active is bool:
			return "Invalid local contact"
	return ""

static func _fields(value: Variant, fields: Array) -> bool:
	if not value is Dictionary or value.size() != fields.size():
		return false
	for field: Variant in fields:
		if not value.has(field):
			return false
	return true

static func _id(value: Variant) -> bool:
	return value is String and not value.is_empty()

static func _world(value: Variant) -> bool:
	return value is String and value in ["night", "day"]

static func _integer(value: Variant) -> bool:
	return typeof(value) == TYPE_INT and value >= -MAX_JSON_INTEGER and value <= MAX_JSON_INTEGER

static func _vector(value: Variant) -> bool:
	return value is Array and value.size() == 3 and _integer(value[0]) and _integer(value[1]) and _integer(value[2])

static func _hash(value: Variant) -> bool:
	if not value is String or value.length() != 64:
		return false
	for character: String in value:
		if not character in "0123456789abcdef":
			return false
	return true

static func _pure(value: Variant, path: String, depth: int = 0) -> String:
	if depth > 64:
		return "Snapshot nesting exceeds 64 at " + path
	match typeof(value):
		TYPE_NIL, TYPE_BOOL, TYPE_STRING:
			return ""
		TYPE_INT:
			return "" if _integer(value) else "Integer exceeds exact JSON range at " + path
		TYPE_ARRAY:
			for item: Variant in value:
				var error: String = _pure(item, path + "[]", depth + 1)
				if not error.is_empty():
					return error
		TYPE_DICTIONARY:
			for key: Variant in value:
				if not key is String:
					return "Dictionary keys must be strings at " + path
				var error: String = _pure(value[key], path + "." + key, depth + 1)
				if not error.is_empty():
					return error
		_:
			return "Only pure integer JSON data is supported at " + path
	return ""

static func _restore_integers(value: Variant) -> Variant:
	if value is float:
		return int(value)
	if value is Dictionary:
		var result: Dictionary = {}
		for key: Variant in value:
			result[key] = _restore_integers(value[key])
		return result
	if value is Array:
		var result: Array = []
		for item: Variant in value:
			result.append(_restore_integers(item))
		return result
	return value

static func _validate_number_tokens(text: String) -> String:
	# Godot JSON parses numbers as floats. Inspect lexical tokens before parsing,
	# rejecting 1000.0/1e3 and integers whose precision would already be lost.
	var in_string: bool = false
	var escaped: bool = false
	var index: int = 0
	while index < text.length():
		var ch: String = text[index]
		if in_string:
			if escaped:
				escaped = false
			elif ch == "\\":
				escaped = true
			elif ch == "\"":
				in_string = false
		elif ch == "\"":
			in_string = true
		elif ch in "-0123456789":
			var start: int = index
			while index < text.length() and text[index] in "-+0123456789.eE":
				index += 1
			var token: String = text.substr(start, index - start)
			if "." in token or "e" in token.to_lower() or not token.is_valid_int():
				return "Noninteger JSON number: " + token
			var absolute: String = token.trim_prefix("-")
			if absolute.length() > 16 or (absolute.length() == 16 and absolute > str(MAX_JSON_INTEGER)):
				return "JSON integer exceeds exact range: " + token
			continue
		index += 1
	return ""
